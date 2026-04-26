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

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: userEmail,
        metadata: { user_id: userId, role_type: role_type || "customer" },
      });
      customerId = newCustomer.id;
    }

    // Create Checkout Session in setup mode (saves card, no charge)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "setup",
      payment_method_types: ["card"],
      success_url: `${req.headers.get("origin")}/${role_type === "subcontractor" ? "subcontractor/payments" : "portal/billing"}?card_saved=true`,
      cancel_url: `${req.headers.get("origin")}/${role_type === "subcontractor" ? "subcontractor/payments" : "portal/billing"}`,
      metadata: { user_id: userId, role_type: role_type || "customer" },
    });

    // Store Stripe customer ID in the appropriate billing profile
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (role_type === "subcontractor") {
      const { data: sub } = await serviceClient
        .from("subcontractors").select("id").eq("user_id", userId).maybeSingle();
      if (sub) {
        await serviceClient.from("subcontractor_billing_profiles").upsert(
          { subcontractor_id: sub.id, processor_customer_id: customerId, updated_at: new Date().toISOString() },
          { onConflict: "subcontractor_id" }
        );
      }
    } else {
      const { data: cust } = await serviceClient
        .from("customers").select("id").eq("user_id", userId).maybeSingle();
      if (cust) {
        await serviceClient.from("customer_billing_profiles").upsert(
          { customer_id: cust.id, processor_customer_id: customerId, updated_at: new Date().toISOString() },
          { onConflict: "customer_id" }
        );
      }
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating setup session:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
