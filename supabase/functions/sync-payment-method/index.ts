import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

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

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email as string;
    if (!userEmail) throw new Error("No email in token");

    const { role_type, session_id } = await req.json();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // If Stripe redirected back with a Checkout Session ID, verify that exact
    // setup session instead of guessing from email or latest card.
    let verifiedPaymentMethodId: string | null = null;
    let stripeCustomerId: string | null = null;
    if (session_id) {
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["setup_intent"],
      });
      if (session.mode !== "setup") return json({ error: "Invalid setup session" }, 400);
      if (session.metadata?.user_id && session.metadata.user_id !== userId) {
        return json({ error: "This setup session does not belong to the signed-in user" }, 403);
      }
      if (session.status !== "complete") return json({ synced: false, message: "Card setup is not complete" }, 409);
      stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null;
      const setupIntent = session.setup_intent as Stripe.SetupIntent | string | null;
      if (setupIntent && typeof setupIntent !== "string") {
        verifiedPaymentMethodId = typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id || null;
      }
    }

    // Prefer the Stripe customer ID we already stored when starting setup —
    // this avoids picking the wrong customer when an email has multiple
    // Stripe records.
    if (!stripeCustomerId && role_type === "subcontractor") {
      const { data: sub } = await serviceClient
        .from("subcontractors").select("id").eq("user_id", userId).maybeSingle();
      if (sub) {
        const { data: bp } = await serviceClient
          .from("subcontractor_billing_profiles")
          .select("processor_customer_id").eq("subcontractor_id", sub.id).maybeSingle();
        stripeCustomerId = (bp as any)?.processor_customer_id || null;
      }
    } else if (!stripeCustomerId) {
      const { data: cust } = await serviceClient
        .from("customers").select("id").eq("user_id", userId).maybeSingle();
      if (cust) {
        const { data: bp } = await serviceClient
          .from("customer_billing_profiles")
          .select("processor_customer_id").eq("customer_id", cust.id).maybeSingle();
        stripeCustomerId = (bp as any)?.processor_customer_id || null;
      }
    }

    // Fallback: look up by email
    if (!stripeCustomerId) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length === 0) {
        return json({ synced: false, message: "No Stripe customer found" });
      }
      stripeCustomerId = customers.data[0].id;
    }

    let pm: Stripe.PaymentMethod | null = null;
    if (verifiedPaymentMethodId) {
      const retrieved = await stripe.paymentMethods.retrieve(verifiedPaymentMethodId);
      const retrievedCustomerId = typeof retrieved.customer === "string" ? retrieved.customer : retrieved.customer?.id;
      pm = retrievedCustomerId === stripeCustomerId ? retrieved : null;
    }
    if (!pm) {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: stripeCustomerId, type: "card", limit: 10,
      });
      pm = paymentMethods.data[0] || null;
    }

    // serviceClient already created above

    if (pm?.card) {
      const cardBrand = pm.card?.brand || "card";
      const cardLast4 = pm.card?.last4 || "****";
      const cardExpMonth = pm.card?.exp_month || null;
      const cardExpYear = pm.card?.exp_year || null;

      // Set as the Stripe customer's default for future invoicing
      try {
        await stripe.customers.update(stripeCustomerId!, {
          invoice_settings: { default_payment_method: pm.id },
        });
      } catch (e) {
        console.warn("Could not set default PM on Stripe customer", e);
      }

      if (role_type === "subcontractor") {
        const { data: sub } = await serviceClient
          .from("subcontractors").select("id").eq("user_id", userId).maybeSingle();
        if (sub) {
          const { error: upsertError } = await serviceClient.from("subcontractor_billing_profiles").upsert(
            {
              subcontractor_id: sub.id, processor_customer_id: stripeCustomerId,
              card_brand: cardBrand, card_last4: cardLast4,
              card_exp_month: cardExpMonth, card_exp_year: cardExpYear,
              default_payment_method_id: pm.id,
              payment_method_present: true, payment_preference: "credit_card",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "subcontractor_id" }
          );
          if (upsertError) throw upsertError;
        }
      } else {
        const { data: cust } = await serviceClient
          .from("customers").select("id").eq("user_id", userId).maybeSingle();
        if (cust) {
          const { error: upsertError } = await serviceClient.from("customer_billing_profiles").upsert(
            {
              customer_id: cust.id, processor_customer_id: stripeCustomerId,
              card_brand: cardBrand, card_last4: cardLast4,
              card_exp_month: cardExpMonth, card_exp_year: cardExpYear,
              default_payment_method_id: pm.id,
              payment_method_present: true, payment_preference: "card-on-file" as any,
              autopay_consent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "customer_id" }
          );
          if (upsertError) throw upsertError;
        } else {
          return json({ synced: false, message: "No app customer record found for this signed-in user" }, 404);
        }
      }

      return json({
        synced: true,
        verified: !!session_id,
        processor_customer_id: stripeCustomerId,
        default_payment_method_id: pm.id,
        card_brand: cardBrand,
        card_last4: cardLast4,
        card_exp_month: cardExpMonth,
        card_exp_year: cardExpYear,
      });
    }

    return json({ synced: false, message: "No card on file" });
  } catch (error: unknown) {
    console.error("Error syncing payment method:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
