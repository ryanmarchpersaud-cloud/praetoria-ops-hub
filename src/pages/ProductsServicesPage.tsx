import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Plus, MoreHorizontal, Package, Pencil, Archive, Copy, XCircle, Check, Globe, CalendarCheck, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const PRODUCT_TYPES = ['Service', 'Package', 'Add-On', 'Inspection', 'Recurring Plan', 'Material / Product'];
const SERVICE_CATEGORIES = [
  'Snow & Ice', 'Landscaping & Grounds', 'Junk Removal', 'Property Care & Maintenance',
  'Cleaning Services', 'Power Washing', 'Property Inspection', 'Bylaw / Compliance',
];
const PRICE_TYPES = ['Flat Rate', 'Hourly', 'Per Visit', 'Per Month', 'Per Unit', 'Custom Quote'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Archived'];
const BOOK_AS_OPTIONS = ['Job', 'Visit', 'Assignment'];
const SEASONAL_OPTIONS = ['Winter', 'Spring', 'Summer', 'Fall', 'Year-Round'];
const DURATION_OPTIONS = [
  { label: 'No duration', value: 'none' },
  { label: '15m', value: '15' },
  { label: '30m', value: '30' },
  { label: '45m', value: '45' },
  { label: '1h', value: '60' },
  { label: '1h 30m', value: '90' },
  { label: '2h', value: '120' },
  { label: '2h 30m', value: '150' },
  { label: '3h', value: '180' },
  { label: '4h', value: '240' },
  { label: '5h', value: '300' },
  { label: '6h', value: '360' },
  { label: '8h', value: '480' },
  { label: '9h 30m', value: '570' },
  { label: '10h', value: '600' },
  { label: '12h', value: '720' },
];

type Product = {
  id: string;
  name: string;
  description: string | null;
  product_type: string;
  service_category: string;
  unit_price: number;
  unit_label: string | null;
  status: string;
  sort_order: number;
  taxable: boolean;
  online_booking_enabled: boolean;
  customer_visible: boolean;
  internal_item_code: string | null;
  price_type: string;
  minimum_charge: number;
  seasonal_label: string | null;
  recurring_eligible: boolean;
  portal_display_description: string | null;
  internal_notes: string | null;
  book_service_as: string;
  service_duration_minutes: number | null;
  allow_customer_quantity: boolean;
  min_quantity: number;
  max_quantity: number;
  available_on_quotes: boolean;
};

type FormState = {
  name: string;
  description: string;
  product_type: string;
  service_category: string;
  unit_price: string;
  unit_label: string;
  status: string;
  taxable: boolean;
  online_booking_enabled: boolean;
  customer_visible: boolean;
  internal_item_code: string;
  price_type: string;
  minimum_charge: string;
  seasonal_label: string;
  recurring_eligible: boolean;
  portal_display_description: string;
  internal_notes: string;
  book_service_as: string;
  service_duration_minutes: string;
  allow_customer_quantity: boolean;
  min_quantity: string;
  max_quantity: string;
  available_on_quotes: boolean;
  sort_order: string;
};

const emptyForm: FormState = {
  name: '', description: '', product_type: 'Service', service_category: 'Snow & Ice',
  unit_price: '0', unit_label: 'visit', status: 'Active',
  taxable: true, online_booking_enabled: true, customer_visible: true,
  internal_item_code: '', price_type: 'Flat Rate', minimum_charge: '0',
  seasonal_label: '', recurring_eligible: false, portal_display_description: '', internal_notes: '',
  book_service_as: 'Job', service_duration_minutes: 'none', allow_customer_quantity: false,
  min_quantity: '1', max_quantity: '100', available_on_quotes: true, sort_order: '100',
};

/* Map price_type → default unit_label */
const PRICE_TYPE_UNIT_DEFAULTS: Record<string, string> = {
  'Flat Rate': 'flat',
  'Hourly': 'hour',
  'Per Visit': 'visit',
  'Per Month': 'month',
  'Per Unit': 'unit',
  'Custom Quote': '',
};

export default function ProductsServicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products_services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Product[];
    },
  });

  /* Conditional logic: auto-set unit_label & recurring_eligible when price_type changes */
  const handlePriceTypeChange = (v: string) => {
    const updates: Partial<FormState> = { price_type: v };
    if (PRICE_TYPE_UNIT_DEFAULTS[v] !== undefined) {
      updates.unit_label = PRICE_TYPE_UNIT_DEFAULTS[v];
    }
    if (v === 'Per Month') {
      updates.recurring_eligible = true;
    }
    setForm((prev) => ({ ...prev, ...updates }));
  };

  /* Conditional logic: auto-show recurring fields when item_type = Recurring Plan */
  const handleProductTypeChange = (v: string) => {
    const updates: Partial<FormState> = { product_type: v };
    if (v === 'Recurring Plan') {
      updates.recurring_eligible = true;
    }
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const validate = (): string[] => {
    const errors: string[] = [];
    if (!form.name.trim()) errors.push('Name is required');
    if (!form.description.trim()) errors.push('Description is required');
    if (!form.service_category) errors.push('Category is required');
    if (!form.price_type) errors.push('Price Type is required');
    if (parseFloat(form.unit_price) < 0) errors.push('Unit Price must be 0 or greater');
    if (form.customer_visible && !form.portal_display_description.trim()) {
      // Just a warning, not blocking
    }
    return errors;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        product_type: form.product_type,
        service_category: form.service_category,
        unit_price: parseFloat(form.unit_price) || 0,
        unit_label: form.unit_label.trim() || 'per visit',
        status: form.status,
        taxable: form.taxable,
        online_booking_enabled: form.online_booking_enabled,
        customer_visible: form.customer_visible,
        internal_item_code: form.internal_item_code.trim() || null,
        price_type: form.price_type,
        minimum_charge: parseFloat(form.minimum_charge) || 0,
        seasonal_label: form.seasonal_label || null,
        recurring_eligible: form.recurring_eligible,
        portal_display_description: form.portal_display_description.trim() || null,
        internal_notes: form.internal_notes.trim() || null,
        book_service_as: form.book_service_as,
        service_duration_minutes: form.service_duration_minutes && form.service_duration_minutes !== 'none' ? parseInt(form.service_duration_minutes) : null,
        allow_customer_quantity: form.allow_customer_quantity,
        min_quantity: parseInt(form.min_quantity) || 1,
        max_quantity: parseInt(form.max_quantity) || 100,
        available_on_quotes: form.available_on_quotes,
        sort_order: parseInt(form.sort_order) || 100,
      };
      if (editingId) {
        const { error } = await supabase.from('products_services').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products_services').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Item updated' : 'Item created');
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['products_services'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save'),
  });

  const handleSave = () => {
    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    saveMutation.mutate();
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Item deleted');
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['products_services'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('products_services').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products_services'] });
      toast.success('Status updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (item: Product) => {
      const { id, sort_order, ...rest } = item;
      const { error } = await supabase.from('products_services').insert({
        ...rest,
        name: `${item.name} (Copy)`,
        status: 'Inactive',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products_services'] });
      toast.success('Item duplicated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setDeleteConfirmOpen(false);
    setValidationErrors([]);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description || '',
      product_type: p.product_type,
      service_category: p.service_category,
      unit_price: String(p.unit_price),
      unit_label: p.unit_label || 'per visit',
      status: p.status,
      taxable: p.taxable,
      online_booking_enabled: p.online_booking_enabled,
      customer_visible: p.customer_visible,
      internal_item_code: p.internal_item_code || '',
      price_type: p.price_type,
      minimum_charge: String(p.minimum_charge),
      seasonal_label: p.seasonal_label || '',
      recurring_eligible: p.recurring_eligible,
      portal_display_description: p.portal_display_description || '',
      internal_notes: p.internal_notes || '',
      book_service_as: p.book_service_as || 'Job',
      service_duration_minutes: p.service_duration_minutes ? String(p.service_duration_minutes) : 'none',
      allow_customer_quantity: p.allow_customer_quantity,
      min_quantity: String(p.min_quantity),
      max_quantity: String(p.max_quantity),
      available_on_quotes: p.available_on_quotes,
      sort_order: String(p.sort_order),
    });
    setValidationErrors([]);
    setDeleteConfirmOpen(false);
    setDialogOpen(true);
  };

  const filtered = products.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (![p.name, p.description, p.product_type, p.service_category, p.internal_item_code].join(' ').toLowerCase().includes(q)) return false;
    }
    if (categoryFilter !== 'all' && p.service_category !== categoryFilter) return false;
    if (typeFilter !== 'all' && p.product_type !== typeFilter) return false;
    return true;
  });

  const counts = {
    total: products.length,
    active: products.filter((p) => p.status === 'Active').length,
    inactive: products.filter((p) => p.status === 'Inactive').length,
    archived: products.filter((p) => p.status === 'Archived').length,
    bookable: products.filter((p) => p.online_booking_enabled && p.status === 'Active').length,
    visible: products.filter((p) => p.customer_visible && p.status === 'Active').length,
  };

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isRecurringPlan = form.product_type === 'Recurring Plan';
  const isHourly = form.price_type === 'Hourly';
  const isCustomQuote = form.price_type === 'Custom Quote';
  const showPortalWarning = form.customer_visible && !form.portal_display_description.trim();

  /* ---------- Modal content ---------- */
  const renderModalContent = () => (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-foreground">
          {editingId ? `Edit ${form.name || 'Item'}` : 'Add New Product / Service'}
        </DialogTitle>
        {editingId && (
          <p className="text-sm text-muted-foreground mt-1">
            Changes will apply to new quotes, jobs, invoices, existing quote templates & online booking
          </p>
        )}
      </DialogHeader>

      {validationErrors.length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1">
          {validationErrors.map((e) => (
            <p key={e} className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{e}
            </p>
          ))}
        </div>
      )}

      <ScrollArea className="max-h-[60vh] pr-4">
        <div className="space-y-5 py-2">
          {/* ---- SECTION: Core Info ---- */}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Core Information</p>

          {/* Item Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Item Type *</Label>
            <Select value={form.product_type} onValueChange={handleProductTypeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRODUCT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Name *</Label>
            <Input
              placeholder="e.g. De-icing Application"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description *</Label>
            <Textarea
              placeholder="Explain what is included, pricing basis, exclusions, and key notes"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Category *</Label>
            <Select value={form.service_category} onValueChange={(v) => updateField('service_category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* ---- SECTION: Pricing ---- */}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pricing</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Price Type *</Label>
              <Select value={form.price_type} onValueChange={handlePriceTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRICE_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Unit Price ($) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.unit_price}
                onChange={(e) => updateField('unit_price', e.target.value)}
              />
              {isCustomQuote && <p className="text-[10px] text-muted-foreground">Custom Quote items may have $0.00 price</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Unit Label</Label>
              <Input
                placeholder="e.g. hour, visit, load"
                value={form.unit_label}
                onChange={(e) => updateField('unit_label', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Min. Charge ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.minimum_charge}
                onChange={(e) => updateField('minimum_charge', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sort Order</Label>
              <Input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(e) => updateField('sort_order', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Internal Item Code</Label>
              <Input placeholder="e.g. SN-ICE-001" value={form.internal_item_code} onChange={(e) => updateField('internal_item_code', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Seasonal Label</Label>
              <Select value={form.seasonal_label || 'none'} onValueChange={(v) => updateField('seasonal_label', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {SEASONAL_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* ---- SECTION: Availability ---- */}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Availability & Tax</p>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="taxExempt"
                checked={!form.taxable}
                onCheckedChange={(v) => updateField('taxable', !v)}
              />
              <label htmlFor="taxExempt" className="text-sm cursor-pointer">Exempt from Tax</label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="availableOnQuotes"
                checked={form.available_on_quotes}
                onCheckedChange={(v) => updateField('available_on_quotes', v as boolean)}
              />
              <label htmlFor="availableOnQuotes" className="text-sm cursor-pointer">Available on quotes, quote templates, jobs, invoices & online booking</label>
            </div>
          </div>

          <Separator />

          {/* ---- SECTION: Online Booking ---- */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Online Booking</h3>
                <p className="text-xs text-muted-foreground">These settings are only available for online booking.</p>
              </div>
              <Switch
                checked={form.online_booking_enabled}
                onCheckedChange={(v) => updateField('online_booking_enabled', v)}
              />
            </div>

            {form.online_booking_enabled && (
              <div className="space-y-4 pl-1 border-l-2 border-primary/20 ml-1 animate-fade-in">
                <div className="pl-3 space-y-4">
                  {/* Book service as */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Book service as</Label>
                    <Select value={form.book_service_as} onValueChange={(v) => updateField('book_service_as', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BOOK_AS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Service Duration */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Service Duration</Label>
                    <Select
                      value={form.service_duration_minutes}
                      onValueChange={(v) => updateField('service_duration_minutes', v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Allow customers to select quantity */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="allowQuantity"
                        checked={form.allow_customer_quantity}
                        onCheckedChange={(v) => updateField('allow_customer_quantity', v as boolean)}
                        className="mt-0.5"
                      />
                      <div>
                        <label htmlFor="allowQuantity" className="text-sm font-medium cursor-pointer">Allow customers to select quantity</label>
                        <p className="text-xs text-muted-foreground">Duration and unit price will scale based on quantity. (e.g. 15min x 4 = 1h)</p>
                      </div>
                    </div>

                    {form.allow_customer_quantity && (
                      <div className="grid grid-cols-2 gap-4 animate-fade-in">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Minimum quantity</Label>
                          <Input type="number" min="1" value={form.min_quantity} onChange={(e) => updateField('min_quantity', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Maximum quantity</Label>
                          <Input type="number" min="1" value={form.max_quantity} onChange={(e) => updateField('max_quantity', e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* ---- SECTION: Customer Portal / Visibility ---- */}
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customer Portal / Visibility</p>

            <div className="flex items-center justify-between">
              <Label className="font-normal">Visible in Customer Portal</Label>
              <Switch checked={form.customer_visible} onCheckedChange={(v) => updateField('customer_visible', v)} />
            </div>

            <div className="flex items-center justify-between">
              <Label className="font-normal">Eligible for Recurring Plans</Label>
              <Switch checked={form.recurring_eligible} onCheckedChange={(v) => updateField('recurring_eligible', v)} />
            </div>

            {form.customer_visible && (
              <div className="space-y-1.5 animate-fade-in">
                <Label className="text-xs text-muted-foreground">Customer-Facing Description</Label>
                <Textarea
                  placeholder="Simpler description shown in portal/request wizard"
                  value={form.portal_display_description}
                  onChange={(e) => updateField('portal_display_description', e.target.value)}
                  rows={2}
                />
                {showPortalWarning && (
                  <p className="text-[10px] text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />Recommended: Add a customer-facing description for portal display
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* ---- SECTION: Status & Notes ---- */}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status & Notes</p>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Internal Notes</Label>
            <Textarea
              placeholder="Admin-only notes not visible to customers"
              value={form.internal_notes}
              onChange={(e) => updateField('internal_notes', e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </ScrollArea>

      {/* ---- FOOTER: Delete / Cancel / Create|Save Changes ---- */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div>
          {editingId && (
            deleteConfirmOpen ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-destructive font-medium">Are you sure?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(editingId)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)}>No</Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </Button>
            )
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={closeDialog}>Cancel</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Products & Services</h1>
            <p className="text-sm text-muted-foreground">Add and update your products & services to stay organized when creating quotes, quote templates, jobs, and invoices.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingId(null); setForm(emptyForm); setValidationErrors([]); }}>
                <Plus className="h-4 w-4 mr-2" />Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh]">
              {renderModalContent()}
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
          {/* Main table */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search products & services..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {SERVICE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {PRODUCT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{filtered.length} Item{filtered.length !== 1 ? 's' : ''}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading catalog...</div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {products.length === 0 ? 'No products yet. Click "Add Item" to create your first catalog entry.' : 'No items match your filters.'}
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="hidden md:table-cell">Type</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="hidden lg:table-cell text-right">Price</TableHead>
                          <TableHead className="hidden md:table-cell text-center">Tax</TableHead>
                          <TableHead className="hidden lg:table-cell text-center">Booking</TableHead>
                          <TableHead className="hidden lg:table-cell text-center">Visible</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((p) => (
                          <TableRow key={p.id} className={`cursor-pointer ${p.status !== 'Active' ? 'opacity-60' : ''}`} onClick={() => openEdit(p)}>
                            <TableCell>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">{p.name}</p>
                                {p.internal_item_code && <p className="text-[10px] text-muted-foreground font-mono">{p.internal_item_code}</p>}
                                {p.description && <p className="text-xs text-muted-foreground truncate max-w-[240px]">{p.description}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline">{p.product_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{p.service_category}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-right font-medium whitespace-nowrap">
                              {p.price_type === 'Custom Quote' ? (
                                <span className="text-muted-foreground text-xs">Custom</span>
                              ) : (
                                <>
                                  ${Number(p.unit_price).toFixed(2)}
                                  <span className="text-xs text-muted-foreground ml-1">/ {p.unit_label || 'flat'}</span>
                                </>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-center">
                              {p.taxable ? <Check className="h-4 w-4 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-center">
                              {p.online_booking_enabled ? <CalendarCheck className="h-4 w-4 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-center">
                              {p.customer_visible ? <Globe className="h-4 w-4 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={p.status === 'Active' ? 'default' : p.status === 'Archived' ? 'secondary' : 'outline'}>
                                {p.status}
                              </Badge>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(p)}>
                                    <Pencil className="h-3.5 w-3.5 mr-2" />Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => duplicateMutation.mutate(p)}>
                                    <Copy className="h-3.5 w-3.5 mr-2" />Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {p.status === 'Active' ? (
                                    <DropdownMenuItem onClick={() => statusMutation.mutate({ id: p.id, status: 'Inactive' })}>
                                      <XCircle className="h-3.5 w-3.5 mr-2" />Deactivate
                                    </DropdownMenuItem>
                                  ) : p.status === 'Inactive' ? (
                                    <>
                                      <DropdownMenuItem onClick={() => statusMutation.mutate({ id: p.id, status: 'Active' })}>
                                        <Package className="h-3.5 w-3.5 mr-2" />Reactivate
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => statusMutation.mutate({ id: p.id, status: 'Archived' })}>
                                        <Archive className="h-3.5 w-3.5 mr-2" />Archive
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <DropdownMenuItem onClick={() => statusMutation.mutate({ id: p.id, status: 'Active' })}>
                                      <Package className="h-3.5 w-3.5 mr-2" />Reactivate
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />Catalog Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-foreground">{counts.total}</span>
                  <span className="text-xs text-muted-foreground">Total Items</span>
                </div>
                <div className="h-px bg-border" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span className="font-medium text-primary">{counts.active}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Inactive</span><span className="font-medium text-muted-foreground">{counts.inactive}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Archived</span><span className="font-medium text-muted-foreground">{counts.archived}</span></div>
                </div>
                <div className="h-px bg-border" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Globe className="h-3.5 w-3.5" />Customer Visible</span>
                    <span className="font-medium text-foreground">{counts.visible}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5" />Online Booking</span>
                    <span className="font-medium text-foreground">{counts.bookable}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">How it works</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p><strong>Admin manages</strong> the catalog here. Items appear in quotes, jobs, visits, and invoices.</p>
                <p><strong>Customer portal</strong> only shows items marked as "Customer Visible." Online booking items appear in the request wizard.</p>
                <p><strong>Deactivated items</strong> are hidden from customers but preserved in historical records.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
