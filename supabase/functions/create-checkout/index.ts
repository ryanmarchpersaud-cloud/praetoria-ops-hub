import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

interface IntegrationEntry {
  provider: string;
  event_name: string;
  channel?: string;
  status: string;
  recipient?: string;
  record_type?: string;
  record_id?: string;
  provider_response_id?: string;
  error_message?: string;
  environment?: string;
  metadata?: Record<string, unknown>;
}

async function logIntegration(entry: IntegrationEntry) {
  try {
    const sb = getServiceClient();
    await sb.from("integration_logs").insert({
      ...entry,
      environment: entry.environment || "production",
      metadata: entry.metadata || {},
    });
  } catch (e) {
    console.error("Failed to log integration event:", e);
  }
}

// ── n8n Event Handoff ──────────────────────────────────────────
const N8N_NOTIFY_EVENTS = new Set([
  "stripe.service_checkout_created",
  "stripe.test_checkout_created",
]);

async function notifyN8n(entry: IntegrationEntry) {
  if (!N8N_NOTIFY_EVENTS.has(entry.event_name)) return;
  const url = Deno.env.get("N8N_WEBHOOK_URL");
  if (!url) return;

  const payload = {
    event: entry.event_name,
    provider: entry.provider,
    channel: entry.channel || "payment",
    status: entry.status,
    recipient: entry.recipient,
    record_type: entry.record_type,
    record_id: entry.record_id,
    provider_response_id: entry.provider_response_id,
    environment: entry.environment || "production",
    metadata: entry.metadata || {},
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await logIntegration({
      provider: "n8n",
      event_name: `n8n.handoff.${entry.event_name}`,
      channel: "webhook",
      status: res.ok ? "success" : "failed",
      record_type: entry.record_type,
      record_id: entry.record_id,
      error_message: res.ok ? undefined : `n8n responded ${res.status}`,
      environment: entry.environment || "production",
      metadata: { upstream_event: entry.event_name },
    });
  } catch (e) {
    console.error("n8n handoff failed:", e);
    await logIntegration({
      provider: "n8n",
      event_name: `n8n.handoff.${entry.event_name}`,
      channel: "webhook",
      status: "failed",
      error_message: e instanceof Error ? e.message : "Unknown error",
      environment: entry.environment || "production",
      metadata: { upstream_event: entry.event_name },
    });
  }
}

