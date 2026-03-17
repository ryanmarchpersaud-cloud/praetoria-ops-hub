import { useParams, useNavigate } from 'react-router-dom';
import { useQuote, useUpdateQuote, useQuoteLineItems, useUpsertLineItems } from '@/hooks/useQuotes';
import { StatusBadge } from '@/components/StatusBadge';
import { ApprovalWorkflowPanel } from '@/components/ApprovalWorkflow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Save, Trash2, ChevronDown, ChevronRight, Phone, Mail, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SERVICE_CATEGORIES } from '@/lib/constants';

interface LineItemForm {
  id?: string;
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
}

function CollapsibleSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer active:bg-muted/30 transition-colors">
            <CardTitle className="text-sm flex items-center justify-between">
              {title}
              {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: quote, isLoading } = useQuote(id);
  const { data: lineItems = [] } = useQuoteLineItems(id);
  const updateQuote = useUpdateQuote();
  const upsertItems = useUpsertLineItems();
  const { toast } = useToast();

  const [form, setForm] = useState<any>({});
  const [items, setItems] = useState<LineItemForm[]>([]);

  useEffect(() => { if (quote) setForm(quote); }, [quote]);
  useEffect(() => {
    if (lineItems.length > 0) {
      setItems(lineItems.map(li => ({
        id: li.id, item_name: li.item_name, description: li.description || '',
        quantity: Number(li.quantity), unit_price: Number(li.unit_price),
        line_total: Number(li.line_total), sort_order: li.sort_order || 0,
      })));
    }
  }, [lineItems]);

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Loading...</div>;
  if (!quote) return <div className="p-8 text-muted-foreground text-sm">Quote not found</div>;

  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));

  const recalculate = (updatedItems: LineItemForm[]) => {
    const subtotal = updatedItems.reduce((sum, i) => sum + i.line_total, 0);
    const taxRate = Number(form.tax_rate || 0.13);
    setForm((p: any) => ({ ...p, subtotal, tax: subtotal * taxRate, total: subtotal + subtotal * taxRate }));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      updated[idx].line_total = updated[idx].quantity * updated[idx].unit_price;
    }
    setItems(updated);
    recalculate(updated);
  };

  const addItem = () => {
    setItems([...items, { item_name: '', description: '', quantity: 1, unit_price: 0, line_total: 0, sort_order: items.length }]);
  };

  const removeItem = (idx: number) => {
    const updated = items.filter((_, i) => i !== idx);
    setItems(updated);
    recalculate(updated);
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateQuote.mutateAsync({
        id, service_category: form.service_category, scope_of_work: form.scope_of_work,
        agent_summary: form.agent_summary, internal_notes: form.internal_notes,
        approval_status: form.approval_status, follow_up_due_at: form.follow_up_due_at,
        tax_rate: Number(form.tax_rate || 0.13),
      });
      await upsertItems.mutateAsync({
        quoteId: id,
        items: items.filter(i => i.item_name).map((i, idx) => ({
          quote_id: id, item_name: i.item_name, description: i.description || null,
          quantity: i.quantity, unit_price: i.unit_price, sort_order: idx,
        })),
      });
      toast({ title: 'Quote saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      const updates: any = { id, approval_status: newStatus as any };
      if (newStatus === 'Sent') { updates.sent_status = 'Sent'; updates.sent_at = new Date().toISOString(); }
      await updateQuote.mutateAsync(updates);
      toast({ title: `Quote ${newStatus.toLowerCase()}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const lead = (quote as any).leads;
  const isSentOrApproved = ['Sent', 'Approved'].includes(form.approval_status);
  const validItems = items.filter(i => i.item_name);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => navigate('/quotes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg md:text-xl font-bold mono">{quote.quote_number}</h1>
            <StatusBadge status={form.approval_status || 'Draft'} />
          </div>
          {lead && (
            <p className="text-xs text-muted-foreground truncate">
              {lead.first_name} {lead.last_name}{lead.company_name ? ` — ${lead.company_name}` : ''}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl md:text-2xl font-bold">${Number(form.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
      </div>

      {/* ── Save Bar ── */}
      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1 h-11" disabled={updateQuote.isPending}>
          <Save className="h-4 w-4 mr-2" /> Save Quote
        </Button>
        <Button variant="outline" className="h-11 shrink-0" onClick={() => navigate(`/quotes/${id}/print`)}>
          <Printer className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Mobile: Workflow first, then content ── */}
      {/* On mobile, workflow panel appears before content for quick status actions */}
      <div className="lg:hidden">
        <ApprovalWorkflowPanel
          status={form.approval_status || 'Draft'}
          agentSummary={form.agent_summary || ''}
          total={Number(form.total || 0)}
          lineItemCount={validItems.length}
          sentAt={quote.sent_at}
          followUpDueAt={form.follow_up_due_at}
          createdAt={quote.created_at}
          onStatusChange={handleStatusChange}
          isUpdating={updateQuote.isPending}
        />
      </div>

      {/* ── Client Quick Info (mobile) ── */}
      {lead && (
        <Card className="lg:hidden">
          <CardContent className="py-3">
            <div className="flex flex-wrap gap-3 text-sm">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-primary active:opacity-70 min-h-[44px]">
                  <Phone className="h-3.5 w-3.5" /> {lead.phone}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-primary active:opacity-70 min-h-[44px]">
                  <Mail className="h-3.5 w-3.5" /> <span className="truncate max-w-[160px]">{lead.email}</span>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* ── Left Column: Content ── */}
        <div className="lg:col-span-2 space-y-3">
          {/* Service & Scope — always visible */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label className="text-xs">Service Category</Label>
                <select value={form.service_category || ''} onChange={e => set('service_category', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10" disabled={isSentOrApproved}>
                  {SERVICE_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Scope of Work</Label>
                <Textarea value={form.scope_of_work || ''} onChange={e => set('scope_of_work', e.target.value)} rows={3} disabled={isSentOrApproved} />
              </div>
            </CardContent>
          </Card>

          {/* ── Line Items ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                Line Items ({validItems.length})
                {!isSentOrApproved && (
                  <Button size="sm" variant="outline" onClick={addItem} className="h-8">
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No line items yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Desktop: grid view */}
                  <div className="hidden md:block space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-1">
                      <div className="col-span-4">Item</div>
                      <div className="col-span-3">Description</div>
                      <div className="col-span-1 text-center">Qty</div>
                      <div className="col-span-2 text-right">Price</div>
                      <div className="col-span-1 text-right">Total</div>
                      <div className="col-span-1"></div>
                    </div>
                    {items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4"><Input value={item.item_name} onChange={e => updateItem(idx, 'item_name', e.target.value)} placeholder="Item" disabled={isSentOrApproved} className="h-9" /></div>
                        <div className="col-span-3"><Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Desc" disabled={isSentOrApproved} className="h-9" /></div>
                        <div className="col-span-1"><Input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="text-center h-9" disabled={isSentOrApproved} /></div>
                        <div className="col-span-2"><Input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} className="text-right h-9" disabled={isSentOrApproved} /></div>
                        <div className="col-span-1 text-sm font-medium text-right mono">${item.line_total.toFixed(2)}</div>
                        <div className="col-span-1">{!isSentOrApproved && <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8"><Trash2 className="h-3 w-3" /></Button>}</div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile: card view */}
                  <div className="md:hidden space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <Input value={item.item_name} onChange={e => updateItem(idx, 'item_name', e.target.value)} placeholder="Item name" disabled={isSentOrApproved} className="h-9 font-medium" />
                            <Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description" disabled={isSentOrApproved} className="h-9 text-sm" />
                          </div>
                          {!isSentOrApproved && (
                            <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-9 w-9 shrink-0">
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 items-end">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Qty</Label>
                            <Input type="number" inputMode="decimal" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="h-9 text-center" disabled={isSentOrApproved} />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Price</Label>
                            <Input type="number" inputMode="decimal" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} className="h-9 text-right" disabled={isSentOrApproved} />
                          </div>
                          <div className="text-right pb-1">
                            <Label className="text-[10px] text-muted-foreground">Total</Label>
                            <p className="text-sm font-semibold mono">${item.line_total.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <Separator />
                  <div className="text-right space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      Subtotal: <span className="font-medium text-foreground ml-1">${Number(form.subtotal || 0).toFixed(2)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tax ({((Number(form.tax_rate) || 0.13) * 100).toFixed(0)}%):
                      <span className="font-medium text-foreground ml-1">${Number(form.tax || 0).toFixed(2)}</span>
                    </p>
                    <p className="text-base font-bold mt-1">
                      Total: <span className="mono">${Number(form.total || 0).toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Notes (collapsible) ── */}
          <CollapsibleSection title="Notes & Settings" defaultOpen={false}>
            <div>
              <Label className="text-xs">Agent Summary</Label>
              <Textarea value={form.agent_summary || ''} onChange={e => set('agent_summary', e.target.value)} rows={3} placeholder="AI-generated or agent notes" />
            </div>
            <div>
              <Label className="text-xs">Internal Notes</Label>
              <Textarea value={form.internal_notes || ''} onChange={e => set('internal_notes', e.target.value)} rows={2} placeholder="Staff-only notes" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tax Rate (%)</Label>
                <Input type="number" inputMode="decimal" step="0.01"
                  value={((Number(form.tax_rate) || 0.13) * 100).toFixed(2)}
                  onChange={e => {
                    const rate = Number(e.target.value) / 100;
                    const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
                    setForm((p: any) => ({ ...p, tax_rate: rate, subtotal, tax: subtotal * rate, total: subtotal + subtotal * rate }));
                  }}
                  disabled={isSentOrApproved} className="h-10" />
              </div>
              <div>
                <Label className="text-xs">Follow-up Due</Label>
                <Input type="datetime-local" value={form.follow_up_due_at ? form.follow_up_due_at.slice(0, 16) : ''} onChange={e => set('follow_up_due_at', e.target.value)} className="h-10" />
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* ── Right Column: Workflow (desktop) + Client ── */}
        <div className="space-y-4">
          {/* Workflow — desktop only (already shown on mobile above) */}
          <div className="hidden lg:block">
            <ApprovalWorkflowPanel
              status={form.approval_status || 'Draft'}
              agentSummary={form.agent_summary || ''}
              total={Number(form.total || 0)}
              lineItemCount={validItems.length}
              sentAt={quote.sent_at}
              followUpDueAt={form.follow_up_due_at}
              createdAt={quote.created_at}
              onStatusChange={handleStatusChange}
              isUpdating={updateQuote.isPending}
            />
          </div>

          {/* Client info — desktop */}
          {lead && (
            <Card className="hidden lg:block">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Client</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                <p className="font-medium">{lead.first_name} {lead.last_name}</p>
                {lead.company_name && <p className="text-muted-foreground">{lead.company_name}</p>}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="text-primary text-xs hover:underline block">{lead.email}</a>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="text-primary text-xs hover:underline block">{lead.phone}</a>
                )}
                {lead.address_line_1 && <p className="text-xs text-muted-foreground">{lead.address_line_1}, {lead.city} {lead.province}</p>}
                <Link to={`/leads/${lead.id}`} className="text-primary text-xs hover:underline inline-block mt-1">View Lead →</Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
