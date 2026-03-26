import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { Calendar, Users, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  visits: any[];
  employees: any[];
  isLoadingVisits: boolean;
  isLoadingEmployees: boolean;
}

export function TodayAppointments({ visits, employees, isLoadingVisits, isLoadingEmployees }: Props) {
  const [tab, setTab] = useState<'visits' | 'employees'>('visits');

  const completed = visits.filter(v => v.visit_status === 'Completed');
  const active = visits.filter(v => v.visit_status === 'In Progress' || v.visit_status === 'En Route');
  const overdue = visits.filter(v => v.visit_status === 'Missed');
  const remaining = visits.filter(v => ['Planned', 'Scheduled'].includes(v.visit_status));

  const activeEmployees = employees.filter(e => e.status === 'active');

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </span>
            Today's Appointments
          </CardTitle>
          <Button variant="outline" size="sm" asChild className="text-xs h-7">
            <Link to="/schedule">View Schedule <ChevronRight className="w-3 h-3 ml-1" /></Link>
          </Button>
        </div>

        {/* Quick metrics */}
        <div className="flex gap-3 mt-3 flex-wrap">
          {[
            { label: 'Total', value: visits.length },
            { label: 'Active', value: active.length },
            { label: 'Completed', value: completed.length },
            { label: 'Remaining', value: remaining.length },
            { label: 'Overdue', value: overdue.length },
          ].map(m => (
            <div key={m.label} className="text-center">
              <p className="text-lg font-bold leading-none">{isLoadingVisits ? '–' : m.value}</p>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1 mt-3 bg-muted rounded-lg p-0.5 w-fit">
          <button
            onClick={() => setTab('visits')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              tab === 'visits' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Visits
          </button>
          <button
            onClick={() => setTab('employees')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              tab === 'employees' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Employees
          </button>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 max-h-[400px] overflow-auto">
        {tab === 'visits' ? (
          isLoadingVisits ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : visits.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No visits scheduled today</p>
          ) : (
            <VisitGroups groups={[
              { label: 'Active', items: active },
              { label: 'Overdue', items: overdue },
              { label: 'Remaining', items: remaining },
              { label: 'Completed', items: completed },
            ]} />
          )
        ) : (
          isLoadingEmployees ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : employees.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No employees found</p>
          ) : (
            <div className="divide-y divide-border/50">
              {activeEmployees.map(emp => (
                <Link key={emp.user_id} to={`/employees/${emp.user_id}`} className="flex items-center justify-between py-2 hover:bg-muted/30 rounded px-1 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{emp.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{emp.job_title || 'Team Member'}</p>
                  </div>
                  <StatusBadge status={emp.status || 'active'} showIcon={false} />
                </Link>
              ))}
              {activeEmployees.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No active employees</p>
              )}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}

function VisitGroups({ groups }: { groups: { label: string; items: any[] }[] }) {
  return (
    <div className="space-y-3">
      {groups.filter(g => g.items.length > 0).map(g => (
        <div key={g.label}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{g.label} ({g.items.length})</p>
          <div className="divide-y divide-border/50">
            {g.items.map(v => (
              <Link key={v.id} to={`/visits/${v.id}`} className="flex items-center justify-between py-2 hover:bg-muted/30 rounded px-1 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">
                    {v.customers?.first_name} {v.customers?.last_name}
                    {v.properties?.property_name && <span className="text-muted-foreground"> · {v.properties.property_name}</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {v.jobs?.job_title || v.visit_number}
                    {v.start_time && <span> · {v.start_time}</span>}
                  </p>
                </div>
                <StatusBadge status={v.visit_status} showIcon={false} />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
