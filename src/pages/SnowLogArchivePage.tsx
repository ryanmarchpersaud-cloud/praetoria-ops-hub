import { useState, useMemo } from 'react';
import { useSnowLogs, useCreateSnowLog, useDeleteSnowLog, useUpdateSnowLog, type SnowLog } from '@/hooks/useSnowLogs';
import { useCustomers } from '@/hooks/useCustomers';
import { useProperties } from '@/hooks/useProperties';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Save, Trash2, Snowflake, FileSpreadsheet, Download } from 'lucide-react';
import { format } from 'date-fns';

const SERVICES = ['Plow', 'Shovel', 'Salt', 'Sand', 'De-Ice'];

type DraftRow = {
  service_date: string;
  start_time: string;
  end_time: string;
  property_id: string;
  customer_id: string;
  temperature_c: string;
  weather_conditions: string;
  snowfall_cm: string;
  services_performed: string;
  salt_kg: string;
  sand_kg: string;
  crew_names: string;
  total_hours: string;
  customer_summary: string;
  internal_notes: string;
};

const emptyRow = (): DraftRow => ({
  service_date: '',
  start_time: '',
  end_time: '',
  property_id: '',
  customer_id: '',
  temperature_c: '',
  weather_conditions: '',
  snowfall_cm: '',
  services_performed: '',
  salt_kg: '',
  sand_kg: '',
  crew_names: '',
  total_hours: '',
  customer_summary: '',
  internal_notes: '',
});

function seasonFromDate(d: string): string | null {
  if (!d) return null;
  const [y, m] = d.split('-').map(Number);
  if (!y || !m) return null;
  // Snow season Oct–Apr
  if (m >= 10) return `${y}-${y + 1}`;
  if (m <= 4) return `${y - 1}-${y}`;
  return `${y}`;
}

