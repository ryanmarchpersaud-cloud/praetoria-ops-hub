import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { DoorOpen, Users, CalendarClock, FileText, ListChecks, LogIn, Plus } from 'lucide-react';
import { useVacantUnits, useShowings, useApplications, useStaffTasks, useMoveInChecklists } from '@/hooks/pm-staff/usePMStaffData';
import { formatStatusLabel } from '@/lib/statusLabel';
import { format } from 'date-fns';

export default function PMStaffHome() {
  const vacancies = useVacantUnits();
  const showings = useShowings();
  const apps = useApplications();
  const tasks = useStaffTasks(true);
  const moveIns = useMoveInChecklists();

  const upcomingShowings = (showings.data ?? []).filter(s => new Date(s.scheduled_at) >= new Date() && s.status === 'scheduled').slice(0, 5);
  const pendingApps = (apps.data ?? []).filter(a => ['submitted', 'under_review', 'started'].includes(a.status)).slice(0, 5);
  const openMoveIns = (moveIns.data ?? []).filter(m => m.status !== 'completed' && m.status !== 'cancelled').slice(0, 5);
  const myTasks = (tasks.data ?? []).filter(t => t.status !== 'completed' && t.status !== 'cancelled').slice(0, 5);

  return (
    <div className="p-4 space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={DoorOpen} label="Vacant units" value={vacancies.data?.length ?? 0} to="/pm-staff/vacancies" />
        <KpiCard icon={CalendarClock} label="Upcoming showings" value={upcomingShowings.length} to="/pm-staff/showings" />
        <KpiCard icon={FileText} label="Pending applications" value={pendingApps.length} to="/pm-staff/applications" />
        <KpiCard icon={LogIn} label="Move-ins in progress" value={openMoveIns.length} to="/pm-staff/move-ins" />
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Quick actions</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button asChild size="sm" variant="outline"><Link to="/pm-staff/prospects?new=1"><Plus className="h-4 w-4 mr-1" />Prospect</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/pm-staff/showings?new=1"><Plus className="h-4 w-4 mr-1" />Showing</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/pm-staff/applications?new=1"><Plus className="h-4 w-4 mr-1" />Application</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/pm-staff/move-ins?new=1"><Plus className="h-4 w-4 mr-1" />Move-in</Link></Button>
        </CardContent>
      </Card>

      {/* Upcoming showings */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">Upcoming showings</CardTitle>
          <Link to="/pm-staff/showings" className="text-xs text-indigo-700 font-medium">View all</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingShowings.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
          {upcomingShowings.map(s => (
            <div key={s.id} className="text-sm flex justify-between border-b border-border/60 py-1">
              <span className="font-medium truncate">{s.prospect?.name ?? 'Prospect'}</span>
              <span className="text-muted-foreground">{format(new Date(s.scheduled_at), 'MMM d, h:mm a')}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* My tasks */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">My open tasks</CardTitle>
          <Link to="/pm-staff/tasks" className="text-xs text-indigo-700 font-medium">View all</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {myTasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks assigned to you.</p>}
          {myTasks.map(t => (
            <div key={t.id} className="text-sm flex justify-between border-b border-border/60 py-1">
              <span className="truncate flex-1">{t.title}</span>
              <span className="text-xs text-muted-foreground ml-2">{formatStatusLabel(t.priority ?? 'normal')}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pending applications */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">Pending applications</CardTitle>
          <Link to="/pm-staff/applications" className="text-xs text-indigo-700 font-medium">View all</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingApps.length === 0 && <p className="text-sm text-muted-foreground">No pending applications.</p>}
          {pendingApps.map(a => (
            <div key={a.id} className="text-sm flex justify-between border-b border-border/60 py-1">
              <span className="truncate">{a.prospect?.name ?? 'Applicant'}</span>
              <span className="text-xs text-muted-foreground">{formatStatusLabel(a.status)}</span>
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
