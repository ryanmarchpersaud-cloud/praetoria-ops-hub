import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate via webhook secret OR supabase JWT
  const webhookSecret = req.headers.get("x-webhook-secret");
  const expectedSecret = Deno.env.get("N8N_WEBHOOK_SECRET");

  if (expectedSecret && webhookSecret !== expectedSecret) {
    // Fall back to JWT auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized – provide x-webhook-secret header or Bearer token" }, 401);
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { error } = await supabaseAuth.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (error) return json({ error: "Invalid token" }, 401);
  }

  // Service-role client for DB operations
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const action = body.action as string;

    if (!action) {
      return json({ error: "Missing 'action' field. Supported: create_activity, update_lead_status, create_quote_draft, set_follow_up" }, 400);
    }

    switch (action) {
      // ── Create Activity ──────────────────────────────────────────
      case "create_activity": {
        const { action_name, workflow_name, record_type, record_id, status, needs_approval, payload_summary } = body;
        if (!action_name) return json({ error: "action_name is required" }, 400);

        const { data, error } = await supabase.from("activities").insert({
          action_name,
          workflow_name: workflow_name || "n8n",
          record_type: record_type || null,
          record_id: record_id || null,
          status: status || "completed",
          needs_approval: needs_approval || false,
          payload_summary: payload_summary || null,
        }).select().single();

        if (error) return json({ error: error.message }, 500);
        return json({ success: true, activity: data });
      }

      // ── Update Lead Status ───────────────────────────────────────
      case "update_lead_status": {
        const { lead_id, status: newStatus, internal_notes } = body;
        if (!lead_id || !newStatus) return json({ error: "lead_id and status are required" }, 400);

        const validStatuses = ["New", "Reviewing", "Awaiting info", "Quote drafting", "Quote ready", "Quote sent", "Won", "Lost", "Archived"];
        if (!validStatuses.includes(newStatus)) {
          return json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, 400);
        }

        const updates: Record<string, unknown> = { status: newStatus };
        if (internal_notes) updates.internal_notes = internal_notes;

        const { data, error } = await supabase.from("leads").update(updates).eq("id", lead_id).select().single();
        if (error) return json({ error: error.message }, 500);

        // Log activity
        await supabase.from("activities").insert({
          action_name: `Lead status → ${newStatus}`,
          workflow_name: "n8n",
          record_type: "lead",
          record_id: lead_id,
          status: "completed",
        });

        return json({ success: true, lead: data });
      }

      // ── Create Quote Draft ───────────────────────────────────────
      case "create_quote_draft": {
        const { lead_id, service_category, scope_of_work, agent_summary, line_items, tax_rate } = body;
        if (!lead_id) return json({ error: "lead_id is required" }, 400);

        const { data: quote, error: qErr } = await supabase.from("quotes").insert({
          lead_id,
          quote_number: "TEMP", // trigger will replace
          service_category: service_category || "Other",
          scope_of_work: scope_of_work || null,
          agent_summary: agent_summary || null,
          tax_rate: tax_rate ?? 0.13,
          approval_status: "Draft",
        }).select().single();

        if (qErr) return json({ error: qErr.message }, 500);

        // Insert line items if provided
        if (Array.isArray(line_items) && line_items.length > 0) {
          const items = line_items.map((li: Record<string, unknown>, i: number) => ({
            quote_id: quote.id,
            item_name: li.item_name || `Item ${i + 1}`,
            description: li.description || null,
            quantity: li.quantity ?? 1,
            unit_price: li.unit_price ?? 0,
            sort_order: i,
          }));
          const { error: liErr } = await supabase.from("quote_line_items").insert(items);
          if (liErr) return json({ error: liErr.message }, 500);
        }

        // Log activity
        await supabase.from("activities").insert({
          action_name: "Quote draft created via n8n",
          workflow_name: "n8n",
          record_type: "quote",
          record_id: quote.id,
          status: "completed",
        });

        // Refetch to get calculated totals
        const { data: final } = await supabase.from("quotes").select("*").eq("id", quote.id).single();
        return json({ success: true, quote: final });
      }

      // ── Set Follow-Up Reminder ───────────────────────────────────
      case "set_follow_up": {
        const { quote_id, follow_up_due_at, internal_notes } = body;
        if (!quote_id || !follow_up_due_at) return json({ error: "quote_id and follow_up_due_at are required" }, 400);

        const updates: Record<string, unknown> = { follow_up_due_at };
        if (internal_notes) updates.internal_notes = internal_notes;

        const { data, error } = await supabase.from("quotes").update(updates).eq("id", quote_id).select().single();
        if (error) return json({ error: error.message }, 500);

        await supabase.from("activities").insert({
          action_name: `Follow-up set for ${follow_up_due_at}`,
          workflow_name: "n8n",
          record_type: "quote",
          record_id: quote_id,
          status: "completed",
        });

        return json({ success: true, quote: data });
      }

      // ── Test n8n Handoff ────────────────────────────────────────
      case "test_handoff": {
        const n8nUrl = Deno.env.get("N8N_WEBHOOK_URL");
        if (!n8nUrl) return json({ error: "N8N_WEBHOOK_URL secret is not configured" }, 500);

        const payload = {
          event: "stripe.test_checkout_created",
          provider: "stripe",
          channel: "payment",
          status: "success",
          recipient: "admin@praetoriagroup.ca",
          record_type: "invoice",
          record_id: "synthetic-test",
          provider_response_id: "synthetic-session",
          environment: "test",
          metadata: { source: "connected_apps_manual_test" },
          timestamp: new Date().toISOString(),
        };

        let handoffOk = false;
        let handoffMessage = "";
        let handoffStatus = 0;

        try {
          const resp = await fetch(n8nUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          handoffStatus = resp.status;
          handoffOk = resp.ok;
          handoffMessage = handoffOk
            ? `n8n responded ${resp.status}`
            : `n8n returned ${resp.status}: ${(await resp.text()).slice(0, 200)}`;
        } catch (fetchErr) {
          handoffMessage = fetchErr instanceof Error ? fetchErr.message : "Fetch failed";
        }

        // Log to integration_logs
        await supabase.from("integration_logs").insert({
          event_name: "stripe.test_checkout_created",
          provider: "n8n",
          channel: "webhook",
          status: handoffOk ? "delivered" : "failed",
          recipient: "admin@praetoriagroup.ca",
          record_type: "invoice",
          record_id: "synthetic-test",
          provider_response_id: "synthetic-session",
          environment: "test",
          error_message: handoffOk ? null : handoffMessage,
          metadata: { source: "connected_apps_manual_test", http_status: handoffStatus },
        });

        return json({
          success: handoffOk,
          message: handoffMessage,
          payload_sent: payload,
          logged: true,
        });
      }

      default:
        return json({ error: `Unknown action '${action}'. Supported: create_activity, update_lead_status, create_quote_draft, set_follow_up, test_handoff` }, 400);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
