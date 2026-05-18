// Processes an account deletion request: deletes the auth user + profile,
// then marks the request processed. Admin/owner only.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const actor = userData.user;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify admin/owner
    const { data: isAdmin } = await admin.rpc('is_admin_or_owner', { _user_id: actor.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden — admin/owner only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { request_id } = await req.json();
    if (!request_id) {
      return new Response(JSON.stringify({ error: 'request_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: reqRow, error: reqErr } = await admin
      .from('account_deletion_requests')
      .select('id, user_id, email, status')
      .eq('id', request_id)
      .maybeSingle();
    if (reqErr || !reqRow) {
      return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const targetUserId = reqRow.user_id;

    // Best-effort cleanup of profile/role rows (other business data is retained per policy)
    await admin.from('profiles').delete().eq('user_id', targetUserId);
    await admin.from('user_roles').delete().eq('user_id', targetUserId);
    // Unlink (don't delete) any customer/worker/subcontractor records so business history is preserved
    await admin.from('customers').update({ user_id: null }).eq('user_id', targetUserId);
    await admin.from('worker_profiles').update({ user_id: null }).eq('user_id', targetUserId);
    await admin.from('subcontractors').update({ user_id: null }).eq('user_id', targetUserId);

    // Delete the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(targetUserId);
    if (delErr) {
      return new Response(JSON.stringify({ error: `Auth delete failed: ${delErr.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Mark request processed
    await admin
      .from('account_deletion_requests')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        processed_by: actor.id,
      })
      .eq('id', request_id);

    return new Response(
      JSON.stringify({ success: true, deleted_user_id: targetUserId, email: reqRow.email }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
