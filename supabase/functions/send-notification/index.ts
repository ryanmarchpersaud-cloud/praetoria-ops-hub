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
  // Replace merge variables; missing ones render as empty string (never raw {{placeholder}})
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

// Resolve recipient email/phone from customer_id or recipient_id when not provided in variables
async function resolveRecipient(
  supabase: any,
  { customer_id, recipient_id, audience, variables }: {
    customer_id?: string;
    recipient_id?: string;
    audience: string;
    variables: Record<string, string>;
  }
): Promise<{ email?: string; phone?: string }> {
  // If already provided in variables, use them
  if (variables.to_email || variables.to_phone) {
    return { email: variables.to_email, phone: variables.to_phone };
  }

  // For customer audience, look up from customers table
  if (audience === "customer" && customer_id) {
    const { data: cust } = await supabase
      .from("customers")
      .select("email, phone")
      .eq("id", customer_id)
      .maybeSingle();
    if (cust) return { email: cust.email || undefined, phone: cust.phone || undefined };
  }

  // For worker/subcontractor audience, look up from profiles table via recipient_id
  if ((audience === "worker" || audience === "subcontractor") && recipient_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", recipient_id)
      .maybeSingle();

    // Try auth user email
    const { data: authData } = await supabase.auth.admin.getUserById(recipient_id);
    if (authData?.user) {
      return { email: authData.user.email || undefined, phone: authData.user.phone || undefined };
    }
  }

  // For admin audience, use ops inbox
  if (audience === "admin") {
    return { email: "ops@praetoriagroup.ca" };
  }

  return {};
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

    // Resolve recipient contact info for email/SMS channels
    const resolved = await resolveRecipient(supabase, {
      customer_id,
      recipient_id,
      audience,
      variables,
    });

    // Inject resolved contact info into variables for template rendering
    const enrichedVars = {
      ...variables,
      to_email: variables.to_email || resolved.email || "",
      to_phone: variables.to_phone || resolved.phone || "",
      company_name: variables.company_name || "Praetoria Group",
    };

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

      // Validate recipient before attempting email/SMS
      if (channel === "email" && !enrichedVars.to_email) {
        results.push({ channel, status: "skipped", reason: "no_recipient_email" });
        console.warn(`[send-notification] Skipping email for event=${event}: no recipient email found`);
        continue;
      }
      if (channel === "sms" && !enrichedVars.to_phone) {
        results.push({ channel, status: "skipped", reason: "no_recipient_phone" });
        console.warn(`[send-notification] Skipping SMS for event=${event}: no recipient phone found`);
        continue;
      }

      // Fetch template
      const { data: template } = await supabase
        .from("notification_templates")
        .select("subject_template, body_template, is_active")
        .eq("event", event)
        .eq("audience", audience)
        .eq("channel", channel)
        .maybeSingle();

      // If template is explicitly inactive, skip
      if (template && !template.is_active) {
        results.push({ channel, status: "skipped", reason: "template_inactive" });
        continue;
      }

      const subject = template?.is_active
        ? renderTemplate(template.subject_template, enrichedVars)
        : enrichedVars.subject || event.replace(/_/g, " ");
      const notifBody = template?.is_active
        ? renderTemplate(template.body_template, enrichedVars)
        : enrichedVars.body || "";

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
          metadata: enrichedVars,
          status: channel === "in_app" ? "sent" : "pending",
          sent_at: channel === "in_app" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (notifErr) {
        results.push({ channel, status: "error", error: notifErr.message });
        continue;
      }

      // ── Email delivery via Resend ──
      if (channel === "email") {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (RESEND_API_KEY && enrichedVars.to_email) {
          try {
            const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Praetoria Group <noreply@praetoriagroup.ca>",
                to: [enrichedVars.to_email],
                subject,
                html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}.container{max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);}.header{background:#1a1a2e;padding:24px 32px;}.header h1{margin:0;color:#fff;font-size:18px;font-weight:600;}.body{padding:32px;color:#27272a;line-height:1.6;font-size:15px;}h2{font-size:16px;margin:0 0 16px;}p{margin:0 0 12px;}.footer{padding:16px 32px;background:#fafafa;color:#71717a;font-size:12px;text-align:center;border-top:1px solid #e4e4e7;}</style></head><body><div class="container"><div class="header"><h1>Praetoria Group</h1></div><div class="body"><h2>${subject}</h2><div>${notifBody}</div></div><div class="footer">Praetoria Group &bull; praetoriagroup.ca</div></div></body></html>`,
                reply_to: enrichedVars.reply_to || "ops@praetoriagroup.ca",
              }),
            });
            const emailData = await emailRes.json();
            if (emailRes.ok) {
              await supabase.from("notifications").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", notif.id);
              results.push({ channel, status: "sent", notification_id: notif.id, resend_id: emailData.id });
            } else {
              await supabase.from("notifications").update({ status: "failed" }).eq("id", notif.id);
              results.push({ channel, status: "failed", notification_id: notif.id, error: emailData.message });
              console.error(`[send-notification] Email failed for event=${event}: ${emailData.message}`);
            }
          } catch (emailErr: any) {
            await supabase.from("notifications").update({ status: "failed" }).eq("id", notif.id);
            results.push({ channel, status: "failed", notification_id: notif.id, error: emailErr.message });
            console.error(`[send-notification] Email exception for event=${event}: ${emailErr.message}`);
          }
        } else {
          results.push({
            channel,
            status: "skipped",
            notification_id: notif.id,
            reason: !RESEND_API_KEY ? "RESEND_API_KEY_missing" : "no_recipient_email",
          });
        }
      }

      // ── SMS delivery via Twilio ──
      else if (channel === "sms") {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
        const TWILIO_PHONE = Deno.env.get("TWILIO_PHONE_NUMBER");
        if (LOVABLE_API_KEY && TWILIO_API_KEY && TWILIO_PHONE && enrichedVars.to_phone) {
          try {
            const smsBody = `${subject}: ${notifBody}`.substring(0, 1600);
            const smsRes = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": TWILIO_API_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: enrichedVars.to_phone,
                From: TWILIO_PHONE,
                Body: smsBody,
              }),
            });
            const smsData = await smsRes.json();
            if (smsRes.ok) {
              await supabase.from("notifications").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", notif.id);
              results.push({ channel, status: "sent", notification_id: notif.id, twilio_sid: smsData.sid });
            } else {
              await supabase.from("notifications").update({ status: "failed" }).eq("id", notif.id);
              results.push({ channel, status: "failed", notification_id: notif.id, error: smsData.message || JSON.stringify(smsData) });
              console.error(`[send-notification] SMS failed for event=${event}: ${smsData.message || JSON.stringify(smsData)}`);
            }
          } catch (smsErr: any) {
            await supabase.from("notifications").update({ status: "failed" }).eq("id", notif.id);
            results.push({ channel, status: "failed", notification_id: notif.id, error: smsErr.message });
            console.error(`[send-notification] SMS exception for event=${event}: ${smsErr.message}`);
          }
        } else {
          results.push({
            channel,
            status: "skipped",
            notification_id: notif.id,
            reason: !enrichedVars.to_phone ? "no_recipient_phone" : "twilio_keys_missing",
          });
        }
      }

      // ── In-app (already marked sent on insert) ──
      else {
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
      payload_summary: { event, audience, channels, customer_id, results_summary: results.map(r => `${r.channel}:${r.status}`) },
    });

    return json({ success: true, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[send-notification] Unhandled error: ${msg}`);
    return json({ error: msg }, 500);
  }
});
