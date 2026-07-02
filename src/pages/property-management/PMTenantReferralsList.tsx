import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, ArrowLeft, AlertTriangle, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['new', 'reviewed', 'contacted', 'converted', 'closed'] as const;
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-amber-100 text-amber-800',
  contacted: 'bg-indigo-100 text-indigo-800',
  converted: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-200 text-slate-700',
};

function useReferrals() {
  return useQuery({
    queryKey: ['pm-tenant-referrals-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_tenant_referrals')
        .select(`*, tenant:pm_tenants(id, first_name, last_name, email, phone,
          unit:pm_units(id, unit_label, property:pm_managed_properties(id, property_name, address_line1, city)))`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
}

export default function PMTenantReferralsList() {
  const { data = [], isLoading } = useReferrals();
  const [selected, setSelected] = useState<any | null>(null);
  const qc = useQueryClient();

  const [status, setStatus] = useState<string>('new');
  const [adminNotes, setAdminNotes] = useState('');

  const openDialog = (r: any) => {
    setSelected(r);
    setStatus(r.status || 'new');
    setAdminNotes(r.admin_notes || '');
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const { error } = await supabase
        .from('pm_tenant_referrals')
        .update({ status, admin_notes: adminNotes })
        .eq('id', selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Referral updated');
      qc.invalidateQueries({ queryKey: ['pm-tenant-referrals-admin'] });
      setSelected(null);
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to update referral'),
  });

  const counts = data.reduce<Record<string, number>>((acc, r: any) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link to="/property-management">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
          <UserPlus className="h-6 w-6" /> Tenant Referrals
        </h1>
        <p className="text-sm text-muted-foreground">
          Friend & neighbour leads submitted from the Tenant Portal.
        </p>
      </div>

      <Alert className="border-amber-300 bg-amber-50 text-amber-900">
        <AlertTriangle className="h-4 w-4 !text-amber-700" />
        <AlertDescription className="text-sm">
          <strong>Leads only.</strong> Tenant referrals do <strong>not</strong> book any service at
          the rental property and do not create jobs, invoices, work orders, or customer records
          automatically. Ops staff must follow up manually with the referred person.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-2 text-xs">
        {STATUS_OPTIONS.map((s) => (
          <Badge key={s} variant="outline" className={STATUS_COLORS[s]}>
            {s}: {counts[s] ?? 0}
          </Badge>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All referrals ({data.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tenant referrals yet.</p>
          ) : (
            <div className="divide-y">
              {data.map((r: any) => {
                const prop = r.tenant?.unit?.property;
                return (
                  <button
                    key={r.id}
                    onClick={() => openDialog(r)}
                    className="w-full text-left py-3 hover:bg-muted/40 -mx-2 px-2 rounded"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{r.friend_name}</p>
                      <Badge className={STATUS_COLORS[r.status] || ''}>{r.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Referred by{' '}
                      <strong>
                        {r.tenant?.first_name} {r.tenant?.last_name}
                      </strong>
                      {prop
                        ? ` · ${prop.property_name}${
                            r.tenant?.unit?.unit_label ? ` · Unit ${r.tenant.unit.unit_label}` : ''
                          }`
                        : ''}
                      {r.service_interest ? ` · Interested in: ${r.service_interest}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
                      {r.friend_phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {r.friend_phone}
                        </span>
                      )}
                      {r.friend_email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {r.friend_email}
                        </span>
                      )}
                      <span>Submitted {new Date(r.created_at).toLocaleString()}</span>
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Referral: {selected?.friend_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="rounded border p-3 bg-muted/30 space-y-1">
                <p>
                  <strong>Referred by:</strong> {selected.tenant?.first_name}{' '}
                  {selected.tenant?.last_name}
                </p>
                {selected.tenant?.unit?.property && (
                  <p className="text-xs text-muted-foreground">
                    {selected.tenant.unit.property.property_name}
                    {selected.tenant.unit?.unit_label
                      ? ` · Unit ${selected.tenant.unit.unit_label}`
                      : ''}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Tenant contact: {selected.tenant?.email || '—'}
                  {selected.tenant?.phone ? ` · ${selected.tenant.phone}` : ''}
                </p>
              </div>

              <div className="space-y-1">
                <p>
                  <strong>Friend / Neighbour:</strong> {selected.friend_name}
                </p>
                <p className="text-xs">Phone: {selected.friend_phone || '—'}</p>
                <p className="text-xs">Email: {selected.friend_email || '—'}</p>
                <p className="text-xs">
                  Service interest: {selected.service_interest || '—'}
                </p>
                {selected.notes && (
                  <p className="text-xs">
                    <strong>Referrer notes:</strong> {selected.notes}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Internal admin notes</label>
                <Textarea
                  rows={4}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Follow-up notes (not visible to tenants)…"
                />
              </div>

              <Alert className="border-amber-300 bg-amber-50 text-amber-900">
                <AlertDescription className="text-xs">
                  Referrals are leads only — no service is booked at the tenant's rental property.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
              onClick={() => save.mutate()}
              disabled={save.isPending}
            >
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
