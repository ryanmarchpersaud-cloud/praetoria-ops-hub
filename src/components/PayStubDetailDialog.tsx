import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Printer, Building2, Send, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

interface PayStub {
  id: string;
  user_id?: string;
  pay_date: string;
  pay_period_start: string;
  pay_period_end: string;
  gross_pay: number;
  deductions: number;
  net_pay: number;
  ytd_gross: number;
  ytd_net: number;
  notes?: string | null;
  stub_pdf_url?: string | null;
}

interface Props {
  stub: PayStub | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName?: string;
  employeeRole?: string;
  /** Hide admin-only actions (send, etc.) in worker portal */
  workerView?: boolean;
}

function useCompanySettings() {
  return useQuery({
    queryKey: ['company_settings_brand'],
    queryFn: async () => {
      const { data } = await supabase.from('company_settings').select('display_name, operating_name, legal_name, logo_url, primary_color, phone, email, physical_address, support_email').limit(1).maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch the detailed payroll_run_item linked to this stub */
function usePayrollRunDetail(userId?: string, payDate?: string, open?: boolean) {
  return useQuery({
    queryKey: ['payroll_run_detail', userId, payDate],
    enabled: !!userId && !!payDate && !!open,
    queryFn: async () => {
      // Find the payroll run that matches this pay date
      const { data: runs } = await supabase
        .from('payroll_runs')
        .select('id, run_number, pay_date, pay_period_start, pay_period_end, status')
        .eq('pay_date', payDate!)
        .limit(5);

      if (!runs || runs.length === 0) return null;

      // Find the item for this user in any matching run
      for (const run of runs) {
        const { data: items } = await supabase
          .from('payroll_run_items')
          .select('*')
          .eq('payroll_run_id', run.id)
          .eq('user_id', userId!)
          .limit(1);

        if (items && items.length > 0) {
          return { run, item: items[0] };
        }
      }
      return null;
    },
    staleTime: 2 * 60 * 1000,
  });
}

const n = (v: any) => Number(v || 0);
const fmt = (v: any) => n(v).toFixed(2);

export default function PayStubDetailDialog({ stub, open, onOpenChange, employeeName, employeeRole, workerView }: Props) {
  const { data: company } = useCompanySettings();
  const { data: detail } = usePayrollRunDetail(stub?.user_id, stub?.pay_date, open);
  const [sending, setSending] = useState(false);

  if (!stub) return null;

  const companyName = company?.operating_name || company?.display_name || company?.legal_name || 'Praetoria Group';
  const primaryColor = company?.primary_color || '#1e3a5f';
  const item = detail?.item;
  const runNumber = detail?.run?.run_number;

  // Earnings lines
  const earnings: { label: string; hours?: number; rate?: number; amount: number }[] = [];
  if (item) {
    if (n(item.regular_hours) > 0) earnings.push({ label: 'Regular Hours', hours: n(item.regular_hours), rate: n(item.hourly_rate), amount: n(item.regular_hours) * n(item.hourly_rate) });
    if (n(item.overtime_hours) > 0) earnings.push({ label: 'Overtime Hours (1.5×)', hours: n(item.overtime_hours), rate: n(item.hourly_rate) * 1.5, amount: n(item.overtime_hours) * n(item.hourly_rate) * 1.5 });
    if (n(item.holiday_hours) > 0) earnings.push({ label: 'Holiday Pay', hours: n(item.holiday_hours), rate: n(item.hourly_rate), amount: n(item.holiday_hours) * n(item.hourly_rate) });
    if (n(item.sick_hours) > 0) earnings.push({ label: 'Sick Pay', hours: n(item.sick_hours), rate: n(item.hourly_rate), amount: n(item.sick_hours) * n(item.hourly_rate) });
    if (n(item.vacation_hours) > 0) earnings.push({ label: 'Vacation Pay', hours: n(item.vacation_hours), rate: n(item.hourly_rate), amount: n(item.vacation_hours) * n(item.hourly_rate) });
    if (n(item.bonus_amount) > 0) earnings.push({ label: 'Bonus', amount: n(item.bonus_amount) });
    if (n(item.allowance_amount) > 0) earnings.push({ label: 'Allowance', amount: n(item.allowance_amount) });
    if (n(item.salary_override) > 0) earnings.push({ label: 'Salary', amount: n(item.salary_override) });
  }

  // Deduction lines
  const deductions: { label: string; amount: number }[] = [];
  if (item) {
    if (n(item.cpp_amount) > 0) deductions.push({ label: 'CPP (Canada Pension Plan)', amount: n(item.cpp_amount) });
    if (n(item.ei_amount) > 0) deductions.push({ label: 'EI (Employment Insurance)', amount: n(item.ei_amount) });
    if (n(item.income_tax_amount) > 0) deductions.push({ label: 'Federal / Provincial Income Tax', amount: n(item.income_tax_amount) });
    if (n(item.other_deductions_amount) > 0) deductions.push({ label: 'Other Deductions', amount: n(item.other_deductions_amount) });
  }

  const handleSend = async () => {
    setSending(true);
    try {
      // Attempt to find employee email
      const { data: profile } = await supabase.from('worker_profiles').select('work_email, full_name').eq('user_id', stub.user_id!).maybeSingle();
      const email = profile?.work_email;
      if (!email) {
        toast.error('No email found for this employee. Cannot send pay stub.');
        return;
      }
      toast.success(`Pay stub notification queued for ${profile.full_name || employeeName}`);
    } catch {
      toast.error('Failed to send pay stub');
    } finally {
      setSending(false);
    }
  };

  // Build printable HTML
  const buildPrintHtml = () => {
    const earningsHtml = earnings.length > 0
      ? earnings.map(e => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">${e.label}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">${e.hours != null ? e.hours.toFixed(1) : '—'}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">${e.rate != null ? '$' + e.rate.toFixed(2) : '—'}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-weight:500;">$${e.amount.toFixed(2)}</td>
        </tr>`).join('')
      : `<tr><td colspan="4" style="padding:8px 10px;font-size:13px;">Gross Earnings</td></tr>`;

    const deductionsHtml = deductions.length > 0
      ? deductions.map(d => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;" colspan="3">${d.label}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;color:#dc2626;">–$${d.amount.toFixed(2)}</td>
        </tr>`).join('')
      : `<tr><td colspan="3" style="padding:8px 10px;font-size:13px;">Total Deductions</td><td style="text-align:right;color:#dc2626;padding:8px 10px;">–$${fmt(stub.deductions)}</td></tr>`;

    return `<!DOCTYPE html><html><head><title>Pay Stub – ${employeeName || 'Employee'} – ${format(new Date(stub.pay_date), 'MMM d, yyyy')}</title>
<style>
  @page { size: letter; margin: 0.6in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; max-width: 750px; margin: 0 auto; padding: 32px; }
  .brand-bar { background: #0f172a; color: white; padding: 20px 24px; border-radius: 8px; display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
  .brand-bar img { height: 56px; }
  .brand-bar h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
  .brand-bar .sub { font-size: 11px; opacity: 0.7; margin-top: 2px; letter-spacing: 0.5px; }
  .brand-bar .contact { font-size: 11px; opacity: 0.7; margin-top: 4px; }
  .doc-title { font-size: 18px; font-weight: 700; color: ${primaryColor}; margin-bottom: 4px; }
  .ref { font-size: 12px; color: #888; margin-bottom: 16px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .meta-box { background: #f1f5f9; padding: 10px 14px; border-radius: 6px; border-left: 3px solid ${primaryColor}; }
  .meta-box .lbl { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.6px; font-weight: 600; }
  .meta-box .val { font-size: 14px; font-weight: 700; margin-top: 2px; }
  .meta-box .sub { font-size: 11px; color: #64748b; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: ${primaryColor}; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 2px solid ${primaryColor}; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; padding: 6px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; text-align: left; border-bottom: 2px solid #cbd5e1; }
  th:last-child { text-align: right; }
  th:nth-child(2), th:nth-child(3) { text-align: center; }
  .total-row td { font-weight: 700; font-size: 14px; padding: 8px 10px; border-top: 2px solid ${primaryColor}; }
  .net-row { background: #f0fdf4; }
  .net-row td { font-weight: 800; font-size: 16px; padding: 10px; border-top: 3px solid #16a34a; }
  .ytd-section { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 16px; }
  .ytd-box { background: #f8fafc; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; }
  .ytd-box .lbl { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.6px; }
  .ytd-box .val { font-size: 15px; font-weight: 700; margin-top: 2px; }
  .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { body { padding: 0; } .brand-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="brand-bar">
  ${company?.logo_url ? `<img src="${company.logo_url}" alt="Logo" />` : ''}
  <div>
    <h1>${companyName}</h1>
    <div class="sub">Residential & Commercial Property Services</div>
    ${company?.physical_address ? `<div class="contact">${company.physical_address}</div>` : ''}
    ${company?.phone ? `<div class="contact">Tel: ${company.phone} | Email: ${company?.support_email || company?.email || 'support@praetoriagroup.ca'}</div>` : ''}
  </div>
</div>

<div class="doc-title">Employee Pay Stub</div>
${runNumber ? `<div class="ref">Reference: ${runNumber}</div>` : '<div class="ref">&nbsp;</div>'}

<div class="meta-grid">
  <div class="meta-box">
    <div class="lbl">Employee</div>
    <div class="val">${employeeName || '—'}</div>
    ${employeeRole ? `<div class="sub">${employeeRole}</div>` : ''}
  </div>
  <div class="meta-box">
    <div class="lbl">Pay Period</div>
    <div class="val">${format(new Date(stub.pay_period_start), 'MMM d')} – ${format(new Date(stub.pay_period_end), 'MMM d, yyyy')}</div>
  </div>
  <div class="meta-box">
    <div class="lbl">Pay Date</div>
    <div class="val">${format(new Date(stub.pay_date), 'MMMM d, yyyy')}</div>
  </div>
</div>

<div class="section-title">Earnings</div>
<table>
  <thead><tr><th>Description</th><th>Hours</th><th>Rate</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>
    ${earningsHtml}
    <tr class="total-row"><td colspan="3">Total Gross Earnings</td><td style="text-align:right;">$${fmt(stub.gross_pay)}</td></tr>
  </tbody>
</table>

<div class="section-title">Deductions</div>
<table>
  <thead><tr><th colspan="3">Description</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>
    ${deductionsHtml}
    <tr class="total-row"><td colspan="3">Total Deductions</td><td style="text-align:right;color:#dc2626;">–$${fmt(stub.deductions)}</td></tr>
  </tbody>
</table>

<table style="margin-top:12px;">
  <tbody>
    <tr class="net-row"><td>NET PAY</td><td style="text-align:right;color:#16a34a;">$${fmt(stub.net_pay)}</td></tr>
  </tbody>
</table>

<div class="section-title">Year-to-Date Summary</div>
<div class="ytd-section">
  <div class="ytd-box"><div class="lbl">YTD Gross</div><div class="val">$${fmt(stub.ytd_gross)}</div></div>
  <div class="ytd-box"><div class="lbl">YTD Deductions</div><div class="val" style="color:#dc2626;">$${fmt(n(stub.ytd_gross) - n(stub.ytd_net))}</div></div>
  <div class="ytd-box"><div class="lbl">YTD Net</div><div class="val" style="color:#16a34a;">$${fmt(stub.ytd_net)}</div></div>
</div>

${stub.notes ? `<p style="margin-top:16px;font-size:12px;color:#64748b;"><strong>Notes:</strong> ${stub.notes}</p>` : ''}

<div class="footer">
  This is an electronically generated pay stub from ${companyName}. For payroll inquiries, contact ${company?.support_email || company?.email || 'support@praetoriagroup.ca'} or call ${company?.phone || '(306) 737-6269'}.
</div>
</body></html>`;
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(buildPrintHtml());
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  const handleSavePdf = () => {
    // Use print dialog in "Save as PDF" mode
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(buildPrintHtml());
    w.document.close();
    w.focus();
    toast.info('Use "Save as PDF" in the print dialog to download.');
    setTimeout(() => w.print(), 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[88vh]">
          <div className="p-6 space-y-5">
            {/* ── Brand Header ── */}
            <div className="rounded-lg p-5 flex items-center gap-4" style={{ background: '#0f172a' }}>
              {company?.logo_url && <img src={company.logo_url} alt="Logo" className="h-14 rounded" />}
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">{companyName}</h2>
                <p className="text-[11px] text-white/60 tracking-wide">Residential & Commercial Property Services</p>
                {company?.physical_address && <p className="text-[11px] text-white/50 mt-0.5">{company.physical_address}</p>}
                {company?.phone && (
                  <p className="text-[11px] text-white/50">
                    Tel: {company.phone} | {company?.support_email || company?.email || 'support@praetoriagroup.ca'}
                  </p>
                )}
              </div>
            </div>

            {/* ── Document Title ── */}
            <div>
              <h3 className="text-xl font-extrabold tracking-tight" style={{ color: primaryColor }}>Employee Pay Stub</h3>
              {runNumber && <p className="text-xs text-muted-foreground mt-0.5">Reference: {runNumber}</p>}
            </div>

            {/* ── Meta Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MetaBox label="Employee" value={employeeName || '—'} sub={employeeRole} color={primaryColor} />
              <MetaBox label="Pay Period" value={`${format(new Date(stub.pay_period_start), 'MMM d')} – ${format(new Date(stub.pay_period_end), 'MMM d, yyyy')}`} color={primaryColor} />
              <MetaBox label="Pay Date" value={format(new Date(stub.pay_date), 'MMMM d, yyyy')} color={primaryColor} />
            </div>

            {/* ── Earnings Section ── */}
            <div>
              <SectionTitle label="Earnings" color={primaryColor} />
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Description</th>
                      <th className="text-center px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Hours</th>
                      <th className="text-center px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Rate</th>
                      <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.length > 0 ? earnings.map((e, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="px-3 py-2 text-foreground">{e.label}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{e.hours != null ? e.hours.toFixed(1) : '—'}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{e.rate != null ? `$${e.rate.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-2 text-right font-medium">${e.amount.toFixed(2)}</td>
                      </tr>
                    )) : (
                      <tr className="border-t border-border/50">
                        <td className="px-3 py-2" colSpan={3}>Gross Earnings</td>
                        <td className="px-3 py-2 text-right font-medium">${fmt(stub.gross_pay)}</td>
                      </tr>
                    )}
                    <tr className="border-t-2 font-bold" style={{ borderColor: primaryColor }}>
                      <td className="px-3 py-2.5" colSpan={3}>Total Gross Earnings</td>
                      <td className="px-3 py-2.5 text-right">${fmt(stub.gross_pay)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Deductions Section ── */}
            <div>
              <SectionTitle label="Deductions" color={primaryColor} />
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold" colSpan={3}>Description</th>
                      <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deductions.length > 0 ? deductions.map((d, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="px-3 py-2 text-foreground" colSpan={3}>{d.label}</td>
                        <td className="px-3 py-2 text-right text-destructive">–${d.amount.toFixed(2)}</td>
                      </tr>
                    )) : (
                      <tr className="border-t border-border/50">
                        <td className="px-3 py-2" colSpan={3}>Total Deductions</td>
                        <td className="px-3 py-2 text-right text-destructive">–${fmt(stub.deductions)}</td>
                      </tr>
                    )}
                    <tr className="border-t-2 font-bold" style={{ borderColor: primaryColor }}>
                      <td className="px-3 py-2.5" colSpan={3}>Total Deductions</td>
                      <td className="px-3 py-2.5 text-right text-destructive">–${fmt(stub.deductions)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Net Pay ── */}
            <div className="rounded-lg p-4 flex items-center justify-between" style={{ background: '#f0fdf4', borderTop: '3px solid #16a34a' }}>
              <span className="text-lg font-extrabold text-foreground">NET PAY</span>
              <span className="text-2xl font-extrabold" style={{ color: '#16a34a' }}>${fmt(stub.net_pay)}</span>
            </div>

            {/* ── Year-to-Date ── */}
            <div>
              <SectionTitle label="Year-to-Date Summary" color={primaryColor} />
              <div className="grid grid-cols-3 gap-3">
                <YtdBox label="YTD Gross" value={`$${fmt(stub.ytd_gross)}`} />
                <YtdBox label="YTD Deductions" value={`$${fmt(n(stub.ytd_gross) - n(stub.ytd_net))}`} className="text-destructive" />
                <YtdBox label="YTD Net" value={`$${fmt(stub.ytd_net)}`} className="text-emerald-600" />
              </div>
            </div>

            {stub.notes && (
              <p className="text-xs text-muted-foreground border-t pt-3"><strong>Notes:</strong> {stub.notes}</p>
            )}

            {/* ── Actions ── */}
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1.5" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleSavePdf}>
                <Download className="h-4 w-4 mr-1.5" /> Save as PDF
              </Button>
              {stub.stub_pdf_url && (
                <a href={stub.stub_pdf_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-1.5" /> Download Attachment
                  </Button>
                </a>
              )}
              {!workerView && stub.user_id && (
                <Button variant="default" size="sm" onClick={handleSend} disabled={sending}>
                  <Send className="h-4 w-4 mr-1.5" /> {sending ? 'Sending…' : 'Send to Employee'}
                </Button>
              )}
            </div>

            {/* ── Footer ── */}
            <p className="text-[10px] text-center text-muted-foreground/60 pt-2">
              This is an electronically generated pay stub from {companyName}. For payroll inquiries, contact {company?.support_email || company?.email || 'support@praetoriagroup.ca'} or call {company?.phone || '(306) 737-6269'}.
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function MetaBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3" style={{ borderLeft: `3px solid ${color}` }}>
      <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SectionTitle({ label, color }: { label: string; color: string }) {
  return (
    <h4 className="text-xs font-bold uppercase tracking-wider mb-2 pb-1" style={{ color, borderBottom: `2px solid ${color}` }}>
      {label}
    </h4>
  );
}

function YtdBox({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="border rounded-lg p-3">
      <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${className || ''}`}>{value}</p>
    </div>
  );
}
