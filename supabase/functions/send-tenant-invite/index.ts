import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://praetoria-ops-hub.lovable.app";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=ca.praetoriagroup.opshub";

function makeTempPassword() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < bytes.length; i++) pw += chars[bytes[i] % chars.length];
  return `Praetoria!${pw}`;
}

function buildEmailHtml(firstName: string, email: string, tempPassword: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr><td style="background:#065F46;padding:28px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Welcome to Praetoria Group</h1>
          <p style="color:#a7f3d0;margin:6px 0 0;font-size:14px;">Your Tenant Portal Account is Ready</p>
        </td></tr>
        <tr><td style="padding:28px 40px;">
          <p style="font-size:15px;color:#111;margin:0 0 14px;">Hi ${firstName},</p>
          <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 20px;">
            Your Tenant Portal account has been created. You can now log in to view your lease, property information, and submit maintenance requests.
          </p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:18px;margin:0 0 20px;">
            <p style="margin:0 0 6px;font-size:13px;color:#065F46;">Login Email</p>
            <p style="margin:0 0 14px;font-size:15px;color:#111;font-weight:600;">${email}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#065F46;">Temporary Password</p>
            <p style="margin:0;font-size:15px;color:#111;font-weight:600;font-family:monospace;">${tempPassword}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${APP_URL}/login" style="display:inline-block;background:#065F46;color:#fff;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">Log In</a>
          </td></tr></table>
          <div style="margin:22px 0 0;padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#166534;">📱 Download the App</p>
            <a href="${PLAY_STORE_URL}" style="display:inline-block;background:#34a853;color:#fff;font-weight:600;text-decoration:none;padding:8px 20px;border-radius:6px;font-size:13px;">Get it on Google Play</a>
          </div>
          <p style="font-size:12px;color:#888;margin:20px 0 0;">For security, please change your password after first login.</p>
          <p style="font-size:12px;color:#888;margin:8px 0 0;">Questions? <a href="mailto:ops@praetoriagroup.ca" style="color:#065F46;">ops@praetoriagroup.ca</a></p>
        </td></tr>
        <tr><td style="background:#f8f9fa;padding:16px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#999;">© ${new Date().getFullYear()} Praetoria Group</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callingUser } } = await anonClient.auth.getUser();
    if (!callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRoles } = await adminClient
      .from("user_roles").select("role").eq("user_id", callingUser.id);
    const isAdmin = callerRoles?.some((r: any) =>
      ["admin", "owner", "hr_admin", "ops_manager"].includes(r.role)
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can invite tenants" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tenant_id, email } = await req.json();
    if (!tenant_id || !email) {
      return new Response(JSON.stringify({ error: "tenant_id and email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tenant, error: tErr } = await adminClient
      .from("pm_tenants").select("id, first_name, last_name, email, user_id").eq("id", tenant_id).maybeSingle();
    if (tErr || !tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    let userId = tenant.user_id as string | null;
    const tempPassword = makeTempPassword();

    if (!userId) {
      // Try to find existing auth user by email
      const { data: list } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users?.find((u: any) => (u.email || "").toLowerCase() === normalizedEmail);
      if (found) {
        userId = found.id;
      } else {
        const { data: created, error: cErr } = await adminClient.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { first_name: tenant.first_name, last_name: tenant.last_name, portal: "tenant" },
        });
        if (cErr || !created?.user) {
          return new Response(JSON.stringify({ error: `Failed to create user: ${cErr?.message}` }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = created.user.id;
      }
    }

    // Always (re)set temp password for existing users so admins can share it
    await adminClient.auth.admin.updateUserById(userId!, { password: tempPassword });

    // Link tenant record + update email
    await adminClient.from("pm_tenants").update({
      user_id: userId,
      email: normalizedEmail,
    }).eq("id", tenant_id);

    // Assign tenant role (idempotent)
    await adminClient.from("user_roles")
      .upsert({ user_id: userId, role: "tenant" }, { onConflict: "user_id,role", ignoreDuplicates: true });

    // Send email
    if (resendApiKey && lovableApiKey) {
      const html = buildEmailHtml(tenant.first_name || "Tenant", normalizedEmail, tempPassword);
      const emailRes = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableApiKey}`,
          "X-Connection-Api-Key": resendApiKey,
        },
        body: JSON.stringify({
          from: "Praetoria Group <noreply@praetoriagroup.ca>",
          to: [normalizedEmail],
          reply_to: "ops@praetoriagroup.ca",
          subject: "Welcome to Praetoria Group – Your Tenant Portal is Ready",
          html,
        }),
      });
      if (!emailRes.ok) {
        const details = await emailRes.json().catch(() => ({}));
        console.error("Tenant invite email error:", details);
        return new Response(JSON.stringify({
          success: true, warning: "User linked but email failed to send",
          temp_password: tempPassword, details,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({
      success: true, user_id: userId, temp_password: tempPassword,
      message: `Tenant invited: ${normalizedEmail}`,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
