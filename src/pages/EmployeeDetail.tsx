import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useEmployee, useEmployeeCertifications, useEmployeeDocuments,
  useEmployeePayStubs, useEmployeeTimeOff, useEmployeeEmergencyContacts,
  useEmployeeEquipment, useIssueEquipment,
} from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, User, Briefcase, Award, FileText, DollarSign, Heart, CalendarDays, UserCheck, MapPin, Phone, Mail, HardHat, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    valid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    inactive: 'bg-muted text-muted-foreground',
    expired: 'bg-destructive/10 text-destructive',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    denied: 'bg-destructive/10 text-destructive',
    'on-leave': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'not-enrolled': 'bg-muted text-muted-foreground',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || colors.inactive}`}>{status}</span>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value || '—'}</span>
    </div>
  );
}

export default function EmployeeDetail() {
  const { id: userId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: emp, isLoading } = useEmployee(userId);
  const { data: certs = [] } = useEmployeeCertifications(userId);
  const { data: docs = [] } = useEmployeeDocuments(userId);
  const { data: payStubs = [] } = useEmployeePayStubs(userId);
  const { data: timeOff = [] } = useEmployeeTimeOff(userId);
  const { data: contacts = [] } = useEmployeeEmergencyContacts(userId);
  const { data: equipment = [] } = useEmployeeEquipment(userId);
  const issueEquipment = useIssueEquipment();
  const [showIssueDialog, setShowIssueDialog] = useState(false);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!emp) return <div className="p-8 text-center text-muted-foreground">Employee not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/employees" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{emp.full_name || 'Employee'}</h1>
          <p className="text-sm text-muted-foreground">{emp.role_title || 'No role'} · {emp.employee_id || 'No ID'}</p>
        </div>
        <StatusChip status={emp.employment_status} />
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-1.5"><User className="h-3.5 w-3.5" /> Profile</TabsTrigger>
          <TabsTrigger value="employment" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Employment</TabsTrigger>
          <TabsTrigger value="training" className="gap-1.5"><Award className="h-3.5 w-3.5" /> Training</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Docs</TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Payroll</TabsTrigger>
          <TabsTrigger value="benefits" className="gap-1.5"><Heart className="h-3.5 w-3.5" /> Benefits</TabsTrigger>
          <TabsTrigger value="timeoff" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Time Off</TabsTrigger>
          <TabsTrigger value="emergency" className="gap-1.5"><UserCheck className="h-3.5 w-3.5" /> Emergency</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Personal Info</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Full Name" value={emp.full_name} />
                <InfoRow label="Employee ID" value={emp.employee_id} />
                <InfoRow label="Work Email" value={emp.work_email} />
                <InfoRow label="Phone" value={emp.phone} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Role & Location</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Role Title" value={emp.role_title} />
                <InfoRow label="Team" value={emp.team} />
                <InfoRow label="Branch" value={emp.branch_location} />
                <InfoRow label="Primary Service" value={emp.primary_service_category} />
                <InfoRow label="Secondary Service" value={emp.secondary_service_category} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Employment */}
        <TabsContent value="employment">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Employment Details</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Status" value={<StatusChip status={emp.employment_status} />} />
                <InfoRow label="Type" value={emp.employment_type} />
                <InfoRow label="Hire Date" value={emp.hire_date ? format(new Date(emp.hire_date), 'MMM d, yyyy') : null} />
                <InfoRow label="Supervisor" value={emp.supervisor_name} />
                <InfoRow label="Manager" value={emp.manager_name} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Compensation</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Pay Type" value={emp.pay_type} />
                <InfoRow label="Hourly Rate" value={emp.hourly_rate != null ? `$${Number(emp.hourly_rate).toFixed(2)}/hr` : null} />
                <InfoRow label="Equipment" value={emp.equipment_permissions?.length ? emp.equipment_permissions.join(', ') : '—'} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Training */}
        <TabsContent value="training">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Driver's License</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Class" value={emp.driver_license_class} />
                <InfoRow label="Expiry" value={emp.driver_license_expiry ? format(new Date(emp.driver_license_expiry), 'MMM d, yyyy') : null} />
                <InfoRow label="Verified" value={emp.license_verified ? 'Yes' : 'No'} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Certifications ({certs.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                {certs.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No certifications recorded.</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Expiry</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {certs.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm font-medium">{c.cert_name}</TableCell>
                          <TableCell><StatusChip status={c.status} /></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.expiry_date ? format(new Date(c.expiry_date), 'MMM d, yyyy') : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Documents ({docs.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {docs.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No documents uploaded.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {docs.map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm font-medium">{d.document_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">{d.document_type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(d.created_at), 'MMM d, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Pay Stubs ({payStubs.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {payStubs.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No pay stubs recorded.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Pay Date</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Net</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {payStubs.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm font-medium">{format(new Date(p.pay_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(p.pay_period_start), 'MMM d')} – {format(new Date(p.pay_period_end), 'MMM d')}</TableCell>
                        <TableCell className="text-sm text-right">${Number(p.gross_pay).toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-right font-medium">${Number(p.net_pay).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benefits */}
        <TabsContent value="benefits">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Benefits</CardTitle></CardHeader>
            <CardContent>
              <InfoRow label="Status" value={<StatusChip status={emp.benefits_status || 'not-enrolled'} />} />
              <InfoRow label="Provider" value={emp.benefits_provider} />
              <InfoRow label="Effective Date" value={emp.benefits_effective_date ? format(new Date(emp.benefits_effective_date), 'MMM d, yyyy') : null} />
              <InfoRow label="Plan Summary" value={emp.benefits_plan_summary} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Off */}
        <TabsContent value="timeoff">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{emp.vacation_balance ?? 0}</p><p className="text-xs text-muted-foreground">Vacation Days</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{emp.sick_balance ?? 0}</p><p className="text-xs text-muted-foreground">Sick Days</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{emp.personal_days_balance ?? 0}</p><p className="text-xs text-muted-foreground">Personal Days</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Requests ({timeOff.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                {timeOff.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No time off requests.</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {timeOff.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm font-medium capitalize">{t.request_type}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(t.start_date), 'MMM d')} – {format(new Date(t.end_date), 'MMM d')}</TableCell>
                          <TableCell className="text-sm">{t.days_requested}</TableCell>
                          <TableCell><StatusChip status={t.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Emergency Contacts */}
        <TabsContent value="emergency">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Emergency Contacts ({contacts.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {contacts.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No emergency contacts.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Relationship</TableHead><TableHead>Phone</TableHead><TableHead>Primary</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {contacts.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm font-medium">{c.contact_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.relationship || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.phone_primary || '—'}</TableCell>
                        <TableCell>{c.is_primary ? <Badge variant="default" className="text-[10px]">Primary</Badge> : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
