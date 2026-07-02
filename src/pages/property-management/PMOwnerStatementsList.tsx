import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, FileText, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useOwnerStatements, useCreateOwnerStatement, STATEMENT_STATUSES } from '@/hooks/usePMOwnerStatements';
import { toast } from '@/hooks/use-toast';
import { formatStatusLabel } from '@/lib/statusLabel';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n || 0);

const statusColor: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  under_review: 'bg-amber-100 text-amber-800',
  finalized: 'bg-blue-100 text-blue-800',
  shared: 'bg-emerald-100 text-emerald-800',
  void: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

function useOwners() {
  return useQuery({
    queryKey: ['pm-owners-for-stmt'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pm_property_owners').select('id, contact_name, company_name').order('contact_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}
function useProperties(ownerId?: string) {
  return useQuery({
    queryKey: ['pm-props-for-stmt', ownerId],
    queryFn: async () => {
      const q = supabase.from('pm_managed_properties').select('id, address_line_1, city, primary_owner_id').order('address_line_1');
      const { data, error } = await q;
      if (error) throw error;
      if (!ownerId) return data ?? [];
      // filter by primary_owner_id OR pm_owner_properties link
      const { data: linked } = await supabase.from('pm_owner_properties').select('property_id').eq('owner_id', ownerId);
      const linkedIds = new Set((linked ?? []).map((l: any) => l.property_id));
      return (data ?? []).filter((p: any) => p.primary_owner_id === ownerId || linkedIds.has(p.id));
    },
  });
}

export default function PMOwnerStatementsList() {
  const [ownerId, setOwnerId] = useState<string>('all');
  const [propertyId, setPropertyId] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: owners = [] } = useOwners();
  const { data: properties = [] } = useProperties(ownerId === 'all' ? undefined : ownerId);
  const { data: statements = [], isLoading } = useOwnerStatements({
    ownerId: ownerId === 'all' ? undefined : ownerId,
    propertyId: propertyId === 'all' ? undefined : propertyId,
    status,
  });

  const propMap = useMemo(() => Object.fromEntries((properties as any[]).map((p) => [p.id, p])), [properties]);
  const ownerMap = useMemo(() => Object.fromEntries((owners as any[]).map((o) => [o.id, o])), [owners]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 max-w-7xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Owner Statements</h1>
          <p className="text-sm text-muted-foreground">Prepare monthly statements for property owners. Draft → Finalize → Share.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> New Draft Statement
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Owner</Label>
              <Select value={ownerId} onValueChange={(v) => { setOwnerId(v); setPropertyId('all'); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All owners</SelectItem>
                  {(owners as any[]).map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.contact_name || o.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Property</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All properties</SelectItem>
                  {(properties as any[]).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.address_line_1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATEMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Statements</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground p-4">Loading…</div>
          ) : statements.length === 0 ? (
            <div className="text-sm text-muted-foreground p-6 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No statements yet. Create a draft to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Net Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visible</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.statement_number}</TableCell>
                    <TableCell>{(ownerMap[s.owner_id] as any)?.contact_name || (ownerMap[s.owner_id] as any)?.company_name || '—'}</TableCell>
                    <TableCell>{s.property_id ? ((propMap[s.property_id] as any)?.address_line_1 || '—') : '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(s.period_start), 'MMM d')} – {format(new Date(s.period_end), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{fmt(Number(s.net_owner_amount))}</TableCell>
                    <TableCell><Badge className={statusColor[s.status]}>{formatStatusLabel(s.status)}</Badge></TableCell>
                    <TableCell>{s.owner_visible ? <Badge className="bg-emerald-100 text-emerald-800"><Eye className="h-3 w-3 mr-1" />Shown</Badge> : <Badge variant="outline">Hidden</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/property-management/owner-statements/${s.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateStatementDialog open={createOpen} onOpenChange={setCreateOpen} owners={owners} />
    </div>
  );
}

function CreateStatementDialog({ open, onOpenChange, owners }: { open: boolean; onOpenChange: (v: boolean) => void; owners: any[] }) {
  const create = useCreateOwnerStatement();
  const [ownerId, setOwnerId] = useState('');
  const [propertyId, setPropertyId] = useState<string>('none');
  const { data: properties = [] } = useProperties(ownerId || undefined);
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const [start, setStart] = useState(format(lastMonthStart, 'yyyy-MM-dd'));
  const [end, setEnd] = useState(format(lastMonthEnd, 'yyyy-MM-dd'));

  async function submit() {
    if (!ownerId) { toast({ title: 'Select an owner', variant: 'destructive' }); return; }
    try {
      const s = await create.mutateAsync({
        owner_id: ownerId,
        property_id: propertyId === 'none' ? null : propertyId,
        period_start: start,
        period_end: end,
      });
      toast({ title: 'Draft created', description: s.statement_number });
      onOpenChange(false);
      window.location.href = `/property-management/owner-statements/${s.id}`;
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Owner Statement</DialogTitle>
          <DialogDescription>Create a draft. You can add line items and finalize on the next screen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Owner</Label>
            <Select value={ownerId} onValueChange={(v) => { setOwnerId(v); setPropertyId('none'); }}>
              <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
              <SelectContent>
                {(owners as any[]).map((o) => <SelectItem key={o.id} value={o.id}>{o.contact_name || o.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Property (optional)</Label>
            <Select value={propertyId} onValueChange={setPropertyId} disabled={!ownerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All properties (portfolio-wide)</SelectItem>
                {(properties as any[]).map((p) => <SelectItem key={p.id} value={p.id}>{p.address_line_1}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Period start</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label>Period end</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create Draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
