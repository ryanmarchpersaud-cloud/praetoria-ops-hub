import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers';
import { ArrowLeft, Upload, ShieldCheck, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { CUSTOMER_TYPES, PROVINCES } from '@/lib/constants';

/**
 * Praetoria-side customer fields the user can map Jobber columns to.
 * Keep this list focused on the fields most commonly present in a Jobber export.
 */
const PRAETORIA_FIELDS = [
  { key: 'skip', label: '— Do not import —', group: 'Skip' },
  { key: 'first_name', label: 'First Name *', group: 'Contact' },
  { key: 'last_name', label: 'Last Name *', group: 'Contact' },
  { key: 'company_name', label: 'Company Name', group: 'Contact' },
  { key: 'email', label: 'Email', group: 'Contact' },
  { key: 'secondary_email', label: 'Secondary Email', group: 'Contact' },
  { key: 'phone', label: 'Phone', group: 'Contact' },
  { key: 'customer_type', label: 'Customer Type', group: 'Account' },
  { key: 'address_line_1', label: 'Service Address', group: 'Address' },
  { key: 'city', label: 'City', group: 'Address' },
  { key: 'province', label: 'Province', group: 'Address' },
  { key: 'postal_code', label: 'Postal Code', group: 'Address' },
  { key: 'billing_address_line_1', label: 'Billing Address', group: 'Billing' },
  { key: 'billing_city', label: 'Billing City', group: 'Billing' },
  { key: 'billing_province', label: 'Billing Province', group: 'Billing' },
  { key: 'billing_postal_code', label: 'Billing Postal Code', group: 'Billing' },
  { key: 'notes', label: 'Internal Notes', group: 'Other' },
  { key: 'referral_source', label: 'Referral Source', group: 'Other' },
] as const;

type FieldKey = typeof PRAETORIA_FIELDS[number]['key'];

/** Common Jobber column names → Praetoria field guesses (case/space insensitive). */
const JOBBER_GUESSES: Record<string, FieldKey> = {
  'first name': 'first_name',
  'firstname': 'first_name',
  'last name': 'last_name',
  'lastname': 'last_name',
  'company': 'company_name',
  'company name': 'company_name',
  'business name': 'company_name',
  'email': 'email',
  'email address': 'email',
  'primary email': 'email',
  'secondary email': 'secondary_email',
  'phone': 'phone',
  'phone number': 'phone',
  'mobile': 'phone',
  'mobile phone': 'phone',
  'main phone': 'phone',
  'street': 'address_line_1',
  'street 1': 'address_line_1',
  'address': 'address_line_1',
  'address 1': 'address_line_1',
  'service address': 'address_line_1',
  'city': 'city',
  'province': 'province',
  'state': 'province',
  'state/province': 'province',
  'postal code': 'postal_code',
  'postal/zip': 'postal_code',
  'zip': 'postal_code',
  'zip code': 'postal_code',
  'billing street': 'billing_address_line_1',
  'billing address': 'billing_address_line_1',
  'billing city': 'billing_city',
  'billing province': 'billing_province',
  'billing state': 'billing_province',
  'billing postal code': 'billing_postal_code',
  'billing zip': 'billing_postal_code',
  'notes': 'notes',
  'internal notes': 'notes',
  'lead source': 'referral_source',
  'referral source': 'referral_source',
  'client type': 'customer_type',
  'customer type': 'customer_type',
};

/** Minimal CSV parser supporting quoted fields and embedded commas / newlines. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else { cur += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = '';
        if (row.some(c => c.length > 0)) rows.push(row);
        row = [];
      } else { cur += ch; }
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); if (row.some(c => c.length > 0)) rows.push(row); }
  return rows;
}

function guessMapping(headers: string[]): FieldKey[] {
  return headers.map(h => JOBBER_GUESSES[h.trim().toLowerCase()] || 'skip');
}

function normalizeProvince(v: string | null): string | null {
  if (!v) return null;
  const t = v.trim().toUpperCase();
  return (PROVINCES as readonly string[]).includes(t) ? t : null;
}

function normalizeCustomerType(v: string | null): string {
  if (!v) return 'Residential';
  const t = v.trim().toLowerCase();
  const match = (CUSTOMER_TYPES as readonly string[]).find(c => c.toLowerCase() === t);
  return match || 'Residential';
}

type RowStatus = 'ready' | 'duplicate' | 'invalid' | 'imported' | 'failed';
interface PreviewRow {
  values: Record<string, string | null>;
  status: RowStatus;
  message?: string;
  include: boolean;
}

export default function CustomersImport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: existingCustomers = [] } = useCustomers();
  const createCustomer = useCreateCustomer();

  const [rawText, setRawText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<FieldKey[]>([]);
  const [markProtected, setMarkProtected] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ created: number; skipped: number; failed: number } | null>(null);

  const existingEmails = useMemo(
    () => new Set(existingCustomers.map(c => (c.email || '').trim().toLowerCase()).filter(Boolean)),
    [existingCustomers],
  );

  const handleParse = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setHeaders([]); setDataRows([]); setMapping([]); return;
    }
    const rows = parseCSV(trimmed);
    if (rows.length === 0) return;
    const hdr = rows[0].map(h => h.trim());
    setHeaders(hdr);
    setDataRows(rows.slice(1));
    setMapping(guessMapping(hdr));
    setResults(null);
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    setRawText(text);
    handleParse(text);
  };

  const previewRows: PreviewRow[] = useMemo(() => {
    if (dataRows.length === 0 || mapping.length === 0) return [];
    return dataRows.map(cells => {
      const values: Record<string, string | null> = {};
      mapping.forEach((field, idx) => {
        if (field === 'skip') return;
        const v = (cells[idx] ?? '').trim();
        values[field] = v.length > 0 ? v : null;
      });
      const email = (values.email || '').toLowerCase();
      const hasName = (values.first_name || values.last_name || values.company_name);
      let status: RowStatus = 'ready';
      let message: string | undefined;
      if (!hasName) { status = 'invalid'; message = 'Missing first/last/company name'; }
      else if (email && existingEmails.has(email)) { status = 'duplicate'; message = 'Email already exists'; }
      return { values, status, message, include: status !== 'invalid' };
    });
  }, [dataRows, mapping, existingEmails]);

  const stats = useMemo(() => {
    const total = previewRows.length;
    const ready = previewRows.filter(r => r.status === 'ready').length;
    const duplicates = previewRows.filter(r => r.status === 'duplicate').length;
    const invalid = previewRows.filter(r => r.status === 'invalid').length;
    return { total, ready, duplicates, invalid };
  }, [previewRows]);

  const toggleInclude = (idx: number) => {
    const updated = [...previewRows];
    updated[idx] = { ...updated[idx], include: !updated[idx].include };
    // We can't directly mutate previewRows (memoized). Track include state via a separate map instead.
    setIncludeOverrides(prev => ({ ...prev, [idx]: updated[idx].include }));
  };
  const [includeOverrides, setIncludeOverrides] = useState<Record<number, boolean>>({});

  const effectiveRows = previewRows.map((r, i) => ({
    ...r,
    include: includeOverrides[i] !== undefined ? includeOverrides[i] : (r.include && (r.status !== 'duplicate' || !skipDuplicates)),
  }));

  const handleImport = async () => {
    setImporting(true);
    let created = 0, skipped = 0, failed = 0;
    for (const row of effectiveRows) {
      if (!row.include || row.status === 'invalid') { skipped++; continue; }
      if (skipDuplicates && row.status === 'duplicate') { skipped++; continue; }
      try {
        const v = row.values;
        const first_name = v.first_name || (v.company_name ? v.company_name.split(' ')[0] : '') || 'Unknown';
        const last_name = v.last_name || (v.company_name ? v.company_name.split(' ').slice(1).join(' ') || '—' : '—');
        await createCustomer.mutateAsync({
          first_name,
          last_name,
          company_name: v.company_name || null,
          account_type: v.company_name ? 'Company' : 'Individual',
          customer_type: normalizeCustomerType(v.customer_type),
          email: v.email || null,
          secondary_email: v.secondary_email || null,
          phone: v.phone || null,
          address_line_1: v.address_line_1 || null,
          city: v.city || null,
          province: normalizeProvince(v.province),
          postal_code: v.postal_code || null,
          billing_address_line_1: v.billing_address_line_1 || null,
          billing_city: v.billing_city || null,
          billing_province: normalizeProvince(v.billing_province),
          billing_postal_code: v.billing_postal_code || null,
          billing_address_same_as_service: !v.billing_address_line_1,
          notes: v.notes ? `[Imported from Jobber] ${v.notes}` : '[Imported from Jobber]',
          referral_source: v.referral_source || 'Other',
          is_protected: markProtected,
        } as any);
        created++;
      } catch (err: any) {
        console.error('Import failed for row', row, err);
        failed++;
      }
    }
    setImporting(false);
    setResults({ created, skipped, failed });
    toast({
      title: 'Import complete',
      description: `${created} created, ${skipped} skipped, ${failed} failed.`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Import customers from Jobber</h1>
          <p className="text-sm text-muted-foreground">
            Upload or paste a Jobber CSV export, map the columns, then bulk-import as protected real customers.
          </p>
        </div>
      </div>

      {/* STEP 1 — Source */}
      <section className="rounded-lg border bg-card p-4 space-y-4">
        <div>
          <h2 className="font-semibold text-sm">Step 1 — Provide Jobber data</h2>
          <p className="text-xs text-muted-foreground">In Jobber: Clients → Export. Then upload that file or paste it here.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file" className="text-sm">Upload CSV</Label>
            <div className="flex items-center gap-2">
              <Input id="csv-file" type="file" accept=".csv,text/csv"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="csv-paste" className="text-sm">…or paste CSV</Label>
            <Textarea id="csv-paste" rows={4} placeholder="first name,last name,email,phone,address,city..."
              value={rawText} onChange={e => { setRawText(e.target.value); handleParse(e.target.value); }}
              className="font-mono text-xs" />
          </div>
        </div>
      </section>

      {/* STEP 2 — Mapping */}
      {headers.length > 0 && (
        <section className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold text-sm">Step 2 — Map Jobber columns to Praetoria fields</h2>
              <p className="text-xs text-muted-foreground">
                We pre-filled common matches. Set unwanted columns to <em>Do not import</em>.
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">{headers.length} columns · {dataRows.length} rows</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {headers.map((h, idx) => (
              <div key={`${h}-${idx}`} className="rounded-md border bg-background p-3 space-y-2">
                <div className="text-xs text-muted-foreground">Jobber column</div>
                <div className="text-sm font-medium truncate" title={h}>{h || <span className="italic text-muted-foreground">(unnamed)</span>}</div>
                <div className="text-xs text-muted-foreground truncate" title={dataRows[0]?.[idx] || ''}>
                  Sample: <span className="text-foreground">{dataRows[0]?.[idx] || '—'}</span>
                </div>
                <Separator />
                <select
                  value={mapping[idx] || 'skip'}
                  onChange={e => {
                    const next = [...mapping];
                    next[idx] = e.target.value as FieldKey;
                    setMapping(next);
                  }}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                >
                  {PRAETORIA_FIELDS.map(f => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* STEP 3 — Preview & Options */}
      {previewRows.length > 0 && (
        <section className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-sm">Step 3 — Review & import</h2>
              <p className="text-xs text-muted-foreground">
                <CheckCircle2 className="inline h-3.5 w-3.5 text-primary mr-1" /> {stats.ready} ready ·{' '}
                <AlertTriangle className="inline h-3.5 w-3.5 text-amber-500 mr-1" /> {stats.duplicates} duplicate ·{' '}
                <X className="inline h-3.5 w-3.5 text-destructive mr-1" /> {stats.invalid} invalid
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex items-center gap-2">
                <Switch id="mark_protected" checked={markProtected} onCheckedChange={setMarkProtected} />
                <Label htmlFor="mark_protected" className="cursor-pointer text-sm flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Mark all as Protected
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="skip_dupes" checked={skipDuplicates} onCheckedChange={setSkipDuplicates} />
                <Label htmlFor="skip_dupes" className="cursor-pointer text-sm">Skip duplicates (by email)</Label>
              </div>
            </div>
          </div>

          <div className="rounded-md border overflow-auto max-h-[480px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="w-16 text-center">Import</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {effectiveRows.map((r, i) => (
                  <TableRow key={i} className={r.status === 'invalid' ? 'opacity-60' : ''}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      {r.status === 'ready' && <Badge variant="outline" className="text-primary border-primary/30">Ready</Badge>}
                      {r.status === 'duplicate' && <Badge variant="outline" className="text-amber-600 border-amber-300" title={r.message}>Duplicate</Badge>}
                      {r.status === 'invalid' && <Badge variant="outline" className="text-destructive border-destructive/30" title={r.message}>Invalid</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{[r.values.first_name, r.values.last_name].filter(Boolean).join(' ') || '—'}</TableCell>
                    <TableCell className="text-sm">{r.values.company_name || '—'}</TableCell>
                    <TableCell className="text-sm">{r.values.email || '—'}</TableCell>
                    <TableCell className="text-sm">{r.values.phone || '—'}</TableCell>
                    <TableCell className="text-sm">{r.values.city || '—'}</TableCell>
                    <TableCell className="text-center">
                      <input type="checkbox" checked={r.include} disabled={r.status === 'invalid'}
                        onChange={() => toggleInclude(i)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {results && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Import results</p>
              <p className="text-muted-foreground text-xs mt-1">
                ✅ {results.created} created · ⏭️ {results.skipped} skipped · ❌ {results.failed} failed
              </p>
              <Link to="/customers" className="text-primary text-xs underline mt-1 inline-block">View customers →</Link>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/customers')}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing || effectiveRows.filter(r => r.include).length === 0}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importing…' : `Import ${effectiveRows.filter(r => r.include).length} customers`}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
