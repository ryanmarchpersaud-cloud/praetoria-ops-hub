import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, MessageCircle } from 'lucide-react';
import { useLeaseRenewals, useUpdateLeaseRenewal, RENEWAL_STATUSES } from '@/hooks/pm/useLeaseRenewals';
import { useAuthorization } from '@/hooks/useAuthorization';
import { formatStatusLabel } from '@/lib/statusLabel';
import { toast } from 'sonner';

export default function PMStaffLeaseRenewals() {
  const auth = useAuthorization();
  const mineOnly = auth.isLeasingAgent && !auth.isPropertyManager && !auth.isAdmin;
  const { data = [] } = useLeaseRenewals({ mineOnly });
  const update = useUpdateLeaseRenewal();
  const [editId, setEditId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');

  const editing = data.find(r => r.id === editId);

  const openEdit = (r: any) => {
    setEditId(r.id);
    setStatus(r.status);
    setNote('');
  };

  const save = async () => {
    if (!editId) return;
    try {
      const patch: any = { status };
      if (note.trim()) patch.admin_notes = (editing?.admin_notes ? editing.admin_notes + '\n' : '') + `[${new Date().toLocaleString()}] ${note}`;
      await update.mutateAsync({ id: editId, patch, activityMessage: `Updated by staff — status ${formatStatusLabel(status)}` });
      toast.success('Renewal updated');
      setEditId(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const markContacted = async (r: any) => {
    try {
      await update.mutateAsync({
        id: r.id,
        patch: { tenant_contacted_at: new Date().toISOString() },
        activityMessage: 'Tenant contacted',
      });
      toast.success('Marked tenant contacted');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-24">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarClock className="h-6 w-6 text-emerald-600" />
          Lease Renewals
        </h1>
        <p className="text-sm text-muted-foreground">
          {mineOnly ? 'Renewals assigned to you.' : 'All renewals you can manage.'}
        </p>
      </div>

      {data.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No renewals yet.</CardContent></Card>
      ) : (
        data.map(r => (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {r.tenant?.first_name} {r.tenant?.last_name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {r.property?.property_name}{r.unit?.unit_label ? ` — ${r.unit.unit_label}` : ''}
                  </p>
                </div>
                <Badge variant="secondary">{formatStatusLabel(r.status)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Ends: </span>{r.current_lease_end_date ?? '—'}</div>
                <div><span className="text-muted-foreground">Proposed rent: </span>{r.proposed_rent ? `$${Number(r.proposed_rent).toFixed(2)}` : '—'}</div>
                <div><span className="text-muted-foreground">Contacted: </span>{r.tenant_contacted_at ? new Date(r.tenant_contacted_at).toLocaleDateString() : '—'}</div>
                <div><span className="text-muted-foreground">Response: </span>{r.tenant_response ? formatStatusLabel(r.tenant_response) : '—'}</div>
              </div>
              {r.admin_notes && <p className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">{r.admin_notes}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Update</Button>
                <Button size="sm" variant="outline" onClick={() => markContacted(r)}>
                  <MessageCircle className="h-3 w-3 mr-1" /> Mark Contacted
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={!!editId} onOpenChange={o => { if (!o) setEditId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Renewal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RENEWAL_STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Add Internal Note</label>
              <Textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Follow-up note (internal only)…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
