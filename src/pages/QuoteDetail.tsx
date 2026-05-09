import { useParams, useNavigate } from 'react-router-dom';
import { useActionPermissions } from '@/hooks/useActionPermissions';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowLeft, Plus, Save, Trash2, ChevronDown, ChevronRight, Phone, Mail, FileText, Briefcase, Package, Archive, AlertTriangle, Receipt, LinkIcon, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { logQuoteFollowUpChange } from '@/lib/quoteFollowUpLog';
import { QuoteEmailPreview } from '@/components/QuoteEmailPreview';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SERVICE_CATEGORIES } from '@/lib/constants';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserRole } from '@/hooks/useUserRole';
import { Pencil, Trash } from 'lucide-react';
import { ConvertQuoteToJobDialog } from '@/components/ConvertQuoteToJobDialog';
import { CreateInvoiceFromWorkDialog } from '@/components/CreateInvoiceFromWorkDialog';
import { FlaggedPersonAlert } from '@/components/FlaggedPersonAlert';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface LineItemForm {
  id?: string;
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  _key?: string;
}

function SortableLineRow({
  id, disabled, children, className,
}: { id: string; disabled?: boolean; children: (handleProps: { attributes: any; listeners: any; setActivatorNodeRef: (element: HTMLElement | null) => void }) => React.ReactNode; className?: string }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  };
  return (
    <div ref={setNodeRef} style={style} className={className}>
      {children({ attributes, listeners, setActivatorNodeRef })}
    </div>
  );
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
  const { data: quote, isLoading, refetch: refetchQuote } = useQuote(id);
  const { data: lineItems = [] } = useQuoteLineItems(id);
  const updateQuote = useUpdateQuote();
  const upsertItems = useUpsertLineItems();
  const { toast } = useToast();
  const { canManageQuotes } = useActionPermissions();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();

  const [form, setForm] = useState<any>({});
  const [items, setItems] = useState<LineItemForm[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogEdit, setCatalogEdit] = useState<{ id: string | null; name: string; service_category: string; unit_price: number } | null>(null);
  const [catalogDeleteId, setCatalogDeleteId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Fetch linked job if converted
  const { data: linkedJob } = useQuery({
    queryKey: ['quote_linked_job', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from('jobs').select('id, job_number, job_title, status').eq('quote_id', id).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  // Fetch linked invoices
  const { data: linkedInvoices = [] } = useQuery({
    queryKey: ['quote_linked_invoices', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase.from('invoices').select('id, invoice_number, status, total').eq('quote_id', id as any);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ['products_services_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_services')
        .select('id, name, description, service_category, unit_price, price_type, unit_label')
        .ilike('status', 'active')
        .order('service_category')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const catalogGrouped = catalog.reduce((acc: Record<string, any[]>, p: any) => {
    const cat = p.service_category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  // Order categories by master list, then any extras alphabetically at the end
  const orderedCatalogGroups: Array<[string, any[]]> = (() => {
    const entries: Array<[string, any[]]> = [];
    const seen = new Set<string>();
    for (const cat of SERVICE_CATEGORIES) {
      if (catalogGrouped[cat]) { entries.push([cat, catalogGrouped[cat]]); seen.add(cat); }
    }
    for (const [cat, items] of Object.entries(catalogGrouped)) {
      if (!seen.has(cat)) entries.push([cat, items as any[]]);
    }
    return entries;
  })();

  // Brand colors per category (matches mem://project/service-categories-master)
  const CATEGORY_COLORS: Record<string, string> = {
    'Snow & Ice': '#2563EB',
    'Maintenance & Repairs': '#DC2626',
    'Property Care & Landscaping': '#F97316',
    'Property Management': '#16A34A',
    'Electrical': '#7C3AED',
    'Plumbing': '#0D9488',
    'Carpentry & Renovations': '#92400E',
    'Roofing & Exteriors': '#374151',
    'Painting & Finishing': '#EAB308',
    'Cleaning Services': '#0EA5E9',
    'Heating, Ventilation & Air Conditioning': '#F43F5E',
    'Concrete & Masonry': '#6B7280',
    'Security & Smart Home': '#111827',
    'Fencing & Decking': '#7c2d12',
    'Junk Removal': '#c2410c',
    'Power Washing': '#0891B2',
    'Tiling & Flooring': '#A16207',
    'Gutter Cleaning & Repair': '#65A30D',
    'Window Cleaning': '#0284C7',
    'Pest Control': '#854D0E',
    'Moving & Hauling': '#9333EA',
    'Insulation & Drywall': '#B91C1C',
    'Appliance Install & Repair': '#0F766E',
    'Garage Doors': '#475569',
    'Locksmith Services': '#1E40AF',
    'Other': '#64748B',
  };

  useEffect(() => {
    if (!quote) return;
    setForm(quote);
    // For brand-new quotes (no customer-facing text yet), pre-fill from company defaults.
    const needsDefaults = !(quote as any).workmanship_warranty && !(quote as any).terms_conditions && !(quote as any).customer_notes;
    if (needsDefaults) {
      (async () => {
        const { data } = await supabase
          .from('company_settings')
          .select('default_workmanship_warranty, default_terms_conditions, default_quote_notes')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (data) {
          setForm((p: any) => ({
            ...p,
            workmanship_warranty: p.workmanship_warranty || (data as any).default_workmanship_warranty || '',
            terms_conditions: p.terms_conditions || (data as any).default_terms_conditions || '',
            customer_notes: p.customer_notes || (data as any).default_quote_notes || '',
          }));
        }
      })();
    }
  }, [quote]);
  useEffect(() => {
    if (lineItems.length > 0) {
      setItems(lineItems.map((li, idx) => ({
        id: li.id, item_name: li.item_name, description: li.description || '',
        quantity: Number(li.quantity), unit_price: Number(li.unit_price),
        line_total: Number(li.line_total), sort_order: li.sort_order || 0,
        _key: li.id || `row-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      })));
    }
  }, [lineItems]);

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Loading...</div>;
  if (!quote) return <div className="p-8 text-muted-foreground text-sm">Quote not found</div>;

  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));

  const recalculate = (updatedItems: LineItemForm[]) => {
    const subtotal = updatedItems.reduce((sum, i) => sum + i.line_total, 0);
    const taxRate = form.tax_rate == null ? 0.11 : Number(form.tax_rate);
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

  const newKey = () => `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const addFromCatalog = (product: any) => {
    const price = Number(product.unit_price) || 0;
    const newItem: LineItemForm = {
      item_name: product.name,
      description: product.description || '',
      quantity: 1,
      unit_price: price,
      line_total: price,
      sort_order: items.length,
      _key: newKey(),
    };
    const updated = [...items, newItem];
    setItems(updated);
    recalculate(updated);
    setCatalogOpen(false);
  };

  const saveCatalogEdit = async () => {
    if (!catalogEdit) return;
    const payload = {
      name: catalogEdit.name.trim(),
      service_category: catalogEdit.service_category,
      unit_price: Number(catalogEdit.unit_price) || 0,
    };
    if (!payload.name) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    if (catalogEdit.id) {
      const { error } = await supabase.from('products_services').update(payload).eq('id', catalogEdit.id);
      if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Catalog item updated' });
    } else {
      const { error } = await supabase.from('products_services').insert({
        ...payload,
        product_type: 'Service',
        price_type: 'Flat Rate',
        unit_label: 'flat',
        status: 'Active',
        taxable: true,
      });
      if (error) { toast({ title: 'Create failed', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Catalog item added' });
    }
    setCatalogEdit(null);
    queryClient.invalidateQueries({ queryKey: ['products_services_active'] });
  };

  const confirmCatalogDelete = async () => {
    if (!catalogDeleteId) return;
    const { error } = await supabase.from('products_services').update({ status: 'Archived' }).eq('id', catalogDeleteId);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Catalog item removed' });
    setCatalogDeleteId(null);
    queryClient.invalidateQueries({ queryKey: ['products_services_active'] });
  };

  const addItem = () => {
    setItems([...items, { item_name: '', description: '', quantity: 1, unit_price: 0, line_total: 0, sort_order: items.length, _key: newKey() }]);
  };

  const removeItem = (idx: number) => {
    const updated = items.filter((_, i) => i !== idx);
    setItems(updated);
    recalculate(updated);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => (i._key || i.id) === active.id);
    const newIndex = items.findIndex(i => (i._key || i.id) === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex).map((it, idx) => ({ ...it, sort_order: idx }));
    setItems(reordered);
  };


  const handleSave = async () => {
    if (!id) return;
    try {
      // Capture previous follow-up date for activity logging.
      const previousFollowUp = (quote as any)?.follow_up_due_at ?? null;
      const nextFollowUp = form.follow_up_due_at || null;

      await updateQuote.mutateAsync({
        id, service_category: form.service_category, scope_of_work: form.scope_of_work,
        agent_summary: form.agent_summary, internal_notes: form.internal_notes,
        customer_notes: form.customer_notes || null,
        workmanship_warranty: form.workmanship_warranty || null,
        terms_conditions: form.terms_conditions || null,
        approval_status: form.approval_status, follow_up_due_at: nextFollowUp,
        tax_rate: form.tax_rate == null || form.tax_rate === '' ? 0.11 : Number(form.tax_rate),
        gst_rate: form.gst_rate === '' || form.gst_rate == null ? null : Number(form.gst_rate),
        pst_rate: form.pst_rate === '' || form.pst_rate == null ? null : Number(form.pst_rate),
        recurring_pricing_enabled: !!form.recurring_pricing_enabled,
        price_per_cut: form.price_per_cut === '' || form.price_per_cut == null ? null : Number(form.price_per_cut),
        price_weekly: form.price_weekly === '' || form.price_weekly == null ? null : Number(form.price_weekly),
        price_biweekly: form.price_biweekly === '' || form.price_biweekly == null ? null : Number(form.price_biweekly),
        price_monthly: form.price_monthly === '' || form.price_monthly == null ? null : Number(form.price_monthly),
        recurring_pricing_notes: form.recurring_pricing_notes || null,
      });
      await upsertItems.mutateAsync({
        quoteId: id,
        items: items.filter(i => i.item_name).map((i, idx) => ({
          quote_id: id, item_name: i.item_name, description: i.description || null,
          quantity: i.quantity, unit_price: i.unit_price, sort_order: idx,
        })),
      });

      // Fire-and-forget log only when the follow-up actually changed.
      if ((previousFollowUp || null) !== (nextFollowUp || null)) {
        void logQuoteFollowUpChange({
          quoteId: id,
          quoteNumber: (quote as any)?.quote_number ?? null,
          previousDueAt: previousFollowUp,
          nextDueAt: nextFollowUp,
          source: 'quote_detail',
        });
      }

      toast({ title: 'Quote saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      // Save line items first so totals are calculated by DB triggers
      await upsertItems.mutateAsync({
        quoteId: id,
        items: items.filter(i => i.item_name).map((i, idx) => ({
          quote_id: id, item_name: i.item_name, description: i.description || null,
          quantity: i.quantity, unit_price: i.unit_price, sort_order: idx,
        })),
      });
      // Also save quote fields (scope, tax_rate, etc.)
      const updates: any = {
        id, approval_status: newStatus as any,
        service_category: form.service_category, scope_of_work: form.scope_of_work,
        agent_summary: form.agent_summary, internal_notes: form.internal_notes,
        customer_notes: form.customer_notes || null,
        workmanship_warranty: form.workmanship_warranty || null,
        terms_conditions: form.terms_conditions || null,
        tax_rate: form.tax_rate == null || form.tax_rate === '' ? 0.11 : Number(form.tax_rate),
        gst_rate: form.gst_rate === '' || form.gst_rate == null ? null : Number(form.gst_rate),
        pst_rate: form.pst_rate === '' || form.pst_rate == null ? null : Number(form.pst_rate),
        recurring_pricing_enabled: !!form.recurring_pricing_enabled,
        price_per_cut: form.price_per_cut === '' || form.price_per_cut == null ? null : Number(form.price_per_cut),
        price_weekly: form.price_weekly === '' || form.price_weekly == null ? null : Number(form.price_weekly),
        price_biweekly: form.price_biweekly === '' || form.price_biweekly == null ? null : Number(form.price_biweekly),
        price_monthly: form.price_monthly === '' || form.price_monthly == null ? null : Number(form.price_monthly),
        recurring_pricing_notes: form.recurring_pricing_notes || null,
      };
      if (newStatus === 'Sent') { updates.sent_status = 'Sent'; updates.sent_at = new Date().toISOString(); }
      await updateQuote.mutateAsync(updates);

      // ─── Auto-send the quote email when transitioning to "Sent" ───
      if (newStatus === 'Sent') {
        const lead = (quote as any)?.leads;
        const customer = (quote as any)?.customers;
        const clientInfo = lead || customer;
        const recipientEmail: string | undefined = clientInfo?.email;
        const recipientName: string | undefined =
          clientInfo?.name ||
          [clientInfo?.first_name, clientInfo?.last_name].filter(Boolean).join(' ').trim() ||
          undefined;

        if (!recipientEmail) {
          toast({
            title: 'Quote marked as Sent — but no email on file',
            description: 'Add an email address to this customer to deliver the quote.',
            variant: 'destructive',
          });
        } else {
          try {
            // Compute total from saved items + tax_rate (DB trigger recalculates, but we estimate locally)
            const subtotal = items
              .filter(i => i.item_name)
              .reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);
            const taxRate = form.tax_rate == null || form.tax_rate === '' ? 0.11 : Number(form.tax_rate);
            const total = subtotal + subtotal * taxRate;

            const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
              body: {
                action: 'quote_sent',
                customer_email: recipientEmail,
                customer_name: recipientName,
                quote_number: quote?.quote_number,
                service_category: form.service_category,
                total: total.toFixed(2),
                quote_id: id,
              },
            });
            if (emailError) throw emailError;

            // Persist delivery status on the quote
            await supabase
              .from('quotes')
              .update({
                email_delivery_status: emailResult?.ok ? 'sent' : 'failed',
                email_sent_at: new Date().toISOString(),
              } as any)
              .eq('id', id);

            // Activity log
            await supabase.from('activities').insert({
              action_name: 'quote_email_sent',
              record_type: 'quote',
              record_id: id,
              status: 'completed',
              payload_summary: {
                quote_number: quote?.quote_number,
                recipient: recipientEmail,
                triggered_from: 'status_change_to_sent',
                email_sent: emailResult?.ok ?? false,
              },
            });

            toast({
              title: emailResult?.ok ? 'Quote sent by email' : 'Quote marked Sent — email failed',
              description: emailResult?.ok
                ? `Delivered to ${recipientEmail}`
                : (emailResult?.error || 'The email provider reported an issue.'),
              variant: emailResult?.ok ? 'default' : 'destructive',
            });
          } catch (emailErr: any) {
            // Don't roll back the status — surface the error so the admin can retry
            await supabase
              .from('quotes')
              .update({ email_delivery_status: 'failed' } as any)
              .eq('id', id);
            toast({
              title: 'Quote marked Sent — email failed',
              description: emailErr?.message || 'Unable to send email. You can resend from the Email Quote panel.',
              variant: 'destructive',
            });
          }
        }
      } else {
        toast({ title: `Quote ${newStatus.toLowerCase()}` });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const lead = (quote as any).leads;
  const customer = (quote as any).customers;
  const clientInfo = lead || customer;
  const isSentOrApproved = ['Sent', 'Approved'].includes(form.approval_status);
  const validItems = items.filter(i => i.item_name);

  const handleDeleteQuote = async () => {
    if (!id) return;
    try {
      await supabase.from('quote_line_items').delete().eq('quote_id', id);
      await supabase.from('quotes').delete().eq('id', id);
      toast({ title: 'Quote deleted' });
      navigate('/quotes');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setDeleteDialog(false);
  };

  const handleArchiveQuote = async () => {
    if (!id) return;
    try {
      await updateQuote.mutateAsync({ id, approval_status: 'Archived' as any });
      toast({ title: 'Quote archived' });
      navigate('/quotes');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleConvertToJob = () => {
    setConvertOpen(true);
  };

  const isConverted = !!(quote as any).converted_job_id || !!linkedJob;
  const sortableIds = items.map((it, idx) => it._key || it.id || `idx-${idx}`);

  return (
    <div className="space-y-4 animate-fade-in">
      <FlaggedPersonAlert
        email={(quote as any)?.leads?.email}
        phone={(quote as any)?.leads?.phone}
        compact
      />
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
          {clientInfo && (
            <p className="text-xs text-muted-foreground truncate">
              {clientInfo.first_name} {clientInfo.last_name}{clientInfo.company_name ? ` — ${clientInfo.company_name}` : ''}
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
        {canManageQuotes && (
          <Button onClick={handleSave} className="flex-1 h-11" disabled={updateQuote.isPending}>
            <Save className="h-4 w-4 mr-2" /> Save Quote
          </Button>
        )}
        {form.approval_status === 'Approved' && !isConverted && canManageQuotes && (
          <Button variant="outline" className="h-11 shrink-0 gap-1.5" onClick={handleConvertToJob}>
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Convert to Job</span>
          </Button>
        )}
        {isConverted && (
          <Badge variant="outline" className="h-11 flex items-center gap-1.5 px-3 text-accent border-accent/30">
            <Briefcase className="h-3.5 w-3.5" /> Converted
          </Badge>
        )}
        {form.approval_status === 'Approved' && canManageQuotes && (
          <Button variant="outline" className="h-11 shrink-0 gap-1.5" onClick={() => setInvoiceOpen(true)}>
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Invoice</span>
          </Button>
        )}
        <Button variant="outline" className="h-11 shrink-0 gap-1.5" onClick={() => navigate(`/quotes/${id}/print`)}>
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Export PDF</span>
        </Button>
        {canManageQuotes && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 shrink-0">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleArchiveQuote} className="gap-2">
                <Archive className="h-4 w-4" /> Archive Quote
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteDialog(true)} className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" /> Delete Quote
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
          onConvertToJob={canManageQuotes ? handleConvertToJob : undefined}
          isConverted={isConverted}
        />
      </div>

      {/* ── Client Quick Info (mobile) ── */}
      {clientInfo && (
        <Card className="lg:hidden">
          <CardContent className="py-3">
            <div className="flex flex-wrap gap-3 text-sm">
              {clientInfo.phone && (
                <a href={`tel:${clientInfo.phone}`} className="flex items-center gap-1.5 text-primary active:opacity-70 min-h-[44px]">
                  <Phone className="h-3.5 w-3.5" /> {clientInfo.phone}
                </a>
              )}
              {clientInfo.email && (
                <a href={`mailto:${clientInfo.email}`} className="flex items-center gap-1.5 text-primary active:opacity-70 min-h-[44px]">
                  <Mail className="h-3.5 w-3.5" /> <span className="truncate max-w-[160px]">{clientInfo.email}</span>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Email Quote (mobile) ── */}
      <div className="lg:hidden">
        <QuoteEmailPreview
          quote={quote}
          lineItems={lineItems}
          onEmailStatusChange={() => refetchQuote()}
        />
      </div>

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

          {/* ── Recurring Service Pricing (optional) ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Recurring Service Pricing</span>
                <label className="flex items-center gap-2 text-xs font-normal text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.recurring_pricing_enabled}
                    onChange={e => set('recurring_pricing_enabled', e.target.checked)}
                    disabled={isSentOrApproved}
                    className="h-4 w-4"
                  />
                  Show on quote
                </label>
              </CardTitle>
            </CardHeader>
            {form.recurring_pricing_enabled && (
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Optional. Use these to give the client recurring-service price options (e.g. lawn care). Leave any field blank to hide it. Prices are pre-tax and shown separately from the quote total.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Per Cut ($)</Label>
                    <Input
                      type="number" step="0.01" min={0}
                      value={form.price_per_cut ?? ''}
                      onChange={e => set('price_per_cut', e.target.value)}
                      placeholder="e.g. 65.00"
                      disabled={isSentOrApproved}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Weekly ($)</Label>
                    <Input
                      type="number" step="0.01" min={0}
                      value={form.price_weekly ?? ''}
                      onChange={e => set('price_weekly', e.target.value)}
                      placeholder="e.g. 60.00"
                      disabled={isSentOrApproved}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Biweekly ($)</Label>
                    <Input
                      type="number" step="0.01" min={0}
                      value={form.price_biweekly ?? ''}
                      onChange={e => set('price_biweekly', e.target.value)}
                      placeholder="e.g. 75.00"
                      disabled={isSentOrApproved}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Monthly ($)</Label>
                    <Input
                      type="number" step="0.01" min={0}
                      value={form.price_monthly ?? ''}
                      onChange={e => set('price_monthly', e.target.value)}
                      placeholder="e.g. 220.00"
                      disabled={isSentOrApproved}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    rows={2}
                    value={form.recurring_pricing_notes || ''}
                    onChange={e => set('recurring_pricing_notes', e.target.value)}
                    placeholder="e.g. Weekly rate assumes a season of May–October. Per cut billed after each visit."
                    disabled={isSentOrApproved}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* ── Line Items ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                Line Items ({validItems.length})
                {!isSentOrApproved && (
                  <div className="flex gap-1.5">
                    <Popover open={catalogOpen} onOpenChange={setCatalogOpen}>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 gap-1">
                          <Package className="h-3 w-3" /> Catalog
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[28rem] sm:w-[32rem] p-0" align="end">
                        <Command>
                          <CommandInput placeholder="Search services..." className="text-base h-12" />
                          {isAdmin && (
                            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                              <span className="text-xs text-muted-foreground">Admin: hover an item to edit or delete</span>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 gap-1"
                                onClick={() => setCatalogEdit({ id: null, name: '', service_category: 'Roofing & Exteriors', unit_price: 0 })}
                              >
                                <Plus className="h-3 w-3" /> New
                              </Button>
                            </div>
                          )}
                          <CommandList className="max-h-[28rem]">
                            <CommandEmpty>No items found.</CommandEmpty>
                            {orderedCatalogGroups.map(([cat, products]) => {
                              const color = CATEGORY_COLORS[cat] || '#64748B';
                              const slug = `cat-${cat.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
                              return (
                                <CommandGroup
                                  key={cat}
                                  heading={cat}
                                  className={`${slug} [&_[cmdk-group-heading]]:text-lg [&_[cmdk-group-heading]]:font-extrabold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-tight [&_[cmdk-group-heading]]:text-white [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2.5 [&_[cmdk-group-heading]]:my-2 [&_[cmdk-group-heading]]:rounded-md [&_[cmdk-group-heading]]:shadow-sm`}
                                >
                                  <style>{`.${slug} [cmdk-group-heading] { background-color: ${color} !important; }`}</style>
                                  {(products as any[]).map((p: any) => (
                                    <CommandItem key={p.id} onSelect={() => addFromCatalog(p)} className="group flex items-center justify-between py-3 text-base gap-2">
                                      <span className="truncate flex-1">{p.name}</span>
                                      <span className="text-muted-foreground text-sm shrink-0">${Number(p.unit_price || 0).toFixed(2)}</span>
                                      {isAdmin && (
                                        <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-aria-selected:opacity-100 transition-opacity">
                                          <button
                                            type="button"
                                            aria-label="Edit catalog item"
                                            className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setCatalogEdit({ id: p.id, name: p.name, service_category: p.service_category || 'Other', unit_price: Number(p.unit_price) || 0 });
                                            }}
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            aria-label="Delete catalog item"
                                            className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setCatalogDeleteId(p.id);
                                            }}
                                          >
                                            <Trash className="h-3.5 w-3.5" />
                                          </button>
                                        </span>
                                      )}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              );
                            })}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button size="sm" variant="outline" onClick={addItem} className="h-8">
                      <Plus className="h-3 w-3 mr-1" /> Manual
                    </Button>
                  </div>
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
                  <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                      {!isMobile ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-1">
                            <div className="col-span-1"></div>
                            <div className="col-span-2">Item</div>
                            <div className="col-span-3">Description</div>
                            <div className="col-span-2 text-center">Qty</div>
                            <div className="col-span-2 text-right">Price</div>
                            <div className="col-span-1 text-right">Total</div>
                            <div className="col-span-1"></div>
                          </div>
                          {items.map((item, idx) => {
                            const rowId = item._key || item.id || `idx-${idx}`;
                            return (
                              <SortableLineRow key={rowId} id={rowId} disabled={isSentOrApproved}>
                                {({ attributes, listeners, setActivatorNodeRef }) => (
                                  <div className="grid grid-cols-12 gap-2 items-center bg-background rounded-md">
                                  <div className="col-span-1 flex justify-center">
                                    {!isSentOrApproved && (
                                      <button
                                        type="button"
                                         ref={setActivatorNodeRef}
                                        {...attributes}
                                        {...listeners}
                                        aria-label="Drag to reorder"
                                        className="touch-none cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
                                      >
                                        <GripVertical className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="col-span-2"><Input value={item.item_name} onChange={e => updateItem(idx, 'item_name', e.target.value)} placeholder="Item" disabled={isSentOrApproved} className="h-9" /></div>
                                  <div className="col-span-3"><Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Desc" disabled={isSentOrApproved} className="h-9" /></div>
                                  <div className="col-span-2"><Input type="number" value={item.quantity === 0 ? '' : item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value === '' ? 0 : Number(e.target.value))} min={0} className="text-center h-9" disabled={isSentOrApproved} /></div>
                                  <div className="col-span-2"><Input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} className="text-right h-9" disabled={isSentOrApproved} /></div>
                                  <div className="col-span-1 text-sm font-medium text-right mono">${item.line_total.toFixed(2)}</div>
                                  <div className="col-span-1">{!isSentOrApproved && <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8"><Trash2 className="h-3 w-3" /></Button>}</div>
                                  </div>
                                )}
                              </SortableLineRow>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {items.map((item, idx) => {
                            const rowId = item._key || item.id || `idx-${idx}`;
                            return (
                              <SortableLineRow key={rowId} id={rowId} disabled={isSentOrApproved}>
                                {({ attributes, listeners, setActivatorNodeRef }) => (
                                  <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                                  <div className="flex items-start justify-between gap-2">
                                    {!isSentOrApproved && (
                                      <button
                                        type="button"
                                         ref={setActivatorNodeRef}
                                        {...attributes}
                                        {...listeners}
                                        aria-label="Drag to reorder"
                                        className="touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground"
                                      >
                                        <GripVertical className="h-5 w-5" />
                                      </button>
                                    )}
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
                                      <Input type="number" inputMode="decimal" value={item.quantity === 0 ? '' : item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value === '' ? 0 : Number(e.target.value))} min={0} className="h-9 text-center" disabled={isSentOrApproved} />
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
                                )}
                              </SortableLineRow>
                            );
                          })}
                        </div>
                      )}
                    </SortableContext>
                  </DndContext>

                  {/* Totals */}
                  <Separator />
                  <div className="text-right space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      Subtotal: <span className="font-medium text-foreground ml-1">${Number(form.subtotal || 0).toFixed(2)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tax ({((form.tax_rate == null || form.tax_rate === '' ? 0.11 : Number(form.tax_rate)) * 100).toFixed(0)}%):
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

          {/* ── Customer-Facing Sections (appear on the printed/sent quote) ── */}
          <CollapsibleSection title="Customer Notes, Warranty & Terms" defaultOpen={true}>
            <p className="text-[11px] text-muted-foreground -mt-1">
              These sections appear on the quote sent to the customer. Defaults can be set in Company Settings → Documents.
            </p>
            <div>
              <Label className="text-xs font-semibold">Customer Notes</Label>
              <Textarea
                value={form.customer_notes || ''}
                onChange={e => set('customer_notes', e.target.value)}
                rows={3}
                placeholder="Friendly note shown to the customer (e.g. thank-you, scheduling info, what's included)"
                disabled={isSentOrApproved}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Workmanship Warranty</Label>
              <Textarea
                value={form.workmanship_warranty || ''}
                onChange={e => set('workmanship_warranty', e.target.value)}
                rows={4}
                placeholder="e.g. Praetoria Group warrants all labour and workmanship for 12 months from completion date…"
                disabled={isSentOrApproved}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Terms & Conditions</Label>
              <Textarea
                value={form.terms_conditions || ''}
                onChange={e => set('terms_conditions', e.target.value)}
                rows={6}
                placeholder="e.g. Quote valid for 30 days. Payment Net 30. Scope changes billed separately…"
                disabled={isSentOrApproved}
              />
            </div>
          </CollapsibleSection>

          {/* ── Notes (collapsible) ── */}
          <CollapsibleSection title="Internal Notes & Settings" defaultOpen={false}>
            <div>
              <Label className="text-xs">Agent Summary</Label>
              <Textarea value={form.agent_summary || ''} onChange={e => set('agent_summary', e.target.value)} rows={3} placeholder="AI-generated or agent notes" />
            </div>
            <div>
              <Label className="text-xs">Internal Notes</Label>
              <Textarea value={form.internal_notes || ''} onChange={e => set('internal_notes', e.target.value)} rows={2} placeholder="Staff-only notes" />
            </div>
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium">Tax exempt (no tax for this customer)</Label>
                <p className="text-xs text-muted-foreground">Toggle on to zero out tax on this quote.</p>
              </div>
              <Switch
                checked={Number(form.tax_rate || 0) === 0}
                disabled={isSentOrApproved}
                onCheckedChange={(checked) => {
                  const rate = checked ? 0 : 0.11;
                  const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
                  setForm((p: any) => ({ ...p, tax_rate: rate, subtotal, tax: subtotal * rate, total: subtotal + subtotal * rate }));
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tax Rate (%)</Label>
                <Input type="number" inputMode="decimal" step="0.01"
                  value={form.tax_rate_display ?? ((form.tax_rate == null || form.tax_rate === '' ? 0.11 : Number(form.tax_rate)) * 100).toFixed(2)}
                  onChange={e => {
                    const raw = e.target.value;
                    const rate = raw === '' ? 0 : Number(raw) / 100;
                    const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
                    setForm((p: any) => ({ ...p, tax_rate: rate, tax_rate_display: raw, subtotal, tax: subtotal * rate, total: subtotal + subtotal * rate }));
                  }}
                  onBlur={() => setForm((p: any) => ({ ...p, tax_rate_display: undefined }))}
                  disabled={isSentOrApproved || Number(form.tax_rate || 0) === 0} className="h-10" />
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
              onConvertToJob={canManageQuotes ? handleConvertToJob : undefined}
              isConverted={isConverted}
            />
          </div>

          {/* Client info — desktop */}
          {clientInfo && (
            <Card className="hidden lg:block">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Client</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                <p className="font-medium">{clientInfo.first_name} {clientInfo.last_name}</p>
                {clientInfo.company_name && <p className="text-muted-foreground">{clientInfo.company_name}</p>}
                {clientInfo.email && (
                  <a href={`mailto:${clientInfo.email}`} className="text-primary text-xs hover:underline block">{clientInfo.email}</a>
                )}
                {clientInfo.phone && (
                  <a href={`tel:${clientInfo.phone}`} className="text-primary text-xs hover:underline block">{clientInfo.phone}</a>
                )}
                {clientInfo.address_line_1 && <p className="text-xs text-muted-foreground">{clientInfo.address_line_1}, {clientInfo.city} {clientInfo.province}</p>}
                {lead && <Link to={`/leads/${lead.id}`} className="text-primary text-xs hover:underline inline-block mt-1">View Lead →</Link>}
                {!lead && customer && <Link to={`/customers/${quote.customer_id}`} className="text-primary text-xs hover:underline inline-block mt-1">View Customer →</Link>}
              </CardContent>
            </Card>
          )}

          {/* Cross-links: Source Request, Created Job, Invoices */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" /> Linked Records
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {(quote as any).request_id && (
                <Link to={`/requests/${(quote as any).request_id}`} className="text-primary text-xs hover:underline flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Original Request →
                </Link>
              )}
              {linkedJob && (
                <Link to={`/jobs/${linkedJob.id}`} className="text-primary text-xs hover:underline flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> {linkedJob.job_number} — {linkedJob.job_title} →
                </Link>
              )}
              {linkedInvoices.map((inv: any) => (
                <Link key={inv.id} to={`/invoices/${inv.id}`} className="text-primary text-xs hover:underline flex items-center gap-1">
                  <Receipt className="h-3 w-3" /> {inv.invoice_number} ({inv.status}) →
                </Link>
              ))}
              {!(quote as any).request_id && !linkedJob && linkedInvoices.length === 0 && (
                <p className="text-xs text-muted-foreground">No linked records yet</p>
              )}
            </CardContent>
          </Card>

          {/* Email Quote Panel */}
          <QuoteEmailPreview
            quote={quote}
            lineItems={lineItems}
            onEmailStatusChange={() => refetchQuote()}
          />
        </div>
      </div>

      {/* Delete confirmation */}
      {/* Catalog edit/create dialog */}
      <Dialog open={!!catalogEdit} onOpenChange={(o) => !o && setCatalogEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{catalogEdit?.id ? 'Edit catalog item' : 'New catalog item'}</DialogTitle>
            <DialogDescription>Changes apply to this item across all future quotes, jobs, and invoices.</DialogDescription>
          </DialogHeader>
          {catalogEdit && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Item name</Label>
                <Input value={catalogEdit.name} onChange={(e) => setCatalogEdit({ ...catalogEdit, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <select
                  value={catalogEdit.service_category}
                  onChange={(e) => setCatalogEdit({ ...catalogEdit, service_category: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Unit price ($)</Label>
                <Input type="number" step="0.01" value={catalogEdit.unit_price}
                  onChange={(e) => setCatalogEdit({ ...catalogEdit, unit_price: Number(e.target.value) })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCatalogEdit(null)}>Cancel</Button>
                <Button onClick={saveCatalogEdit}>{catalogEdit.id ? 'Save' : 'Create'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Catalog delete confirmation */}
      <Dialog open={!!catalogDeleteId} onOpenChange={(o) => !o && setCatalogDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove catalog item?</DialogTitle>
            <DialogDescription>
              The item will be archived and hidden from the catalog picker. Existing quotes and invoices that already use it are not affected.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCatalogDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmCatalogDelete}>Remove</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Delete Quote
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {quote.quote_number}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDeleteQuote}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conversion Wizard */}
      <ConvertQuoteToJobDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        quote={quote}
        lead={lead}
        lineItems={lineItems}
      />

      {/* Invoice from Quote */}
      <CreateInvoiceFromWorkDialog
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        sourceType="quote"
        sourceRecord={quote}
        lineItems={lineItems}
        customerId={quote.customer_id || lead?.customer_id || ''}
        quoteId={id}
        requestId={(quote as any).request_id}
      />
    </div>
  );
}
