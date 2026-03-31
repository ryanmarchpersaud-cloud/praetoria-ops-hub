import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWCBClaims, useUpsertWCBClaim, useSGIDriverRecords, useUpsertSGIRecord, useBenefitEnrollments, useUpsertEnrollment, useInsuranceProviders } from '@/hooks/useHRModules';
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, HardHat, Car, Heart, AlertTriangle, ExternalLink, ShieldCheck, FileText, ChevronRight } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';

const claimStatusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700 border-amber-200',
  open: 'bg-blue-500/10 text-blue-600 border-blue-200',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  denied: 'bg-destructive/10 text-destructive border-destructive/20',
  closed: 'bg-muted text-muted-foreground border-border',
  return_to_work: 'bg-purple-500/10 text-purple-600 border-purple-200',
};

const abstractStatusColors: Record<string, string> = {
  not_obtained: 'bg-amber-500/10 text-amber-700',
  clear: 'bg-emerald-500/10 text-emerald-600',
  violations: 'bg-destructive/10 text-destructive',
  expired: 'bg-destructive/10 text-destructive',
};

export default function HRComplianceWorkflowsPage() {
  const { data: employees = [] } = useEmployees();
  const { data: wcbClaims = [], isLoading: loadW } = useWCBClaims();
  const { data: sgiRecords = [], isLoading: loadS } = useSGIDriverRecords();
  const { data: enrollments = [], isLoading: loadE } = useBenefitEnrollments();
  const { data: providers = [] } = useInsuranceProviders();
  const upsertClaim = useUpsertWCBClaim();
  const upsertSGI = useUpsertSGIRecord();
  const upsertEnrollment = useUpsertEnrollment();

  const [wcbOpen, setWcbOpen] = useState(false);
  const [sgiOpen, setSgiOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const activeEmps = employees.filter(e => e.employment_status === 'active');
  const getEmpName = (uid: string) => employees.find(e => e.user_id === uid)?.full_name ?? 'Unknown';

  // WCB stats
  const openClaims = wcbClaims.filter((c: any) => c.claim_status !== 'closed' && c.claim_status !== 'denied');
  const returnToWork = wcbClaims.filter((c: any) => c.claim_status === 'return_to_work');

  // SGI stats
  const expiringLicences = sgiRecords.filter((r: any) => r.licence_expiry && differenceInDays(new Date(r.licence_expiry), new Date()) <= 30 && differenceInDays(new Date(r.licence_expiry), new Date()) >= 0);
  const expiredLicences = sgiRecords.filter((r: any) => r.licence_expiry && isPast(new Date(r.licence_expiry)));
  const needsAbstract = sgiRecords.filter((r: any) => r.abstract_status === 'not_obtained' || (r.abstract_last_obtained && differenceInDays(new Date(), new Date(r.abstract_last_obtained)) > 365));

  // Benefit stats
  const pendingEnrollments = enrollments.filter((e: any) => e.enrollment_status === 'pending');

  // WCB form
  const [wcbForm, setWcbForm] = useState({ employee_user_id: '', claim_number: '', injury_date: '', injury_type: 'strain', body_part: '', claim_status: 'pending', restrictions: '', follow_up_notes: '' });
  // SGI form
  const [sgiForm, setSgiForm] = useState({ employee_user_id: '', drivers_licence_number: '', licence_class: '5', licence_expiry: '', abstract_status: 'not_obtained', authorization_signed: false, fleet_vehicle_assigned: '', notes: '' });
  // Enrollment form
  const [enrForm, setEnrForm] = useState({ employee_user_id: '', provider_id: '', enrollment_status: 'pending', effective_date: '', plan_type: '', dependent_count: 0, notes: '', change_type: 'new_enrollment', change_reason: '', termination_date: '' });

  const handleWCBSave = async () => {
    if (!wcbForm.employee_user_id || !wcbForm.injury_date) return;
    try { await upsertClaim.mutateAsync(wcbForm); toast.success('WCB claim recorded'); setWcbOpen(false); } catch { toast.error('Failed'); }
  };
  const handleSGISave = async () => {
    if (!sgiForm.employee_user_id) return;
    try { await upsertSGI.mutateAsync(sgiForm); toast.success('SGI record saved'); setSgiOpen(false); } catch { toast.error('Failed'); }
  };
  const handleEnrollSave = async () => {
    if (!enrForm.employee_user_id || !enrForm.provider_id) return;
    try { await upsertEnrollment.mutateAsync(enrForm); toast.success('Enrollment recorded'); setEnrollOpen(false); } catch { toast.error('Failed'); }
  };

  if (loadW || loadS || loadE) return <div className="space-y-3 p-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">SK Compliance & Carriers</h1>
        <p className="text-sm text-muted-foreground">WCB Saskatchewan, SGI driver compliance, and benefits enrollment workflows</p>
      </div>

      {/* Quick-link cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center"><HardHat className="h-5 w-5 text-orange-600" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">WCB Saskatchewan</p>
              <p className="text-xs text-muted-foreground">{openClaims.length} open claims</p>
            </div>
            <a href="https://www.wcbsask.com/employers" target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><ExternalLink className="h-3 w-3 mr-1" />Portal</Button></a>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Car className="h-5 w-5 text-amber-600" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">SGI Saskatchewan</p>
              <p className="text-xs text-muted-foreground">{sgiRecords.length} driver records</p>
            </div>
            <a href="https://www.mysgi.sk.ca" target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><ExternalLink className="h-3 w-3 mr-1" />Portal</Button></a>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center"><Heart className="h-5 w-5 text-rose-600" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">Benefits Enrollment</p>
              <p className="text-xs text-muted-foreground">{pendingEnrollments.length} pending</p>
            </div>
            <Link to="/hr/benefits"><Button variant="outline" size="sm"><ChevronRight className="h-3 w-3" /></Button></Link>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(openClaims.length > 0 || expiredLicences.length > 0 || expiringLicences.length > 0 || needsAbstract.length > 0 || pendingEnrollments.length > 0) && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Action Items</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {openClaims.length > 0 && <AlertRow badge={openClaims.length} label="Open WCB claims requiring follow-up" variant="destructive" />}
            {returnToWork.length > 0 && <AlertRow badge={returnToWork.length} label="Return-to-work plans active" variant="default" />}
            {expiredLicences.length > 0 && <AlertRow badge={expiredLicences.length} label="Expired driver licences" variant="destructive" />}
            {expiringLicences.length > 0 && <AlertRow badge={expiringLicences.length} label="Driver licences expiring within 30 days" variant="default" />}
            {needsAbstract.length > 0 && <AlertRow badge={needsAbstract.length} label="Driver abstracts needed or overdue" variant="default" />}
            {pendingEnrollments.length > 0 && <AlertRow badge={pendingEnrollments.length} label="Pending benefit enrollments" variant="default" />}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="wcb">
        <TabsList>
          <TabsTrigger value="wcb">WCB Claims {openClaims.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px] px-1">{openClaims.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="sgi">SGI / Drivers {(expiredLicences.length + expiringLicences.length) > 0 && <Badge variant="destructive" className="ml-1 text-[10px] px-1">{expiredLicences.length + expiringLicences.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="enrollments">Benefit Enrollments</TabsTrigger>
        </TabsList>

        {/* WCB Tab */}
        <TabsContent value="wcb" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Track workplace injuries, WCB claims, and return-to-work plans</p>
            <Dialog open={wcbOpen} onOpenChange={setWcbOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Claim</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Record WCB Claim</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Employee</Label>
                    <Select value={wcbForm.employee_user_id} onValueChange={v => setWcbForm({...wcbForm, employee_user_id: v})}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{activeEmps.map(e => <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Injury Date</Label><Input type="date" value={wcbForm.injury_date} onChange={e => setWcbForm({...wcbForm, injury_date: e.target.value})} /></div>
                    <div><Label>Claim #</Label><Input value={wcbForm.claim_number} onChange={e => setWcbForm({...wcbForm, claim_number: e.target.value})} placeholder="WCB-..." /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Injury Type</Label>
                      <Select value={wcbForm.injury_type} onValueChange={v => setWcbForm({...wcbForm, injury_type: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="strain">Strain/Sprain</SelectItem><SelectItem value="cut">Cut/Laceration</SelectItem><SelectItem value="fracture">Fracture</SelectItem><SelectItem value="burn">Burn</SelectItem><SelectItem value="slip_fall">Slip & Fall</SelectItem><SelectItem value="repetitive">Repetitive Strain</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                    <div><Label>Body Part</Label><Input value={wcbForm.body_part} onChange={e => setWcbForm({...wcbForm, body_part: e.target.value})} placeholder="e.g. Lower back" /></div>
                  </div>
                  <div><Label>Status</Label>
                    <Select value={wcbForm.claim_status} onValueChange={v => setWcbForm({...wcbForm, claim_status: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="denied">Denied</SelectItem><SelectItem value="return_to_work">Return to Work</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>
                  <div><Label>Restrictions / Notes</Label><Textarea value={wcbForm.restrictions} onChange={e => setWcbForm({...wcbForm, restrictions: e.target.value})} rows={2} /></div>
                  <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setWcbOpen(false)}>Cancel</Button><Button onClick={handleWCBSave} disabled={!wcbForm.employee_user_id || !wcbForm.injury_date}>Save</Button></div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {wcbClaims.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground"><HardHat className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No WCB claims recorded</p></CardContent></Card>
          ) : (
            <Card><Table><TableHeader><TableRow>
              <TableHead>Employee</TableHead><TableHead>Claim #</TableHead><TableHead>Injury Date</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>RTW Date</TableHead>
            </TableRow></TableHeader><TableBody>
              {wcbClaims.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell><Link to={`/employees/${c.employee_user_id}`} className="hover:underline font-medium">{getEmpName(c.employee_user_id)}</Link></TableCell>
                  <TableCell className="font-mono text-sm">{c.claim_number || '—'}</TableCell>
                  <TableCell className="text-sm">{format(new Date(c.injury_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize text-xs">{c.injury_type?.replace('_', ' ')}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={`capitalize text-xs ${claimStatusColors[c.claim_status] || ''}`}>{c.claim_status?.replace('_', ' ')}</Badge></TableCell>
                  <TableCell className="text-sm">{c.return_to_work_date ? format(new Date(c.return_to_work_date), 'MMM d, yyyy') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody></Table></Card>
          )}
        </TabsContent>

        {/* SGI Tab */}
        <TabsContent value="sgi" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Driver licences, abstracts, and fleet vehicle assignments</p>
            <Dialog open={sgiOpen} onOpenChange={setSgiOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add Driver Record</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>SGI Driver Record</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Employee</Label>
                    <Select value={sgiForm.employee_user_id} onValueChange={v => setSgiForm({...sgiForm, employee_user_id: v})}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{activeEmps.map(e => <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Licence #</Label><Input value={sgiForm.drivers_licence_number} onChange={e => setSgiForm({...sgiForm, drivers_licence_number: e.target.value})} /></div>
                    <div><Label>Class</Label>
                      <Select value={sgiForm.licence_class} onValueChange={v => setSgiForm({...sgiForm, licence_class: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="1">Class 1 (Semi)</SelectItem><SelectItem value="2">Class 2 (Bus)</SelectItem><SelectItem value="3">Class 3 (Straight Truck)</SelectItem><SelectItem value="4">Class 4 (Taxi/Ambulance)</SelectItem><SelectItem value="5">Class 5 (Standard)</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Licence Expiry</Label><Input type="date" value={sgiForm.licence_expiry} onChange={e => setSgiForm({...sgiForm, licence_expiry: e.target.value})} /></div>
                    <div><Label>Abstract Status</Label>
                      <Select value={sgiForm.abstract_status} onValueChange={v => setSgiForm({...sgiForm, abstract_status: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="not_obtained">Not Obtained</SelectItem><SelectItem value="clear">Clear</SelectItem><SelectItem value="violations">Violations Found</SelectItem><SelectItem value="expired">Expired (Needs Renewal)</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="flex items-center gap-2"><Switch checked={sgiForm.authorization_signed} onCheckedChange={v => setSgiForm({...sgiForm, authorization_signed: v})} /><Label>Authorization to Pull Abstract Signed</Label></div>
                  <div><Label>Fleet Vehicle</Label><Input value={sgiForm.fleet_vehicle_assigned} onChange={e => setSgiForm({...sgiForm, fleet_vehicle_assigned: e.target.value})} placeholder="e.g. Unit #12 - 2023 F-150" /></div>
                  <div><Label>Notes</Label><Textarea value={sgiForm.notes} onChange={e => setSgiForm({...sgiForm, notes: e.target.value})} rows={2} /></div>
                  <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSgiOpen(false)}>Cancel</Button><Button onClick={handleSGISave} disabled={!sgiForm.employee_user_id}>Save</Button></div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {sgiRecords.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground"><Car className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No driver records yet</p></CardContent></Card>
          ) : (
            <Card><Table><TableHeader><TableRow>
              <TableHead>Employee</TableHead><TableHead>Licence #</TableHead><TableHead>Class</TableHead><TableHead>Expiry</TableHead><TableHead>Abstract</TableHead><TableHead>Auth</TableHead><TableHead>Vehicle</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader><TableBody>
              {sgiRecords.map((r: any) => {
                const expired = r.licence_expiry && isPast(new Date(r.licence_expiry));
                const expiring = r.licence_expiry && !expired && differenceInDays(new Date(r.licence_expiry), new Date()) <= 30;
                const needsAbstractRenewal = r.abstract_status === 'not_obtained' || r.abstract_status === 'expired' || (r.abstract_last_obtained && differenceInDays(new Date(), new Date(r.abstract_last_obtained)) > 365);
                return (
                  <TableRow key={r.id} className={expired ? 'bg-destructive/5' : expiring ? 'bg-amber-500/5' : ''}>
                    <TableCell><Link to={`/employees/${r.employee_user_id}`} className="hover:underline font-medium">{getEmpName(r.employee_user_id)}</Link></TableCell>
                    <TableCell className="font-mono text-sm">{r.drivers_licence_number || '—'}</TableCell>
                    <TableCell>Class {r.licence_class}</TableCell>
                    <TableCell className="text-sm">{r.licence_expiry ? format(new Date(r.licence_expiry), 'MMM d, yyyy') : '—'}{expired && <Badge variant="destructive" className="ml-1 text-[10px]">Expired</Badge>}{expiring && <Badge className="ml-1 text-[10px] bg-amber-500">Soon</Badge>}</TableCell>
                    <TableCell><Badge variant="outline" className={`capitalize text-xs ${abstractStatusColors[r.abstract_status] || ''}`}>{r.abstract_status?.replace('_', ' ')}</Badge></TableCell>
                    <TableCell>{r.authorization_signed ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <span className="text-xs text-muted-foreground">No</span>}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{r.fleet_vehicle_assigned || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(expired || expiring) && (
                          <Button variant="outline" size="sm" className="text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={async () => {
                              try {
                                await upsertSGI.mutateAsync({ ...r, renewal_reminder_sent: true, last_reminder_date: new Date().toISOString().split('T')[0] });
                                toast.success(`Renewal reminder flagged for ${getEmpName(r.employee_user_id)}`);
                              } catch { toast.error('Failed'); }
                            }}>
                            {r.renewal_reminder_sent ? '✓ Reminded' : 'Flag Renewal'}
                          </Button>
                        )}
                        {needsAbstractRenewal && (
                          <Button variant="outline" size="sm" className="text-xs h-7"
                            onClick={async () => {
                              try {
                                await upsertSGI.mutateAsync({ ...r, abstract_status: 'not_obtained' });
                                toast.success('Abstract marked for renewal');
                              } catch { toast.error('Failed'); }
                            }}>
                            Renew Abstract
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody></Table></Card>
          )}
        </TabsContent>

        {/* Benefit Enrollments Tab */}
        <TabsContent value="enrollments" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Track employee enrollments, life-event changes, and terminations</p>
            <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Enrollment / Change</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Benefit Enrollment / Change</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Change Type</Label>
                    <Select value={enrForm.change_type} onValueChange={v => setEnrForm({...enrForm, change_type: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_enrollment">New Enrollment</SelectItem>
                        <SelectItem value="life_event">Life Event Change</SelectItem>
                        <SelectItem value="plan_change">Plan Change</SelectItem>
                        <SelectItem value="termination">Termination / Removal</SelectItem>
                      </SelectContent></Select></div>
                  <div><Label>Employee</Label>
                    <Select value={enrForm.employee_user_id} onValueChange={v => setEnrForm({...enrForm, employee_user_id: v})}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{activeEmps.map(e => <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Provider</Label>
                    <Select value={enrForm.provider_id} onValueChange={v => setEnrForm({...enrForm, provider_id: v})}><SelectTrigger><SelectValue placeholder="Select provider..." /></SelectTrigger>
                      <SelectContent>{providers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.provider_name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Status</Label>
                      <Select value={enrForm.enrollment_status} onValueChange={v => setEnrForm({...enrForm, enrollment_status: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="enrolled">Enrolled</SelectItem><SelectItem value="waived">Waived</SelectItem><SelectItem value="terminated">Terminated</SelectItem></SelectContent></Select></div>
                    <div><Label>Effective Date</Label><Input type="date" value={enrForm.effective_date} onChange={e => setEnrForm({...enrForm, effective_date: e.target.value})} /></div>
                  </div>
                  {enrForm.change_type === 'termination' && (
                    <div><Label>Termination Date</Label><Input type="date" value={enrForm.termination_date} onChange={e => setEnrForm({...enrForm, termination_date: e.target.value})} /></div>
                  )}
                  {(enrForm.change_type === 'life_event' || enrForm.change_type === 'plan_change') && (
                    <div><Label>Reason for Change</Label><Input value={enrForm.change_reason} onChange={e => setEnrForm({...enrForm, change_reason: e.target.value})} placeholder="e.g. Marriage, new dependent, address change" /></div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Plan Type</Label><Input value={enrForm.plan_type} onChange={e => setEnrForm({...enrForm, plan_type: e.target.value})} placeholder="e.g. Family, Single" /></div>
                    <div><Label>Dependents</Label><Input type="number" value={enrForm.dependent_count} onChange={e => setEnrForm({...enrForm, dependent_count: Number(e.target.value)})} /></div>
                  </div>
                  <div><Label>Notes</Label><Textarea value={enrForm.notes} onChange={e => setEnrForm({...enrForm, notes: e.target.value})} rows={2} /></div>
                  <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEnrollOpen(false)}>Cancel</Button><Button onClick={handleEnrollSave} disabled={!enrForm.employee_user_id || !enrForm.provider_id}>Save</Button></div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {enrollments.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground"><Heart className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No benefit enrollments recorded</p></CardContent></Card>
          ) : (
            <Card><Table><TableHeader><TableRow>
              <TableHead>Employee</TableHead><TableHead>Provider</TableHead><TableHead>Change</TableHead><TableHead>Plan</TableHead><TableHead>Status</TableHead><TableHead>Effective</TableHead><TableHead>Dependents</TableHead>
            </TableRow></TableHeader><TableBody>
              {enrollments.map((e: any) => {
                const changeLabels: Record<string, string> = { new_enrollment: 'New', life_event: 'Life Event', plan_change: 'Plan Change', termination: 'Termination' };
                const changeColors: Record<string, string> = { new_enrollment: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', life_event: 'bg-blue-500/10 text-blue-600 border-blue-200', plan_change: 'bg-purple-500/10 text-purple-600 border-purple-200', termination: 'bg-destructive/10 text-destructive border-destructive/20' };
                return (
                  <TableRow key={e.id}>
                    <TableCell><Link to={`/employees/${e.employee_user_id}`} className="hover:underline font-medium">{getEmpName(e.employee_user_id)}</Link></TableCell>
                    <TableCell className="text-sm">{(e.hr_insurance_providers as any)?.provider_name ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${changeColors[e.change_type] || ''}`}>{changeLabels[e.change_type] || e.change_type}</Badge></TableCell>
                    <TableCell className="text-sm">{e.plan_type || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className={`capitalize text-xs ${e.enrollment_status === 'enrolled' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : e.enrollment_status === 'pending' ? 'bg-amber-500/10 text-amber-700 border-amber-200' : e.enrollment_status === 'terminated' ? 'bg-destructive/10 text-destructive' : ''}`}>{e.enrollment_status}</Badge></TableCell>
                    <TableCell className="text-sm">{e.effective_date ? format(new Date(e.effective_date), 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell className="text-sm text-center">{e.dependent_count ?? 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody></Table></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AlertRow({ badge, label, variant }: { badge: number; label: string; variant: 'destructive' | 'default' }) {
  return (
    <div className="flex items-center gap-2 px-1 py-0.5">
      <Badge variant={variant === 'destructive' ? 'destructive' : 'secondary'} className="text-xs">{badge}</Badge>
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );
}
