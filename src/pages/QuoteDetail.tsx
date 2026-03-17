import { useParams, useNavigate } from 'react-router-dom';
import { useQuote, useUpdateQuote, useQuoteLineItems, useUpsertLineItems } from '@/hooks/useQuotes';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Save, Trash2, CheckCircle, Send, XCircle, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SERVICE_CATEGORIES, QUOTE_APPROVAL_STATUSES } from '@/lib/constants';

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
    const tax = subtotal * 0.13;
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
    const newItems = [...items, { item_name: '', description: '', quantity: 1, unit_price: 0, line_total: 0, sort_order: items.length }];
    setItems(newItems);
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
        subtotal: form.subtotal,
        tax: form.tax,
        total: form.total,
        agent_summary: form.agent_summary,
        internal_notes: form.internal_notes,
        approval_status: form.approval_status,
        follow_up_due_at: form.follow_up_due_at,
      });
      await upsertItems.mutateAsync({
        quoteId: id,
        items: items.filter(i => i.item_name).map((i, idx) => ({
          quote_id: id,
          item_name: i.item_name,
          description: i.description || null,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: i.line_total,
          sort_order: idx,
        })),
      });
      toast({ title: 'Quote saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleApproval = async (status: string) => {
    if (!id) return;
    try {
      const updates: any = { id, approval_status: status as any };
      if (status === 'Sent') {
        updates.sent_status = 'Sent';
        updates.sent_at = new Date().toISOString();
      }
      await updateQuote.mutateAsync(updates);
      toast({ title: `Quote ${status.toLowerCase()}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const lead = (quote as any).leads;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/quotes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold mono">{quote.quote_number}</h1>
          {lead && <p className="text-sm text-muted-foreground">{lead.first_name} {lead.last_name} — {lead.company_name || 'No company'}</p>}
        </div>
        <StatusBadge status={form.approval_status || 'Draft'} />
      </div>

      {/* Approval Workflow Bar */}
      <Card className="border-primary/20">
        <CardContent className="py-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium mr-2">Workflow:</span>
          <Button size="sm" variant="outline" onClick={() => handleApproval('Needs review')}>
            <Eye className="h-3 w-3 mr-1" /> Submit for Review
          </Button>
          <Button size="sm" variant="outline" className="text-success border-success/30" onClick={() => handleApproval('Approved')}>
            <CheckCircle className="h-3 w-3 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="text-primary border-primary/30" onClick={() => handleApproval('Sent')}>
            <Send className="h-3 w-3 mr-1" /> Mark Sent
          </Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => handleApproval('Declined')}>
            <XCircle className="h-3 w-3 mr-1" /> Decline
          </Button>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Quote Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Service Category</Label>
                <select value={form.service_category || ''} onChange={e => set('service_category', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {SERVICE_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><Label>Scope of Work</Label><Textarea value={form.scope_of_work || ''} onChange={e => set('scope_of_work', e.target.value)} rows={4} /></div>
              <div><Label>Agent Summary</Label><Textarea value={form.agent_summary || ''} onChange={e => set('agent_summary', e.target.value)} rows={3} placeholder="AI-generated or agent notes about this quote" /></div>
              <div><Label>Internal Notes</Label><Textarea value={form.internal_notes || ''} onChange={e => set('internal_notes', e.target.value)} rows={2} /></div>
              <div>
                <Label>Follow-up Due</Label>
                <Input type="datetime-local" value={form.follow_up_due_at ? form.follow_up_due_at.slice(0, 16) : ''} onChange={e => set('follow_up_due_at', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Line Items
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No line items. Click "Add" to start.</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        {idx === 0 && <Label className="text-xs">Item</Label>}
                        <Input value={item.item_name} onChange={e => updateItem(idx, 'item_name', e.target.value)} placeholder="Item name" />
                      </div>
                      <div className="col-span-3">
                        {idx === 0 && <Label className="text-xs">Desc</Label>}
                        <Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description" />
                      </div>
                      <div className="col-span-1">
                        {idx === 0 && <Label className="text-xs">Qty</Label>}
                        <Input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
                      </div>
                      <div className="col-span-2">
                        {idx === 0 && <Label className="text-xs">Price</Label>}
                        <Input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} />
                      </div>
                      <div className="col-span-1 text-sm font-medium text-right py-2">${item.line_total.toFixed(2)}</div>
                      <div className="col-span-1">
                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="text-right space-y-1">
                    <p className="text-sm">Subtotal: <span className="font-medium">${Number(form.subtotal || 0).toFixed(2)}</span></p>
                    <p className="text-sm">Tax (13%): <span className="font-medium">${Number(form.tax || 0).toFixed(2)}</span></p>
                    <p className="text-lg font-bold">Total: ${Number(form.total || 0).toFixed(2)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Button onClick={handleSave} className="w-full" disabled={updateQuote.isPending}>
            <Save className="h-4 w-4 mr-2" /> Save Quote
          </Button>

          {lead && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Lead Info</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{lead.first_name} {lead.last_name}</p>
                {lead.company_name && <p className="text-muted-foreground">{lead.company_name}</p>}
                {lead.email && <p className="text-muted-foreground">{lead.email}</p>}
                {lead.phone && <p className="text-muted-foreground">{lead.phone}</p>}
                <Button variant="link" className="p-0 h-auto text-primary" asChild>
                  <a href={`/leads/${lead.id}`}>View Lead →</a>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-4 text-xs text-muted-foreground space-y-1">
              <p>Sent: {quote.sent_at ? new Date(quote.sent_at).toLocaleDateString() : 'Not sent'}</p>
              <p>Created: {new Date(quote.created_at).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
