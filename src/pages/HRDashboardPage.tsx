import { Link } from 'react-router-dom';
import { useEmployees } from '@/hooks/useEmployees';
import { useComplianceSummary } from '@/hooks/useTraining';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, BookOpen, ShieldCheck, AlertTriangle, Clock, Award,
  CalendarDays, HardHat, ChevronRight, FileText, UserCheck,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, to }: {
  icon: any; label: string; value: number | string; color: string; to?: string;
}) {
  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        {to && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function HRDashboardPage() {
  const { data: employees = [] } = useEmployees();
  const { data: compliance } = useComplianceSummary();

  const active = employees.filter(e => e.employment_status === 'active').length;
  const onLeave = employees.filter(e => e.employment_status === 'on-leave').length;

  const quickLinks = [
    { icon: Users, label: 'Employee Directory', to: '/employees', desc: 'View all worker profiles' },
    { icon: BookOpen, label: 'Training Catalog', to: '/hr/training', desc: 'Manage courses & assignments' },
    { icon: ShieldCheck, label: 'Compliance Overview', to: '/hr/compliance', desc: 'Certifications & mandatory training' },
    { icon: CalendarDays, label: 'Time Off Requests', to: '/employees', desc: 'Review pending leave requests' },
    { icon: HardHat, label: 'PPE Management', to: '/employees', desc: 'Equipment issuance & tracking' },
    { icon: FileText, label: 'Worker Documents', to: '/employees', desc: 'Certificates, policies & uploads' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">HR Workspace</h1>
        <p className="text-sm text-muted-foreground">People management, training & compliance overview</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Active Employees" value={active} color="bg-primary/10 text-primary" to="/employees" />
        <StatCard icon={UserCheck} label="On Leave" value={onLeave} color="bg-amber-500/10 text-amber-600" />
        <StatCard icon={BookOpen} label="Training Assignments" value={compliance?.totalAssignments ?? 0} color="bg-blue-500/10 text-blue-600" to="/hr/training" />
        <StatCard icon={Award} label="Completed" value={compliance?.completed ?? 0} color="bg-emerald-500/10 text-emerald-600" />
      </div>

      {/* Compliance alerts */}
      {compliance && (compliance.overdue > 0 || compliance.expiringSoon > 0 || compliance.failed > 0) && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Compliance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {compliance.overdue > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">{compliance.overdue}</Badge>
                <span className="text-sm text-foreground">Overdue training assignments</span>
              </div>
            )}
            {compliance.expiringSoon > 0 && (
              <div className="flex items-center gap-2">
                <Badge className="text-xs bg-amber-500 hover:bg-amber-600">{compliance.expiringSoon}</Badge>
                <span className="text-sm text-foreground">Certifications expiring within 30 days</span>
              </div>
            )}
            {compliance.failed > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{compliance.failed}</Badge>
                <span className="text-sm text-foreground">Failed assessments requiring retake</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Compliance progress */}
      {compliance && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Mandatory Training</span>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold text-foreground">
                {compliance.mandatoryCompleted} / {compliance.mandatoryTotal}
              </p>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                <div
                  className="bg-primary rounded-full h-1.5 transition-all"
                  style={{ width: `${compliance.mandatoryTotal ? (compliance.mandatoryCompleted / compliance.mandatoryTotal) * 100 : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Not Started</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold text-foreground">{compliance.notStarted}</p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting worker action</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">In Progress</span>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold text-foreground">{compliance.inProgress}</p>
              <p className="text-xs text-muted-foreground mt-1">Currently being completed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick links */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quick Access</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {quickLinks.map(link => (
              <Link key={link.to + link.label} to={link.to} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                <link.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{link.label}</p>
                  <p className="text-xs text-muted-foreground">{link.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
