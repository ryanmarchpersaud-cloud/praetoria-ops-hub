import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

async function log(entry: Record<string, unknown>) {
  try {
    const sb = getServiceClient();
    await sb.from("integration_logs").insert({
      provider: "stripe",
      environment: "production",
      metadata: {},
      ...entry,
    });
  } catch (e) {
    console.error("Log failed:", e);
  }
}

async function sendNotification(sb: any, body: Record<string, unknown>) {
  try {
    // Use internal service-role fetch to our own send-notification function
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("Notification send failed:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Hardened: fail closed if webhook secret missing in production ────
  // Webhooks without signature verification are forgeable; reject rather
  // than silently accept JSON.
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured — refusing request");
    await log({
      event_name: "stripe.webhook_secret_missing",
      status: "failed",
      error_message: "STRIPE_WEBHOOK_SECRET not configured",
    });
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const sb = getServiceClient();

  let event: Stripe.Event;

  // Always verify signature
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    await log({
      event_name: "stripe.webhook_signature_failed",
      status: "failed",
      error_message: err.message,
    });
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[stripe-webhook] Received event: ${event.type} (${event.id})`);

  // ── Hardened: idempotency dedupe on event.id ─────────────────────────
  // Stripe retries webhooks; without dedupe we could double-record
  // payments / double-update invoices on transient failures.
  try {
    const { error: dedupeErr } = await sb
      .from("stripe_webhook_events")
      .insert({ event_id: event.id, event_type: event.type });
    if (dedupeErr) {
      // Unique violation = already processed → 200 OK so Stripe stops retrying
      if ((dedupeErr as any).code === "23505") {
        console.log(`[stripe-webhook] Duplicate event ${event.id} ignored`);
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      console.error("[stripe-webhook] Dedupe insert failed:", dedupeErr);
      // Continue processing — don't lose events because of dedupe table issue
    }
  } catch (e) {
    console.error("[stripe-webhook] Dedupe check error:", e);
  }

  try {
    switch (event.type) {
      // ── Checkout completed (invoice payment or setup) ──────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const invoiceId = session.metadata?.internal_invoice_id;

        if (session.mode === "payment" && invoiceId && session.payment_status === "paid") {
          const amountPaid = (session.amount_total || 0) / 100;

          // Look up current invoice
          const { data: inv } = await sb
            .from("invoices")
            .select("id, total, amount_paid, balance_due, customer_id, invoice_number")
            .eq("id", invoiceId)
            .maybeSingle();

          if (inv) {
            const newPaid = Number(inv.amount_paid || 0) + amountPaid;
            const newBalance = Math.max(0, Number(inv.total) - newPaid);
            const newStatus = newBalance <= 0.005 ? "Paid" : "Partially Paid";

            await sb.from("invoices").update({
              amount_paid: Math.round(newPaid * 100) / 100,
              balance_due: Math.round(newBalance * 100) / 100,
              status: newStatus,
              payment_method: "credit_card",
              ...(newStatus === "Paid" ? { paid_at: new Date().toISOString() } : {}),
            }).eq("id", invoiceId);

            // Record finance_payment
            await sb.from("finance_payments").insert({
              payment_type: "invoice_payment",
              payment_date: new Date().toISOString().split("T")[0],
              amount: amountPaid,
              payment_method: "credit_card",
              invoice_id: invoiceId,
              reference_number: session.payment_intent as string || session.id,
              internal_note: "Auto-recorded from Stripe Checkout",
            });

            // Send payment_received notification
            const { data: cust } = await sb
              .from("customers")
              .select("first_name, last_name, email, phone")
              .eq("id", inv.customer_id)
              .maybeSingle();

            const customerName = cust ? `${cust.first_name} ${cust.last_name}` : "";

            await sendNotification(sb, {
              event: "payment_received",
              customer_id: inv.customer_id,
              record_type: "invoice",
              record_id: invoiceId,
              channels: ["in_app", "email"],
              audience: "customer",
              variables: {
                customer_name: customerName,
                invoice_number: inv.invoice_number || "",
                amount_paid: amountPaid.toFixed(2),
                total: String(inv.total),
                to_email: cust?.email || "",
              },
            });

            // Notify admin
            await sendNotification(sb, {
              event: "payment_received",
              record_type: "invoice",
              record_id: invoiceId,
              channels: ["in_app"],
              audience: "admin",
              variables: {
                customer_name: customerName,
                invoice_number: inv.invoice_number || "",
                amount_paid: amountPaid.toFixed(2),
              },
            });

            await log({
              event_name: "stripe.payment_succeeded",
              channel: "payment",
              status: "success",
              record_type: "invoice",
              record_id: invoiceId,
              recipient: cust?.email,
              provider_response_id: session.id,
              metadata: { amount: amountPaid, new_status: newStatus },
            });
          }
        }

        // Handle setup mode (card saved)
        if (session.mode === "setup") {
          const customerId = session.customer as string;
          if (customerId) {
            // Fetch payment methods to sync card info
            const paymentMethods = await stripe.paymentMethods.list({
              customer: customerId,
              type: "card",
              limit: 1,
            });

            if (paymentMethods.data.length > 0) {
              const pm = paymentMethods.data[0];
              const cardBrand = pm.card?.brand || "card";
              const cardLast4 = pm.card?.last4 || "****";

              // Try to find matching customer or subcontractor billing profile
              const { data: custProfile } = await sb
                .from("customer_billing_profiles")
                .select("id")
                .eq("processor_customer_id", customerId)
                .maybeSingle();

              if (custProfile) {
                await sb.from("customer_billing_profiles").update({
                  card_brand: cardBrand,
                  card_last4: cardLast4,
                  card_exp_month: pm.card?.exp_month,
                  card_exp_year: pm.card?.exp_year,
                  default_payment_method_id: pm.id,
                  payment_method_present: true,
                  payment_preference: "card-on-file",
                  updated_at: new Date().toISOString(),
                }).eq("id", custProfile.id);
              }

              const { data: subProfile } = await sb
                .from("subcontractor_billing_profiles")
                .select("id")
                .eq("processor_customer_id", customerId)
                .maybeSingle();

              if (subProfile) {
                await sb.from("subcontractor_billing_profiles").update({
                  card_brand: cardBrand,
                  card_last4: cardLast4,
                  card_exp_month: pm.card?.exp_month,
                  card_exp_year: pm.card?.exp_year,
                  default_payment_method_id: pm.id,
                  payment_method_present: true,
                  payment_preference: "credit_card",
                  updated_at: new Date().toISOString(),
                }).eq("id", subProfile.id);
              }

              await log({
                event_name: "stripe.payment_method_saved",
                channel: "payment",
                status: "success",
                provider_response_id: session.id,
                metadata: { card_brand: cardBrand, card_last4: cardLast4 },
              });
            }
          }
        }
        break;
      }

      // ── Payment failed ──────────────────────────────────────────
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const invoiceId = pi.metadata?.internal_invoice_id;

        if (invoiceId) {
          // Update invoice status to Failed
          const { data: inv } = await sb
            .from("invoices")
            .select("id, customer_id, invoice_number, total, balance_due")
            .eq("id", invoiceId)
            .maybeSingle();

          if (inv) {
            await sb.from("invoices").update({ status: "Failed" }).eq("id", invoiceId);

            const { data: cust } = await sb
              .from("customers")
              .select("first_name, last_name, email")
              .eq("id", inv.customer_id)
              .maybeSingle();

            const customerName = cust ? `${cust.first_name} ${cust.last_name}` : "";

            await sendNotification(sb, {
              event: "payment_failed",
              customer_id: inv.customer_id,
              record_type: "invoice",
              record_id: invoiceId,
              channels: ["in_app", "email"],
              audience: "customer",
              variables: {
                customer_name: customerName,
                invoice_number: inv.invoice_number || "",
                total: String(inv.total),
                balance_due: String(inv.balance_due),
                to_email: cust?.email || "",
              },
            });

            await sendNotification(sb, {
              event: "payment_failed",
              record_type: "invoice",
              record_id: invoiceId,
              channels: ["in_app"],
              audience: "admin",
              variables: {
                customer_name: customerName,
                invoice_number: inv.invoice_number || "",
                total: String(inv.total),
              },
            });
          }

          await log({
            event_name: "stripe.payment_failed",
            channel: "payment",
            status: "failed",
            record_type: "invoice",
            record_id: invoiceId,
            provider_response_id: pi.id,
            error_message: pi.last_payment_error?.message || "Payment failed",
          });
        }
        break;
      }

      // ── Payment method attached/detached ────────────────────────
      case "payment_method.attached": {
        const pm = event.data.object as Stripe.PaymentMethod;
        if (pm.customer && pm.card) {
          const customerId = typeof pm.customer === "string" ? pm.customer : pm.customer.id;
          const cardUpdate = {
            card_brand: pm.card.brand,
            card_last4: pm.card.last4,
            card_exp_month: pm.card.exp_month,
            card_exp_year: pm.card.exp_year,
            payment_method_present: true,
            default_payment_method_id: pm.id,
            payment_preference: "card-on-file",
            updated_at: new Date().toISOString(),
          };

          // Sync to customer billing profile
          const { data: custBp } = await sb
            .from("customer_billing_profiles")
            .select("id")
            .eq("processor_customer_id", customerId)
            .maybeSingle();
          if (custBp) {
            await sb.from("customer_billing_profiles").update(cardUpdate).eq("id", custBp.id);
          }

          // Sync to subcontractor billing profile
          const { data: subBp } = await sb
            .from("subcontractor_billing_profiles")
            .select("id")
            .eq("processor_customer_id", customerId)
            .maybeSingle();
          if (subBp) {
            await sb.from("subcontractor_billing_profiles").update(cardUpdate).eq("id", subBp.id);
          }

          await log({
            event_name: "stripe.payment_method_attached",
            channel: "payment",
            status: "success",
            metadata: {
              customer: customerId,
              card_brand: pm.card.brand,
              card_last4: pm.card.last4,
              exp: `${pm.card.exp_month}/${pm.card.exp_year}`,
            },
          });
        }
        break;
      }

      case "payment_method.detached": {
        const pm = event.data.object as Stripe.PaymentMethod;
        await log({
          event_name: "stripe.payment_method_detached",
          channel: "payment",
          status: "success",
          metadata: { payment_method_id: pm.id },
        });
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    // Mark event as fully processed for the dedupe table
    await sb
      .from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("event_id", event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error(`[stripe-webhook] Error processing ${event.type}:`, err);
    await log({
      event_name: `stripe.webhook_error.${event.type}`,
      status: "failed",
      error_message: err.message,
      provider_response_id: event.id,
    });
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
