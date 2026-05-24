import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, corsHeaders } from "../_shared/auth.ts";

function escapeIcal(text: string): string {
  return (text || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function formatDate(d: string): string {
  const dt = new Date(d);
  return dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Health check (public, no data exposed)
    if (action === 'health') {
      return new Response(JSON.stringify({ ok: true, message: 'Calendar feed ready' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Require authentication for all data access
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const supabase = auth.adminClient;

    // Determine caller's role context
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', auth.userId);
    const roles = (roleRows ?? []).map((r: any) => r.role as string);
    const opsRoles = ['owner', 'admin', 'ops_manager', 'accountant', 'hr_admin', 'manager', 'dispatcher', 'supervisor'];
    const isOps = roles.some((r) => opsRoles.includes(r));
    const isWorker = roles.some((r) => ['staff', 'lead_worker', 'supervisor', 'dispatcher'].includes(r));

    if (!isOps && !isWorker) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const scope = url.searchParams.get('scope') || 'visits';
    const days = parseInt(url.searchParams.get('days') || '90');
    const requestedWorkerId = url.searchParams.get('worker_id');

    // Non-ops users can only see their own assignments; ignore worker_id override
    const effectiveWorkerId = isOps ? requestedWorkerId : auth.userId;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + days);

    const events: string[] = [];

    if (scope === 'visits' || scope === 'all') {
      let q = supabase.from('visits').select(`
        id, visit_number, service_date, start_time, end_time, status, notes,
        assigned_worker_id, job_id,
        jobs(job_title, job_number, assigned_to),
        properties(address_line_1, city)
      `)
        .gte('service_date', fromDate.toISOString().split('T')[0])
        .lte('service_date', toDate.toISOString().split('T')[0])
        .order('service_date', { ascending: true });

      if (effectiveWorkerId) q = q.eq('assigned_worker_id', effectiveWorkerId);

      const { data: visits } = await q;

      let filtered = (visits || []) as any[];
      if (!isOps) {
        // Restrict to visits actually assigned to this worker (direct, via job, or crew)
        const ids = filtered.map((v) => v.id);
        const { data: crew } = ids.length
          ? await supabase.from('visit_crew_members').select('visit_id').eq('worker_user_id', auth.userId).in('visit_id', ids)
          : { data: [] as any[] };
        const crewSet = new Set((crew || []).map((c: any) => c.visit_id));
        filtered = filtered.filter((v) =>
          v.assigned_worker_id === auth.userId ||
          v.jobs?.assigned_to === auth.userId ||
          crewSet.has(v.id)
        );
      }

      for (const v of filtered) {
        const start = v.start_time
          ? `${v.service_date}T${v.start_time}`
          : `${v.service_date}T08:00:00`;
        const end = v.end_time
          ? `${v.service_date}T${v.end_time}`
          : `${v.service_date}T09:00:00`;

        const jobTitle = v.jobs?.job_title || 'Visit';
        const location = [v.properties?.address_line_1, v.properties?.city].filter(Boolean).join(', ');

        events.push([
          'BEGIN:VEVENT',
          `UID:${v.id}@praetoriagroup.ca`,
          `DTSTART:${formatDate(start)}`,
          `DTEND:${formatDate(end)}`,
          `SUMMARY:${escapeIcal(`${v.visit_number || ''} — ${jobTitle}`)}`,
          location ? `LOCATION:${escapeIcal(location)}` : '',
          `STATUS:${v.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'}`,
          v.notes ? `DESCRIPTION:${escapeIcal(v.notes)}` : '',
          'END:VEVENT',
        ].filter(Boolean).join('\r\n'));
      }
    }

    if ((scope === 'jobs' || scope === 'all') && isOps) {
      const { data: jobs } = await supabase.from('jobs').select(`
        id, job_number, job_title, status, start_date, end_date, notes,
        properties(address_line_1, city)
      `)
        .gte('start_date', fromDate.toISOString().split('T')[0])
        .lte('start_date', toDate.toISOString().split('T')[0])
        .order('start_date', { ascending: true });

      for (const j of (jobs || []) as any[]) {
        const start = `${j.start_date}T08:00:00`;
        const end = j.end_date ? `${j.end_date}T17:00:00` : `${j.start_date}T17:00:00`;
        const location = [j.properties?.address_line_1, j.properties?.city].filter(Boolean).join(', ');

        events.push([
          'BEGIN:VEVENT',
          `UID:job-${j.id}@praetoriagroup.ca`,
          `DTSTART:${formatDate(start)}`,
          `DTEND:${formatDate(end)}`,
          `SUMMARY:${escapeIcal(`${j.job_number || ''} — ${j.job_title || 'Job'}`)}`,
          location ? `LOCATION:${escapeIcal(location)}` : '',
          `STATUS:${j.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'}`,
          j.notes ? `DESCRIPTION:${escapeIcal(j.notes)}` : '',
          'END:VEVENT',
        ].filter(Boolean).join('\r\n'));
      }
    }

    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Praetoria Group//Operations Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Praetoria Operations',
      'X-WR-TIMEZONE:America/Regina',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    return new Response(ical, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="praetoria-schedule.ics"',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