const TEST_PRICE_ID = "price_1TCO8lR6HWfxbuQUMooGNBfM";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);
  const env = stripeKey.startsWith("sk_test_") ? "test" : "live";

  try {
    const { action, ...params } = await req.json();

    if (action === "health") {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        const account = await stripe.accounts.retrieve();
        await logIntegration({
          provider: "stripe",
          event_name: "stripe.health_check",
          channel: "payment",
          status: "success",
          environment: env,
          metadata: { account_name: account.settings?.dashboard?.display_name || account.business_profile?.name },
        });
        return json({
          ok: true,
          stripe_configured: true,
          account_name: account.settings?.dashboard?.display_name || account.business_profile?.name || "Connected",
          livemode: env === "live",
        });
      } catch (e: any) {
        await logIntegration({
          provider: "stripe",
          event_name: "stripe.health_check",
          channel: "payment",
          status: "failed",
          environment: env,
          error_message: e.message,
        });
        return json({ ok: false, stripe_configured: false, error: e.message });
      }
    }

    if (action === "test_checkout") {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const origin = req.headers.get("origin") || "https://praetoria-ops-hub.lovable.app";

      const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
      const authHeader = req.headers.get("Authorization");
      let userEmail: string | undefined;
      let userId: string | undefined;
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabase.auth.getUser(token);
        userEmail = data.user?.email ?? undefined;
        userId = data.user?.id ?? undefined;
      }

      let customerId: string | undefined;
      if (userEmail) {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) customerId = customers.data[0].id;
      }

      try {
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          customer_email: customerId ? undefined : userEmail,
          line_items: [{ price: TEST_PRICE_ID, quantity: 1 }],
          mode: "payment",
          success_url: `${origin}/settings/connected-apps?stripe_test=success`,
          cancel_url: `${origin}/settings/connected-apps?stripe_test=cancelled`,
          metadata: {
            source: "praetoria_ops",
            action: "admin_test",
            environment: env,
            internal_user_id: userId || "anonymous",
          },
        });

        const logEntry: IntegrationEntry = {
          provider: "stripe",
          event_name: "stripe.test_checkout_created",
          channel: "payment",
          status: "success",
          recipient: userEmail,
          provider_response_id: session.id,
          environment: env,
          metadata: { user_id: userId },
        };
        await logIntegration(logEntry);
        await notifyN8n(logEntry);
        return json({ ok: true, url: session.url });
      } catch (e: any) {
        await logIntegration({
          provider: "stripe",
          event_name: "stripe.test_checkout_created",
          channel: "payment",
          status: "failed",
          recipient: userEmail,
          environment: env,
          error_message: e.message,
        });
        throw e;
      }
    }

    if (action === "create_checkout") {
      const { price_id, quantity, customer_email, customer_id, invoice_id, service_category, description } = params;
      if (!price_id) return json({ error: "Missing price_id" }, 400);

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const origin = req.headers.get("origin") || "https://praetoria-ops-hub.lovable.app";

      let stripeCustomerId: string | undefined;
      if (customer_email) {
        const customers = await stripe.customers.list({ email: customer_email, limit: 1 });
        if (customers.data.length > 0) stripeCustomerId = customers.data[0].id;
      }

      try {
        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          customer_email: stripeCustomerId ? undefined : customer_email,
          line_items: [{ price: price_id, quantity: quantity || 1 }],
          mode: "payment",
          success_url: `${origin}/portal/billing?payment=success`,
          cancel_url: `${origin}/portal/billing?payment=cancelled`,
          metadata: {
            source: "praetoria_ops",
            action: "service_payment",
            environment: env,
            internal_customer_id: customer_id || "",
            internal_invoice_id: invoice_id || "",
            service_category: service_category || "",
            description: description || "",
          },
        });

        const logEntry: IntegrationEntry = {
          provider: "stripe",
          event_name: "stripe.service_checkout_created",
          channel: "payment",
          status: "success",
          recipient: customer_email,
          record_type: "invoice",
          record_id: invoice_id,
          provider_response_id: session.id,
          environment: env,
          metadata: { customer_id, service_category },
        };
        await logIntegration(logEntry);
        await notifyN8n(logEntry);
        return json({ ok: true, url: session.url, session_id: session.id });
      } catch (e: any) {
        await logIntegration({
          provider: "stripe",
          event_name: "stripe.service_checkout_created",
          channel: "payment",
          status: "failed",
          recipient: customer_email,
          record_type: "invoice",
          record_id: invoice_id,
          environment: env,
          error_message: e.message,
        });
        throw e;
      }
    }

    // ── Invoice Payment (amount-based, no price_id needed) ──────────
    if (action === "invoice_payment") {
      const { invoice_id, amount, description: desc } = params;
      if (!invoice_id || !amount) return json({ error: "Missing invoice_id or amount" }, 400);

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const origin = req.headers.get("origin") || "https://praetoria-ops-hub.lovable.app";

      const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
      const authHeader = req.headers.get("Authorization");
      let userEmail: string | undefined;
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabase.auth.getUser(token);
        userEmail = data.user?.email ?? undefined;
      }

      let stripeCustomerId: string | undefined;
      if (userEmail) {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) stripeCustomerId = customers.data[0].id;
      }

      const amountCents = Math.round(Number(amount) * 100);

      try {
        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          customer_email: stripeCustomerId ? undefined : userEmail,
          line_items: [{
            price_data: {
              currency: "cad",
              product_data: { name: desc || "Invoice Payment" },
              unit_amount: amountCents,
            },
            quantity: 1,
          }],
          mode: "payment",
          success_url: `${origin}/portal/billing?payment=success&invoice=${invoice_id}`,
          cancel_url: `${origin}/portal/billing?payment=cancelled`,
          metadata: {
            source: "praetoria_ops",
            action: "invoice_payment",
            environment: env,
            internal_invoice_id: invoice_id,
          },
        });

        const logEntry: IntegrationEntry = {
          provider: "stripe",
          event_name: "stripe.invoice_payment_created",
          channel: "payment",
          status: "success",
          recipient: userEmail,
          record_type: "invoice",
          record_id: invoice_id,
          provider_response_id: session.id,
          environment: env,
          metadata: { amount, invoice_id },
        };
        await logIntegration(logEntry);
        await notifyN8n(logEntry);
        return json({ ok: true, url: session.url, session_id: session.id });
      } catch (e: any) {
        await logIntegration({
          provider: "stripe",
          event_name: "stripe.invoice_payment_created",
          channel: "payment",
          status: "failed",
          recipient: userEmail,
          record_type: "invoice",
          record_id: invoice_id,
          environment: env,
          error_message: e.message,
        });
        throw e;
      }
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
