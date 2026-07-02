import { useMemo, useState } from 'react';
import { OwnerLayout } from '@/components/owner/OwnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Receipt, ExternalLink, FileText, Loader2 } from 'lucide-react';
import {
  useOwnerExpenses,
  useOwnerExpenseAttachments,
  useOwnerProperties,
  getOwnerReceiptSignedUrl,
} from '@/hooks/useOwnerPortal';
import { toast } from '@/hooks/use-toast';
import { formatStatusLabel } from '@/lib/statusLabel';

function formatMoney(n?: number | string | null) {
  const v = Number(n ?? 0);
  return v.toLocaleString(undefined, { style: 'currency', currency: 'CAD' });
}

function statusTone(s?: string) {
  switch ((s || '').toLowerCase()) {
    case 'paid':
    case 'reimbursed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'pending':
    case 'draft':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'approved':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'billable':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'cancelled':
    case 'disputed':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function ReceiptList({ expenseId }: { expenseId: string }) {
  const { data: atts = [], isLoading } = useOwnerExpenseAttachments(expenseId);
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function openReceipt(id: string, path: string) {
    try {
      setOpeningId(id);
      const url = await getOwnerReceiptSignedUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast({ title: 'Could not open receipt', description: e.message, variant: 'destructive' });
    } finally {
      setOpeningId(null);
    }
  }

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading receipts…</p>;
  if (atts.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Receipts</p>
      <ul className="space-y-1">
        {atts.map((a: any) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => openReceipt(a.id, a.storage_path)}
              className="w-full flex items-center gap-2 text-left text-sm px-2 py-1.5 rounded border hover:bg-accent"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              <span className="truncate">{a.file_name}</span>
              {openingId === a.id ? (
                <Loader2 className="h-3.5 w-3.5 ml-auto animate-spin" />
              ) : (
                <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function OwnerExpenses() {
  const [propertyId, setPropertyId] = useState<string>('all');
  const { data: properties = [] } = useOwnerProperties();
  const { data: rows = [], isLoading } = useOwnerExpenses(propertyId === 'all' ? undefined : propertyId);

  const total = useMemo(() => (rows as any[]).reduce((s, r) => s + Number(r.total || 0), 0), [rows]);

  return (
    <OwnerLayout>
      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Property Expenses</p>
                <h2 className="text-lg font-semibold">Owner-visible spending</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Only expenses shared with you by Praetoria Group appear here. Internal notes
                  and vendor pricing are hidden unless intentionally shared.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="All properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All properties</SelectItem>
                  {(properties as any[]).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.property_name || p.address_line_1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="sm:ml-auto text-sm text-muted-foreground">
                {rows.length} {rows.length === 1 ? 'expense' : 'expenses'} · Total{' '}
                <span className="font-semibold text-foreground">{formatMoney(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent></Card>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No owner-visible expenses yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(rows as any[]).map((r) => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{r.category || 'Expense'}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {r.property?.property_name || r.property?.address_line_1}
                        {r.unit?.unit_label ? ` · ${r.unit.unit_label}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold">{formatMoney(r.total)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.expense_date ? new Date(r.expense_date).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={statusTone(r.status)}>{formatStatusLabel(r.status || 'draft')}</Badge>
                    {r.is_billable_to_owner && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                        Billable to owner
                      </Badge>
                    )}
                    {r.work_order?.work_order_number && (
                      <Badge variant="outline" className="bg-slate-50 text-slate-700">
                        {r.work_order.work_order_number}
                      </Badge>
                    )}
                  </div>

                  {(r.owner_visible_note || r.description) && (
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                      {r.owner_visible_note || r.description}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <p className="text-muted-foreground">Subtotal</p>
                      <p className="font-medium">{formatMoney(r.subtotal)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">GST</p>
                      <p className="font-medium">{formatMoney(r.gst_amount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">PST</p>
                      <p className="font-medium">{formatMoney(r.pst_amount)}</p>
                    </div>
                  </div>

                  <ReceiptList expenseId={r.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardContent className="p-4 text-xs text-muted-foreground">
            Questions about a charge?{' '}
            <a href="mailto:ops@praetoriagroup.ca" className="text-emerald-700 underline">
              ops@praetoriagroup.ca
            </a>
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
