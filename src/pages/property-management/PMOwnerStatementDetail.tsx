import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, CheckCircle2, Send, Ban, Printer, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  useOwnerStatement, useOwnerStatementLines, useUpdateOwnerStatement,
  useAddStatementLine, useDeleteStatementLine, STATEMENT_LINE_TYPES,
  fetchStatementDraftData,
} from '@/hooks/usePMOwnerStatements';
import { toast } from '@/hooks/use-toast';
import { formatStatusLabel } from '@/lib/statusLabel';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n || 0);

export default function PMOwnerStatementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: stmt, isLoading } = useOwnerStatement(id);
  const { data: lines = [] } = useOwnerStatementLines(id);
  const update = useUpdateOwnerStatement();
  const addLine = useAddStatementLine();
  const delLine = useDeleteStatementLine();
  const [addOpen, setAddOpen] = useState(false);

  const { data: owner } = useQuery({
    queryKey: ['pm-owner-info', stmt?.owner_id],
    enabled: !!stmt?.owner_id,
    queryFn: async () => {
      const { data } = await supabase.from('pm_property_owners').select('*').eq('id', stmt!.owner_id).maybeSingle();
      return data;
    },
  });
  const { data: property } = useQuery({
    queryKey: ['pm-prop-info', stmt?.property_id],
    enabled: !!stmt?.property_id,
    queryFn: async () => {
      const { data } = await supabase.from('pm_managed_properties').select('*').eq('id', stmt!.property_id!).maybeSingle();
      return data;
    },
  });

  if (isLoading || !stmt) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const readOnly = ['finalized','shared','void','cancelled'].includes(stmt.status);

  async function autoDraft() {
    if (!stmt!.property_id) { toast({ title: 'Select a property first', variant: 'destructive' }); return; }
    try {
      const { expenses } = await fetchStatementDraftData(stmt!.property_id, stmt!.period_start, stmt!.period_end);
      let added = 0;
      for (const e of expenses as any[]) {
        const type = e.maintenance_request_id ? 'maintenance_expense' : 'property_expense';
        await addLine.mutateAsync({
          statement_id: stmt!.id,
          line_type: type,
          line_date: e.expense_date,
          property_id: stmt!.property_id,
          unit_id: e.unit_id || null,
          description: e.description || e.category || 'Expense',
          amount: Number(e.total || 0),
          source_table: 'pm_expenses',
          source_id: e.id,
          owner_visible_note: e.is_owner_visible ? 'Included on your statement' : null,
        });
        added += 1;
      }
      toast({ title: 'Draft populated', description: `Added ${added} expense line${added === 1 ? '' : 's'}. Add rent and management fee lines manually.` });
    } catch (e: any) {
      toast({ title: 'Auto-draft failed', description: e.message, variant: 'destructive' });
    }
  }

  async function setStatus(status: any) {
    const patch: any = { status };
    if (status === 'finalized') patch.finalized_at = new Date().toISOString();
    if (status === 'shared') { patch.shared_at = new Date().toISOString(); patch.owner_visible = true; }
    await update.mutateAsync({ id: stmt!.id, patch });
    toast({ title: `Statement ${formatStatusLabel(status)}` });
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/property-management/owner-statements')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold">{stmt.statement_number}</h1>
              <Badge className="bg-slate-100 text-slate-700">{formatStatusLabel(stmt.status)}</Badge>
              {stmt.owner_visible && <Badge className="bg-emerald-100 text-emerald-800"><Eye className="h-3 w-3 mr-1" />Owner-visible</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(stmt.period_start), 'MMM d, yyyy')} – {format(new Date(stmt.period_end), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
          {stmt.status === 'draft' && (
            <>
              <Button size="sm" variant="outline" onClick={() => setStatus('under_review')}>Move to Review</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setStatus('finalized')}>
                <CheckCircle2 className="h-4 w-4 mr-1" />Finalize
              </Button>
            </>
          )}
          {stmt.status === 'under_review' && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setStatus('finalized')}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Finalize
            </Button>
          )}
          {stmt.status === 'finalized' && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setStatus('shared')}>
              <Send className="h-4 w-4 mr-1" />Share with Owner
            </Button>
          )}
          {!['void','cancelled'].includes(stmt.status) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-rose-700 border-rose-200"><Ban className="h-4 w-4 mr-1" />Void</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Void this statement?</AlertDialogTitle>
                  <AlertDialogDescription>The owner will no longer see it. This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => setStatus('void')} className="bg-rose-600 hover:bg-rose-700">Void</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Summary card */}
      <Card>
        <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryTile label="Owner" value={owner ? (owner.contact_name || owner.company_name || '—') : '—'} />
          <SummaryTile label="Property" value={property?.address_line_1 || 'Portfolio-wide'} />
          <SummaryTile label="Rent Collected" value={fmt(Number(stmt.rent_collected))} />
          <SummaryTile label="Property Expenses" value={fmt(Number(stmt.property_expenses))} />
          <SummaryTile label="Maintenance" value={fmt(Number(stmt.maintenance_expenses))} />
          <SummaryTile label="Management Fees" value={fmt(Number(stmt.management_fees))} />
          <SummaryTile label="Adjustments" value={fmt(Number(stmt.adjustments))} />
          <SummaryTile label="Net to Owner" value={fmt(Number(stmt.net_owner_amount))} highlight />
        </CardContent>
      </Card>

      {/* Lines */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Line Items</CardTitle>
          <div className="flex gap-2">
            {!readOnly && stmt.property_id && (
              <Button size="sm" variant="outline" onClick={autoDraft}><Sparkles className="h-4 w-4 mr-1" />Auto-import expenses</Button>
            )}
            {!readOnly && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />Add Line
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <div className="text-sm text-muted-foreground p-6 text-center">No lines yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {!readOnly && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm whitespace-nowrap">{l.line_date ? format(new Date(l.line_date), 'MMM d') : '—'}</TableCell>
                    <TableCell><Badge variant="outline">{formatStatusLabel(l.line_type)}</Badge></TableCell>
                    <TableCell>
                      <div className="text-sm">{l.description || '—'}</div>
                      {l.admin_note && <div className="text-[11px] text-amber-700 mt-0.5">Admin: {l.admin_note}</div>}
                      {l.owner_visible_note && <div className="text-[11px] text-emerald-700 mt-0.5">Owner: {l.owner_visible_note}</div>}
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmt(Number(l.amount))}</TableCell>
                    {!readOnly && (
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => delLine.mutate({ id: l.id, statement_id: stmt.id })}>
                          <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Notes & visibility */}
      <Card>
        <CardHeader><CardTitle className="text-base">Notes & Sharing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Owner-visible note</Label>
            <Textarea
              value={stmt.owner_visible_notes || ''}
              onChange={(e) => update.mutate({ id: stmt.id, patch: { owner_visible_notes: e.target.value } })}
              placeholder="Message the owner will see on this statement…"
              disabled={readOnly && stmt.status !== 'finalized' && stmt.status !== 'shared'}
              rows={3}
            />
          </div>
          <div>
            <Label>Admin-only note</Label>
            <Textarea
              value={stmt.admin_notes || ''}
              onChange={(e) => update.mutate({ id: stmt.id, patch: { admin_notes: e.target.value } })}
              placeholder="Internal notes — owners never see this."
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between border rounded-md p-3 bg-slate-50">
            <div>
              <div className="font-medium text-sm flex items-center gap-2">
                {stmt.owner_visible ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-slate-500" />}
                Show on Owner Portal
              </div>
              <p className="text-xs text-muted-foreground">Owners only see finalized or shared statements marked visible.</p>
            </div>
            <Switch
              checked={stmt.owner_visible}
              onCheckedChange={(v) => update.mutate({ id: stmt.id, patch: { owner_visible: v } })}
            />
          </div>
        </CardContent>
      </Card>

      <AddLineDialog open={addOpen} onOpenChange={setAddOpen} statementId={stmt.id} propertyId={stmt.property_id} />
    </div>
  );
}

function SummaryTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-md border ${highlight ? 'bg-emerald-50 border-emerald-200' : 'bg-white'}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      <div className={`text-sm md:text-base font-semibold ${highlight ? 'text-emerald-800' : 'text-slate-900'} mt-0.5 truncate`}>{value}</div>
    </div>
  );
}

