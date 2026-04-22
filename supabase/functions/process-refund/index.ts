import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders, requireAuth, requireRole } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Standardized auth + role gate (refunds = admin/owner/accountant only)
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    const gate = await requireRole(auth, ["owner", "admin", "accountant"]);
    if (!gate.ok) return gate.response;
    const sb = auth.adminClient;
    const userId = auth.userId;

    const body = await req.json();
    const { invoice_id, refund_type, amount, reason, internal_notes } = body;

    if (!invoice_id || !amount || amount <= 0) {
      throw new Error("invoice_id and a positive amount are required");
    }

    // Fetch invoice
    const { data: invoice, error: invErr } = await sb
      .from("invoices")
      .select("id, total, amount_paid, balance_due, customer_id, invoice_number, status")
      .eq("id", invoice_id)
      .single();
    if (invErr || !invoice) throw new Error("Invoice not found");

    if (amount > Number(invoice.amount_paid)) {
      throw new Error(`Refund amount ($${amount}) exceeds amount paid ($${invoice.amount_paid})`);
    }

    // Look up Stripe payment intents for this invoice from finance_payments
    const { data: payments } = await sb
      .from("finance_payments")
      .select("reference_number, amount")
      .eq("invoice_id", invoice_id)
      .eq("payment_method", "credit_card")
      .order("created_at", { ascending: false });

    let stripeRefundId: string | null = null;
    let stripePaymentIntentId: string | null = null;

    // Try Stripe refund if we have a payment intent reference
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey && payments && payments.length > 0) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      // Find a payment intent to refund against
      const piRef = payments.find(p => p.reference_number?.startsWith("pi_"));
      if (piRef) {
        stripePaymentIntentId = piRef.reference_number;
        try {
          const refund = await stripe.refunds.create({
            payment_intent: stripePaymentIntentId!,
            amount: Math.round(amount * 100), // cents
            reason: refund_type === "duplicate" ? "duplicate" : "requested_by_customer",
          });
          stripeRefundId = refund.id;
        } catch (stripeErr: any) {
          console.error("Stripe refund failed:", stripeErr.message);
          // Still record the refund locally as failed
          await sb.from("finance_refunds").insert({
            invoice_id,
            customer_id: invoice.customer_id,
            refund_type: refund_type || "partial",
            amount,
            reason,
            stripe_payment_intent_id: stripePaymentIntentId,
            status: "failed",
            processed_by: userId,
            processed_at: new Date().toISOString(),
            internal_notes: `Stripe error: ${stripeErr.message}. ${internal_notes || ""}`.trim(),
          });
          throw new Error(`Stripe refund failed: ${stripeErr.message}`);
        }
      }
    }

    // Record refund
    const { data: refundRecord, error: refundErr } = await sb
      .from("finance_refunds")
      .insert({
        invoice_id,
        customer_id: invoice.customer_id,
        refund_type: refund_type || "partial",
        amount,
        reason,
        stripe_refund_id: stripeRefundId,
        stripe_payment_intent_id: stripePaymentIntentId,
        status: "processed",
        processed_by: userId,
        processed_at: new Date().toISOString(),
        internal_notes,
      })
      .select()
      .single();
    if (refundErr) throw refundErr;

    // Update invoice balances
    const newPaid = Math.max(0, Number(invoice.amount_paid) - amount);
    const newBalance = Number(invoice.total) - newPaid;
    let newStatus = invoice.status;
    if (newPaid <= 0.005) {
      newStatus = "Refunded";
    } else if (newBalance > 0.005) {
      newStatus = "Partially Paid";
    }

    await sb.from("invoices").update({
      amount_paid: Math.round(newPaid * 100) / 100,
      balance_due: Math.round(newBalance * 100) / 100,
      status: newStatus,
    }).eq("id", invoice_id);

    // Record negative finance_payment
    await sb.from("finance_payments").insert({
      payment_type: "refund",
      payment_date: new Date().toISOString().split("T")[0],
      amount: -amount,
      payment_method: stripeRefundId ? "credit_card" : "manual",
      invoice_id,
      reference_number: stripeRefundId || refundRecord.id,
      internal_note: `Refund: ${reason || refund_type}`,
    });

    // Notify customer
    try {
      const { data: cust } = await sb
        .from("customers")
        .select("first_name, last_name, email")
        .eq("id", invoice.customer_id)
        .maybeSingle();

      const customerName = cust ? `${cust.first_name} ${cust.last_name}` : "";

      const notifUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`;
      await fetch(notifUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        },
        body: JSON.stringify({
          event: "refund_issued",
          customer_id: invoice.customer_id,
          record_type: "invoice",
          record_id: invoice_id,
          channels: ["in_app", "email"],
          audience: "customer",
          variables: {
            customer_name: customerName,
            invoice_number: invoice.invoice_number || "",
            amount: amount.toFixed(2),
            to_email: cust?.email || "",
          },
        }),
      });
    } catch { /* non-critical */ }

    return new Response(JSON.stringify({ success: true, refund: refundRecord }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[process-refund] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
