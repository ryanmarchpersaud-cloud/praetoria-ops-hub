import { useParams, useNavigate } from 'react-router-dom';
import { useQuote, useUpdateQuote, useQuoteLineItems, useUpsertLineItems } from '@/hooks/useQuotes';
import { StatusBadge } from '@/components/StatusBadge';
import { ApprovalWorkflowPanel } from '@/components/ApprovalWorkflow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
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

  useEffect(() => {
    if (quote) setForm(quote);
  }, [quote]);

  useEffect(() => {
    if (lineItems.length > 0) {
      setItems(lineItems.map(li => ({
        id: li.id,
        item_name: li.item_name,
        description: li.description || '',
        quantity: Number(li.quantity),
        unit_price: Number(li.unit_price),
        line_total: Number(li.line_total),
        sort_order: li.sort_order || 0,
      })));
    }
  }, [lineItems]);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!quote) return <div className="p-8 text-muted-foreground">Quote not found</div>;

  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));

  const recalculate = (updatedItems: LineItemForm[]) => {
    const subtotal = updatedItems.reduce((sum, i) => sum + i.line_total, 0);
    const taxRate = Number(form.tax_rate || 0.13);
    const tax = subtotal * taxRate;
    setForm((p: any) => ({ ...p, subtotal, tax, total: subtotal + tax }));
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
        id,
        service_category: form.service_category,
        scope_of_work: form.scope_of_work,
        agent_summary: form.agent_summary,
        internal_notes: form.internal_notes,
        approval_status: form.approval_status,
        follow_up_due_at: form.follow_up_due_at,
        tax_rate: Number(form.tax_rate || 0.13),
      });
      await upsertItems.mutateAsync({
        quoteId: id,
        items: items.filter(i => i.item_name).map((i, idx) => ({
          quote_id: id,
          item_name: i.item_name,
          description: i.description || null,
          quantity: i.quantity,
          unit_price: i.unit_price,
          sort_order: idx,
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
      if (newStatus === 'Sent') {
        updates.sent_status = 'Sent';
        updates.sent_at = new Date().toISOString();
      }
      await updateQuote.mutateAsync(updates);
      toast({ title: `Quote ${newStatus.toLowerCase()}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const lead = (quote as any).leads;
  const isSentOrApproved = ['Sent', 'Approved'].includes(form.approval_status);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/quotes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold mono">{quote.quote_number}</h1>
            <StatusBadge status={form.approval_status || 'Draft'} />
          </div>
          {lead && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {lead.first_name} {lead.last_name}
              {lead.company_name && <span className="ml-1">— {lead.company_name}</span>}
            </p>
          )}
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-2xl font-bold">${Number(form.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground">Quote Total</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Left Column: Quote Content ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quote Details */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Quote Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Service Category</Label>
                <select
                  value={form.service_category || ''}
                  onChange={e => set('service_category', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={isSentOrApproved}
                >
                  {SERVICE_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Scope of Work</Label>
                <Textarea
                  value={form.scope_of_work || ''}
                  onChange={e => set('scope_of_work', e.target.value)}
                  rows={4}
                  disabled={isSentOrApproved}
                />
              </div>
              <div>
                <Label>Agent Summary</Label>
                <Textarea
                  value={form.agent_summary || ''}
                  onChange={e => set('agent_summary', e.target.value)}
                  rows={3}
                  placeholder="AI-generated or agent notes about this quote"
                />
              </div>
              <div>
                <Label>Internal Notes</Label>
                <Textarea
                  value={form.internal_notes || ''}
                  onChange={e => set('internal_notes', e.target.value)}
                  rows={2}
                  placeholder="Notes visible only to staff"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={((Number(form.tax_rate) || 0.13) * 100).toFixed(2)}
                    onChange={e => {
                      const rate = Number(e.target.value) / 100;
                      const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
                      const tax = subtotal * rate;
                      setForm((p: any) => ({ ...p, tax_rate: rate, subtotal, tax, total: subtotal + tax }));
                    }}
                    placeholder="13.00"
                    disabled={isSentOrApproved}
                  />
                </div>
                <div>
                  <Label>Follow-up Due</Label>
                  <Input
                    type="datetime-local"
                    value={form.follow_up_due_at ? form.follow_up_due_at.slice(0, 16) : ''}
                    onChange={e => set('follow_up_due_at', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Line Items
                {!isSentOrApproved && (
                  <Button size="sm" variant="outline" onClick={addItem}>
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No line items yet.</p>
                  <p className="text-xs mt-1">Add line items to build the quote pricing.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Desktop header */}
                  <div className="hidden md:grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider px-1">
                    <div className="col-span-4">Item</div>
                    <div className="col-span-3">Description</div>
                    <div className="col-span-1 text-center">Qty</div>
                    <div className="col-span-2 text-right">Unit Price</div>
                    <div className="col-span-1 text-right">Total</div>
                    <div className="col-span-1"></div>
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 md:col-span-4">
                        <Input
                          value={item.item_name}
                          onChange={e => updateItem(idx, 'item_name', e.target.value)}
                          placeholder="Item name"
                          disabled={isSentOrApproved}
                        />
                      </div>
                      <div className="col-span-12 md:col-span-3">
                        <Input
                          value={item.description}
                          onChange={e => updateItem(idx, 'description', e.target.value)}
                          placeholder="Description"
                          disabled={isSentOrApproved}
                        />
                      </div>
                      <div className="col-span-4 md:col-span-1">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                          className="text-center"
                          disabled={isSentOrApproved}
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                          className="text-right"
                          disabled={isSentOrApproved}
                        />
                      </div>
                      <div className="col-span-3 md:col-span-1 text-sm font-medium text-right py-2 mono">
                        ${item.line_total.toFixed(2)}
                      </div>
                      <div className="col-span-1">
                        {!isSentOrApproved && (
                          <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8">
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="text-right space-y-1 pr-10">
                    <p className="text-sm text-muted-foreground">
                      Subtotal: <span className="font-medium text-foreground ml-2">${Number(form.subtotal || 0).toFixed(2)}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Tax ({((Number(form.tax_rate) || 0.13) * 100).toFixed(0)}%):
                      <span className="font-medium text-foreground ml-2">${Number(form.tax || 0).toFixed(2)}</span>
                    </p>
                    <Separator className="ml-auto w-32" />
                    <p className="text-lg font-bold">
                      Total: <span className="mono">${Number(form.total || 0).toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button (large, below content on mobile) */}
          <Button onClick={handleSave} className="w-full" size="lg" disabled={updateQuote.isPending}>
            <Save className="h-4 w-4 mr-2" /> Save Quote
          </Button>
        </div>

        {/* ── Right Column: Workflow + Meta ── */}
        <div className="space-y-4">
          {/* Approval Workflow */}
          <ApprovalWorkflowPanel
            status={form.approval_status || 'Draft'}
            agentSummary={form.agent_summary || ''}
            total={Number(form.total || 0)}
            lineItemCount={items.filter(i => i.item_name).length}
            sentAt={quote.sent_at}
            followUpDueAt={form.follow_up_due_at}
            createdAt={quote.created_at}
            onStatusChange={handleStatusChange}
            isUpdating={updateQuote.isPending}
          />

          {/* Lead Info */}
          {lead && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Client</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                <p className="font-medium">{lead.first_name} {lead.last_name}</p>
                {lead.company_name && <p className="text-muted-foreground">{lead.company_name}</p>}
                {lead.email && <p className="text-muted-foreground">{lead.email}</p>}
                {lead.phone && <p className="text-muted-foreground">{lead.phone}</p>}
                {lead.address_line_1 && (
                  <p className="text-muted-foreground">
                    {lead.address_line_1}, {lead.city} {lead.province}
                  </p>
                )}
                <Link to={`/leads/${lead.id}`} className="text-primary text-xs hover:underline inline-block mt-1">
                  View Full Lead →
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
