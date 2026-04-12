import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FileSignature, Send, Eye, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAgreements, useAgreementTemplates, useCreateAgreement, useSendAgreement } from '@/hooks/useAgreements';
import { useCustomers } from '@/hooks/useCustomers';
import { useEmployees } from '@/hooks/useEmployees';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-amber-100 text-amber-700',
  signed: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-destructive/10 text-destructive',
  expired: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
};

const categoryLabels: Record<string, string> = {
  snow: 'Snow & Ice',
  junk_removal: 'Junk Removal',
  cleaning: 'Cleaning',
  landscaping: 'Landscaping',
  property_maintenance: 'Property Maintenance',
  property_management: 'Property Management',
  subcontractor: 'Subcontractor',
  employee: 'Employee / Worker',
  policy_acknowledgement: 'Policy Acknowledgement',
};

export default function AgreementsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: agreements = [], isLoading } = useAgreements({ status: statusFilter, recipientType: typeFilter });
  const filtered = agreements.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.recipient_name.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    all: agreements.length,
    draft: agreements.filter(a => a.status === 'draft').length,
    sent: agreements.filter(a => a.status === 'sent').length,
    signed: agreements.filter(a => a.status === 'signed').length,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSignature className="h-6 w-6 text-primary" /> Agreements
          </h1>
          <p className="text-sm text-muted-foreground">Create, send, and manage agreements & e-signatures</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Agreement
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: counts.all },
          { label: 'Drafts', value: counts.draft },
          { label: 'Awaiting Signature', value: counts.sent },
          { label: 'Signed', value: counts.signed },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search agreements..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="signed">Signed</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Recipient" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="subcontractor">Subcontractor</SelectItem>
            <SelectItem value="worker">Worker / Employee</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? <Skeleton className="h-64" /> : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(a => (
                <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/agreements/${a.id}`)}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>
                    <div className="text-sm">{a.recipient_name}</div>
                    <div className="text-xs text-muted-foreground">{a.recipient_type}</div>
                  </TableCell>
                  <TableCell className="text-sm">{categoryLabels[a.category] || a.category}</TableCell>
                  <TableCell><Badge className={statusColors[a.status] || ''}>{a.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(a.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/agreements/${a.id}`); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No agreements found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <CreateAgreementDialog open={showCreate} onOpenChange={setShowCreate} userId={user?.id} />
    </div>
  );
}

