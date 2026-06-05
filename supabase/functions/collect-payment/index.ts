import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Restrict to ops/admin/accountant — only staff may charge cards on file
    const userId = claimsData.claims.sub as string;
    const serviceClientForRoleCheck = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: roles } = await serviceClientForRoleCheck
      .from("user_roles").select("role").eq("user_id", userId);
    const allowed = (roles ?? []).some((r: { role: string }) =>
      ["owner", "admin", "accountant", "ops_manager", "manager"].includes(r.role)
    );
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { invoice_id, amount } = await req.json();
    if (!invoice_id || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "invoice_id and positive amount are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get invoice and customer billing profile
    const { data: inv, error: invErr } = await serviceClient
      .from("invoices")
      .select("id, invoice_number, customer_id, total, amount_paid, balance_due, status")
      .eq("id", invoice_id)
      .single();
    if (invErr || !inv) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: bp } = await serviceClient
      .from("customer_billing_profiles")
      .select("processor_customer_id, default_payment_method_id, payment_method_present, card_brand, card_last4, autopay_consent_at, payment_preference")
      .eq("customer_id", inv.customer_id)
      .maybeSingle();

    if (!bp?.processor_customer_id || !bp?.default_payment_method_id || !bp?.payment_method_present) {
      return new Response(JSON.stringify({ error: "No card on file for this customer" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const paymentMethod = await stripe.paymentMethods.retrieve(bp.default_payment_method_id);
    if (paymentMethod.customer !== bp.processor_customer_id || !paymentMethod.card) {
      return new Response(JSON.stringify({ error: "Saved card could not be verified with Stripe" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await stripe.customers.update(bp.processor_customer_id, {
      invoice_settings: { default_payment_method: bp.default_payment_method_id },
    });

    if (amount > Number(inv.balance_due || inv.total) + 0.005) {
      return new Response(JSON.stringify({ error: "Amount exceeds invoice balance" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountCents = Math.round(amount * 100);

    // Create and confirm payment intent using saved card
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "cad",
      customer: bp.processor_customer_id,
      payment_method: bp.default_payment_method_id,
      off_session: true,
      confirm: true,
      description: `Invoice ${inv.invoice_number}`,
      metadata: { internal_invoice_id: invoice_id, charged_by: userId, charge_source: "admin_card_on_file" },
    });

    if (paymentIntent.status === "succeeded") {
      const newPaid = Number(inv.amount_paid || 0) + amount;
      const newBalance = Math.max(0, Number(inv.total) - newPaid);
      const newStatus = newBalance <= 0.005 ? "Paid" : "Partially Paid";

      await serviceClient.from("invoices").update({
        amount_paid: Math.round(newPaid * 100) / 100,
        balance_due: Math.round(newBalance * 100) / 100,
        status: newStatus,
        payment_method: "credit_card",
        ...(newStatus === "Paid" ? { paid_at: new Date().toISOString() } : {}),
      }).eq("id", invoice_id);

      const { error: paymentRecordError } = await serviceClient.from("finance_payments").insert({
        payment_type: "invoice_payment",
        payment_date: new Date().toISOString().split("T")[0],
        amount,
        payment_method: "credit_card",
        invoice_id,
        reference_number: paymentIntent.id,
        entered_by: userId,
        internal_note: `Collected from authorized saved card (${paymentMethod.card.brand} •••• ${paymentMethod.card.last4})`,
      });

      if (paymentRecordError) throw paymentRecordError;

      await serviceClient.from("customer_billing_profiles").update({
        card_brand: paymentMethod.card.brand,
        card_last4: paymentMethod.card.last4,
        card_exp_month: paymentMethod.card.exp_month,
        card_exp_year: paymentMethod.card.exp_year,
        default_payment_method_id: paymentMethod.id,
        payment_method_present: true,
        updated_at: new Date().toISOString(),
      }).eq("customer_id", inv.customer_id);

      return new Response(JSON.stringify({
        success: true,
        payment_intent_id: paymentIntent.id,
        new_status: newStatus,
        amount_charged: amount,
        card_brand: paymentMethod.card.brand,
        card_last4: paymentMethod.card.last4,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    return new Response(JSON.stringify({
      success: false,
      status: paymentIntent.status,
      error: "Payment requires additional action or failed",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  } catch (error: any) {
    console.error("Error collecting payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