export default function SnowLogArchivePage() {
  const { toast } = useToast();
  const [seasonFilter, setSeasonFilter] = useState<string>('');
  const { data: logs = [], isLoading } = useSnowLogs(seasonFilter ? { season: seasonFilter } : undefined);
  const { data: customers = [] } = useCustomers();
  const { data: properties = [] } = useProperties();
  const createSnowLog = useCreateSnowLog();
  const deleteSnowLog = useDeleteSnowLog();

  const [drafts, setDrafts] = useState<DraftRow[]>([emptyRow()]);

  const seasons = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => l.season && set.add(l.season));
    return Array.from(set).sort().reverse();
  }, [logs]);

  const updateDraft = (i: number, field: keyof DraftRow, value: string) => {
    setDrafts((d) => d.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setDrafts((d) => [...d, emptyRow()]);
  const removeRow = (i: number) => setDrafts((d) => d.filter((_, idx) => idx !== i));

  const validRows = drafts.filter((r) => r.service_date && r.property_id);

  const handleSave = async () => {
    if (validRows.length === 0) {
      toast({ title: 'Nothing to save', description: 'Each row needs a date and property.', variant: 'destructive' });
      return;
    }
    const payload = validRows.map((r) => {
      const customer_id = r.customer_id || properties.find((p) => p.id === r.property_id)?.customer_id || null;
      return {
        service_date: r.service_date,
        start_time: r.start_time || null,
        end_time: r.end_time || null,
        property_id: r.property_id,
        customer_id,
        season: seasonFromDate(r.service_date),
        temperature_c: r.temperature_c ? Number(r.temperature_c) : null,
        weather_conditions: r.weather_conditions || null,
        snowfall_cm: r.snowfall_cm ? Number(r.snowfall_cm) : null,
        services_performed: r.services_performed
          ? r.services_performed.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        salt_kg: r.salt_kg ? Number(r.salt_kg) : null,
        sand_kg: r.sand_kg ? Number(r.sand_kg) : null,
        crew_names: r.crew_names || null,
        total_hours: r.total_hours ? Number(r.total_hours) : null,
        customer_summary: r.customer_summary || null,
        internal_notes: r.internal_notes || null,
        source: 'paper_archive',
      };
    });
    try {
      await createSnowLog.mutateAsync(payload as any);
      toast({ title: `Saved ${payload.length} snow log${payload.length > 1 ? 's' : ''}` });
      setDrafts([emptyRow()]);
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this snow log entry? This cannot be undone.')) return;
    try {
      await deleteSnowLog.mutateAsync(id);
      toast({ title: 'Snow log deleted' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  const exportCsv = () => {
    const headers = ['Date', 'Property', 'Customer', 'Start', 'End', 'Temp °C', 'Conditions', 'Snowfall cm', 'Services', 'Salt kg', 'Sand kg', 'Crew', 'Hours', 'Customer Summary', 'Internal Notes'];
    const rows = logs.map((l) => [
      l.service_date,
      l.properties?.property_name ?? '',
      l.customers ? `${l.customers.first_name ?? ''} ${l.customers.last_name ?? ''} ${l.customers.company_name ?? ''}`.trim() : '',
      l.start_time ?? '',
      l.end_time ?? '',
      l.temperature_c ?? '',
      l.weather_conditions ?? '',
      l.snowfall_cm ?? '',
      (l.services_performed ?? []).join('; '),
      l.salt_kg ?? '',
      l.sand_kg ?? '',
      l.crew_names ?? '',
      l.total_hours ?? '',
      l.customer_summary ?? '',
      l.internal_notes ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snow-logs-${seasonFilter || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Snowflake className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Snow Log Archive</h1>
            <p className="text-sm text-muted-foreground">Permanent record of historical snow & ice services. Customers see a friendly summary in their portal.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={seasonFilter || 'all'} onValueChange={(v) => setSeasonFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All seasons" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All seasons</SelectItem>
              {seasons.map((s) => <SelectItem key={s} value={s}>Winter {s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={logs.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4" /> Bulk Entry — Type or paste rows from your paper logs
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-4 w-4 mr-1" /> Add Row</Button>
              <Button size="sm" onClick={handleSave} disabled={createSnowLog.isPending || validRows.length === 0}>
                <Save className="h-4 w-4 mr-1" /> Save {validRows.length > 0 && `(${validRows.length})`}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Rows need a date and property to save. Customer is auto-filled from property. Services: comma-separated (e.g. "Plow, Salt").</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border p-1 text-left min-w-[120px]">Date *</th>
                <th className="border p-1 text-left min-w-[180px]">Property *</th>
                <th className="border p-1 text-left w-20">Start</th>
                <th className="border p-1 text-left w-20">End</th>
                <th className="border p-1 text-left w-16">°C</th>
                <th className="border p-1 text-left min-w-[140px]">Conditions</th>
                <th className="border p-1 text-left w-20">Snow cm</th>
                <th className="border p-1 text-left min-w-[140px]">Services</th>
                <th className="border p-1 text-left w-20">Salt kg</th>
                <th className="border p-1 text-left w-20">Sand kg</th>
                <th className="border p-1 text-left min-w-[140px]">Crew</th>
                <th className="border p-1 text-left w-16">Hrs</th>
                <th className="border p-1 text-left min-w-[200px]">Customer Summary</th>
                <th className="border p-1 text-left min-w-[160px]">Internal Notes</th>
                <th className="border p-1 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((row, i) => (
                <tr key={i}>
                  <td className="border p-0.5"><Input type="date" className="h-8 text-xs" value={row.service_date} onChange={(e) => updateDraft(i, 'service_date', e.target.value)} /></td>
                  <td className="border p-0.5">
                    <Select value={row.property_id} onValueChange={(v) => updateDraft(i, 'property_id', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select property" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="border p-0.5"><Input type="time" className="h-8 text-xs" value={row.start_time} onChange={(e) => updateDraft(i, 'start_time', e.target.value)} /></td>
                  <td className="border p-0.5"><Input type="time" className="h-8 text-xs" value={row.end_time} onChange={(e) => updateDraft(i, 'end_time', e.target.value)} /></td>
                  <td className="border p-0.5"><Input type="number" step="0.1" className="h-8 text-xs" value={row.temperature_c} onChange={(e) => updateDraft(i, 'temperature_c', e.target.value)} /></td>
                  <td className="border p-0.5"><Input className="h-8 text-xs" placeholder="Snow, freezing rain..." value={row.weather_conditions} onChange={(e) => updateDraft(i, 'weather_conditions', e.target.value)} /></td>
                  <td className="border p-0.5"><Input type="number" step="0.1" className="h-8 text-xs" value={row.snowfall_cm} onChange={(e) => updateDraft(i, 'snowfall_cm', e.target.value)} /></td>
                  <td className="border p-0.5"><Input className="h-8 text-xs" placeholder="Plow, Salt" value={row.services_performed} onChange={(e) => updateDraft(i, 'services_performed', e.target.value)} /></td>
                  <td className="border p-0.5"><Input type="number" step="0.1" className="h-8 text-xs" value={row.salt_kg} onChange={(e) => updateDraft(i, 'salt_kg', e.target.value)} /></td>
                  <td className="border p-0.5"><Input type="number" step="0.1" className="h-8 text-xs" value={row.sand_kg} onChange={(e) => updateDraft(i, 'sand_kg', e.target.value)} /></td>
                  <td className="border p-0.5"><Input className="h-8 text-xs" value={row.crew_names} onChange={(e) => updateDraft(i, 'crew_names', e.target.value)} /></td>
                  <td className="border p-0.5"><Input type="number" step="0.25" className="h-8 text-xs" value={row.total_hours} onChange={(e) => updateDraft(i, 'total_hours', e.target.value)} /></td>
                  <td className="border p-0.5"><Input className="h-8 text-xs" placeholder="What customer sees" value={row.customer_summary} onChange={(e) => updateDraft(i, 'customer_summary', e.target.value)} /></td>
                  <td className="border p-0.5"><Input className="h-8 text-xs" value={row.internal_notes} onChange={(e) => updateDraft(i, 'internal_notes', e.target.value)} /></td>
                  <td className="border p-0.5 text-center">
                    {drafts.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRow(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved Snow Logs ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-4">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No snow logs saved yet for this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Conditions</TableHead>
                    <TableHead>Snow</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Materials</TableHead>
                    <TableHead>Crew / Hrs</TableHead>
                    <TableHead>Customer Summary</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium whitespace-nowrap">{format(new Date(l.service_date + 'T00:00:00'), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{l.properties?.property_name ?? '—'}</TableCell>
                      <TableCell className="text-xs">{l.weather_conditions ?? '—'}{l.temperature_c != null && ` · ${l.temperature_c}°C`}</TableCell>
                      <TableCell>{l.snowfall_cm != null ? `${l.snowfall_cm} cm` : '—'}</TableCell>
                      <TableCell className="text-xs">{(l.services_performed ?? []).join(', ') || '—'}</TableCell>
                      <TableCell className="text-xs">
                        {[l.salt_kg && `Salt ${l.salt_kg}kg`, l.sand_kg && `Sand ${l.sand_kg}kg`].filter(Boolean).join(', ') || '—'}
                      </TableCell>
                      <TableCell className="text-xs">{l.crew_names ?? '—'}{l.total_hours != null && ` · ${l.total_hours}h`}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate" title={l.customer_summary ?? ''}>{l.customer_summary ?? '—'}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(l.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
  );
}