/* ── Create Agreement Dialog ── */
function CreateAgreementDialog({ open, onOpenChange, userId }: { open: boolean; onOpenChange: (o: boolean) => void; userId?: string }) {
  const { data: templates = [] } = useAgreementTemplates();
  const { data: customers = [] } = useCustomers();
  const { data: employees = [] } = useEmployees();
  const createAgreement = useCreateAgreement();
  const sendAgreement = useSendAgreement();
  const navigate = useNavigate();

  const [templateId, setTemplateId] = useState('');
  const [recipientType, setRecipientType] = useState('customer');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientUserId, setRecipientUserId] = useState('');
  const [title, setTitle] = useState('');
  const [mergeData, setMergeData] = useState<Record<string, string>>({});

  const selectedTemplate = templates.find(t => t.id === templateId);
  const mergeFields: string[] = selectedTemplate?.merge_fields ? (selectedTemplate.merge_fields as string[]) : [];

  const handleTemplateChange = (tid: string) => {
    setTemplateId(tid);
    const tmpl = templates.find(t => t.id === tid);
    if (tmpl) {
      setTitle(tmpl.name);
      // Determine recipient type from category
      if (tmpl.category === 'subcontractor') setRecipientType('subcontractor');
      else if (tmpl.category === 'employee') setRecipientType('worker');
      else setRecipientType('customer');
    }
  };

  const handleRecipientSelect = (userId: string) => {
    setRecipientUserId(userId);
    if (recipientType === 'customer') {
      const c = customers.find((c: any) => c.id === userId);
      if (c) { setRecipientName(`${c.first_name} ${c.last_name}`); setRecipientEmail(c.email || ''); }
    } else {
      const e = employees.find((e: any) => e.user_id === userId);
      if (e) { setRecipientName(e.full_name || ''); setRecipientEmail(e.work_email || ''); }
    }
  };

  const renderBody = () => {
    if (!selectedTemplate) return '';
    let html = selectedTemplate.body_html;
    // Auto-fill company name
    const data = { ...mergeData, company_name: mergeData.company_name || 'Praetoria Group' };
    if (recipientType === 'customer') data.customer_name = recipientName;
    if (recipientType === 'subcontractor') data.subcontractor_name = recipientName;
    if (recipientType === 'worker') { data.employee_name = recipientName; data.recipient_name = recipientName; }
    Object.entries(data).forEach(([k, v]) => {
      html = html.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v || `[${k}]`);
    });
    return html;
  };

  const handleCreate = async (andSend = false) => {
    if (!templateId || !recipientName || !title) { toast.error('Fill required fields'); return; }
    const body = renderBody();
    const payload: any = {
      template_id: templateId,
      category: selectedTemplate?.category || 'general',
      title,
      recipient_type: recipientType,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      body_html: body,
      merge_data: mergeData,
      created_by: userId,
      status: 'draft',
    };
    if (recipientType === 'customer' && recipientUserId) payload.customer_id = recipientUserId;
    if (recipientType === 'subcontractor' && recipientUserId) payload.subcontractor_user_id = recipientUserId;
    if (recipientType === 'worker' && recipientUserId) { payload.employee_user_id = recipientUserId; payload.recipient_user_id = recipientUserId; }
    // For customers, try to look up their user_id
    if (recipientType === 'customer' && recipientUserId) {
      const c = customers.find((c: any) => c.id === recipientUserId);
      if (c?.user_id) payload.recipient_user_id = c.user_id;
    }
    if (recipientType === 'subcontractor' && recipientUserId) payload.recipient_user_id = recipientUserId;

    createAgreement.mutate(payload, {
      onSuccess: (data: any) => {
        if (andSend && data?.id) {
          sendAgreement.mutate({ id: data.id, sentBy: userId! });
        }
        onOpenChange(false);
        navigate(`/agreements/${data.id}`);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Create New Agreement</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] px-6 pb-2">
          <div className="space-y-4 pb-4">
            {/* Template */}
            <div>
              <Label>Agreement Template</Label>
              <Select value={templateId} onValueChange={handleTemplateChange}>
                <SelectTrigger><SelectValue placeholder="Choose a template…" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} — <span className="text-muted-foreground text-xs">{categoryLabels[t.category] || t.category}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>

            {/* Recipient Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Recipient Type</Label>
                <Select value={recipientType} onValueChange={setRecipientType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                    <SelectItem value="worker">Worker / Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Select Recipient</Label>
                {recipientType === 'customer' ? (
                  <Select value={recipientUserId} onValueChange={handleRecipientSelect}>
                    <SelectTrigger><SelectValue placeholder="Choose customer…" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={recipientUserId} onValueChange={handleRecipientSelect}>
                    <SelectTrigger><SelectValue placeholder="Choose employee/sub…" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e: any) => (
                        <SelectItem key={e.user_id} value={e.user_id}>{e.full_name || e.work_email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Recipient Name</Label><Input value={recipientName} onChange={e => setRecipientName(e.target.value)} /></div>
              <div><Label>Recipient Email</Label><Input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} /></div>
            </div>

            {/* Merge Fields */}
            {mergeFields.length > 0 && (
              <>
                <Separator />
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Fill Agreement Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  {mergeFields
                    .filter(f => !['company_name', 'customer_name', 'subcontractor_name', 'employee_name', 'recipient_name'].includes(f))
                    .map(field => (
                      <div key={field}>
                        <Label className="text-xs">{field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Label>
                        {field === 'notes' || field === 'special_conditions' || field === 'policy_content' || field === 'pricing_terms' ? (
                          <Textarea value={mergeData[field] || ''} onChange={e => setMergeData(d => ({ ...d, [field]: e.target.value }))} rows={2} />
                        ) : (
                          <Input value={mergeData[field] || ''} onChange={e => setMergeData(d => ({ ...d, [field]: e.target.value }))} type={field.includes('date') ? 'date' : 'text'} />
                        )}
                      </div>
                    ))}
                </div>
              </>
            )}

            {/* Preview */}
            {selectedTemplate && (
              <>
                <Separator />
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Preview</h4>
                <div className="border rounded-lg p-4 bg-background prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderBody() }} />
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 pb-6 pt-2 gap-2">
          <Button variant="outline" onClick={() => handleCreate(false)} disabled={createAgreement.isPending}>
            Save as Draft
          </Button>
          <Button onClick={() => handleCreate(true)} disabled={createAgreement.isPending}>
            <Send className="h-4 w-4 mr-1" /> Create & Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
