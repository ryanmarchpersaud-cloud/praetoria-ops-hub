import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Mail, FileText, ExternalLink, Save as SaveIcon, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatTzTime, tzDateKey, minutesBetween, formatDurationMinutes } from '@/lib/timezone';

type Mode = 'job' | 'visit' | 'customer';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  customerId?: string | null;
  jobId?: string | null;
  visitId?: string | null;
  defaultEmail?: string | null;
}

interface VisitRow {
  id: string;
  visit_number: string | null;
  service_date: string | null;
  arrival_time: string | null;
  completion_time: string | null;
  visit_status: string | null;
  job_id: string | null;
  customer_id: string | null;
  service_summary: string | null;
  customer_visible_notes: string | null;
  crew_notes: string | null;
  assigned_worker_id: string | null;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '-';
  const date = new Date(`${d}T12:00:00`);
  return date.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function ProofOfServiceDialog({ open, onOpenChange, mode, customerId, jobId, visitId, defaultEmail }: Props) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [includeCrewNotes, setIncludeCrewNotes] = useState(false);
  const [customerMessage, setCustomerMessage] = useState('');
  const [emailTo, setEmailTo] = useState(defaultEmail || '');
  const [saveToDocs, setSaveToDocs] = useState(true);
  const [busy, setBusy] = useState<'download' | 'email' | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [lastFileName, setLastFileName] = useState<string | null>(null);

  // Load visits relevant to scope
  const { data: visits = [], isLoading } = useQuery<VisitRow[]>({
    queryKey: ['proof-of-service-visits', mode, customerId, jobId, visitId],
    enabled: open,
    queryFn: async () => {
      let q = supabase
        .from('visits')
        .select('id, visit_number, service_date, arrival_time, completion_time, visit_status, job_id, customer_id, service_summary, customer_visible_notes, crew_notes, assigned_worker_id')
        .order('service_date', { ascending: false })
        .limit(200);
      if (mode === 'visit' && visitId) q = q.eq('id', visitId);
      else if (mode === 'job' && jobId) q = q.eq('job_id', jobId);
      else if (mode === 'customer' && customerId) q = q.eq('customer_id', customerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as VisitRow[]) || [];
    },
  });

