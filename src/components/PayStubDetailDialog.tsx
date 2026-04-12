import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Printer, Send, Upload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const WHITE_LOGO_URL = 'https://czltgypfgegjmcsczpms.supabase.co/storage/v1/object/public/attachments/praetoria-logo-white.png';

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

function useEmployeeProfile(userId?: string, open?: boolean) {
  return useQuery({
    queryKey: ['pay_stub_employee_profile', userId],
    enabled: !!userId && !!open,
    queryFn: async () => {
      const { data } = await supabase.from('worker_profiles').select('employee_id, full_name, role_title').eq('user_id', userId!).maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function usePayrollRunDetail(userId?: string, payDate?: string, open?: boolean) {
  return useQuery({
    queryKey: ['payroll_run_detail', userId, payDate],
    enabled: !!userId && !!payDate && !!open,
    queryFn: async () => {
      const { data: runs } = await supabase
        .from('payroll_runs')
        .select('id, run_number, pay_date, pay_period_start, pay_period_end, status')
        .eq('pay_date', payDate!)
        .limit(5);
      if (!runs || runs.length === 0) return null;
      for (const run of runs) {
        const { data: items } = await supabase
          .from('payroll_run_items')
          .select('*')
          .eq('payroll_run_id', run.id)
          .eq('user_id', userId!)
          .limit(1);
        if (items && items.length > 0) return { run, item: items[0] };
      }
      return null;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/** Auto-calculate YTD from all pay stubs for this user in the same calendar year */
function useYtdTotals(userId?: string, payDate?: string, open?: boolean) {
  return useQuery({
    queryKey: ['pay_stub_ytd', userId, payDate],
    enabled: !!userId && !!payDate && !!open,
    queryFn: async () => {
      const year = new Date(payDate!).getFullYear();
      const yearStart = `${year}-01-01`;
      const { data } = await supabase
        .from('employee_pay_stubs')
        .select('gross_pay, deductions, net_pay, pay_date')
        .eq('user_id', userId!)
        .gte('pay_date', yearStart)
        .lte('pay_date', payDate!)
        .order('pay_date');
      if (!data) return { ytdGross: 0, ytdDeductions: 0, ytdNet: 0 };
      const ytdGross = data.reduce((s, r) => s + Number(r.gross_pay || 0), 0);
      const ytdDeductions = data.reduce((s, r) => s + Number(r.deductions || 0), 0);
      const ytdNet = data.reduce((s, r) => s + Number(r.net_pay || 0), 0);
      return { ytdGross, ytdDeductions, ytdNet };
    },
    staleTime: 60 * 1000,
  });
}

const n = (v: any) => Number(v || 0);
const fmt = (v: any) => n(v).toFixed(2);

export default function PayStubDetailDialog({ stub, open, onOpenChange, employeeName, employeeRole, workerView }: Props) {
  const { data: company } = useCompanySettings();
  const { data: detail } = usePayrollRunDetail(stub?.user_id, stub?.pay_date, open);
  const { data: empProfile } = useEmployeeProfile(stub?.user_id, open);
  const { data: ytd } = useYtdTotals(stub?.user_id, stub?.pay_date, open);
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!stub) return null;

  const companyName = company?.operating_name || company?.display_name || company?.legal_name || 'Praetoria Group';
  const primaryColor = company?.primary_color || '#1e3a5f';
  const item = detail?.item;
  const runNumber = detail?.run?.run_number;
  const employeeId = empProfile?.employee_id;
  const displayName = employeeName || empProfile?.full_name || '—';
  const displayRole = employeeRole || empProfile?.role_title;

  // Use auto-calculated YTD (from all stubs in same year)
  const ytdGross = ytd?.ytdGross ?? n(stub.ytd_gross);
  const ytdDeductions = ytd?.ytdDeductions ?? (n(stub.ytd_gross) - n(stub.ytd_net));
  const ytdNet = ytd?.ytdNet ?? n(stub.ytd_net);

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
  const deductionLines: { label: string; amount: number }[] = [];
  if (item) {
    if (n(item.cpp_amount) > 0) deductionLines.push({ label: 'CPP (Canada Pension Plan)', amount: n(item.cpp_amount) });
    if (n(item.ei_amount) > 0) deductionLines.push({ label: 'EI (Employment Insurance)', amount: n(item.ei_amount) });
    if (n(item.income_tax_amount) > 0) deductionLines.push({ label: 'Federal / Provincial Income Tax', amount: n(item.income_tax_amount) });
    if (n(item.other_deductions_amount) > 0) deductionLines.push({ label: 'Other Deductions', amount: n(item.other_deductions_amount) });
  }

  const handleSend = async () => {
    setSending(true);
    try {
      const { data: profile } = await supabase.from('worker_profiles').select('work_email, full_name').eq('user_id', stub.user_id!).maybeSingle();
      if (!profile?.work_email) {
        toast.error('No email found for this employee.');
        return;
      }
      toast.success(`Pay stub notification sent to ${profile.full_name || displayName}`);
    } catch {
      toast.error('Failed to send pay stub');
    } finally {
      setSending(false);
    }
  };

  const handleUploadToPortal = async () => {
    if (!stub.user_id) { toast.error('No employee linked'); return; }
    setUploading(true);
    try {
      // Check if already uploaded
      const { data: existing } = await supabase
        .from('worker_documents')
        .select('id')
        .eq('user_id', stub.user_id)
        .eq('document_type', 'payroll')
        .ilike('document_name', `%${format(new Date(stub.pay_date), 'yyyy-MM-dd')}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        toast.info('This pay stub is already in the employee portal.');
        return;
      }

      const docName = `Pay Stub – ${format(new Date(stub.pay_period_start), 'MMM d')} to ${format(new Date(stub.pay_period_end), 'MMM d, yyyy')} (${format(new Date(stub.pay_date), 'yyyy-MM-dd')})`;

      const { error } = await supabase.from('worker_documents').insert({
        user_id: stub.user_id,
        document_name: docName,
        document_type: 'payroll',
        file_url: stub.stub_pdf_url || '',
        file_name: `pay-stub-${format(new Date(stub.pay_date), 'yyyy-MM-dd')}.pdf`,
        uploaded_by: user?.id,
        notes: `Auto-uploaded pay stub for pay date ${format(new Date(stub.pay_date), 'MMM d, yyyy')}. ${runNumber ? `Ref: ${runNumber}` : ''}`,
      });
      if (error) throw error;
      toast.success(`Pay stub uploaded to ${displayName}'s portal`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  // ── Print HTML builder ──
  const buildPrintHtml = () => {
    const earningsHtml = earnings.length > 0
      ? earnings.map(e => `
        <tr>
          <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${e.label}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">${e.hours != null ? e.hours.toFixed(1) : '—'}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">${e.rate != null ? '$' + e.rate.toFixed(2) : '—'}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-weight:600;">$${e.amount.toFixed(2)}</td>
        </tr>`).join('')
      : `<tr><td colspan="4" style="padding:8px 12px;font-size:13px;">Gross Earnings — $${fmt(stub.gross_pay)}</td></tr>`;

    const deductionsHtml = deductionLines.length > 0
      ? deductionLines.map(d => `
        <tr>
          <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;" colspan="3">${d.label}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;color:#dc2626;">–$${d.amount.toFixed(2)}</td>
        </tr>`).join('')
      : `<tr><td colspan="3" style="padding:8px 12px;font-size:13px;">Total Deductions</td><td style="text-align:right;color:#dc2626;padding:8px 12px;">–$${fmt(stub.deductions)}</td></tr>`;

    return `<!DOCTYPE html><html><head><title>Pay Stub – ${displayName} – ${format(new Date(stub.pay_date), 'MMM d, yyyy')}</title>
<style>
  @page { size: letter; margin: 0.5in 0.6in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; max-width: 750px; margin: 0 auto; padding: 32px; }
  .brand-bar { background: #0f172a; color: white; padding: 22px 28px; border-radius: 10px; display: flex; align-items: center; gap: 20px; margin-bottom: 28px; }
  .brand-bar img { height: 64px; }
  .brand-bar h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
  .brand-bar .tagline { font-size: 11px; opacity: 0.6; margin-top: 2px; letter-spacing: 1px; text-transform: uppercase; }
  .brand-bar .contact { font-size: 11px; opacity: 0.55; margin-top: 4px; }
  .doc-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
  .doc-title { font-size: 20px; font-weight: 800; color: ${primaryColor}; }
  .ref-badge { font-size: 12px; color: #64748b; background: #f1f5f9; padding: 3px 10px; border-radius: 4px; font-weight: 600; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin: 16px 0 24px; }
  .meta-box { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border-left: 4px solid ${primaryColor}; }
  .meta-box .lbl { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.8px; font-weight: 700; }
  .meta-box .val { font-size: 14px; font-weight: 700; margin-top: 3px; }
  .meta-box .sub { font-size: 11px; color: #64748b; margin-top: 1px; }
  .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: ${primaryColor}; margin: 22px 0 8px; padding-bottom: 5px; border-bottom: 2px solid ${primaryColor}; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; padding: 7px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; font-weight: 700; text-align: left; border-bottom: 2px solid #cbd5e1; }
  th:last-child { text-align: right; }
  th:nth-child(2), th:nth-child(3) { text-align: center; }
  .total-row td { font-weight: 700; font-size: 14px; padding: 9px 12px; border-top: 2px solid ${primaryColor}; background: #f8fafc; }
  .net-box { background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
  .net-box .label { font-size: 18px; font-weight: 800; color: #1a1a2e; }
  .net-box .amount { font-size: 26px; font-weight: 900; color: #16a34a; }
  .ytd-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-top: 12px; }
  .ytd-box { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
  .ytd-box .lbl { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.7px; font-weight: 700; }
  .ytd-box .val { font-size: 16px; font-weight: 800; margin-top: 3px; }
  .footer { margin-top: 36px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px; line-height: 1.6; }
  @media print { body { padding: 0; } .brand-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .net-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="brand-bar">
  <img src="${WHITE_LOGO_URL}" alt="Praetoria Group" />
  <div>
    <h1>${companyName}</h1>
    <div class="tagline">Residential & Commercial Property Services</div>
    ${company?.physical_address ? `<div class="contact">${company.physical_address}</div>` : ''}
    <div class="contact">Tel: ${company?.phone || '(306) 737-6269'} | ${company?.support_email || company?.email || 'support@praetoriagroup.ca'}</div>
  </div>
</div>

<div class="doc-header">
  <div class="doc-title">Employee Pay Stub</div>
  <div>
    ${runNumber ? `<span class="ref-badge">${runNumber}</span>` : ''}
    ${employeeId ? `<span class="ref-badge" style="margin-left:6px;">EMP #${employeeId}</span>` : ''}
  </div>
</div>

<div class="meta-grid">
  <div class="meta-box">
    <div class="lbl">Employee</div>
    <div class="val">${displayName}</div>
    ${displayRole ? `<div class="sub">${displayRole}</div>` : ''}
    ${employeeId ? `<div class="sub">Employee ID: ${employeeId}</div>` : ''}
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
  <thead><tr><th>Description</th><th>Hours</th><th>Rate</th><th>Amount</th></tr></thead>
  <tbody>
    ${earningsHtml}
    <tr class="total-row"><td colspan="3">Total Gross Earnings</td><td style="text-align:right;">$${fmt(stub.gross_pay)}</td></tr>
  </tbody>
</table>

<div class="section-title">Deductions</div>
<table>
  <thead><tr><th colspan="3">Description</th><th>Amount</th></tr></thead>
  <tbody>
    ${deductionsHtml}
    <tr class="total-row"><td colspan="3">Total Deductions</td><td style="text-align:right;color:#dc2626;">–$${fmt(stub.deductions)}</td></tr>
  </tbody>
</table>

<div class="net-box">
  <div class="label">NET PAY</div>
  <div class="amount">$${fmt(stub.net_pay)}</div>
</div>

<div class="section-title">Year-to-Date Summary (${new Date(stub.pay_date).getFullYear()})</div>
<div class="ytd-grid">
  <div class="ytd-box"><div class="lbl">YTD Gross</div><div class="val">$${fmt(ytdGross)}</div></div>
  <div class="ytd-box"><div class="lbl">YTD Deductions</div><div class="val" style="color:#dc2626;">$${fmt(ytdDeductions)}</div></div>
  <div class="ytd-box"><div class="lbl">YTD Net</div><div class="val" style="color:#16a34a;">$${fmt(ytdNet)}</div></div>
</div>

${stub.notes ? `<p style="margin-top:18px;font-size:12px;color:#64748b;"><strong>Notes:</strong> ${stub.notes}</p>` : ''}

<div class="footer">
  This is an electronically generated pay stub from ${companyName}.<br/>
  For payroll inquiries, contact ${company?.support_email || company?.email || 'support@praetoriagroup.ca'} or call ${company?.phone || '(306) 737-6269'}.
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
      <DialogContent className="sm:max-w-2xl max-h-[92vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 space-y-5">
            {/* ── Brand Header ── */}
            <div className="rounded-xl p-5 flex items-center gap-5" style={{ background: '#0f172a' }}>
              <img src={WHITE_LOGO_URL} alt="Praetoria Group" className="h-16" />
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">{companyName}</h2>
                <p className="text-[11px] text-white/50 tracking-widest uppercase mt-0.5">Residential & Commercial Property Services</p>
                {company?.physical_address && <p className="text-[11px] text-white/45 mt-1">{company.physical_address}</p>}
                <p className="text-[11px] text-white/45">
                  Tel: {company?.phone || '(306) 737-6269'} | {company?.support_email || company?.email || 'support@praetoriagroup.ca'}
                </p>
              </div>
            </div>

            {/* ── Document Title + References ── */}
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h3 className="text-xl font-extrabold tracking-tight" style={{ color: primaryColor }}>Employee Pay Stub</h3>
              <div className="flex gap-2">
                {runNumber && <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded">{runNumber}</span>}
                {employeeId && <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded">EMP #{employeeId}</span>}
              </div>
            </div>

            {/* ── Meta Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MetaBox label="Employee" value={displayName} sub={displayRole} sub2={employeeId ? `Employee ID: ${employeeId}` : undefined} color={primaryColor} />
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
                      <Th align="left">Description</Th>
                      <Th align="center">Hours</Th>
                      <Th align="center">Rate</Th>
                      <Th align="right">Amount</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.length > 0 ? earnings.map((e, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="px-3 py-2 text-foreground">{e.label}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{e.hours != null ? e.hours.toFixed(1) : '—'}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{e.rate != null ? `$${e.rate.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-2 text-right font-semibold">${e.amount.toFixed(2)}</td>
                      </tr>
                    )) : (
                      <tr className="border-t border-border/50">
                        <td className="px-3 py-2" colSpan={3}>Gross Earnings</td>
                        <td className="px-3 py-2 text-right font-semibold">${fmt(stub.gross_pay)}</td>
                      </tr>
                    )}
                    <tr className="border-t-2 font-bold bg-muted/30" style={{ borderColor: primaryColor }}>
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
                      <Th align="left" colSpan={3}>Description</Th>
                      <Th align="right">Amount</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {deductionLines.length > 0 ? deductionLines.map((d, i) => (
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
                    <tr className="border-t-2 font-bold bg-muted/30" style={{ borderColor: primaryColor }}>
                      <td className="px-3 py-2.5" colSpan={3}>Total Deductions</td>
                      <td className="px-3 py-2.5 text-right text-destructive">–${fmt(stub.deductions)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Net Pay ── */}
            <div className="rounded-xl p-5 flex items-center justify-between" style={{ background: '#f0fdf4', border: '2px solid #bbf7d0' }}>
              <span className="text-lg font-extrabold text-foreground">NET PAY</span>
              <span className="text-3xl font-black" style={{ color: '#16a34a' }}>${fmt(stub.net_pay)}</span>
            </div>

            {/* ── Year-to-Date ── */}
            <div>
              <SectionTitle label={`Year-to-Date Summary (${new Date(stub.pay_date).getFullYear()})`} color={primaryColor} />
              <div className="grid grid-cols-3 gap-3">
                <YtdBox label="YTD Gross" value={`$${fmt(ytdGross)}`} />
                <YtdBox label="YTD Deductions" value={`$${fmt(ytdDeductions)}`} className="text-destructive" />
                <YtdBox label="YTD Net" value={`$${fmt(ytdNet)}`} className="text-emerald-600" />
              </div>
            </div>

            {stub.notes && (
              <p className="text-xs text-muted-foreground border-t pt-3"><strong>Notes:</strong> {stub.notes}</p>
            )}

            {/* ── Actions ── */}
            <Separator />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="w-full">
                <Printer className="h-4 w-4 mr-1.5" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleSavePdf} className="w-full">
                <Download className="h-4 w-4 mr-1.5" /> Save as PDF
              </Button>
              {!workerView && stub.user_id && (
                <>
                  <Button variant="outline" size="sm" onClick={handleUploadToPortal} disabled={uploading} className="w-full">
                    {uploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                    {uploading ? 'Uploading…' : 'Upload to Portal'}
                  </Button>
                  <Button variant="default" size="sm" onClick={handleSend} disabled={sending} className="w-full">
                    {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                    {sending ? 'Sending…' : 'Send to Employee'}
                  </Button>
                </>
              )}
            </div>

            {/* ── Footer ── */}
            <p className="text-[10px] text-center text-muted-foreground/50 pt-2 leading-relaxed">
              This is an electronically generated pay stub from {companyName}.<br />
              For payroll inquiries, contact {company?.support_email || company?.email || 'support@praetoriagroup.ca'} or call {company?.phone || '(306) 737-6269'}.
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function MetaBox({ label, value, sub, sub2, color }: { label: string; value: string; sub?: string; sub2?: string; color: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3.5" style={{ borderLeft: `4px solid ${color}` }}>
      <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">{label}</p>
      <p className="text-sm font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      {sub2 && <p className="text-[11px] text-muted-foreground">{sub2}</p>}
    </div>
  );
}

function SectionTitle({ label, color }: { label: string; color: string }) {
  return (
    <h4 className="text-xs font-extrabold uppercase tracking-wider mb-2 pb-1.5" style={{ color, borderBottom: `2px solid ${color}` }}>
      {label}
    </h4>
  );
}

function Th({ children, align, colSpan }: { children: React.ReactNode; align: 'left' | 'center' | 'right'; colSpan?: number }) {
  return (
    <th className={`px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-bold text-${align}`} colSpan={colSpan}>
      {children}
    </th>
  );
}

function YtdBox({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="border rounded-lg p-3.5">
      <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">{label}</p>
      <p className={`text-lg font-extrabold mt-1 ${className || ''}`}>{value}</p>
    </div>
  );
}
