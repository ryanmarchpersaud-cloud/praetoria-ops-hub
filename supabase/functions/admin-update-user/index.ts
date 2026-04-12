import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { user_id, email, password, delete_user_id } = await req.json();

  // Delete a user first if requested
  if (delete_user_id) {
    const { error: delErr } = await adminClient.auth.admin.deleteUser(delete_user_id);
    if (delErr) {
      return new Response(JSON.stringify({ error: "Delete failed: " + delErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!user_id) {
      return new Response(JSON.stringify({ success: true, deleted: delete_user_id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const updatePayload: Record<string, unknown> = {};
  if (email) { updatePayload.email = email; updatePayload.email_confirm = true; }
  if (password) updatePayload.password = password;

  const { data, error } = await adminClient.auth.admin.updateUserById(user_id, updatePayload);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, email: data.user.email }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});