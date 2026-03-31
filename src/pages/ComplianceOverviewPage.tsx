import { useComplianceSummary, useAllAssignments, useTrainingCourses } from '@/hooks/useTraining';
import { useEmployees } from '@/hooks/useEmployees';
import { useAllSubcontractors } from '@/hooks/useSubcontractor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShieldCheck, AlertTriangle, Clock, Award, RefreshCw, Users,
  CheckCircle2, XCircle, Calendar, HardHat,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';

function MetricCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: number | string; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return <span className="text-xs text-muted-foreground">No expiry</span>;
  const days = differenceInDays(new Date(date), new Date());
  if (days < 0) return <Badge variant="destructive" className="text-[10px]">Expired {Math.abs(days)}d ago</Badge>;
  if (days <= 30) return <Badge className="text-[10px] bg-amber-500 hover:bg-amber-600">{days}d left</Badge>;
  return <span className="text-xs text-muted-foreground">{format(new Date(date), 'MMM d, yyyy')}</span>;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'passed': return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
    case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function ComplianceOverviewPage() {
  const { data: compliance } = useComplianceSummary();
  const { data: allAssignments = [] } = useAllAssignments();
  const { data: courses = [] } = useTrainingCourses();
  const { data: employees = [] } = useEmployees();
  const { data: subcontractors = [] } = useAllSubcontractors();

  const today = new Date().toISOString().split('T')[0];

  // Build user lookup (employees + subcontractors)
  const getUserName = (userId: string) => {
    const emp = employees.find(e => e.user_id === userId);
    if (emp) return emp.full_name;
    const sub = subcontractors.find((s: any) => s.user_id === userId);
    if (sub) return (sub as any).contact_name || (sub as any).company_name || 'Subcontractor';
    return 'Unknown';
  };
  const getUserType = (userId: string): 'employee' | 'subcontractor' | 'unknown' => {
    if (employees.find(e => e.user_id === userId)) return 'employee';
    if (subcontractors.find((s: any) => s.user_id === userId)) return 'subcontractor';
    return 'unknown';
  };
  const getUserLink = (userId: string) => {
    const type = getUserType(userId);
    if (type === 'employee') return `/employees/${userId}`;
    if (type === 'subcontractor') {
      const sub = subcontractors.find((s: any) => s.user_id === userId);
      return sub ? `/subcontractors/${(sub as any).id}` : '#';
    }
    return '#';
  };

  // Filter views
  const mandatoryAssignments = allAssignments.filter((a: any) => a.training_courses?.is_mandatory);
  const overdueAssignments = allAssignments.filter((a: any) => a.due_date && a.due_date < today && a.status !== 'passed');
  const expiringAssignments = allAssignments.filter((a: any) => {
    if (!a.expiry_date) return false;
    const exp = new Date(a.expiry_date);
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    return exp <= in30 && exp >= new Date();
  });
  const expiredAssignments = allAssignments.filter((a: any) => {
    if (!a.expiry_date) return false;
    return new Date(a.expiry_date) < new Date();
  });

  const mandatoryCourses = courses.filter((c: any) => c.is_mandatory);

  // Per-person compliance (employees + subcontractors)
  const allPeople = [
    ...employees.filter(e => e.employment_status === 'active').map(e => ({ userId: e.user_id, name: e.full_name, role: e.role_title || '—', type: 'Employee' as const })),
    ...subcontractors.filter((s: any) => (s as any).status === 'active' || !(s as any).status).map((s: any) => ({ userId: s.user_id, name: s.contact_name || s.company_name || 'Subcontractor', role: s.company_name || '—', type: 'Subcontractor' as const })),
  ];

  const personCompliance = allPeople
    .filter(p => p.userId)
    .map(person => {
      const personAssignments = allAssignments.filter((a: any) => a.user_id === person.userId);
      const personMandatory = personAssignments.filter((a: any) => a.training_courses?.is_mandatory);
      const personPassed = personMandatory.filter((a: any) => a.status === 'passed').length;
      return {
        ...person,
        totalAssigned: personAssignments.length,
        mandatoryTotal: personMandatory.length,
        mandatoryPassed: personPassed,
        complianceRate: personMandatory.length > 0 ? Math.round((personPassed / personMandatory.length) * 100) : 100,
        hasOverdue: personAssignments.some((a: any) => a.due_date && a.due_date < today && a.status !== 'passed'),
      };
    })
    .sort((a, b) => a.complianceRate - b.complianceRate);

  const overallRate = compliance
    ? compliance.mandatoryTotal > 0
      ? Math.round((compliance.mandatoryCompleted / compliance.mandatoryTotal) * 100)
      : 100
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Compliance Overview</h1>
        <p className="text-sm text-muted-foreground">Certifications, mandatory training status & expiry tracking for all personnel</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={ShieldCheck} label="Overall Compliance" value={`${overallRate}%`} color="bg-primary/10 text-primary" />
        <MetricCard icon={AlertTriangle} label="Overdue" value={compliance?.overdue ?? 0} color="bg-destructive/10 text-destructive" />
        <MetricCard icon={RefreshCw} label="Expiring Soon" value={compliance?.expiringSoon ?? 0} color="bg-amber-500/10 text-amber-600" />
        <MetricCard icon={Award} label="Mandatory Completed" value={`${compliance?.mandatoryCompleted ?? 0}/${compliance?.mandatoryTotal ?? 0}`} color="bg-emerald-500/10 text-emerald-600" />
      </div>

      {/* Overall progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Mandatory Training Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={overallRate} className="flex-1" />
            <span className="text-sm font-bold text-foreground">{overallRate}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {compliance?.mandatoryCompleted ?? 0} of {compliance?.mandatoryTotal ?? 0} mandatory assignments completed across all personnel
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="personnel">
        <TabsList className="flex-wrap">
          <TabsTrigger value="personnel">
            <Users className="h-3.5 w-3.5 mr-1.5" /> All Personnel ({personCompliance.length})
          </TabsTrigger>
          <TabsTrigger value="mandatory">
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Mandatory Courses ({mandatoryCourses.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Overdue ({overdueAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="expiring">
            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Expiring / Expired ({expiringAssignments.length + expiredAssignments.length})
          </TabsTrigger>
        </TabsList>

        {/* Personnel compliance tab */}
        <TabsContent value="personnel" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Mandatory</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personCompliance.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No active personnel</TableCell></TableRow>
                  ) : personCompliance.map(person => (
                    <TableRow key={person.userId}>
                      <TableCell>
                        <Link to={getUserLink(person.userId)} className="text-sm font-medium text-primary hover:underline">
                          {person.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${person.type === 'Subcontractor' ? 'bg-blue-500/10 text-blue-700' : ''}`}>
                          {person.type === 'Employee' ? <HardHat className="h-3 w-3 mr-1 inline" /> : null}
                          {person.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{person.role}</TableCell>
                      <TableCell className="text-sm">{person.mandatoryPassed}/{person.mandatoryTotal}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={person.complianceRate} className="w-20 h-1.5" />
                          <span className="text-xs font-medium">{person.complianceRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {person.hasOverdue ? (
                          <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                        ) : person.complianceRate === 100 ? (
                          <Badge className="text-[10px] bg-emerald-500 hover:bg-emerald-600">Compliant</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">In Progress</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mandatory courses tab */}
        <TabsContent value="mandatory" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Renewal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mandatoryCourses.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No mandatory courses defined</TableCell></TableRow>
                  ) : mandatoryCourses.map((course: any) => {
                    const assigned = allAssignments.filter((a: any) => a.course_id === course.id);
                    const passed = assigned.filter((a: any) => a.status === 'passed').length;
                    return (
                      <TableRow key={course.id}>
                        <TableCell className="text-sm font-medium">{course.title}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px] capitalize">{course.category}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">{course.target_audience}</TableCell>
                        <TableCell className="text-sm">{assigned.length}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{passed}/{assigned.length}</span>
                            {assigned.length > 0 && (
                              <Progress value={(passed / assigned.length) * 100} className="w-16 h-1.5" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {course.renewal_period_days ? `${course.renewal_period_days}d` : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overdue tab */}
        <TabsContent value="overdue" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueAssignments.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No overdue assignments 🎉</TableCell></TableRow>
                  ) : overdueAssignments.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Link to={getUserLink(a.user_id)} className="text-sm font-medium text-primary hover:underline">
                          {getUserName(a.user_id)}
                        </Link>
                        <Badge variant="outline" className="text-[9px] ml-1.5">{getUserType(a.user_id) === 'subcontractor' ? 'Sub' : 'Emp'}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{a.training_courses?.title || '—'}</TableCell>
                      <TableCell><div className="flex items-center gap-1.5"><StatusIcon status={a.status} /><span className="text-sm capitalize">{a.status?.replace('_', ' ')}</span></div></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.due_date ? format(new Date(a.due_date), 'MMM d, yyyy') : '—'}</TableCell>
                      <TableCell><Badge variant="destructive" className="text-[10px]">{Math.abs(differenceInDays(new Date(a.due_date), new Date()))}d overdue</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expiring tab */}
        <TabsContent value="expiring" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Renewal Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(expiringAssignments.length + expiredAssignments.length) === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No expiring or expired certifications</TableCell></TableRow>
                  ) : [...expiredAssignments, ...expiringAssignments].map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Link to={getUserLink(a.user_id)} className="text-sm font-medium text-primary hover:underline">
                          {getUserName(a.user_id)}
                        </Link>
                        <Badge variant="outline" className="text-[9px] ml-1.5">{getUserType(a.user_id) === 'subcontractor' ? 'Sub' : 'Emp'}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{a.training_courses?.title || '—'}</TableCell>
                      <TableCell><div className="flex items-center gap-1.5"><StatusIcon status={a.status} /><span className="text-sm capitalize">{a.status?.replace('_', ' ')}</span></div></TableCell>
                      <TableCell className="text-sm">{a.expiry_date ? format(new Date(a.expiry_date), 'MMM d, yyyy') : '—'}</TableCell>
                      <TableCell><ExpiryBadge date={a.expiry_date} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
