import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callingUser } } = await anonClient.auth.getUser();
    if (!callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is admin/owner
    const { data: callerRoles } = await adminClient
      .from("user_roles").select("role").eq("user_id", callingUser.id);
    const isAdmin = callerRoles?.some((r: any) => ["admin", "owner", "hr_admin", "ops_manager"].includes(r.role));
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can send invites" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, temporary_password } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get worker profile
    const { data: worker, error: workerErr } = await adminClient
      .from("worker_profiles")
      .select("full_name, work_email")
      .eq("user_id", user_id)
      .single();

    if (workerErr || !worker) {
      return new Response(JSON.stringify({ error: "Worker not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!worker.work_email) {
      return new Response(JSON.stringify({ error: "Worker has no email address set" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If a temporary password was provided, update the user's password
    if (typeof temporary_password === "string" && temporary_password.length >= 8) {
      const { error: passwordError } = await adminClient.auth.admin.updateUserById(user_id, {
        password: temporary_password,
      });

      if (passwordError) {
        throw new Error(`Failed to set temporary password: ${passwordError.message}`);
      }
    }

    const appUrl = "https://praetoria-ops-hub.lovable.app";
    const firstName = worker.full_name?.split(" ")[0] || "Team Member";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Welcome to Praetoria Group</h1>
          <p style="color:#a0a0b8;margin:8px 0 0;font-size:14px;">Your Worker Portal Account is Ready</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="font-size:16px;color:#1a1a2e;margin:0 0 16px;">Hi ${firstName},</p>
          <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
            Your account on the Praetoria Ops Hub has been created. You can now log in to access your schedule, assignments, documents, and more.
          </p>
          <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:0 0 24px;">
            <p style="margin:0 0 8px;font-size:13px;color:#888;">Login Email</p>
            <p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;font-weight:600;">${worker.work_email}</p>
            ${temporary_password ? `
            <p style="margin:0 0 8px;font-size:13px;color:#888;">Temporary Password</p>
            <p style="margin:0;font-size:15px;color:#1a1a2e;font-weight:600;font-family:monospace;">${temporary_password}</p>
            ` : `
            <p style="margin:0;font-size:13px;color:#888;">Use the password provided by your manager to log in.</p>
            `}
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${appUrl}/login" style="display:inline-block;background:#1a1a2e;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;">
                Log In to Your Account
              </a>
            </td></tr>
          </table>
          <p style="font-size:13px;color:#888;margin:24px 0 0;line-height:1.5;">
            For security, please change your password after your first login. If you have any questions, contact your supervisor or the admin team.
          </p>
        </td></tr>
        <tr><td style="background:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#999;">© ${new Date().getFullYear()} Praetoria Group · Saskatchewan, Canada</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Send via Resend through connector gateway
    if (!resendApiKey || !lovableApiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRes = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": resendApiKey,
      },
      body: JSON.stringify({
        from: "Praetoria Group <noreply@praetoriagroup.ca>",
        to: [worker.work_email],
        reply_to: "ops@praetoriagroup.ca",
        subject: `Welcome to Praetoria Group – Your Account is Ready`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailRes.json();
    if (!emailRes.ok) {
      console.error("Email send error:", emailResult);
      return new Response(JSON.stringify({ error: "Failed to send invite email", details: emailResult }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invite sent to ${worker.work_email}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