function AddLineDialog({ open, onOpenChange, statementId, propertyId }: { open: boolean; onOpenChange: (v: boolean) => void; statementId: string; propertyId: string | null }) {
  const addLine = useAddStatementLine();
  const [type, setType] = useState<string>('management_fee');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [ownerNote, setOwnerNote] = useState('');
  const [adminNote, setAdminNote] = useState('');

  async function submit() {
    const amt = Number(amount);
    if (!amt || isNaN(amt)) { toast({ title: 'Enter an amount', variant: 'destructive' }); return; }
    try {
      await addLine.mutateAsync({
        statement_id: statementId,
        line_type: type as any,
        line_date: date,
        property_id: propertyId,
        description: desc || null,
        amount: amt,
        owner_visible_note: ownerNote || null,
        admin_note: adminNote || null,
      });
      toast({ title: 'Line added' });
      setDesc(''); setAmount(''); setOwnerNote(''); setAdminNote('');
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Statement Line</DialogTitle>
          <DialogDescription>Manually add a rent, expense, fee, adjustment, or credit line.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATEMENT_LINE_TYPES.map((t) => <SelectItem key={t} value={t}>{formatStatusLabel(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <div><Label>Description</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Monthly management fee — 8%" /></div>
          <div><Label>Amount (CAD)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label>Owner-visible note</Label><Input value={ownerNote} onChange={(e) => setOwnerNote(e.target.value)} placeholder="Optional" /></div>
          <div><Label>Admin-only note</Label><Input value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Optional — internal" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={submit} disabled={addLine.isPending}>
            {addLine.isPending ? 'Adding…' : 'Add Line'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
