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
    const cleanupSteps: Array<[string, Promise<any>]> = [
      ['profiles.delete', admin.from('profiles').delete().eq('user_id', targetUserId)],
      ['user_roles.delete', admin.from('user_roles').delete().eq('user_id', targetUserId)],
      // Unlink (don't delete) so business history is preserved
      ['customers.user_id', admin.from('customers').update({ user_id: null }).eq('user_id', targetUserId)],
      ['customers.created_by', admin.from('customers').update({ created_by: null }).eq('created_by', targetUserId)],
      ['worker_profiles.user_id', admin.from('worker_profiles').update({ user_id: null }).eq('user_id', targetUserId)],
      ['subcontractors.user_id', admin.from('subcontractors').update({ user_id: null }).eq('user_id', targetUserId)],
      // Null out NO ACTION foreign keys that would otherwise block auth.users delete
      ['leads.assigned_to', admin.from('leads').update({ assigned_to: null }).eq('assigned_to', targetUserId)],
      ['leads.created_by', admin.from('leads').update({ created_by: null }).eq('created_by', targetUserId)],
      ['quotes.created_by', admin.from('quotes').update({ created_by: null }).eq('created_by', targetUserId)],
      ['quotes.approved_by', admin.from('quotes').update({ approved_by: null }).eq('approved_by', targetUserId)],
      ['activities.user_id', admin.from('activities').update({ user_id: null }).eq('user_id', targetUserId)],
      ['activities.approved_by', admin.from('activities').update({ approved_by: null }).eq('approved_by', targetUserId)],
      ['files.uploaded_by', admin.from('files').update({ uploaded_by: null }).eq('uploaded_by', targetUserId)],
      ['service_requests.user_id', admin.from('service_requests').update({ user_id: null }).eq('user_id', targetUserId)],
      ['training_courses.created_by', admin.from('training_courses').update({ created_by: null }).eq('created_by', targetUserId)],
      ['training_assignments.assigned_by', admin.from('training_assignments').update({ assigned_by: null }).eq('assigned_by', targetUserId)],
      ['operational_tasks.assigned_to', admin.from('operational_tasks').update({ assigned_to: null }).eq('assigned_to', targetUserId)],
      ['operational_tasks.created_by', admin.from('operational_tasks').update({ created_by: null }).eq('created_by', targetUserId)],
    ];
    for (const [label, p] of cleanupSteps) {
      const { error } = await p;
      if (error) console.error(`[process-account-deletion] cleanup ${label} failed:`, error.message);
    }

    // Send confirmation email BEFORE deleting the auth user (so we still have the email).
    // Fire-and-forget — never block deletion if email fails.
    if (reqRow.email) {
      try {
        await admin.functions.invoke('send-email', {
          body: {
            action: 'ops_notification',
            subject: 'Your Praetoria Group account has been deleted',
            body_html: `
              <div style="font-family: Arial, sans-serif; color: #0F172A; max-width: 560px;">
                <h2 style="color:#0F172A;">Your account has been deleted</h2>
                <p>Hi,</p>
                <p>This is a confirmation that your Praetoria Group account
                (<strong>${reqRow.email}</strong>) has been permanently deleted at your request.
                You will no longer be able to sign in with this email.</p>
                <p>As required by Canadian record-keeping law, business records such as invoices,
                tax records, signed agreements, and job/service history may be retained in
                anonymized form. Your personal profile and login have been removed.</p>
                <p>If this was a mistake, or you'd like to re-open an account, please contact us
                at <a href="mailto:support@praetoriagroup.ca">support@praetoriagroup.ca</a>.</p>
                <p style="margin-top:24px;">Thank you,<br/>The Praetoria Group Team</p>
              </div>
            `,
            to_addresses: [reqRow.email],
          },
        });
      } catch (e) {
        console.error('deletion confirmation email failed', e);
      }
    }

    // Delete the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(targetUserId);
    if (delErr) {
      console.error('[process-account-deletion] auth.admin.deleteUser failed:', delErr);
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