  // Try to populate default email from customer record when mode != customer
  useQuery({
    queryKey: ['proof-of-service-customer-email', customerId],
    enabled: open && !!customerId && !defaultEmail,
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('email, billing_contact_email, accounts_payable_email, site_contact_email')
        .eq('id', customerId!)
        .maybeSingle();
      const fallback = data?.email || (data as any)?.billing_contact_email || (data as any)?.accounts_payable_email || (data as any)?.site_contact_email;
      if (fallback && !emailTo) setEmailTo(fallback);
      return data;
    },
  });

  // Default selection
  useEffect(() => {
    if (!open || !visits.length) return;
    setSelected(prev => {
      if (prev.size > 0) return prev;
      if (mode === 'visit' && visitId) return new Set([visitId]);
      // Default: include completed + in-progress visits
      const initial = visits.filter(v => v.visit_status !== 'Cancelled').map(v => v.id);
      return new Set(initial);
    });
  }, [open, visits, mode, visitId]);

  // Date range filter
  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      if (!v.service_date) return true;
      if (dateStart && v.service_date < dateStart) return false;
      if (dateEnd && v.service_date > dateEnd) return false;
      return true;
    });
  }, [visits, dateStart, dateEnd]);

  const selectedVisits = useMemo(() => filteredVisits.filter(v => selected.has(v.id)), [filteredVisits, selected]);
  const totalMinutes = useMemo(() => {
    return selectedVisits.reduce((sum, v) => sum + minutesBetween(v.arrival_time, v.completion_time), 0);
  }, [selectedVisits]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(filteredVisits.map(v => v.id)));
  const selectNone = () => setSelected(new Set());

  const invoke = async (action: 'signed_url' | 'email' | 'save_to_customer_docs', overrides: Record<string, unknown> = {}) => {
    const visibleSelectedVisitIds = selectedVisits.map(v => v.id);
    const body: Record<string, unknown> = {
      action,
      visit_ids: visibleSelectedVisitIds,
      customer_id: customerId || selectedVisits[0]?.customer_id,
      job_id: jobId || selectedVisits[0]?.job_id,
      include_crew_notes: includeCrewNotes,
      include_photos: false,
      customer_message: customerMessage,
      date_range: { start: dateStart || undefined, end: dateEnd || undefined },
      ...overrides,
    };
    const { data, error } = await supabase.functions.invoke('proof-of-service-pdf', { body });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as { signedUrl?: string; downloadUrl?: string; fileName?: string; recipient?: string };
  };

  const handleDownload = async () => {
    if (!selectedVisits.length) return toast({ title: 'Select at least one visit', variant: 'destructive' });
    setBusy('download');
    try {
      // If save-to-docs toggle is on, request the combined action
      const action = saveToDocs ? 'save_to_customer_docs' : 'signed_url';
      const res = await invoke(action);
      if (res.downloadUrl) {
        setLastUrl(res.signedUrl || res.downloadUrl);
        setLastFileName(res.fileName || 'proof-of-service.pdf');
        const a = document.createElement('a');
        a.href = res.downloadUrl;
        a.download = res.fileName || 'proof-of-service.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast({ title: saveToDocs ? 'Report downloaded and saved to customer documents' : 'Report ready' });
      }
    } catch (e: any) {
      toast({ title: 'Could not generate report', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const handleEmail = async () => {
    if (!selectedVisits.length) return toast({ title: 'Select at least one visit', variant: 'destructive' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo)) return toast({ title: 'Enter a valid email', variant: 'destructive' });
    setBusy('email');
    try {
      const res = await invoke('email', { email: emailTo });
      toast({ title: `Emailed to ${res.recipient || emailTo}` });
      if (saveToDocs) {
        // Also save to customer documents on email send for record-keeping
        try { await invoke('save_to_customer_docs'); } catch { /* non-fatal */ }
      }
    } catch (e: any) {
      toast({ title: 'Could not send report', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Proof of Service Report</DialogTitle>
          <DialogDescription>
            Select the visits to include, then download, email, or save the PDF to the customer's documents. Times use Saskatchewan/Regina local time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 -mx-1 px-1">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> From</Label>
              <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> To</Label>
              <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="h-9" />
            </div>
          </div>

          {/* Visits list */}
          <div className="border rounded-md">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
              <div className="text-xs font-medium">
                {isLoading ? 'Loading visits...' : `${filteredVisits.length} visit${filteredVisits.length === 1 ? '' : 's'}`}
                {selectedVisits.length > 0 && <span className="ml-2 text-muted-foreground">({selectedVisits.length} selected · {formatDurationMinutes(totalMinutes)} total)</span>}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>Select all</Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={selectNone}>Clear</Button>
              </div>
            </div>
            <div className="max-h-64 overflow-auto divide-y">
              {filteredVisits.length === 0 && !isLoading && (
                <div className="p-4 text-xs text-muted-foreground">No visits in this range.</div>
              )}
              {filteredVisits.map(v => {
                const mins = minutesBetween(v.arrival_time, v.completion_time);
                const isSelected = selected.has(v.id);
                return (
                  <label key={v.id} className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40">
                    <Checkbox checked={isSelected} onCheckedChange={() => toggle(v.id)} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{fmtDate(v.service_date)}</span>
                        <Badge variant="outline" className="text-[10px]">{v.visit_number}</Badge>
                        <Badge variant="outline" className="text-[10px]">{v.visit_status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {v.arrival_time ? formatTzTime(v.arrival_time) : '—'} → {v.completion_time ? formatTzTime(v.completion_time) : '—'}
                        {mins > 0 && <span className="ml-2 font-medium text-foreground">{formatDurationMinutes(mins)}</span>}
                      </div>
                      {v.service_summary && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{v.service_summary}</div>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Customer message */}
          <div>
            <Label className="text-xs">Customer-facing message (optional)</Label>
            <Textarea
              value={customerMessage}
              onChange={(e) => setCustomerMessage(e.target.value)}
              placeholder="Attached is the proof of service report for June 24–26."
              rows={2}
            />
          </div>

          {/* Options */}
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Include internal crew notes</div>
                <div className="text-xs text-muted-foreground">Off by default. Crew/internal notes will only appear in the PDF if you opt in.</div>
              </div>
              <Switch checked={includeCrewNotes} onCheckedChange={setIncludeCrewNotes} />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Save a copy under Customer Documents</div>
                <div className="text-xs text-muted-foreground">Visible to the customer in their portal under "Proof of Service".</div>
              </div>
              <Switch checked={saveToDocs} onCheckedChange={setSaveToDocs} />
            </div>
          </div>

          {/* Email row */}
          <div className="rounded-md border p-3 space-y-2">
            <Label className="text-xs">Email recipient</Label>
            <Input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="customer@example.com"
              className="h-9"
            />
          </div>

          {lastUrl && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs flex items-center justify-between gap-2">
              <span className="truncate">Last report: <strong>{lastFileName}</strong></span>
              <a href={lastUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="outline" onClick={handleDownload} disabled={busy !== null || selectedVisits.length === 0}>
            {busy === 'download' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download PDF
          </Button>
          <Button onClick={handleEmail} disabled={busy !== null || selectedVisits.length === 0 || !emailTo}>
            {busy === 'email' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Email to Customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
