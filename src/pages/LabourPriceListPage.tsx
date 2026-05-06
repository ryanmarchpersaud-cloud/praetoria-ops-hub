import { useMemo, useState } from 'react';
import { Download, Search, Copy, Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  PRICE_ROWS, PRICE_CATEGORIES, PRICE_LIST_PDF,
  PRICE_LIST_VERSION, PRICE_LIST_DATE, QUOTE_DISCLAIMER, PRICE_LIST_DISCLAIMER,
} from '@/lib/labourPriceList';

export default function LabourPriceListPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PRICE_ROWS.filter(r => {
      if (category !== 'all' && r.category !== category) return false;
      if (!q) return true;
      return (
        r.service.toLowerCase().includes(q) ||
        r.unit.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });
  }, [search, category]);

  const copyDisclaimer = async () => {
    try {
      await navigator.clipboard.writeText(QUOTE_DISCLAIMER);
      setCopied(true);
      toast({ title: 'Disclaimer copied', description: 'Paste it into your quote.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy manually.', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Labour-Only Price List</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Internal quoting reference — Version {PRICE_LIST_VERSION} · {PRICE_LIST_DATE} · Regina, SK
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href={PRICE_LIST_PDF}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4" />
              Download PDF Price List
            </a>
          </Button>
          <Button onClick={copyDisclaimer} size="sm">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Quote Disclaimer'}
          </Button>
        </div>
      </div>

      {/* Rules card */}
      <div className="rounded-lg border bg-muted/30 p-4 mb-6 text-xs sm:text-sm">
        <div className="flex items-center gap-2 font-semibold mb-2">
          <FileText className="h-4 w-4" />
          Pricing rules & assumptions
        </div>
        <pre className="whitespace-pre-wrap font-sans text-muted-foreground leading-relaxed">
{PRICE_LIST_DISCLAIMER}
        </pre>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search service, unit, or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {PRICE_CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Showing {rows.length} of {PRICE_ROWS.length} rows. Use <span className="font-semibold">Standard</span> as the default starting point.
      </p>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[18%]">Category</TableHead>
              <TableHead className="w-[24%]">Service / Task</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Basic</TableHead>
              <TableHead className="text-right">Standard</TableHead>
              <TableHead className="text-right">Complex</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs text-muted-foreground">{r.category}</TableCell>
                <TableCell className="font-medium">{r.service}</TableCell>
                <TableCell className="text-sm">{r.unit}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{r.basic}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{r.standard}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{r.complex}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.notes}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No matching rows.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="rounded-lg border p-3 bg-card">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.category}</div>
            <div className="font-semibold text-sm mt-0.5">{r.service}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Unit: {r.unit}</div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-center">
              <div className="rounded bg-muted/50 py-1.5">
                <div className="text-[10px] uppercase text-muted-foreground">Basic</div>
                <div className="text-sm tabular-nums">{r.basic}</div>
              </div>
              <div className="rounded bg-primary/10 py-1.5">
                <div className="text-[10px] uppercase text-muted-foreground">Standard</div>
                <div className="text-sm font-bold tabular-nums">{r.standard}</div>
              </div>
              <div className="rounded bg-muted/50 py-1.5">
                <div className="text-[10px] uppercase text-muted-foreground">Complex</div>
                <div className="text-sm tabular-nums">{r.complex}</div>
              </div>
            </div>
            {r.notes && (
              <div className="text-xs text-muted-foreground mt-2 leading-snug">{r.notes}</div>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">No matching rows.</div>
        )}
      </div>
    </div>
  );
}
