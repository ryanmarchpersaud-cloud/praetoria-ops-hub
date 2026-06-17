import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus, Trash2, Save, ExternalLink, Loader2, Receipt as ReceiptIcon, Truck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export type CostCategory =
  | 'Fuel' | 'Travel' | 'Labour' | 'Material'
  | 'Equipment' | 'Hotel/Meals' | 'Reimbursable' | 'Other';

const CATEGORIES: CostCategory[] = [
  'Fuel', 'Travel', 'Labour', 'Material', 'Equipment', 'Hotel/Meals', 'Reimbursable', 'Other',
];

interface Props {
  jobId: string | null;
  jobNumber?: string;
  jobTitle?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface ExpenseRow {
  id: string;
  expense_date: string;
  category: string;
  description: string | null;
  amount: number;
  vendor_name: string | null;
  receipt_url: string | null;
  notes: string | null;
}

interface MetaRow {
  id?: string;
  travel_included_in_quote: boolean;
  distance_notes: string;
  trip_count_override: number | null;
  travel_hours: number;
  travel_labour_cost: number;
  hotel_cost: number;
  meal_cost: number;
  fuel_per_trip: number;
  notes: string;
  tracker_override: 'include' | 'exclude' | null;
}

const EMPTY_META: MetaRow = {
  travel_included_in_quote: false,
  distance_notes: '',
  trip_count_override: null,
  travel_hours: 0,
  travel_labour_cost: 0,
  hotel_cost: 0,
  meal_cost: 0,
  fuel_per_trip: 0,
  notes: '',
  tracker_override: null,
};

export function ManageJobCostsDrawer({ jobId, jobNumber, jobTitle, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [meta, setMeta] = useState<MetaRow>(EMPTY_META);
  const [savingMeta, setSavingMeta] = useState(false);
  const [newEntry, setNewEntry] = useState({
    category: 'Fuel' as CostCategory,
    amount: '',
    description: '',
    vendor_name: '',
    expense_date: new Date().toISOString().slice(0, 10),
  });
  const [adding, setAdding] = useState(false);

  // Load expenses for this job
  const { data: expenses = [], isLoading: loadExp } = useQuery({
    enabled: !!jobId && open,
    queryKey: ['job-expenses', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, expense_date, category, description, amount, vendor_name, receipt_url, notes')
        .eq('job_id', jobId!)
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExpenseRow[];
    },
  });

  // Load meta
  const { data: metaData, isLoading: loadMeta } = useQuery({
    enabled: !!jobId && open,
    queryKey: ['job-cost-meta', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_cost_meta')
        .select('*')
        .eq('job_id', jobId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (metaData) {
      setMeta({
        id: metaData.id,
        travel_included_in_quote: !!metaData.travel_included_in_quote,
        distance_notes: metaData.distance_notes ?? '',
        trip_count_override: metaData.trip_count_override,
        travel_hours: Number(metaData.travel_hours) || 0,
        travel_labour_cost: Number(metaData.travel_labour_cost) || 0,
        hotel_cost: Number(metaData.hotel_cost) || 0,
        meal_cost: Number(metaData.meal_cost) || 0,
        fuel_per_trip: Number(metaData.fuel_per_trip) || 0,
        notes: metaData.notes ?? '',
        tracker_override: ((metaData as any).tracker_override ?? null) as 'include' | 'exclude' | null,
      });
    } else {
      setMeta(EMPTY_META);
    }
  }, [metaData, jobId]);

  async function saveMeta() {
    if (!jobId) return;
    setSavingMeta(true);
    const payload: any = {
      job_id: jobId,
      travel_included_in_quote: meta.travel_included_in_quote,
      distance_notes: meta.distance_notes || null,
      trip_count_override: meta.trip_count_override,
      travel_hours: meta.travel_hours,
      travel_labour_cost: meta.travel_labour_cost,
      hotel_cost: meta.hotel_cost,
      meal_cost: meta.meal_cost,
      fuel_per_trip: meta.fuel_per_trip,
      notes: meta.notes || null,
      tracker_override: meta.tracker_override,
    };
    const { error } = await supabase
      .from('job_cost_meta')
      .upsert(payload, { onConflict: 'job_id' });
    setSavingMeta(false);
    if (error) {
      toast.error('Could not save cost notes: ' + error.message);
      return;
    }
    toast.success('Cost notes saved');
    qc.invalidateQueries({ queryKey: ['job-cost-meta', jobId] });
    qc.invalidateQueries({ queryKey: ['job-cost-profit-tracker'] });
  }

  async function addEntry() {
    if (!jobId) return;
    const amt = parseFloat(newEntry.amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setAdding(true);
    const { error } = await supabase.from('expenses').insert({
      job_id: jobId,
      category: newEntry.category,
      description: newEntry.description || newEntry.category,
      amount: amt,
      vendor_name: newEntry.vendor_name || null,
      expense_date: newEntry.expense_date,
      payment_method: 'Other',
    });
    setAdding(false);
    if (error) {
      toast.error('Could not add cost entry: ' + error.message);
      return;
    }
    toast.success('Cost entry added');
    setNewEntry({ ...newEntry, amount: '', description: '', vendor_name: '' });
    qc.invalidateQueries({ queryKey: ['job-expenses', jobId] });
    qc.invalidateQueries({ queryKey: ['job-cost-profit-tracker'] });
  }

  async function deleteEntry(id: string) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete: ' + error.message);
      return;
    }
    toast.success('Cost entry deleted');
    qc.invalidateQueries({ queryKey: ['job-expenses', jobId] });
    qc.invalidateQueries({ queryKey: ['job-cost-profit-tracker'] });
  }

  const total = expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Manage Costs
            {jobNumber && (
              <Link to={`/jobs/${jobId}`} className="text-sm text-primary font-mono inline-flex items-center gap-1 hover:underline">
                {jobNumber} <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {jobTitle} — Add fuel, labour, materials, trips, and travel costs to track real profit.
          </SheetDescription>
        </SheetHeader>

        {/* Include / exclude from tracker */}
        <section className="mt-5 space-y-2 rounded-lg border p-3 bg-background">
          <h3 className="text-sm font-bold">Include in Job Cost Tracker?</h3>
          <p className="text-[11px] text-muted-foreground">
            Routine landscaping, monthly maintenance and small junk jobs are auto-hidden.
            Use this when you want to track real costs on a specific project (drywall, paint, reno, out-of-town).
          </p>
          <div className="flex flex-wrap gap-2">
            {(['include', null, 'exclude'] as const).map(v => (
              <Button
                key={String(v)}
                size="sm"
                variant={meta.tracker_override === v ? 'default' : 'outline'}
                className="h-7 text-[11px] px-2"
                onClick={() => setMeta({ ...meta, tracker_override: v })}
              >
                {v === 'include' ? 'Yes — include' : v === 'exclude' ? 'No — exclude' : 'Automatic'}
              </Button>
            ))}
          </div>
        </section>

        {/* Travel / Out-of-town meta */}
        <section className="mt-5 space-y-3 rounded-lg border p-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" /> Travel & Out-of-Town
            </h3>
            <Badge variant={meta.travel_included_in_quote ? 'default' : 'outline'} className="text-[10px]">
              {meta.travel_included_in_quote ? 'Travel in quote' : 'Travel NOT in quote'}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fuel per trip ($)">
              <Input type="number" step="0.01" value={meta.fuel_per_trip || ''}
                onChange={e => setMeta({ ...meta, fuel_per_trip: parseFloat(e.target.value) || 0 })} />
            </Field>
            <Field label="Trip count override">
              <Input type="number" value={meta.trip_count_override ?? ''}
                placeholder="Auto from visits"
                onChange={e => setMeta({ ...meta, trip_count_override: e.target.value ? parseInt(e.target.value) : null })} />
            </Field>
            <Field label="Travel hours">
              <Input type="number" step="0.25" value={meta.travel_hours || ''}
                onChange={e => setMeta({ ...meta, travel_hours: parseFloat(e.target.value) || 0 })} />
            </Field>
            <Field label="Travel labour cost ($)">
              <Input type="number" step="0.01" value={meta.travel_labour_cost || ''}
                onChange={e => setMeta({ ...meta, travel_labour_cost: parseFloat(e.target.value) || 0 })} />
            </Field>
            <Field label="Hotel cost ($)">
              <Input type="number" step="0.01" value={meta.hotel_cost || ''}
                onChange={e => setMeta({ ...meta, hotel_cost: parseFloat(e.target.value) || 0 })} />
            </Field>
            <Field label="Meals / per-diem ($)">
              <Input type="number" step="0.01" value={meta.meal_cost || ''}
                onChange={e => setMeta({ ...meta, meal_cost: parseFloat(e.target.value) || 0 })} />
            </Field>
          </div>
          <Field label="Distance / location notes">
            <Input value={meta.distance_notes}
              placeholder="e.g. Estevan — 220 km one way"
              onChange={e => setMeta({ ...meta, distance_notes: e.target.value })} />
          </Field>
          <div className="flex items-center justify-between rounded border p-2 bg-background">
            <Label htmlFor="travel-quote" className="text-xs cursor-pointer">Was travel included in the quote?</Label>
            <Switch id="travel-quote" checked={meta.travel_included_in_quote}
              onCheckedChange={v => setMeta({ ...meta, travel_included_in_quote: v })} />
          </div>
          <Field label="Notes">
            <Textarea rows={2} value={meta.notes}
              onChange={e => setMeta({ ...meta, notes: e.target.value })} />
          </Field>
          <Button size="sm" onClick={saveMeta} disabled={savingMeta} className="w-full">
            {savingMeta ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save travel & notes
          </Button>
        </section>

        {/* Add cost entry */}
        <section className="mt-5 space-y-3 rounded-lg border p-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" /> Add Cost Entry
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={newEntry.category} onValueChange={v => setNewEntry({ ...newEntry, category: v as CostCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Amount ($)">
              <Input type="number" step="0.01" value={newEntry.amount}
                onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })} />
            </Field>
            <Field label="Date">
              <Input type="date" value={newEntry.expense_date}
                onChange={e => setNewEntry({ ...newEntry, expense_date: e.target.value })} />
            </Field>
            <Field label="Vendor (optional)">
              <Input value={newEntry.vendor_name}
                onChange={e => setNewEntry({ ...newEntry, vendor_name: e.target.value })} />
            </Field>
          </div>
          <Field label="Description">
            <Input value={newEntry.description}
              placeholder="e.g. Petro-Canada fill-up, Estevan trip 2"
              onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} />
          </Field>
          <Button size="sm" onClick={addEntry} disabled={adding} className="w-full">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            Add entry
          </Button>
        </section>

        {/* Existing entries */}
        <section className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ReceiptIcon className="h-4 w-4" /> Cost Entries ({expenses.length})
            </h3>
            <span className="text-xs font-bold tabular-nums">
              Total: ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          {loadExp ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : expenses.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 border rounded bg-muted/30">
              No cost entries yet — add fuel, labour, materials, or trip costs above.
            </p>
          ) : (
            <div className="divide-y border rounded">
              {expenses.map(e => (
                <div key={e.id} className="flex items-center justify-between p-2.5 gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{e.category}</Badge>
                      <span className="font-semibold tabular-nums">${Number(e.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      <span className="text-muted-foreground text-[10px]">{e.expense_date}</span>
                    </div>
                    {e.description && <p className="text-muted-foreground mt-0.5 truncate">{e.description}</p>}
                    {e.vendor_name && <p className="text-[10px] text-muted-foreground">Vendor: {e.vendor_name}</p>}
                    {e.receipt_url && (
                      <a href={e.receipt_url} target="_blank" rel="noreferrer"
                        className="text-[10px] text-primary inline-flex items-center gap-0.5 hover:underline">
                        <ReceiptIcon className="h-2.5 w-2.5" /> View receipt
                      </a>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                    onClick={() => deleteEntry(e.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {loadMeta && <p className="text-[10px] text-muted-foreground">Loading travel notes…</p>}
        </section>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
