import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEmployees } from '@/hooks/useEmployees';
import { useAllEmergencyContacts } from '@/hooks/useHRData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Phone, Users, AlertTriangle, UserCheck, ShieldAlert, Building2,
  ChevronRight, PhoneCall, Mail,
} from 'lucide-react';

const ESCALATION_CONTACTS = [
  { role: 'Operations Manager', name: 'Ops Dispatch', phone: '', email: 'ops@praetoriagroup.ca', desc: 'First-line escalation for field issues' },
  { role: 'Safety Manager', name: 'Safety Lead', phone: '', email: 'safety@praetoriagroup.ca', desc: 'Safety incidents & compliance' },
  { role: 'HR Admin', name: 'HR Department', phone: '', email: 'hr@praetoriagroup.ca', desc: 'People issues, harassment, policy' },
  { role: 'Admin', name: 'Admin Office', phone: '', email: 'admin@praetoriagroup.ca', desc: 'General admin escalation' },
  { role: 'Emergency', name: '911 Emergency', phone: '911', email: '', desc: 'Life-threatening emergencies only' },
];

const SK_EXTERNAL_CONTACTS = [
  { org: 'WCB Saskatchewan', phone: '1-800-667-7590', url: 'https://www.wcbsask.com', desc: 'Workers\' Compensation Board — employer claims & injury reporting' },
  { org: 'SK Blue Cross', phone: '1-800-667-6853', url: 'https://www.sk.bluecross.ca', desc: 'Benefits plan administration & claims' },
  { org: 'SGI Saskatchewan', phone: '1-844-855-2744', url: 'https://www.sgi.sk.ca', desc: 'Driver licensing, abstracts & fleet insurance' },
  { org: 'SK OHS Division', phone: '1-800-567-7233', url: 'https://www.worksafesask.ca', desc: 'Occupational Health & Safety — workplace safety reporting' },
  { org: 'Poison Control SK', phone: '1-866-454-1212', url: '', desc: 'Chemical exposure & hazardous material incidents' },
  { org: 'SK Human Rights Commission', phone: '1-800-667-9249', url: 'https://saskatchewanhumanrights.ca', desc: 'Discrimination, harassment & accommodation complaints' },
];

export default function HRContactHubPage() {
  const { data: employees = [] } = useEmployees();
  const { data: allContacts = [] } = useAllEmergencyContacts();

  const activeEmployees = employees.filter(e => e.employment_status === 'active');

  // Map contacts to employees
  const contactsByUser = useMemo(() => {
    const map = new Map<string, any[]>();
    allContacts.forEach(c => {
      const list = map.get(c.user_id) || [];
      list.push(c);
      map.set(c.user_id, list);
    });
    return map;
  }, [allContacts]);

  const withContacts = activeEmployees.filter(e => contactsByUser.has(e.user_id));
  const withoutContacts = activeEmployees.filter(e => !contactsByUser.has(e.user_id));

  // Supervisor / management contacts from employee list
  const supervisors = employees.filter(e =>
    e.role_title && (
      e.role_title.toLowerCase().includes('supervisor') ||
      e.role_title.toLowerCase().includes('manager') ||
      e.role_title.toLowerCase().includes('lead')
    ) && e.employment_status === 'active'
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contact Hub</h1>
        <p className="text-sm text-muted-foreground">Emergency contacts, escalation paths & department directories</p>
      </div>

      {/* Coverage summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{withContacts.length}</p>
              <p className="text-xs text-muted-foreground">Have Emergency Contacts</p>
            </div>
          </CardContent>
        </Card>
        <Card className={withoutContacts.length > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{withoutContacts.length}</p>
              <p className="text-xs text-muted-foreground">Missing Emergency Contacts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{supervisors.length}</p>
              <p className="text-xs text-muted-foreground">Supervisors / Leads</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="escalation">
        <TabsList>
          <TabsTrigger value="escalation"><ShieldAlert className="h-3.5 w-3.5 mr-1.5" /> Escalation Contacts</TabsTrigger>
          <TabsTrigger value="emergency"><Phone className="h-3.5 w-3.5 mr-1.5" /> Emergency Contacts ({allContacts.length})</TabsTrigger>
          <TabsTrigger value="missing"><AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Missing ({withoutContacts.length})</TabsTrigger>
          <TabsTrigger value="supervisors"><Building2 className="h-3.5 w-3.5 mr-1.5" /> Supervisors ({supervisors.length})</TabsTrigger>
        </TabsList>

        {/* Escalation contacts */}
        <TabsContent value="escalation" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ESCALATION_CONTACTS.map((contact, i) => (
              <Card key={i} className={contact.role === 'Emergency' ? 'border-destructive/30 bg-destructive/5' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{contact.role}</p>
                      <p className="text-xs text-muted-foreground mt-1">{contact.desc}</p>
                    </div>
                    <Badge variant={contact.role === 'Emergency' ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                      {contact.role === 'Emergency' ? '🚨 911' : 'Internal'}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`}>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                          <PhoneCall className="h-3 w-3" /> Call
                        </Button>
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`}>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                          <Mail className="h-3 w-3" /> Email
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* All emergency contacts */}
        <TabsContent value="emergency" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {allContacts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No emergency contacts on file.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Contact Name</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Primary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allContacts.map((c: any) => {
                      const emp = employees.find(e => e.user_id === c.user_id);
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Link to={`/employees/${c.user_id}`} className="text-sm font-medium text-primary hover:underline">
                              {emp?.full_name || 'Unknown'}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">{c.contact_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.relationship || '—'}</TableCell>
                          <TableCell>
                            {c.phone_primary ? (
                              <a href={`tel:${c.phone_primary}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                                <PhoneCall className="h-3 w-3" /> {c.phone_primary}
                              </a>
                            ) : <span className="text-sm text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            {c.is_primary ? <Badge className="text-[10px] bg-emerald-500 hover:bg-emerald-600">Primary</Badge> : <span className="text-xs text-muted-foreground">Alt</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Missing contacts */}
        <TabsContent value="missing" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {withoutContacts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">All active employees have emergency contacts 🎉</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withoutContacts.map(emp => (
                      <TableRow key={emp.user_id}>
                        <TableCell className="text-sm font-medium">{emp.full_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{emp.role_title || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{emp.phone || '—'}</TableCell>
                        <TableCell>
                          <Link to={`/employees/${emp.user_id}`}>
                            <Button size="sm" variant="outline" className="text-xs gap-1">
                              View Profile <ChevronRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supervisors */}
        <TabsContent value="supervisors" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {supervisors.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No supervisors or leads found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Service Line</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supervisors.map(emp => (
                      <TableRow key={emp.user_id}>
                        <TableCell>
                          <Link to={`/employees/${emp.user_id}`} className="text-sm font-medium text-primary hover:underline">
                            {emp.full_name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{emp.role_title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{emp.primary_service_category || '—'}</TableCell>
                        <TableCell>
                          {emp.phone ? (
                            <a href={`tel:${emp.phone}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                              <PhoneCall className="h-3 w-3" /> {emp.phone}
                            </a>
                          ) : <span className="text-sm text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {emp.work_email ? (
                            <a href={`mailto:${emp.work_email}`} className="text-sm text-primary hover:underline">{emp.work_email}</a>
                          ) : <span className="text-sm text-muted-foreground">—</span>}
                        </TableCell>
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
