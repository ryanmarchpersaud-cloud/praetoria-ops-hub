import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the Praetoria Ops Hub AI Co-pilot — a helpful, concise operations assistant for a field-services company (snow removal, landscaping, cleaning, security, etc.).

You have access to live operational data that is provided as context below. Use it to answer questions accurately.

Guidelines:
- Be concise and action-oriented
- Format currency as CAD ($) with commas
- Use markdown for tables and lists when helpful
- If the data doesn't contain enough info, say so honestly
- Never make up data — only reference what's in the context
- You can suggest actions but cannot execute them directly yet
- Refer to the platform as "Praetoria Ops Hub"
`;

async function getOperationalContext(supabase: any) {
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: overdueInvoices },
    { data: todayVisits },
    { data: activeJobs },
    { data: openRequests },
    { data: recentIncidents },
    { data: pendingQuotes },
    { data: upcomingVisits },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, total, balance_due, due_date, status, customer_id")
      .eq("status", "Sent")
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(20),
    supabase
      .from("visits")
      .select("id, visit_number, service_date, status, service_type, assigned_worker_id, start_time, end_time")
      .eq("service_date", today)
      .order("start_time", { ascending: true })
      .limit(30),
    supabase
      .from("jobs")
      .select("id, job_number, job_title, status, service_type, created_at")
      .in("status", ["Active", "In Progress", "Scheduled"])
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("requests")
      .select("id, request_number, service_type, status, priority, created_at")
      .in("status", ["New", "In Review", "Pending"])
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("incident_reports")
      .select("id, report_number, incident_type, severity, status, created_at")
      .in("status", ["Open", "Investigating", "In Progress"])
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("quotes")
      .select("id, quote_number, total, approval_status, created_at")
      .in("approval_status", ["Draft", "Needs review", "Sent"])
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("visits")
      .select("id, visit_number, service_date, status, service_type, assigned_worker_id")
      .gt("service_date", today)
      .order("service_date", { ascending: true })
      .limit(15),
  ]);

  return `
## LIVE OPERATIONAL DATA (as of ${new Date().toISOString()})

### Overdue Invoices (${overdueInvoices?.length || 0})
${overdueInvoices?.length ? overdueInvoices.map((i: any) => `- ${i.invoice_number}: $${Number(i.balance_due).toLocaleString()} due on ${i.due_date}`).join("\n") : "None"}

### Today's Visits (${todayVisits?.length || 0})
${todayVisits?.length ? todayVisits.map((v: any) => `- ${v.visit_number}: ${v.service_type || "Service"} — ${v.status} (${v.start_time || "unscheduled"})`).join("\n") : "None scheduled"}

### Active Jobs (${activeJobs?.length || 0})
${activeJobs?.length ? activeJobs.map((j: any) => `- ${j.job_number}: ${j.job_title} — ${j.status}`).join("\n") : "None"}

### Open Requests (${openRequests?.length || 0})
${openRequests?.length ? openRequests.map((r: any) => `- ${r.request_number}: ${r.service_type} — ${r.status} (${r.priority || "normal"})`).join("\n") : "None"}

### Open Incidents (${recentIncidents?.length || 0})
${recentIncidents?.length ? recentIncidents.map((i: any) => `- ${i.report_number}: ${i.incident_type} — ${i.severity} — ${i.status}`).join("\n") : "None"}

### Pending Quotes (${pendingQuotes?.length || 0})
${pendingQuotes?.length ? pendingQuotes.map((q: any) => `- ${q.quote_number}: $${Number(q.total).toLocaleString()} — ${q.approval_status}`).join("\n") : "None"}

### Upcoming Visits (next 7 days: ${upcomingVisits?.length || 0})
${upcomingVisits?.length ? upcomingVisits.map((v: any) => `- ${v.visit_number}: ${v.service_date} — ${v.service_type || "Service"} — ${v.status}`).join("\n") : "None"}
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create service-role client to query data
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch live operational context
    const context = await getOperationalContext(supabase);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\n\n" + context },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-copilot error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
