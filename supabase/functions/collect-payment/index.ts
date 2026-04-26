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
      .select("processor_customer_id, default_payment_method_id, payment_method_present")
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
      metadata: { internal_invoice_id: invoice_id },
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

      await serviceClient.from("finance_payments").insert({
        payment_type: "invoice_payment",
        payment_date: new Date().toISOString().split("T")[0],
        amount,
        payment_method: "credit_card",
        invoice_id,
        reference_number: paymentIntent.id,
        internal_note: "Collected from card on file",
      });

      return new Response(JSON.stringify({
        success: true,
        payment_intent_id: paymentIntent.id,
        new_status: newStatus,
        amount_charged: amount,
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
