import { useState } from 'react';
import { OwnerLayout } from '@/components/owner/OwnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Printer, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useOwnerScope, scopeBlocksAll } from '@/hooks/useOwnerScope';
import { formatStatusLabel } from '@/lib/statusLabel';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n || 0);

export default function OwnerStatements() {
  const scope = useOwnerScope();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: statements = [], isLoading } = useQuery({
    queryKey: ['owner-portal-statements', scope],
    enabled: scope.ready,
    queryFn: async () => {
      if (scopeBlocksAll(scope)) return [];
      let q = supabase.from('pm_owner_statements' as any).select('*')
        .eq('owner_visible', true)
        .in('status', ['finalized','shared'])
        .order('period_end', { ascending: false });
      if (scope.isPreview && scope.ownerId) q = q.eq('owner_id', scope.ownerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return (
    <OwnerLayout>
      <div className="p-4 space-y-3">
        {openId ? (
          <StatementDetail id={openId} onBack={() => setOpenId(null)} />
        ) : (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Owner Statements</h2>
              <p className="text-xs text-muted-foreground">Monthly summary of rent, expenses, and net owner amounts.</p>
            </div>
            {isLoading ? (
              <div className="text-sm text-muted-foreground p-6 text-center">Loading…</div>
            ) : statements.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-10 w-10 mx-auto opacity-30 mb-2" />
                  <p className="text-sm text-muted-foreground">No statements have been shared with you yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {statements.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setOpenId(s.id)}
                    className="w-full text-left"
                  >
                    <Card className="hover:border-emerald-300 transition-colors">
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-slate-500">{s.statement_number}</span>
                            <Badge className="bg-emerald-100 text-emerald-800">{formatStatusLabel(s.status)}</Badge>
                          </div>
                          <div className="text-sm font-medium mt-0.5">
                            {format(new Date(s.period_start), 'MMM d')} – {format(new Date(s.period_end), 'MMM d, yyyy')}
                          </div>
                          <div className="text-[11px] text-muted-foreground">Rent collected: {fmt(Number(s.rent_collected))} · Expenses: {fmt(Number(s.property_expenses) + Number(s.maintenance_expenses))}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] uppercase text-muted-foreground">Net to you</div>
                          <div className={`text-base font-bold flex items-center gap-1 ${Number(s.net_owner_amount) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {Number(s.net_owner_amount) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            {fmt(Number(s.net_owner_amount))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </OwnerLayout>
  );
}

function StatementDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: stmt } = useQuery({
    queryKey: ['owner-stmt', id],
    queryFn: async () => {
      const { data } = await supabase.from('pm_owner_statements' as any).select('*').eq('id', id).maybeSingle();
      return data;
    },
  });
  const { data: lines = [] } = useQuery({
    queryKey: ['owner-stmt-lines', id],
    queryFn: async () => {
      const { data } = await supabase.from('pm_owner_statement_lines' as any).select('*').eq('statement_id', id).order('line_date', { ascending: true });
      return (data ?? []) as any[];
    },
  });
  const { data: property } = useQuery({
    queryKey: ['owner-stmt-prop', (stmt as any)?.property_id],
    enabled: !!(stmt as any)?.property_id,
    queryFn: async () => {
      const { data } = await supabase.from('pm_managed_properties').select('*').eq('id', (stmt as any).property_id).maybeSingle();
      return data;
    },
  });

  if (!stmt) return <div className="text-sm text-muted-foreground p-4">Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <Button variant="outline" size="sm" onClick={() => window.open(`/owner/statements/${id}/print`, '_blank')}><Printer className="h-4 w-4 mr-1" />Print / PDF</Button>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span>Statement {(stmt as any).statement_number}</span>
            <Badge className="bg-emerald-100 text-emerald-800">{formatStatusLabel((stmt as any).status)}</Badge>
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {format(new Date((stmt as any).period_start), 'MMM d, yyyy')} – {format(new Date((stmt as any).period_end), 'MMM d, yyyy')}
          </div>
          {property && <div className="text-xs text-muted-foreground">{(property as any).address_line_1}, {(property as any).city}</div>}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Rent Collected" value={fmt(Number((stmt as any).rent_collected))} />
          <Row label="Property Expenses" value={`- ${fmt(Number((stmt as any).property_expenses))}`} />
          <Row label="Maintenance" value={`- ${fmt(Number((stmt as any).maintenance_expenses))}`} />
          <Row label="Management Fees" value={`- ${fmt(Number((stmt as any).management_fees))}`} />
          <Row label="Adjustments / Credits" value={fmt(Number((stmt as any).adjustments))} />
          <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
            <span>Net Owner Amount</span>
            <span className={Number((stmt as any).net_owner_amount) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{fmt(Number((stmt as any).net_owner_amount))}</span>
          </div>
        </CardContent>
      </Card>

      {(stmt as any).owner_visible_notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notes from Praetoria</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{(stmt as any).owner_visible_notes}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Line Items</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {lines.length === 0 ? (
            <p className="text-xs text-muted-foreground">No line items.</p>
          ) : lines.map((l) => (
            <div key={l.id} className="border rounded p-2 flex justify-between gap-2 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{formatStatusLabel(l.line_type)}</Badge>
                  {l.line_date && <span className="text-[11px] text-muted-foreground">{format(new Date(l.line_date), 'MMM d')}</span>}
                </div>
                <div className="mt-0.5">{l.description || '—'}</div>
                {l.owner_visible_note && <div className="text-[11px] text-slate-600 mt-0.5">{l.owner_visible_note}</div>}
              </div>
              <div className="text-right font-medium whitespace-nowrap">{fmt(Number(l.amount))}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>
  );
}
