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

// Test product price for admin verification
const TEST_PRICE_ID = "price_1TCO8lR6HWfxbuQUMooGNBfM";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);

  try {
    const { action, ...params } = await req.json();

    // ---- Health check ----
    if (action === "health") {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        const account = await stripe.accounts.retrieve();
        return json({
          ok: true,
          stripe_configured: true,
          account_name: account.settings?.dashboard?.display_name || account.business_profile?.name || "Connected",
          livemode: !stripeKey.startsWith("sk_test_"),
        });
      } catch (e: any) {
        return json({ ok: false, stripe_configured: false, error: e.message });
      }
    }

    // ---- Admin test checkout ----
    if (action === "test_checkout") {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const origin = req.headers.get("origin") || "https://praetoria-ops-hub.lovable.app";

      // Optionally authenticate user
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const authHeader = req.headers.get("Authorization");
      let userEmail: string | undefined;
      let userId: string | undefined;
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabase.auth.getUser(token);
        userEmail = data.user?.email ?? undefined;
        userId = data.user?.id ?? undefined;
      }

      // Find or create Stripe customer
      let customerId: string | undefined;
      if (userEmail) {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        }
      }

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
          environment: stripeKey.startsWith("sk_test_") ? "test" : "live",
          internal_user_id: userId || "anonymous",
        },
      });

      return json({ ok: true, url: session.url });
    }

    // ---- Create checkout for invoice/service payment ----
    if (action === "create_checkout") {
      const { price_id, quantity, customer_email, customer_id, invoice_id, service_category, description } = params;
      if (!price_id) return json({ error: "Missing price_id" }, 400);

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const origin = req.headers.get("origin") || "https://praetoria-ops-hub.lovable.app";

      // Find or create Stripe customer
      let stripeCustomerId: string | undefined;
      if (customer_email) {
        const customers = await stripe.customers.list({ email: customer_email, limit: 1 });
        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id;
        }
      }

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
          environment: stripeKey.startsWith("sk_test_") ? "test" : "live",
          internal_customer_id: customer_id || "",
          internal_invoice_id: invoice_id || "",
          service_category: service_category || "",
          description: description || "",
        },
      });

      return json({ ok: true, url: session.url, session_id: session.id });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
