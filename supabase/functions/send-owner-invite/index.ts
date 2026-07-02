import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://praetoria-ops-hub.lovable.app";

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
        <tr><td style="background:#0f172a;padding:28px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Welcome to Praetoria Group</h1>
          <p style="color:#94a3b8;margin:6px 0 0;font-size:14px;">Your Property Owner Portal is Ready</p>
        </td></tr>
        <tr><td style="padding:28px 40px;">
          <p style="font-size:15px;color:#111;margin:0 0 14px;">Hi ${firstName},</p>
          <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 20px;">
            Your Property Owner Portal has been set up. You can now log in to view your properties, units, leases, and maintenance activity for the properties you own with Praetoria Group.
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:18px;margin:0 0 20px;">
            <p style="margin:0 0 6px;font-size:13px;color:#0f172a;">Login Email</p>
            <p style="margin:0 0 14px;font-size:15px;color:#111;font-weight:600;">${email}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#0f172a;">Temporary Password</p>
            <p style="margin:0;font-size:15px;color:#111;font-weight:600;font-family:monospace;">${tempPassword}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${APP_URL}/login" style="display:inline-block;background:#0f172a;color:#fff;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">Log In</a>
          </td></tr></table>
          <p style="font-size:12px;color:#888;margin:20px 0 0;">For security, please change your password after first login.</p>
          <p style="font-size:12px;color:#888;margin:8px 0 0;">Questions? <a href="mailto:ops@praetoriagroup.ca" style="color:#0f172a;">ops@praetoriagroup.ca</a></p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:16px 40px;text-align:center;border-top:1px solid #e2e8f0;">
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
      return new Response(JSON.stringify({ error: "Only admins can invite property owners" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { owner_id, email } = await req.json();
    if (!owner_id || !email) {
      return new Response(JSON.stringify({ error: "owner_id and email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: owner, error: oErr } = await adminClient
      .from("pm_property_owners")
      .select("id, owner_name, company_name, email, user_id")
      .eq("id", owner_id).maybeSingle();
    if (oErr || !owner) {
      return new Response(JSON.stringify({ error: "Property owner not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    let userId = owner.user_id as string | null;
    const tempPassword = makeTempPassword();
    const firstName = (owner.owner_name || owner.company_name || "").split(" ")[0] || "Owner";

    if (!userId) {
      const { data: list } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users?.find((u: any) => (u.email || "").toLowerCase() === normalizedEmail);
      if (found) {
        userId = found.id;
      } else {
        const { data: created, error: cErr } = await adminClient.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { first_name: firstName, portal: "property_owner" },
        });
        if (cErr || !created?.user) {
          return new Response(JSON.stringify({ error: `Failed to create user: ${cErr?.message}` }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = created.user.id;
      }
    }

    // Always (re)set temp password so admin can share it
    await adminClient.auth.admin.updateUserById(userId!, { password: tempPassword });

    // Link owner record + update email
    await adminClient.from("pm_property_owners").update({
      user_id: userId,
      email: normalizedEmail,
      is_active: true,
    }).eq("id", owner_id);

    // Assign property_owner role (idempotent, EXTERNAL owners only — do NOT assign internal 'owner')
    await adminClient.from("user_roles")
      .upsert({ user_id: userId, role: "property_owner" }, { onConflict: "user_id,role", ignoreDuplicates: true });

    // Phase 5A: force password change on first login using the existing profiles flow.
    // Additive — reuses the same must_change_password mechanism customers/workers already use.
    await adminClient.from("profiles").upsert(
      { user_id: userId, must_change_password: true },
      { onConflict: "user_id" },
    );


    if (resendApiKey && lovableApiKey) {
      const html = buildEmailHtml(firstName, normalizedEmail, tempPassword);
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
          subject: "Welcome to Praetoria Group – Your Property Owner Portal is Ready",
          html,
        }),
      });
      if (!emailRes.ok) {
        const details = await emailRes.json().catch(() => ({}));
        console.error("Owner invite email error:", details);
        return new Response(JSON.stringify({
          success: true, warning: "User linked but email failed to send",
          temp_password: tempPassword, details,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({
      success: true, user_id: userId, temp_password: tempPassword,
      message: `Property owner invited: ${normalizedEmail}`,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
