import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateTempPassword(): string {
  // 12 chars: easy to type, contains letter, number, and symbol
  const adjectives = ['Snow', 'Bold', 'Swift', 'Sharp', 'Bright', 'Clear', 'Frost', 'Steel'];
  const nouns = ['Lion', 'Bear', 'Wolf', 'Hawk', 'Eagle', 'Fox', 'Owl', 'Tiger'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj}${noun}${num}!`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is an admin/owner
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
    const target_user_id: string | undefined = body.user_id;
    if (!target_user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tempPassword = (typeof body.password === 'string' && body.password.length >= 8)
      ? body.password
      : generateTempPassword();

    const { data: updated, error: updErr } = await admin.auth.admin.updateUserById(target_user_id, {
      password: tempPassword,
      email_confirm: true,
    });
    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({
        success: true,
        password: tempPassword,
        email: updated?.user?.email ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
