import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Search } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  INSPECTION_STATUSES, INSPECTION_TYPES,
  PmInspectionStatus, PmInspectionType,
} from '@/hooks/pm/usePmInspections';
import { InspectionsList } from '@/components/property-management/inspections/InspectionsList';
import { CreateInspectionDialog } from '@/components/property-management/inspections/CreateInspectionDialog';

const ANY = '__any__';

export default function PMInspectionsList() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>(ANY);
  const [status, setStatus] = useState<string>(ANY);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filters = useMemo(() => ({
    search: search || undefined,
    inspection_type: type !== ANY ? (type as PmInspectionType) : undefined,
    status: status !== ANY ? (status as PmInspectionStatus) : undefined,
    from: from || undefined,
    to: to || undefined,
  }), [search, type, status, from, to]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-emerald-700" /> Inspections
          </h1>
          <p className="text-sm text-muted-foreground">
            Property, unit, and lease inspections. Toggle tenant/owner visibility per note, item, and photo.
          </p>
        </div>
        <CreateInspectionDialog />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="relative md:col-span-2">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search title…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All types</SelectItem>
                {INSPECTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All statuses</SelectItem>
                {INSPECTION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <div className="flex justify-end md:col-span-2">
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setType(ANY); setStatus(ANY); setFrom(''); setTo(''); }}>Clear</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <InspectionsList filters={filters} />
    </div>
  );
}
