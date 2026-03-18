import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const {
      event,
      customer_id,
      recipient_id,
      record_type,
      record_id,
      variables = {},
      channels = ["in_app"],
      audience = "customer",
    } = body;

    if (!event) return json({ error: "Missing 'event' field" }, 400);

    const results: Record<string, unknown>[] = [];

    // Check customer notification preferences if customer audience
    let prefs: Record<string, boolean> | null = null;
    if (audience === "customer" && customer_id) {
      const { data: prefData } = await supabase
        .from("customer_notification_preferences")
        .select("email_enabled, sms_enabled, in_app_enabled")
        .eq("customer_id", customer_id)
        .eq("event", event)
        .maybeSingle();
      if (prefData) prefs = prefData;
    }

    for (const channel of channels as string[]) {
      // Check preference - default to enabled if no preference set
      if (prefs) {
        const key = `${channel}_enabled` as keyof typeof prefs;
        if (prefs[key] === false) {
          results.push({ channel, status: "skipped", reason: "disabled_by_preference" });
          continue;
        }
      }

      // Fetch template
      const { data: template } = await supabase
        .from("notification_templates")
        .select("subject_template, body_template, is_active")
        .eq("event", event)
        .eq("audience", audience)
        .eq("channel", channel)
        .maybeSingle();

      const subject = template?.is_active
        ? renderTemplate(template.subject_template, variables)
        : variables.subject || event.replace(/_/g, " ");
      const notifBody = template?.is_active
        ? renderTemplate(template.body_template, variables)
        : variables.body || "";

      // Create notification record
      const { data: notif, error: notifErr } = await supabase
        .from("notifications")
        .insert({
          event,
          channel,
          audience,
          recipient_id: recipient_id || null,
          customer_id: customer_id || null,
          record_type: record_type || null,
          record_id: record_id || null,
          subject,
          body: notifBody,
          metadata: variables,
          status: channel === "in_app" ? "sent" : "pending",
          sent_at: channel === "in_app" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (notifErr) {
        results.push({ channel, status: "error", error: notifErr.message });
        continue;
      }

      // For email/sms - mark as pending (ready for external processor)
      // In production, this is where Stripe/Twilio/email API calls would go
      if (channel === "email") {
        // Send via Resend through send-email edge function
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (RESEND_API_KEY && variables.to_email) {
          try {
            const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Praetoria Ops <noreply@praetoriagroup.ca>",
                to: [variables.to_email],
                subject,
                html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;"><h2>${subject}</h2><div>${notifBody}</div><p style="color:#71717a;font-size:12px;margin-top:24px;">Praetoria Group &bull; praetoriagroup.ca</p></div>`,
                reply_to: variables.reply_to || "ops@praetoriagroup.ca",
              }),
            });
            const emailData = await emailRes.json();
            if (emailRes.ok) {
              await supabase.from("notifications").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", notif.id);
              results.push({ channel, status: "sent", notification_id: notif.id, resend_id: emailData.id });
            } else {
              results.push({ channel, status: "failed", notification_id: notif.id, error: emailData.message });
            }
          } catch (emailErr: any) {
            results.push({ channel, status: "failed", notification_id: notif.id, error: emailErr.message });
          }
        } else {
          results.push({ channel, status: "queued", notification_id: notif.id, message: "Email queued (RESEND_API_KEY or to_email missing)" });
        }
      } else if (channel === "sms") {
        // SMS integration placeholder - ready for Twilio connector
        results.push({ channel, status: "queued", notification_id: notif.id, message: "SMS queued for delivery" });
      } else {
        results.push({ channel, status: "sent", notification_id: notif.id });
      }
    }

    // Log activity
    await supabase.from("activities").insert({
      action_name: `Notification: ${event.replace(/_/g, " ")}`,
      workflow_name: "notifications",
      record_type: record_type || null,
      record_id: record_id || null,
      status: "completed",
      payload_summary: { event, audience, channels, customer_id },
    });

    return json({ success: true, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
