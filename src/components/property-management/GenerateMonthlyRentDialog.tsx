import { useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { useCreatePmLedgerEntry, type PmLedgerEntry } from '@/hooks/usePmLedger';

type Props = {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  leaseId?: string | null;
  propertyId?: string | null;
  unitId?: string | null;
  defaultRentAmount?: number;
  defaultRentDueDay?: number;
  existingEntries: PmLedgerEntry[];
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function ym(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
function lastDay(year: number, month0: number) { return new Date(year, month0 + 1, 0).getDate(); }
function monthLabel(year: number, month0: number) {
  return new Date(year, month0, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
}

export default function GenerateMonthlyRentDialog({
  open, onClose, tenantId, leaseId, propertyId, unitId,
  defaultRentAmount = 0, defaultRentDueDay = 1, existingEntries,
}: Props) {
  const create = useCreatePmLedgerEntry();
  const now = new Date();

  const [startMonth, setStartMonth] = useState(ym(now));
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState(String(defaultRentAmount || ''));
  const [dueDay, setDueDay] = useState(String(defaultRentDueDay || 1));
  const [tenantVisible, setTenantVisible] = useState(true);
  const [skipExisting, setSkipExisting] = useState(true);
  const [busy, setBusy] = useState(false);

  const existingPeriods = useMemo(() => new Set(
    existingEntries
      .filter(e => e.type === 'rent_charge' && e.period_start)
      .map(e => String(e.period_start).slice(0, 7)),
  ), [existingEntries]);

  const preview = useMemo(() => {
    const [ys, ms] = startMonth.split('-').map(Number);
    if (!ys || !ms) return [];
    const count = Math.max(1, Math.min(24, Number(months) || 1));
    const day = Math.max(1, Math.min(31, Number(dueDay) || 1));
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(ys, ms - 1 + i, 1);
      const y = d.getFullYear(); const m0 = d.getMonth();
      const dd = Math.min(day, lastDay(y, m0));
      const period_start = `${y}-${pad(m0 + 1)}-01`;
      const period_end = `${y}-${pad(m0 + 1)}-${pad(lastDay(y, m0))}`;
      return {
        key: `${y}-${pad(m0 + 1)}`,
        label: monthLabel(y, m0),
        due_date: `${y}-${pad(m0 + 1)}-${pad(dd)}`,
        period_start, period_end,
        duplicate: existingPeriods.has(`${y}-${pad(m0 + 1)}`),
      };
    });
  }, [startMonth, months, dueDay, existingPeriods]);

  const toCreate = skipExisting ? preview.filter(p => !p.duplicate) : preview;
  const amt = Number(amount);

  const handleGenerate = async () => {
    if (!amt || amt <= 0) return toast.error('Enter a rent amount');
    if (toCreate.length === 0) return toast.error('Nothing to generate');
    setBusy(true);
    try {
      for (const p of toCreate) {
        await create.mutateAsync({
          tenant_id: tenantId,
          lease_id: leaseId ?? null,
          property_id: propertyId ?? null,
          unit_id: unitId ?? null,
          type: 'rent_charge',
          status: 'unpaid',
          amount: amt,
          entry_date: p.due_date,
          due_date: p.due_date,
          period_start: p.period_start,
          period_end: p.period_end,
          description: `Monthly rent — ${p.label}`,
          tenant_visible: tenantVisible,
        } as any);
      }
      toast.success(`Generated ${toCreate.length} monthly rent charge${toCreate.length > 1 ? 's' : ''}`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to generate rent charges');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Generate Monthly Rent
          </DialogTitle>
          <DialogDescription>
            Creates one rent charge per month from the lease terms. Use this when nothing extra
            (maintenance, fees) needs to be added — otherwise use “Add Rent Charge”.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Start month</Label>
            <Input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} />
          </div>
          <div>
            <Label>Number of months</Label>
            <Input type="number" min={1} max={24} value={months}
              onChange={e => setMonths(Number(e.target.value))} />
          </div>
          <div>
            <Label>Monthly rent ($)</Label>
            <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Due day of month</Label>
            <Input type="number" min={1} max={31} value={dueDay} onChange={e => setDueDay(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border p-2">
          <Label className="text-sm">Skip months that already have a rent charge</Label>
          <Switch checked={skipExisting} onCheckedChange={setSkipExisting} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-2">
          <Label className="text-sm">Visible to tenant in portal</Label>
          <Switch checked={tenantVisible} onCheckedChange={setTenantVisible} />
        </div>

        <div className="border rounded-md divide-y max-h-52 overflow-auto">
          {preview.map(p => (
            <div key={p.key} className="flex items-center justify-between p-2 text-sm">
              <span>{p.label}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                due {p.due_date}
                {p.duplicate && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 text-[10px]">
                    {skipExisting ? 'Skipped — exists' : 'Duplicate'}
                  </Badge>
                )}
              </span>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleGenerate}
            disabled={busy || toCreate.length === 0}>
            {busy ? 'Generating…' : `Generate ${toCreate.length} charge${toCreate.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
