import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is admin/owner
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc('is_admin_or_owner', { _user_id: userData.user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const customer_id: string | undefined = body.customer_id;
    const redirect_to: string = body.redirect_to || 'https://praetoriagroup.ca/portal/dashboard';
    if (!customer_id) {
      return new Response(JSON.stringify({ error: 'customer_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up the customer's auth account
    const { data: customer, error: cErr } = await admin
      .from('customers')
      .select('id, user_id, email, first_name, last_name, company_name')
      .eq('id', customer_id)
      .single();
    if (cErr || !customer) throw new Error('Customer not found');
    if (!customer.email) throw new Error('Customer has no email on file');

    // Resolve auth user_id by email if not stored on customer record
    let targetUserId = customer.user_id as string | null;
    if (!targetUserId) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = list?.users?.find((u: any) => (u.email || '').toLowerCase() === (customer.email as string).toLowerCase());
      targetUserId = match?.id ?? null;
    }
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'This customer does not have a portal account yet. Invite them first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate a magic link WITHOUT sending email (generateLink only returns the link)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: customer.email,
      options: { redirectTo: redirect_to },
    });
    if (linkErr) throw linkErr;

    const action_link = (linkData as any)?.properties?.action_link
      ?? (linkData as any)?.action_link
      ?? null;
    if (!action_link) throw new Error('Failed to generate sign-in link');

    // Silent audit log entry
    await admin.rpc('write_audit_log', {
      _action: 'admin.impersonate_customer',
      _target_type: 'customer',
      _target_id: customer_id,
      _customer_id: customer_id,
      _success: true,
      _before: null,
      _after: null,
      _metadata: { admin_user_id: userData.user.id, target_email: customer.email },
      _ip_address: req.headers.get('x-forwarded-for') ?? null,
      _user_agent: req.headers.get('user-agent') ?? null,
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true, action_link, email: customer.email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
