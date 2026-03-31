import { Link } from 'react-router-dom';
import { useEmployees } from '@/hooks/useEmployees';
import { useComplianceSummary } from '@/hooks/useTraining';
import { useAllTimeOffRequests, useAllEmergencyContacts, useAllIncidentReports, useAllCertifications } from '@/hooks/useHRData';
import { useWCBClaims, useSGIDriverRecords, useBenefitEnrollments } from '@/hooks/useHRModules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users, BookOpen, ShieldCheck, AlertTriangle, Clock, Award,
  CalendarDays, HardHat, ChevronRight, FileText, UserCheck,
  Phone, ShieldAlert, UserX, UserPlus, Heart, Shield, ClipboardList,
  DollarSign, StickyNote, Car, MapPin,
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';

function StatCard({ icon: Icon, label, value, color, to, alert }: {
  icon: any; label: string; value: number | string; color: string; to?: string; alert?: boolean;
}) {
  const content = (
    <Card className={`hover:shadow-md transition-shadow ${alert ? 'border-destructive/30' : ''}`}>
      <CardContent className="p-3 flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
          <p className="text-[10px] leading-tight text-muted-foreground truncate">{label}</p>
        </div>
        {to && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function HRDashboardPage() {
  const { data: employees = [] } = useEmployees();
  const { data: compliance } = useComplianceSummary();
  const { data: timeOffRequests = [] } = useAllTimeOffRequests();
  const { data: emergencyContacts = [] } = useAllEmergencyContacts();
  const { data: incidents = [] } = useAllIncidentReports();
  const { data: certs = [] } = useAllCertifications();
  const { data: wcbClaims = [] } = useWCBClaims();
  const { data: sgiRecords = [] } = useSGIDriverRecords();
  const { data: enrollments = [] } = useBenefitEnrollments();

  const active = employees.filter(e => e.employment_status === 'active');
  const onLeave = employees.filter(e => e.employment_status === 'on-leave');
  const onboarding = employees.filter(e => e.employment_status === 'onboarding' || (e.employment_status === 'active' && e.hire_date && differenceInDays(new Date(), new Date(e.hire_date)) <= 30));
  const terminated = employees.filter(e => e.employment_status === 'terminated' || e.employment_status === 'inactive');

  // Emergency contact coverage
  const employeeUserIds = new Set(active.map(e => e.user_id));
  const contactedUserIds = new Set(emergencyContacts.map(c => c.user_id));
  const missingEmergencyContacts = active.filter(e => !contactedUserIds.has(e.user_id));

  // Time-off
  const pendingTimeOff = timeOffRequests.filter(t => t.status === 'pending');

  // Incidents needing follow-up
  const openIncidents = incidents.filter((i: any) => i.follow_up_status !== 'resolved' && i.follow_up_status !== 'closed');

  // Expiring certs (within 30 days)
  const today = new Date();
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const expiringCerts = certs.filter((c: any) => {
    if (!c.expiry_date) return false;
    const exp = new Date(c.expiry_date);
    return exp <= in30 && exp >= today;
  });
  const expiredCerts = certs.filter((c: any) => {
    if (!c.expiry_date) return false;
    return new Date(c.expiry_date) < today && c.status !== 'revoked';
  });

  const overallRate = compliance
    ? compliance.mandatoryTotal > 0
      ? Math.round((compliance.mandatoryCompleted / compliance.mandatoryTotal) * 100)
      : 100
    : 0;

  const quickLinks = [
    { icon: Users, label: 'Employee Directory', to: '/employees', desc: 'View all worker profiles' },
    { icon: Shield, label: 'Benefits & Insurance', to: '/hr/benefits', desc: 'SGI, Blue Cross, Sun Life, WCB' },
    { icon: ClipboardList, label: 'Onboarding / Offboarding', to: '/hr/checklists', desc: 'Lifecycle checklists & progress' },
    { icon: StickyNote, label: 'HR Notes & Case Log', to: '/hr/case-notes', desc: 'Private per-employee notes' },
    { icon: DollarSign, label: 'Compensation & Reviews', to: '/hr/compensation', desc: 'Pay rates, raises & review schedule' },
    { icon: BookOpen, label: 'Training Catalog', to: '/hr/training', desc: 'Manage courses & assignments' },
    { icon: ShieldCheck, label: 'Compliance Overview', to: '/hr/compliance', desc: 'Certifications & mandatory training' },
    { icon: Phone, label: 'Contact Hub', to: '/hr/contacts', desc: 'Emergency contacts & escalation' },
    { icon: CalendarDays, label: 'Time Off Requests', to: '/hr/time-off', desc: 'Review pending leave requests' },
    { icon: HardHat, label: 'PPE & Equipment', to: '/hr/equipment', desc: 'Equipment issuance & tracking' },
    { icon: FileText, label: 'Worker Documents', to: '/hr/documents', desc: 'Certificates, policies & uploads' },
    { icon: ShieldAlert, label: 'Incident Follow-up', to: '/incidents', desc: 'Open incidents needing HR action' },
  ];

  // Onboarding detail (recent hires within 30 days)
  const recentHires = employees.filter(e =>
    e.hire_date && differenceInDays(new Date(), new Date(e.hire_date)) <= 30 && e.employment_status === 'active'
  );
  // Offboarding (terminated in last 30 days)
  const recentTerminations = employees.filter(e =>
    (e.employment_status === 'terminated' || e.employment_status === 'inactive') &&
    e.updated_at && differenceInDays(new Date(), new Date(e.updated_at)) <= 30
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">HR Workspace</h1>
        <p className="text-sm text-muted-foreground">People management, training, compliance & safety coordination</p>
      </div>

      {/* Key metrics - Row 1: People */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Active Employees" value={active.length} color="bg-primary/10 text-primary" to="/employees" />
        <StatCard icon={UserCheck} label="On Leave" value={onLeave.length} color="bg-amber-500/10 text-amber-600" />
        <StatCard icon={UserPlus} label="New Hires (30d)" value={onboarding.length} color="bg-blue-500/10 text-blue-600" />
        <StatCard icon={CalendarDays} label="Pending Leave" value={pendingTimeOff.length} color="bg-purple-500/10 text-purple-600" to="/hr/time-off" alert={pendingTimeOff.length > 0} />
        <StatCard icon={ShieldAlert} label="Open Incidents" value={openIncidents.length} color="bg-destructive/10 text-destructive" to="/incidents" alert={openIncidents.length > 0} />
        <StatCard icon={Heart} label="No Emerg. Contact" value={missingEmergencyContacts.length} color="bg-destructive/10 text-destructive" to="/hr/contacts" alert={missingEmergencyContacts.length > 0} />
      </div>

      {/* Row 2: Training & Compliance */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="Training Assigned" value={compliance?.totalAssignments ?? 0} color="bg-blue-500/10 text-blue-600" to="/hr/training" />
        <StatCard icon={Award} label="Completed" value={compliance?.completed ?? 0} color="bg-emerald-500/10 text-emerald-600" />
        <StatCard icon={AlertTriangle} label="Overdue Training" value={compliance?.overdue ?? 0} color="bg-destructive/10 text-destructive" to="/hr/compliance" alert={(compliance?.overdue ?? 0) > 0} />
        <StatCard icon={Clock} label="Failed / Retakes" value={compliance?.failed ?? 0} color="bg-amber-500/10 text-amber-600" alert={(compliance?.failed ?? 0) > 0} />
      </div>

      {/* Onboarding / Offboarding mini-sections */}
      {(recentHires.length > 0 || recentTerminations.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentHires.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-blue-600" /> Onboarding ({recentHires.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {recentHires.map(emp => (
                  <Link key={emp.user_id} to={`/employees/${emp.user_id}`} className="flex items-center gap-2 px-1 py-1 hover:bg-muted/50 rounded text-sm">
                    <span className="font-medium text-foreground">{emp.full_name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{emp.hire_date ? `Hired ${format(new Date(emp.hire_date), 'MMM d')}` : ''}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
          {recentTerminations.length > 0 && (
            <Card className="border-muted">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserX className="h-4 w-4 text-muted-foreground" /> Recent Offboarding ({recentTerminations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {recentTerminations.map(emp => (
                  <Link key={emp.user_id} to={`/employees/${emp.user_id}`} className="flex items-center gap-2 px-1 py-1 hover:bg-muted/50 rounded text-sm">
                    <span className="font-medium text-muted-foreground">{emp.full_name}</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto capitalize">{emp.employment_status}</Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Alerts section */}
      {(compliance && (compliance.overdue > 0 || compliance.expiringSoon > 0 || compliance.failed > 0)) || expiringCerts.length > 0 || expiredCerts.length > 0 || missingEmergencyContacts.length > 0 ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Action Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(compliance?.overdue ?? 0) > 0 && (
              <Link to="/hr/compliance" className="flex items-center gap-2 hover:bg-muted/50 rounded px-1 py-0.5">
                <Badge variant="destructive" className="text-xs">{compliance!.overdue}</Badge>
                <span className="text-sm text-foreground">Overdue training assignments</span>
                <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />
              </Link>
            )}
            {expiredCerts.length > 0 && (
              <Link to="/hr/compliance" className="flex items-center gap-2 hover:bg-muted/50 rounded px-1 py-0.5">
                <Badge variant="destructive" className="text-xs">{expiredCerts.length}</Badge>
                <span className="text-sm text-foreground">Expired certifications</span>
                <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />
              </Link>
            )}
            {expiringCerts.length > 0 && (
              <Link to="/hr/compliance" className="flex items-center gap-2 hover:bg-muted/50 rounded px-1 py-0.5">
                <Badge className="text-xs bg-amber-500 hover:bg-amber-600">{expiringCerts.length}</Badge>
                <span className="text-sm text-foreground">Certifications expiring within 30 days</span>
                <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />
              </Link>
            )}
            {(compliance?.failed ?? 0) > 0 && (
              <div className="flex items-center gap-2 px-1">
                <Badge variant="secondary" className="text-xs">{compliance!.failed}</Badge>
                <span className="text-sm text-foreground">Failed assessments requiring retake</span>
              </div>
            )}
            {pendingTimeOff.length > 0 && (
              <Link to="/hr/time-off" className="flex items-center gap-2 hover:bg-muted/50 rounded px-1 py-0.5">
                <Badge className="text-xs bg-purple-500 hover:bg-purple-600">{pendingTimeOff.length}</Badge>
                <span className="text-sm text-foreground">Pending time-off requests</span>
                <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />
              </Link>
            )}
            {missingEmergencyContacts.length > 0 && (
              <Link to="/hr/contacts" className="flex items-center gap-2 hover:bg-muted/50 rounded px-1 py-0.5">
                <Badge variant="destructive" className="text-xs">{missingEmergencyContacts.length}</Badge>
                <span className="text-sm text-foreground">Employees without emergency contacts</span>
                <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />
              </Link>
            )}
            {openIncidents.length > 0 && (
              <Link to="/incidents" className="flex items-center gap-2 hover:bg-muted/50 rounded px-1 py-0.5">
                <Badge variant="destructive" className="text-xs">{openIncidents.length}</Badge>
                <span className="text-sm text-foreground">Open incidents needing follow-up</span>
                <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />
              </Link>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Compliance progress */}
      {compliance && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Mandatory Training Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={overallRate} className="flex-1" />
              <span className="text-sm font-bold text-foreground">{overallRate}%</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{compliance.notStarted}</p>
                <p className="text-[10px] text-muted-foreground">Not Started</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{compliance.inProgress}</p>
                <p className="text-[10px] text-muted-foreground">In Progress</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-600">{compliance.mandatoryCompleted}</p>
                <p className="text-[10px] text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
