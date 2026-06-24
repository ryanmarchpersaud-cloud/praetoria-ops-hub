import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Plus, Search, Trash2, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Row = {
  id: string;
  catalog_item_id: string | null;
  item_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  _new?: boolean;
};

interface Props { jobId: string }

export function JobPricingCard({ jobId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: existing = [], isLoading } = useQuery({
    queryKey: ['job_line_items', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_line_items').select('*').eq('job_id', jobId).order('sort_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!jobId,
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ['catalog_active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products_services').select('*').ilike('status', 'active').order('name');
      return data || [];
    },
  });

  useEffect(() => { setRows((existing as any[]).map(r => ({ ...r } as Row))); }, [existing]);

  const filteredCatalog = useMemo(() => {
    if (!search) return [];
    const s = search.toLowerCase();
    return (catalog as any[]).filter(i =>
      `${i.name} ${i.description || ''} ${i.service_category || ''} ${i.unit_label || ''}`.toLowerCase().includes(s)
    ).slice(0, 12);
  }, [catalog, search]);

  const addFromCatalog = (item: any) => {
    const minQty = Number(item.min_quantity) || 1;
    const price = Number(item.unit_price) || 0;
    const minCharge = Number(item.minimum_charge) || 0;
    const lineTotal = Math.max(minQty * price, minCharge);
    const unitLabel = item.unit_label ? ` (${item.unit_label})` : '';
    setRows(prev => [...prev, {
      id: crypto.randomUUID(),
      catalog_item_id: item.id,
      item_name: `${item.name}${unitLabel}`,
      description: item.description || (minCharge > 0 ? `Minimum charge $${minCharge.toFixed(2)}` : null),
      quantity: minQty,
      unit_price: price,
      line_total: lineTotal,
      sort_order: prev.length,
      _new: true,
    }]);
    setSearch('');
  };

  const addBlank = () => {
    setRows(prev => [...prev, {
      id: crypto.randomUUID(), catalog_item_id: null, item_name: '', description: null,
      quantity: 1, unit_price: 0, line_total: 0, sort_order: prev.length, _new: true,
    }]);
  };

  const update = (id: string, field: keyof Row, value: any) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const u = { ...r, [field]: value } as Row;
      if (field === 'quantity' || field === 'unit_price') {
        u.line_total = Math.round((Number(u.quantity) || 0) * (Number(u.unit_price) || 0) * 100) / 100;
      }
      return u;
    }));
  };

  const remove = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  const subtotal = rows.reduce((s, r) => s + (Number(r.line_total) || 0), 0);

  const save = async () => {
    setSaving(true);
    try {
      // Replace strategy: delete all then insert current
      const { error: delErr } = await supabase.from('job_line_items').delete().eq('job_id', jobId);
      if (delErr) throw delErr;
      if (rows.length > 0) {
        const payload = rows.map((r, idx) => ({
          job_id: jobId,
          catalog_item_id: r.catalog_item_id,
          item_name: r.item_name || 'Item',
          description: r.description,
          quantity: Number(r.quantity) || 0,
          unit_price: Number(r.unit_price) || 0,
          line_total: Number(r.line_total) || 0,
          sort_order: idx,
        }));
        const { error } = await supabase.from('job_line_items').insert(payload as any);
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ['job_line_items', jobId] });
      toast({ title: 'Pricing saved', description: `${rows.length} line item${rows.length === 1 ? '' : 's'} saved.` });
    } catch (e: any) {
      toast({ title: 'Error saving pricing', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" /> Pricing & Line Items
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Select catalog items (e.g. hourly tractor mowing) or add custom lines. Saved items flow into invoices.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Catalog search */}
        <div className="space-y-1.5">
          <Label className="text-xs">Add from catalog</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search catalog (e.g. tractor mowing, snow, lawn)…"
              className="h-9 pl-7 text-sm"
            />
          </div>
          {search && (
            <div className="border rounded-md max-h-60 overflow-y-auto bg-background">
              {filteredCatalog.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">No matches for "{search}"</p>
              ) : filteredCatalog.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addFromCatalog(item)}
                  className="w-full text-left p-2 hover:bg-muted/60 border-b last:border-b-0 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{item.name}</span>
                    <span className="text-xs font-mono">
                      ${Number(item.unit_price || 0).toFixed(2)}
                      {item.unit_label ? ` / ${item.unit_label}` : ''}
                    </span>
                  </div>
                  {(item.service_category || item.minimum_charge > 0) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.service_category}
                      {Number(item.minimum_charge) > 0 && ` · min charge $${Number(item.minimum_charge).toFixed(2)}`}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Existing line items */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3 border rounded-md text-center">
            No line items. Search the catalog above or add a custom row.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="border rounded-md p-2 space-y-2 bg-muted/20">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12 md:col-span-5">
                    <Label className="text-[10px]">Item</Label>
                    <Input value={r.item_name} onChange={e => update(r.id, 'item_name', e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label className="text-[10px]">Qty</Label>
                    <Input type="number" step="0.5" min="0" value={r.quantity}
                      onChange={e => update(r.id, 'quantity', parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label className="text-[10px]">Rate</Label>
                    <Input type="number" step="0.01" min="0" value={r.unit_price}
                      onChange={e => update(r.id, 'unit_price', parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label className="text-[10px]">Total</Label>
                    <Input value={`$${Number(r.line_total).toFixed(2)}`} readOnly className="h-8 text-xs font-mono bg-background" />
                  </div>
                  <div className="col-span-12 md:col-span-1 flex md:items-end">
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-full text-destructive" onClick={() => remove(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <Input value={r.description || ''} onChange={e => update(r.id, 'description', e.target.value)}
                  placeholder="Description (optional)" className="h-7 text-[11px]" />
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground">Subtotal (before tax)</span>
              <span className="text-sm font-semibold">${subtotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={addBlank} className="h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add custom line
          </Button>
          <div className="flex-1" />
          <Button type="button" size="sm" onClick={save} disabled={saving} className="h-8 text-xs">
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save Pricing
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
