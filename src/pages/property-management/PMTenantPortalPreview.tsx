import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Home, FileText, Wrench, Bell, User as UserIcon, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useEmergencyContacts, useInsurance, useOccupants, useVehicles, usePets, useInspections,
} from '@/hooks/useTenantProfile';

/**
 * Admin preview of the tenant portal — READ ONLY.
 *
 * Renders inside the admin AppLayout so admin identity is unambiguous, and
 * shows a persistent banner. Reads use RLS as ops staff so we can safely
 * scope every query by tenant_id. No tenant actions are performed here.
 */
export default function PMTenantPortalPreview() {
  const { id } = useParams<{ id: string }>();
  const tenantId = id!;

  const { data: tenant } = useQuery({
    enabled: !!tenantId,
    queryKey: ['pm-preview', 'tenant', tenantId],
    queryFn: async () => {
      const { data } = await (supabase as any).from('pm_tenants').select('*').eq('id', tenantId).maybeSingle();
      return data;
    },
  });

  const { data: leases = [] } = useQuery({
    enabled: !!tenantId,
    queryKey: ['pm-preview', 'leases', tenantId],
    queryFn: async () => {
      const { data } = await (supabase as any).from('pm_leases').select('*').eq('tenant_id', tenantId);
      return data ?? [];
    },
  });
  const activeLease = leases.find((l: any) => l.status === 'active') ?? leases[0] ?? null;

  const { data: ledger = [] } = useQuery({
    enabled: !!tenantId,
    queryKey: ['pm-preview', 'ledger', tenantId],
    queryFn: async () => {
      const { data } = await (supabase as any).from('pm_tenant_ledger').select('*').eq('tenant_id', tenantId).order('entry_date', { ascending: false }).limit(50);
      return data ?? [];
    },
  });
  const balance = ledger.reduce((s: number, r: any) => {
    const a = Number(r.amount) || 0;
    if (['charge', 'late_fee'].includes(r.type)) return s + a;
    if (['payment', 'credit', 'refund'].includes(r.type)) return s - a;
    return s;
  }, 0);

  const { data: notices = [] } = useQuery({
    enabled: !!tenantId,
    queryKey: ['pm-preview', 'notices', tenantId],
    queryFn: async () => {
      const propId = activeLease?.property_id ?? null;
      const q = (supabase as any).from('pm_tenant_notices').select('*').order('published_at', { ascending: false }).limit(50);
      const { data } = propId
        ? await q.or(`tenant_id.eq.${tenantId},property_id.eq.${propId}`)
        : await q.eq('tenant_id', tenantId);
      return data ?? [];
    },
  });

  const { data: docs = [] } = useQuery({
    enabled: !!tenantId,
    queryKey: ['pm-preview', 'docs', tenantId],
    queryFn: async () => {
      const propId = activeLease?.property_id ?? null;
      const q = (supabase as any).from('pm_tenant_documents').select('*').order('shared_at', { ascending: false });
      const { data } = propId
        ? await q.or(`tenant_id.eq.${tenantId},property_id.eq.${propId}`)
        : await q.eq('tenant_id', tenantId);
      return data ?? [];
    },
  });

  const { data: contacts = [] } = useEmergencyContacts(tenantId);
  const { data: ins } = useInsurance(tenantId);
  const { data: occ = [] } = useOccupants(tenantId);
  const { data: veh = [] } = useVehicles(tenantId);
  const { data: pets = [] } = usePets(tenantId);
  const { data: inspections = [] } = useInspections(tenantId);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/property-management/tenants/${tenantId}`}><ArrowLeft className="h-4 w-4 mr-1" />Back to tenant</Link>
        </Button>
      </div>

      <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-3 flex items-start gap-2">
        <Eye className="h-5 w-5 text-amber-700 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-900">Admin Preview — You are viewing this tenant portal as Praetoria Admin.</p>
          <p className="text-amber-800 text-xs">Read only. No tenant actions will be performed and no audit events will record as this tenant.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserIcon className="h-4 w-4" /> Tenant</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <p className="font-medium">{[tenant?.first_name, tenant?.last_name].filter(Boolean).join(' ')}</p>
          <p className="text-xs text-muted-foreground">{tenant?.email} · {tenant?.phone}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Home className="h-4 w-4 text-emerald-700" /> Balance</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${balance.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4 text-emerald-700" /> Notices</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{notices.length} <span className="text-sm text-muted-foreground font-normal">({notices.filter((n: any) => !n.ack_at).length} unread)</span></p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Shared Documents ({docs.length})</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {docs.length === 0 ? <p className="text-muted-foreground">None shared.</p> : docs.map((d: any) => (
            <div key={d.id} className="border rounded p-2 text-xs">{d.title} — {d.category}</div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4" /> Emergency contacts ({contacts.length})</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {contacts.length === 0 ? <p className="text-muted-foreground">None on file.</p> : contacts.map((c: any) => (
            <div key={c.id} className="border rounded p-2 text-xs">{c.contact_name}{c.is_primary && <Badge className="ml-1 bg-emerald-100 text-emerald-800">Primary</Badge>} — {c.phone}</div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Insurance</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <Badge variant={ins?.status === 'provided' ? 'default' : 'secondary'}>{(ins?.status ?? 'not_provided').replace('_', ' ')}</Badge>
          {ins?.provider && <p className="mt-1 text-xs">{ins.provider} · {ins.policy_number} · expires {ins.coverage_expiry ?? '—'}</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Occupants ({occ.length})</CardTitle></CardHeader><CardContent className="text-xs">{occ.map((o: any) => <div key={o.id}>{o.occupant_name}</div>)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Vehicles ({veh.length})</CardTitle></CardHeader><CardContent className="text-xs">{veh.map((v: any) => <div key={v.id}>{v.make_model}</div>)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pets ({pets.length})</CardTitle></CardHeader><CardContent className="text-xs">{pets.map((p: any) => <div key={p.id}>{p.pet_name}</div>)}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Inspections shared with tenant</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {inspections.filter((i: any) => i.tenant_visible && i.status === 'shared').length === 0 && <p className="text-muted-foreground">No inspections currently shared with the tenant.</p>}
          {inspections.filter((i: any) => i.tenant_visible && i.status === 'shared').map((i: any) => (
            <div key={i.id} className="border rounded p-2 text-xs">{i.inspection_type} · {i.inspection_date}</div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center pt-2">Admin preview · Praetoria Group</p>
    </div>
  );
}
