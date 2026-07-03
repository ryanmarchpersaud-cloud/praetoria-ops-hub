import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { signInspectionPhoto } from '@/hooks/pm/usePmInspections';

export type InspectionPrintMode = 'admin' | 'tenant' | 'owner';

interface Props {
  id: string;
  mode: InspectionPrintMode;
  backHref?: string;
}

const CONDITION_COLORS: Record<string, string> = {
  excellent: '#059669',
  good: '#10b981',
  fair: '#d97706',
  poor: '#f97316',
  damaged: '#dc2626',
  needs_cleaning: '#7c3aed',
  not_applicable: '#6b7280',
};

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return d; }
}

function labelize(v?: string | null) {
  return (v ?? '').replace(/_/g, ' ');
}

export function InspectionPrintView({ id, mode, backHref }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pm_inspection_print', id, mode],
    queryFn: async () => {
      const [{ data: insp, error: ie }, itemsRes, photosRes] = await Promise.all([
        supabase.from('pm_inspections').select('*').eq('id', id).maybeSingle(),
        supabase.from('pm_inspection_items').select('*').eq('inspection_id', id).order('sort_order'),
        supabase.from('pm_inspection_photos').select('*').eq('inspection_id', id).order('created_at'),
      ]);
      if (ie) throw ie;
      if (!insp) throw new Error('Inspection not found');

      // Related lookups (only admin needs full detail; tenant/owner get property/unit basics)
      const [propRes, unitRes, tenantRes, ownerRes, leaseRes, creatorRes, assignedRes] = await Promise.all([
        insp.property_id ? supabase.from('properties').select('id,name,address,city,province,postal_code').eq('id', insp.property_id).maybeSingle() : Promise.resolve({ data: null }),
        insp.unit_id ? supabase.from('pm_units').select('id,unit_label,bedrooms,bathrooms').eq('id', insp.unit_id).maybeSingle() : Promise.resolve({ data: null }),
        mode === 'admin' && insp.tenant_id ? supabase.from('pm_tenants').select('id,full_name,email,phone').eq('id', insp.tenant_id).maybeSingle() : Promise.resolve({ data: null }),
        mode === 'admin' && insp.owner_id ? supabase.from('pm_property_owners').select('id,full_name,email').eq('id', insp.owner_id).maybeSingle() : Promise.resolve({ data: null }),
        mode === 'admin' && insp.lease_id ? supabase.from('pm_leases').select('id,start_date,end_date,status').eq('id', insp.lease_id).maybeSingle() : Promise.resolve({ data: null }),
        mode === 'admin' && insp.created_by ? supabase.from('profiles').select('id,full_name,email').eq('id', insp.created_by).maybeSingle() : Promise.resolve({ data: null }),
        mode === 'admin' && insp.assigned_to ? supabase.from('profiles').select('id,full_name,email').eq('id', insp.assigned_to).maybeSingle() : Promise.resolve({ data: null }),
      ] as const);

      return {
        inspection: insp,
        items: itemsRes.data ?? [],
        photos: photosRes.data ?? [],
        property: (propRes as any).data,
        unit: (unitRes as any).data,
        tenant: (tenantRes as any).data,
        owner: (ownerRes as any).data,
        lease: (leaseRes as any).data,
        creator: (creatorRes as any).data,
        assigned: (assignedRes as any).data,
      };
    },
  });

  const { visibleItems, visiblePhotos } = useMemo(() => {
    if (!data) return { visibleItems: [] as any[], visiblePhotos: [] as any[] };
    if (mode === 'admin') return { visibleItems: data.items, visiblePhotos: data.photos };
    const key = mode === 'tenant' ? 'tenant_visible' : 'owner_visible';
    return {
      visibleItems: (data.items as any[]).filter((i) => i[key]),
      visiblePhotos: (data.photos as any[]).filter((p) => p[key]),
    };
  }, [data, mode]);

  const [signed, setSigned] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      await Promise.all(
        (visiblePhotos as any[]).map(async (p) => {
          try { out[p.id] = await signInspectionPhoto(p.file_path, 3600); } catch { /* placeholder */ }
        }),
      );
      if (!cancelled) setSigned(out);
    })();
    return () => { cancelled = true; };
  }, [visiblePhotos]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading inspection report…</div>;
  if (error || !data) return <div className="p-6 text-sm text-destructive">Unable to load this inspection report.</div>;

  const insp: any = data.inspection;

  // Visibility-safe summaries / notes
  const summary = insp.summary || '';
  const tenantNotes = insp.tenant_visible_notes || '';
  const ownerNotes = insp.owner_visible_notes || '';
  const adminNotes = insp.admin_notes || '';

  const propertyLine = data.property
    ? [data.property.name, data.property.address, [data.property.city, data.property.province, data.property.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(' — ')
    : '—';

  // Group items by area
  const grouped = (visibleItems as any[]).reduce<Record<string, any[]>>((acc, it) => {
    (acc[it.area] ||= []).push(it);
    return acc;
  }, {});

  const modeLabel = mode === 'admin' ? 'Internal Report' : mode === 'tenant' ? 'Tenant Copy' : 'Owner Copy';

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white">
      {/* Toolbar (hidden on print) */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {backHref && (
            <Button asChild variant="ghost" size="sm">
              <a href={backHref}><ArrowLeft className="h-4 w-4 mr-1" /> Back</a>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">Inspection Report — {modeLabel}</span>
        </div>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" /> Print / Save as PDF
        </Button>
      </div>

      {/* Page */}
      <div className="max-w-[8.5in] mx-auto bg-white shadow print:shadow-none my-6 print:my-0 print:max-w-none">
        {/* Header */}
        <div
          className="px-8 py-6 text-white flex items-start justify-between"
          style={{ background: '#0F172A' }}
        >
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-300">Praetoria Group</div>
            <h1 className="text-2xl font-extrabold mt-1">{insp.title}</h1>
            <div className="text-xs text-slate-300 mt-1">Property Management • Inspection Report • {modeLabel}</div>
          </div>
          <div className="text-right">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }}
            >
              {labelize(insp.status)}
            </span>
            <div className="text-[11px] text-slate-300 mt-2">Printed {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-8 py-5 border-b">
          <SummaryCard label="Inspection Type" value={labelize(insp.inspection_type)} />
          <SummaryCard label="Inspection Date" value={fmtDate(insp.inspected_at || insp.completed_at || insp.scheduled_for)} />
          <SummaryCard label="Property" value={data.property?.name ?? '—'} />
          <SummaryCard label="Unit" value={data.unit?.unit_label ?? '—'} />
        </div>

        {/* Details grid */}
        <div className="px-8 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm border-b">
          <Row k="Property address" v={propertyLine} />
          {mode === 'admin' && <Row k="Tenant" v={data.tenant?.full_name ?? '—'} />}
          {mode === 'admin' && <Row k="Owner" v={data.owner?.full_name ?? '—'} />}
          {mode === 'admin' && data.lease && <Row k="Lease" v={`${fmtDate(data.lease.start_date)} → ${fmtDate(data.lease.end_date)}`} />}
          {mode === 'admin' && <Row k="Created by" v={data.creator?.full_name ?? data.creator?.email ?? '—'} />}
          {mode === 'admin' && <Row k="Assigned to" v={data.assigned?.full_name ?? data.assigned?.email ?? '—'} />}
          {mode === 'admin' && <Row k="Scheduled for" v={fmtDate(insp.scheduled_for)} />}
          {mode === 'admin' && <Row k="Completed" v={fmtDate(insp.completed_at)} />}
          {mode === 'admin' && <Row k="Reviewed" v={fmtDate(insp.reviewed_at)} />}
        </div>

        {/* Summary */}
        {summary && (
          <Section title="Summary">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{summary}</p>
          </Section>
        )}

        {/* Notes — visibility-scoped */}
        {mode === 'admin' && adminNotes && (
          <Section title="Admin-only notes" accent="#dc2626">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{adminNotes}</p>
          </Section>
        )}
        {(mode === 'admin' || mode === 'tenant') && tenantNotes && (
          <Section title="Tenant-visible notes" accent="#0f766e">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{tenantNotes}</p>
          </Section>
        )}
        {(mode === 'admin' || mode === 'owner') && ownerNotes && (
          <Section title="Owner-visible notes" accent="#b45309">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{ownerNotes}</p>
          </Section>
        )}

        {/* Checklist */}
        <Section title="Checklist & condition ratings">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-muted-foreground">No checklist items {mode !== 'admin' ? 'shared for this copy.' : 'recorded.'}</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([area, rows]) => (
                <div key={area} className="border rounded-md overflow-hidden print:break-inside-avoid">
                  <div className="px-3 py-2 text-xs font-bold uppercase tracking-wide bg-slate-100 border-b">{area}</div>
                  <table className="w-full text-sm">
                    <thead className="text-[11px] uppercase text-muted-foreground">
                      <tr className="border-b">
                        <th className="text-left px-3 py-1.5 font-semibold">Item</th>
                        <th className="text-left px-3 py-1.5 font-semibold">Condition</th>
                        <th className="text-left px-3 py-1.5 font-semibold">Flags</th>
                        <th className="text-left px-3 py-1.5 font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((it) => {
                        const color = CONDITION_COLORS[it.condition] || '#6b7280';
                        return (
                          <tr key={it.id} className="border-b last:border-0 align-top">
                            <td className="px-3 py-2 font-medium">{it.item_label || '—'}</td>
                            <td className="px-3 py-2">
                              <span
                                className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                                style={{ background: `${color}18`, color, border: `1px solid ${color}55` }}
                              >
                                {labelize(it.condition)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[11px] space-x-1">
                              {it.issue_found && <Badge variant="destructive" className="text-[10px]">Issue</Badge>}
                              {it.repair_needed && <Badge variant="secondary" className="text-[10px]">Repair</Badge>}
                              {it.cleaning_needed && <Badge variant="outline" className="text-[10px]">Cleaning</Badge>}
                            </td>
                            <td className="px-3 py-2 text-[12px] whitespace-pre-wrap">{it.notes || ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Photos */}
        <Section title="Photos">
          {visiblePhotos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos {mode !== 'admin' ? 'shared for this copy.' : 'attached.'}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(visiblePhotos as any[]).map((p) => {
                const url = signed[p.id];
                return (
                  <figure key={p.id} className="border rounded-md overflow-hidden print:break-inside-avoid">
                    <div className="aspect-video bg-slate-100 flex items-center justify-center">
                      {url ? (
                        <img src={url} alt={p.caption || p.file_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Photo unavailable</span>
                      )}
                    </div>
                    <figcaption className="px-2 py-1.5 text-[11px] text-muted-foreground">
                      {p.caption || p.file_name}
                      {mode === 'admin' && (
                        <span className="ml-2">
                          {p.tenant_visible && <span className="mr-1 text-teal-700">•tenant</span>}
                          {p.owner_visible && <span className="mr-1 text-amber-700">•owner</span>}
                        </span>
                      )}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          )}
        </Section>

        {/* Disclaimer / footer */}
        <div className="px-8 py-5 border-t text-[11px] text-muted-foreground leading-relaxed">
          {mode === 'admin' && <p>Internal Praetoria Group document. Contains information not to be shared outside authorized staff.</p>}
          {mode === 'tenant' && <p>This is a tenant copy of the inspection report shared by Praetoria Group. It reflects only items marked visible to the tenant.</p>}
          {mode === 'owner' && <p>This is an owner copy of the inspection report shared by Praetoria Group. It reflects only items marked visible to the property owner.</p>}
        </div>

        {/* Footer bar */}
        <div className="px-8 py-4 text-[11px] text-white flex items-center justify-between" style={{ background: '#0F172A' }}>
          <span>Praetoria Group • Property Management</span>
          <span>support@praetoriagroup.ca • praetoriagroup.ca</span>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          @page { size: letter; margin: 0.5in; }
          body { background: #fff !important; }
          .print\\:hidden { display: none !important; }
          .print\\:break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
          .shadow { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3 bg-slate-50">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm font-semibold mt-0.5 truncate">{value}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground min-w-[8rem]">{k}:</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <section className="px-8 py-5 border-b print:break-inside-avoid">
      <h2
        className="text-sm font-bold uppercase tracking-wide mb-3 pb-1 border-b-2"
        style={{ borderColor: accent || '#0F172A', color: accent || '#0F172A' }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
