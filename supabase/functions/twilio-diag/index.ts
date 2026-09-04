// Temporary owner-only diagnostic for the inbound SMS router.
//
// Reports ONLY booleans and masked values: whether the stored Twilio auth token
// authenticates against the Twilio REST API, and which webhook URL variant the
// router validates signatures against. No secret, partial secret or hash is
// ever returned or logged.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const asCaller = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );
  const { data: userData } = await asCaller.auth.getUser();
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const { data: allowed } = await asCaller.rpc("is_admin_or_owner", { _user_id: userData.user.id });
  if (!allowed) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const webhookUrl = Deno.env.get("TWILIO_WEBHOOK_URL") ?? "";

  let tokenAuthenticates: boolean | null = null;
  let restStatus: number | null = null;
  if (authToken && accountSid) {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: { Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}` },
    });
    restStatus = res.status;
    tokenAuthenticates = res.ok;
  }

  return new Response(JSON.stringify({
    auth_token_configured: !!authToken,
    auth_token_length_ok: authToken.length === 32,
    account_sid_configured: !!accountSid,
    account_sid_prefix_ok: accountSid.startsWith("AC"),
    token_authenticates: tokenAuthenticates,
    twilio_rest_status: restStatus,
    webhook_url: webhookUrl,
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});
