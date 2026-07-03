import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import {
  DoorOpen, CalendarClock, FileText, LogIn, Home as HomeIcon,
  ListChecks, AlertCircle, KeyRound, LogOut as LogOutIcon,
} from 'lucide-react';
import {
  useVacantUnits, useShowings, useApplications, useStaffTasks,
  useMoveInChecklists, useProspects,
} from '@/hooks/pm-staff/usePMStaffData';
import { formatStatusLabel } from '@/lib/statusLabel';
import { format, isAfter, addDays } from 'date-fns';
import { PMStaffClockInCard } from '@/components/pm-staff/PMStaffClockInCard';
import { RenewalsDueSoonCard } from '@/components/pm-staff/RenewalsDueSoonCard';

export default function PMStaffHome() {
  const vacancies = useVacantUnits();
  const showings = useShowings();
  const apps = useApplications();
  const tasks = useStaffTasks(true);
  const moveIns = useMoveInChecklists();
  const prospects = useProspects();

  const now = new Date();
  const soonCutoff = addDays(now, 30);

  const vacantUnits = vacancies.data ?? [];
  const availableSoon = vacantUnits.filter((u: any) => u.available_date && isAfter(new Date(u.available_date), now) && !isAfter(new Date(u.available_date), soonCutoff)).length;

  const upcomingShowings = (showings.data ?? []).filter(s => new Date(s.scheduled_at) >= now && s.status === 'scheduled').slice(0, 5);
  const pendingApps = (apps.data ?? []).filter(a => ['submitted', 'under_review', 'started'].includes(a.status));
  const openMoveIns = (moveIns.data ?? []).filter(m => m.status !== 'completed' && m.status !== 'cancelled');
  const myTasks = (tasks.data ?? []).filter(t => t.status !== 'completed' && t.status !== 'cancelled').slice(0, 5);

  // Pipeline counts
  const pList = prospects.data ?? [];
  const pipeline = [
    { label: 'New leads', count: pList.filter((p: any) => p.status === 'new').length },
    { label: 'Contacted', count: pList.filter((p: any) => p.status === 'contacted').length },
    { label: 'Showing scheduled', count: upcomingShowings.length },
    { label: 'Applied', count: pendingApps.length },
    { label: 'Approved', count: (apps.data ?? []).filter((a: any) => a.status === 'approved').length },
    { label: 'Move-in scheduled', count: openMoveIns.length },
  ];

  // Priority follow-ups (heuristic)
  const followUps: { label: string; count: number; to: string }[] = [
    { label: 'Prospects not contacted', count: pList.filter((p: any) => p.status === 'new').length, to: '/pm-staff/prospects' },
    { label: 'Applications waiting for review', count: (apps.data ?? []).filter((a: any) => a.status === 'submitted').length, to: '/pm-staff/applications' },
    { label: 'Move-in checklists incomplete', count: openMoveIns.length, to: '/pm-staff/move-ins' },
    { label: 'Tasks overdue', count: (tasks.data ?? []).filter((t: any) => t.due_date && new Date(t.due_date) < now && t.status !== 'completed').length, to: '/pm-staff/tasks' },
  ].filter(f => f.count > 0);

  return (
    <div className="p-4 space-y-4">
      {/* Clock In / Out */}
      <PMStaffClockInCard />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={DoorOpen} label="Vacant units" value={vacantUnits.length} to="/pm-staff/vacancies" />
        <KpiCard icon={HomeIcon} label="Available soon" value={availableSoon} to="/pm-staff/vacancies" />
        <KpiCard icon={CalendarClock} label="Upcoming showings" value={upcomingShowings.length} to="/pm-staff/showings" />
        <KpiCard icon={FileText} label="Pending applications" value={pendingApps.length} to="/pm-staff/applications" />
        <KpiCard icon={LogIn} label="Move-ins in progress" value={openMoveIns.length} to="/pm-staff/move-ins" />
        <KpiCard icon={ListChecks} label="Open tasks" value={myTasks.length} to="/pm-staff/tasks" />
      </div>

      {/* Renewals due soon */}
      <RenewalsDueSoonCard />


      {/* Upcoming showings */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">Upcoming showings / open houses</CardTitle>
          <Link to="/pm-staff/showings" className="text-xs text-emerald-700 font-medium">View all</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingShowings.length === 0 && <p className="text-sm text-muted-foreground">No showings scheduled.</p>}
          {upcomingShowings.map((s: any) => (
            <div key={s.id} className="text-sm border-b border-border/60 py-1.5 last:border-0">
              <div className="flex justify-between items-start gap-2">
                <span className="font-medium truncate">{s.prospect?.name ?? 'Prospect'}</span>
                <span className="text-xs text-muted-foreground shrink-0">{format(new Date(s.scheduled_at), 'MMM d, h:mm a')}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-muted-foreground mt-0.5">
                <span className="truncate">{s.location ?? s.unit_label ?? '—'}</span>
                <span className="ml-2 shrink-0">{formatStatusLabel(s.status ?? 'scheduled')}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Leasing pipeline */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Leasing pipeline</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          {pipeline.map(p => (
            <div key={p.label} className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-2 text-center">
              <p className="text-lg font-bold leading-none text-emerald-800">{p.count}</p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{p.label}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Priority follow-ups */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-600" />Priority follow-ups</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {followUps.length === 0 && <p className="text-sm text-muted-foreground">You're all caught up.</p>}
          {followUps.map(f => (
            <Link key={f.label} to={f.to} className="flex justify-between items-center text-sm border-b border-border/60 py-1.5 last:border-0">
              <span className="truncate">{f.label}</span>
              <span className="ml-2 shrink-0 text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{f.count}</span>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Vacant units */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">Vacant / available units</CardTitle>
          <Link to="/pm-staff/vacancies" className="text-xs text-emerald-700 font-medium">View all</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {vacantUnits.length === 0 && <p className="text-sm text-muted-foreground">No vacant units.</p>}
          {vacantUnits.slice(0, 5).map((u: any) => (
            <div key={u.id} className="text-sm border-b border-border/60 py-1.5 last:border-0">
              <div className="flex justify-between items-start gap-2">
                <span className="font-medium truncate">{u.property?.property_name ?? 'Property'} · Unit {u.unit_label ?? u.unit_number ?? '—'}</span>
                {u.rent_amount ? <span className="text-xs font-semibold shrink-0">${Number(u.rent_amount).toLocaleString()}</span> : null}
              </div>
              <div className="flex justify-between items-center text-[11px] text-muted-foreground mt-0.5">
                <span>{u.available_date ? `Avail ${format(new Date(u.available_date), 'MMM d')}` : 'Available now'}</span>
                <span className="ml-2 shrink-0">{formatStatusLabel(u.status ?? 'vacant')}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Move-ins / Move-outs */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><KeyRound className="h-4 w-4 text-emerald-700" />Move-ins & move-outs</CardTitle>
          <Link to="/pm-staff/move-ins" className="text-xs text-emerald-700 font-medium">View all</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {openMoveIns.length === 0 && <p className="text-sm text-muted-foreground">No move-ins in progress.</p>}
          {openMoveIns.slice(0, 4).map((m: any) => (
            <div key={m.id} className="text-sm flex justify-between border-b border-border/60 py-1.5 last:border-0">
              <span className="truncate">{m.property?.property_name ?? 'Property'} · {m.tenant_name ?? 'Tenant'}</span>
              <span className="text-xs text-muted-foreground ml-2 shrink-0">{formatStatusLabel(m.status ?? 'in_progress')}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
            <LogOutIcon className="h-3.5 w-3.5" />
            Move-outs coming in a later phase.
          </div>
        </CardContent>
      </Card>

      {/* My open tasks */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">My open tasks</CardTitle>
          <Link to="/pm-staff/tasks" className="text-xs text-emerald-700 font-medium">View all</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {myTasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks assigned to you.</p>}
          {myTasks.map((t: any) => (
            <div key={t.id} className="text-sm border-b border-border/60 py-1.5 last:border-0">
              <div className="flex justify-between items-start gap-2">
                <span className="truncate flex-1">{t.title}</span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">{formatStatusLabel(t.priority ?? 'normal')}</span>
              </div>
              {t.due_date && (
                <p className="text-[11px] text-muted-foreground mt-0.5">Due {format(new Date(t.due_date), 'MMM d')}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, to }: { icon: any; label: string; value: number; to: string }) {
  return (
    <Link to={to} className="block">
      <Card className="hover:shadow-md transition-shadow border-emerald-100">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Icon className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none">{value}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide truncate">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
