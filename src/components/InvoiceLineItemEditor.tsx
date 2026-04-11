import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUpsertInvoiceLineItems } from '@/hooks/useInvoices';

interface LineItem {
  id?: string;
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  service_date: string;
}

interface Props {
  invoiceId: string;
  existingItems: any[];
  onSaved?: () => void;
}

export default function InvoiceLineItemEditor({ invoiceId, existingItems, onSaved }: Props) {
  const [items, setItems] = useState<LineItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const upsertItems = useUpsertInvoiceLineItems();

  const { data: catalog = [] } = useQuery({
    queryKey: ['products_services_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_services')
        .select('id, name, description, service_category, unit_price, price_type, unit_label')
        .eq('status', 'Active')
        .order('service_category')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existingItems.length > 0 && items.length === 0) {
      setItems(existingItems.map((i: any) => ({
        id: i.id,
        item_name: i.item_name,
        description: i.description || '',
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        line_total: Number(i.line_total),
        sort_order: i.sort_order,
        service_date: i.service_date || '',
      })));
    }
  }, [existingItems]);

  const addFromCatalog = (product: any) => {
    const price = Number(product.unit_price) || 0;
    setItems(prev => [...prev, {
      item_name: product.name,
      description: product.description || '',
      quantity: 1,
      unit_price: price,
      line_total: price,
      sort_order: prev.length,
      service_date: '',
    }]);
    setPickerOpen(false);
    setDirty(true);
  };

  const addBlankRow = () => {
    setItems(prev => [...prev, {
      item_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      line_total: 0,
      sort_order: prev.length,
      service_date: '',
    }]);
    setDirty(true);
  };

  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[idx], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        item.line_total = Number(item.quantity) * Number(item.unit_price);
      }
      updated[idx] = item;
      return updated;
    });
    setDirty(true);
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, sort_order: i })));
    setDirty(true);
  };

  const handleSave = async () => {
    const payload = items.map((item, idx) => ({
      invoice_id: invoiceId,
      item_name: item.item_name || 'Untitled Item',
      description: item.description || null,
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      line_total: Number(item.quantity) * Number(item.unit_price),
      sort_order: idx,
      service_date: item.service_date || null,
      service_time: null,
    }));
    try {
      await upsertItems.mutateAsync({ invoiceId, items: payload });
      toast.success('Line items saved');
      setDirty(false);
      onSaved?.();
    } catch {
      toast.error('Failed to save line items');
    }
  };

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0);

  const grouped = catalog.reduce((acc: Record<string, any[]>, p: any) => {
    const cat = p.service_category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Package className="h-3.5 w-3.5" /> Add from Catalog
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search services..." />
                <CommandList className="max-h-64">
                  <CommandEmpty>No items found</CommandEmpty>
                  {Object.entries(grouped).map(([cat, prods]) => (
                    <CommandGroup key={cat} heading={cat}>
                      {(prods as any[]).map((p: any) => (
                        <CommandItem key={p.id} onSelect={() => addFromCatalog(p)} className="flex justify-between">
                          <span className="text-sm truncate">{p.name}</span>
                          <span className="text-xs text-muted-foreground ml-2 shrink-0">
                            {p.unit_price ? `$${Number(p.unit_price).toFixed(2)}` : 'Quote'}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="ghost" onClick={addBlankRow} className="gap-1.5 text-muted-foreground">
            <Plus className="h-3.5 w-3.5" /> Blank Row
          </Button>
        </div>
        {dirty && (
          <Button size="sm" onClick={handleSave} disabled={upsertItems.isPending} className="gap-1.5">
            {upsertItems.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Items
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[35%]">Product & Service</TableHead>
            <TableHead className="w-24">Date</TableHead>
            
            <TableHead className="text-right w-20">Qty</TableHead>
            <TableHead className="text-right w-28">Price</TableHead>
            <TableHead className="text-right w-28">Total</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                No line items — use "Add from Catalog" to get started
              </TableCell>
            </TableRow>
          ) : (
            items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Input
                    value={item.item_name}
                    onChange={e => updateItem(idx, 'item_name', e.target.value)}
                    placeholder="Product / service name"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    placeholder="Description (optional)"
                    className="h-7 text-xs mt-1 text-muted-foreground border-dashed"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={item.service_date}
                    onChange={e => updateItem(idx, 'service_date', e.target.value)}
                    className="h-8 text-sm w-32"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={item.service_time}
                    onChange={e => updateItem(idx, 'service_time', e.target.value)}
                    className="h-8 text-sm w-28"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm text-right w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm text-right w-28"
                  />
                </TableCell>
                <TableCell className="text-right text-sm font-medium mono">
                  ${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {items.length > 0 && (
        <div className="text-right text-sm text-muted-foreground">
          Subtotal: <span className="font-medium text-foreground mono">${subtotal.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
