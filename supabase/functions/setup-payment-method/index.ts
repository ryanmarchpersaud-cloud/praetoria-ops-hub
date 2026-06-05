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

    const body = await req.json().catch(() => ({}));
    const { role_type, authorization_text, authorization_version } = body || {};

    const AUTH_TEXT_DEFAULT = "I authorize Praetoria Operations Group Inc. / Praetoria Group to securely save my payment method with Stripe and charge my saved card for approved invoices, recurring monthly services, or other services I authorize.";
    const consentText: string = (typeof authorization_text === "string" && authorization_text.trim().length > 20)
      ? authorization_text.trim()
      : AUTH_TEXT_DEFAULT;
    const consentVersion: string = (typeof authorization_version === "string" && authorization_version.trim()) || "v1";

    // Capture request context for the audit trail
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || null;
    const userAgent = req.headers.get("user-agent") || null;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: linkedCustomer } = role_type === "subcontractor"
      ? await serviceClient.from("subcontractors").select("id").eq("user_id", userId).maybeSingle()
      : await serviceClient.from("customers").select("id").eq("user_id", userId).maybeSingle();

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: userEmail,
        metadata: { user_id: userId, role_type: role_type || "customer", app_customer_id: linkedCustomer?.id || "" },
      });
      customerId = newCustomer.id;
    }

    // Use the request's origin so the user returns to the SAME domain they
    // started on (custom domain, lovable.app, or preview), keeping their
    // session alive so the auto-sync on /portal/billing actually fires.
    const referer = req.headers.get("referer");
    const origin =
      req.headers.get("origin") ||
      (referer ? new URL(referer).origin : null) ||
      "https://praetoriagroup.ca";
    const returnPath = role_type === "subcontractor" ? "/subcontractor/payments" : "/portal/billing";

    // Create Checkout Session in setup mode (saves card, no charge)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "setup",
      payment_method_types: ["card"],
      success_url: `${origin}${returnPath}?card_saved=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnPath}`,
      client_reference_id: linkedCustomer?.id || userId,
      metadata: { user_id: userId, role_type: role_type || "customer", app_customer_id: linkedCustomer?.id || "" },
    });

    // Store Stripe customer ID in the appropriate billing profile
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

    // Record card-on-file authorization (pending — completed by sync-payment-method)
    try {
      await serviceClient.from("payment_method_authorizations").insert({
        customer_id: role_type === "subcontractor" ? null : (linkedCustomer?.id || null),
        subcontractor_id: role_type === "subcontractor" ? (linkedCustomer?.id || null) : null,
        user_id: userId,
        role_type: role_type || "customer",
        processor: "stripe",
        processor_customer_id: customerId,
        authorization_text: consentText,
        authorization_version: consentVersion,
        ip_address: ipAddress,
        user_agent: userAgent,
        setup_session_id: session.id,
        is_default: true,
      });
    } catch (e) {
      console.warn("Could not insert payment_method_authorizations:", e);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error creating setup session:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
