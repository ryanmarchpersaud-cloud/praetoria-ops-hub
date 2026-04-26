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

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email as string;
    if (!userEmail) throw new Error("No email in token");

    const { role_type } = await req.json();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find stripe customer
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ synced: false, message: "No Stripe customer found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const stripeCustomer = customers.data[0];
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomer.id, type: "card", limit: 1,
    });

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (paymentMethods.data.length > 0) {
      const pm = paymentMethods.data[0];
      const cardBrand = pm.card?.brand || "card";
      const cardLast4 = pm.card?.last4 || "****";
      const cardExpMonth = pm.card?.exp_month || null;
      const cardExpYear = pm.card?.exp_year || null;

      if (role_type === "subcontractor") {
        const { data: sub } = await serviceClient
          .from("subcontractors").select("id").eq("user_id", userId).maybeSingle();
        if (sub) {
          await serviceClient.from("subcontractor_billing_profiles").upsert(
            {
              subcontractor_id: sub.id, processor_customer_id: stripeCustomer.id,
              card_brand: cardBrand, card_last4: cardLast4,
              card_exp_month: cardExpMonth, card_exp_year: cardExpYear,
              default_payment_method_id: pm.id,
              payment_method_present: true, payment_preference: "credit_card",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "subcontractor_id" }
          );
        }
      } else {
        const { data: cust } = await serviceClient
          .from("customers").select("id").eq("user_id", userId).maybeSingle();
        if (cust) {
          await serviceClient.from("customer_billing_profiles").upsert(
            {
              customer_id: cust.id, processor_customer_id: stripeCustomer.id,
              card_brand: cardBrand, card_last4: cardLast4,
              card_exp_month: cardExpMonth, card_exp_year: cardExpYear,
              default_payment_method_id: pm.id,
              payment_method_present: true, payment_preference: "credit_card" as any,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "customer_id" }
          );
        }
      }

      return new Response(
        JSON.stringify({ synced: true, card_brand: cardBrand, card_last4: cardLast4, card_exp_month: cardExpMonth, card_exp_year: cardExpYear }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(JSON.stringify({ synced: false, message: "No card on file" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    console.error("Error syncing payment method:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
