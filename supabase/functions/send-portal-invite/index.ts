import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://praetoria-ops-hub.lovable.app";
const PLAY_STORE_URL = "https://play.google.com/apps/internaltest/4701596223109416665";

async function getAuthLoginEmail(adminClient: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await adminClient.auth.admin.getUserById(userId);
  if (error) {
    throw new Error(`Failed to fetch the login email for this account: ${error.message}`);
  }
  return data.user?.email ?? null;
}

function buildEmailHtml(portal: string, firstName: string, email: string, tempPassword: string | null, loginPath: string) {
  const portalLabels: Record<string, { title: string; subtitle: string; description: string; color: string }> = {
    worker: {
      title: "Welcome to Praetoria Group",
      subtitle: "Your Worker Portal Account is Ready",
      description: "You can now log in to access your schedule, assignments, equipment, documents, timesheets, and more.",
      color: "#1a1a2e",
    },
    subcontractor: {
      title: "Welcome to Praetoria Group",
      subtitle: "Your Subcontractor Portal Account is Ready",
      description: "You can now log in to manage your assignments, submit invoices, upload compliance documents, and track payments.",
      color: "#1a1a2e",
    },
    customer: {
      title: "Welcome to Praetoria Group",
      subtitle: "Your Customer Portal Account is Ready",
      description: "You can now log in to view your properties, track service visits, manage billing, submit service requests, and more.",
      color: "#1a1a2e",
    },
  };

  const p = portalLabels[portal] || portalLabels.worker;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:${p.color};padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">${p.title}</h1>
          <p style="color:#a0a0b8;margin:8px 0 0;font-size:14px;">${p.subtitle}</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="font-size:16px;color:#1a1a2e;margin:0 0 16px;">Hi ${firstName},</p>
          <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
            Your account on the Praetoria Ops Hub has been created. ${p.description}
          </p>
          <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:0 0 24px;">
            <p style="margin:0 0 8px;font-size:13px;color:#888;">Login Email</p>
            <p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;font-weight:600;">${email}</p>
            ${tempPassword ? `
            <p style="margin:0 0 8px;font-size:13px;color:#888;">Temporary Password</p>
            <p style="margin:0;font-size:15px;color:#1a1a2e;font-weight:600;font-family:monospace;">${tempPassword}</p>
            ` : `
            <p style="margin:0;font-size:13px;color:#888;">Use the password provided by your administrator to log in.</p>
            `}
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${APP_URL}${loginPath}" style="display:inline-block;background:${p.color};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;">
                Log In to Your Account
              </a>
            </td></tr>
          </table>

          <div style="margin:24px 0 0;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#166534;">📱 Download the App</p>
            <p style="margin:0 0 10px;font-size:13px;color:#555;line-height:1.5;">For the best experience, download the Praetoria Group app on your Android device:</p>
            <a href="${PLAY_STORE_URL}" style="display:inline-block;background:#34a853;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:6px;">
              Get it on Google Play
            </a>
          </div>

          <p style="font-size:13px;color:#888;margin:24px 0 0;line-height:1.5;">
            For security, please change your password after your first login.
          </p>
          <div style="margin:16px 0 0;padding:12px;background:#f8f9fa;border-radius:6px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#555;">Need Help?</p>
            <p style="margin:0;font-size:12px;color:#888;line-height:1.6;">
              📧 Email: <a href="mailto:ops@praetoriagroup.ca" style="color:#1a1a2e;">ops@praetoriagroup.ca</a><br/>
              📧 Support: <a href="mailto:support@praetoriagroup.ca" style="color:#1a1a2e;">support@praetoriagroup.ca</a><br/>
              🌐 Website: <a href="https://praetoriagroup.ca" style="color:#1a1a2e;">praetoriagroup.ca</a>
            </p>
          </div>
        </td></tr>
        <tr><td style="background:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#999;">© ${new Date().getFullYear()} Praetoria Group · Saskatchewan, Canada</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    const isAdmin = callerRoles?.some((r: any) => ["admin", "owner", "hr_admin", "ops_manager"].includes(r.role));
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can send invites" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { portal_type, user_id, customer_id } = await req.json();
    // Cryptographically secure temp password
    const _pwBytes = new Uint8Array(12);
    crypto.getRandomValues(_pwBytes);
    const _pwChars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let _pw = '';
    for (let i = 0; i < _pwBytes.length; i++) _pw += _pwChars[_pwBytes[i] % _pwChars.length];
    const DEFAULT_TEMP_PASSWORD = `Praetoria!${_pw}`;
    const temporary_password = DEFAULT_TEMP_PASSWORD;

    if (!portal_type || !["worker", "subcontractor", "customer"].includes(portal_type)) {
      return new Response(JSON.stringify({ error: "portal_type must be worker, subcontractor, or customer" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let recipientEmail: string | null = null;
    let recipientName = "Team Member";
    let loginPath = "/login";

    if (portal_type === "worker") {
      if (!user_id) return new Response(JSON.stringify({ error: "user_id required for worker" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: w } = await adminClient.from("worker_profiles").select("full_name, work_email").eq("user_id", user_id).single();
      if (!w) return new Response(JSON.stringify({ error: "Worker not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      recipientEmail = w.work_email;
      recipientName = w.full_name?.split(" ")[0] || "Team Member";
      loginPath = "/login";
    } else if (portal_type === "subcontractor") {
      if (!user_id) return new Response(JSON.stringify({ error: "user_id required for subcontractor" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: s } = await adminClient.from("subcontractors").select("contact_name, email").eq("user_id", user_id).single();
      if (!s) return new Response(JSON.stringify({ error: "Subcontractor not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const authLoginEmail = await getAuthLoginEmail(adminClient, user_id);
      recipientEmail = authLoginEmail || s.email;
      recipientName = s.contact_name?.split(" ")[0] || "Partner";
      loginPath = "/login";
    } else if (portal_type === "customer") {
      if (!customer_id) return new Response(JSON.stringify({ error: "customer_id required for customer" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: c } = await adminClient.from("customers").select("first_name, email, user_id").eq("id", customer_id).single();
      if (!c) return new Response(JSON.stringify({ error: "Customer not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!c.user_id) return new Response(JSON.stringify({ error: "Customer does not have a portal account yet. Create one first." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      recipientEmail = c.email;
      recipientName = c.first_name || "Valued Customer";
      loginPath = "/login";
    }

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "No email address found for this contact" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update password if provided
    const updatePasswordForUser = async (targetId: string, password: string) => {
      const { error: passwordError } = await adminClient.auth.admin.updateUserById(targetId, {
        password,
      });

      if (passwordError) {
        throw new Error(`Failed to set temporary password: ${passwordError.message}`);
      }
    };

    // Always set the default temporary password
    if (portal_type === "customer") {
      const { data: cust } = await adminClient.from("customers").select("user_id").eq("id", customer_id).single();
      if (cust?.user_id) {
        await updatePasswordForUser(cust.user_id, temporary_password);
      }
    } else if (user_id) {
      await updatePasswordForUser(user_id, temporary_password);
    }

    const emailHtml = buildEmailHtml(portal_type, recipientName, recipientEmail, temporary_password || null, loginPath);

    if (!resendApiKey || !lovableApiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subjectMap: Record<string, string> = {
      worker: "Welcome to Praetoria Group – Your Worker Account is Ready",
      subcontractor: "Welcome to Praetoria Group – Your Subcontractor Portal is Ready",
      customer: "Welcome to Praetoria Group – Your Customer Portal is Ready",
    };

    const emailRes = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": resendApiKey,
      },
      body: JSON.stringify({
        from: "Praetoria Group <noreply@praetoriagroup.ca>",
        to: [recipientEmail],
        reply_to: "ops@praetoriagroup.ca",
        subject: subjectMap[portal_type],
        html: emailHtml,
      }),
    });

    const emailResult = await emailRes.json();
    if (!emailRes.ok) {
      console.error("Email send error:", emailResult);
      return new Response(JSON.stringify({ error: "Failed to send invite email", details: emailResult }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: `Invite sent to ${recipientEmail}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
