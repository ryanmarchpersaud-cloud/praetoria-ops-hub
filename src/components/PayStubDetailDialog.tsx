import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PayStub {
  id: string;
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
}

function useCompanySettings() {
  return useQuery({
    queryKey: ['company_settings_brand'],
    queryFn: async () => {
      const { data } = await supabase.from('company_settings').select('display_name, operating_name, legal_name, logo_url, primary_color, phone, email, physical_address').limit(1).maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export default function PayStubDetailDialog({ stub, open, onOpenChange, employeeName, employeeRole }: Props) {
  const { data: company } = useCompanySettings();

  if (!stub) return null;

  const companyName = company?.operating_name || company?.display_name || company?.legal_name || 'Company';
  const primaryColor = company?.primary_color || 'hsl(var(--primary))';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Pay Stub - ${employeeName || 'Employee'}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; max-width: 700px; margin: auto; color: #1a1a1a; }
        .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid ${primaryColor}; }
        .header img { height: 48px; }
        .header h1 { font-size: 20px; color: ${primaryColor}; margin: 0; }
        .header p { font-size: 12px; color: #666; margin: 2px 0; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .meta-box { background: #f8f9fa; padding: 12px; border-radius: 6px; }
        .meta-box label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .meta-box p { font-size: 14px; font-weight: 600; margin: 4px 0 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { text-align: left; padding: 8px 12px; background: ${primaryColor}; color: white; font-size: 12px; text-transform: uppercase; }
        td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
        td.right { text-align: right; }
        .net-row td { font-weight: 700; font-size: 15px; border-top: 2px solid ${primaryColor}; background: #f0fdf4; }
        .ytd { margin-top: 16px; padding: 12px; background: #f1f5f9; border-radius: 6px; display: flex; justify-content: space-between; }
        .ytd span { font-size: 12px; color: #666; } .ytd strong { font-size: 14px; }
        .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #999; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="header">
        ${company?.logo_url ? `<img src="${company.logo_url}" alt="Logo" />` : ''}
        <div>
          <h1>${companyName}</h1>
          ${company?.physical_address ? `<p>${company.physical_address}</p>` : ''}
          ${company?.phone ? `<p>${company.phone}</p>` : ''}
        </div>
      </div>
      <h2 style="font-size:16px;margin-bottom:16px;">Pay Stub</h2>
      <div class="meta">
        <div class="meta-box"><label>Employee</label><p>${employeeName || '—'}</p>${employeeRole ? `<p style="font-weight:400;font-size:12px;color:#666">${employeeRole}</p>` : ''}</div>
        <div class="meta-box"><label>Pay Date</label><p>${format(new Date(stub.pay_date), 'MMMM d, yyyy')}</p></div>
        <div class="meta-box"><label>Pay Period</label><p>${format(new Date(stub.pay_period_start), 'MMM d')} – ${format(new Date(stub.pay_period_end), 'MMM d, yyyy')}</p></div>
      </div>
      <table>
        <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          <tr><td>Gross Pay</td><td class="right">$${Number(stub.gross_pay).toFixed(2)}</td></tr>
          <tr><td>Deductions (CPP, EI, Tax, etc.)</td><td class="right" style="color:#dc2626">–$${Number(stub.deductions).toFixed(2)}</td></tr>
          <tr class="net-row"><td>Net Pay</td><td class="right" style="color:#16a34a">$${Number(stub.net_pay).toFixed(2)}</td></tr>
        </tbody>
      </table>
      ${(stub.ytd_gross || stub.ytd_net) ? `
      <div class="ytd">
        <div><span>YTD Gross</span><br/><strong>$${Number(stub.ytd_gross).toFixed(2)}</strong></div>
        <div><span>YTD Net</span><br/><strong>$${Number(stub.ytd_net).toFixed(2)}</strong></div>
      </div>` : ''}
      ${stub.notes ? `<p style="margin-top:16px;font-size:12px;color:#666;"><strong>Notes:</strong> ${stub.notes}</p>` : ''}
      <div class="footer">This is an electronically generated pay stub. For questions, contact ${company?.email || 'your administrator'}.</div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" style={{ color: primaryColor }} />
            Pay Stub
          </DialogTitle>
        </DialogHeader>

        {/* Company header */}
        <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: primaryColor }}>
          {company?.logo_url && <img src={company.logo_url} alt="Logo" className="h-10 rounded" />}
          <div>
            <p className="font-semibold text-sm" style={{ color: primaryColor }}>{companyName}</p>
            {company?.physical_address && <p className="text-xs text-muted-foreground">{company.physical_address}</p>}
          </div>
        </div>

        {/* Employee + dates */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Employee</p>
            <p className="font-semibold">{employeeName || '—'}</p>
            {employeeRole && <p className="text-xs text-muted-foreground">{employeeRole}</p>}
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Pay Date</p>
            <p className="font-semibold">{format(new Date(stub.pay_date), 'MMM d, yyyy')}</p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Pay Period</p>
          <p className="font-semibold">{format(new Date(stub.pay_period_start), 'MMM d')} – {format(new Date(stub.pay_period_end), 'MMM d, yyyy')}</p>
        </div>

        <Separator />

        {/* Earnings breakdown */}
        <div className="space-y-2">
          <Row label="Gross Pay" value={`$${Number(stub.gross_pay).toFixed(2)}`} />
          <Row label="Deductions (CPP, EI, Tax)" value={`–$${Number(stub.deductions).toFixed(2)}`} className="text-destructive" />
          <Separator />
          <div className="flex justify-between items-center font-bold text-base pt-1">
            <span>Net Pay</span>
            <span className="text-emerald-600">${Number(stub.net_pay).toFixed(2)}</span>
          </div>
        </div>

        {/* YTD */}
        {(stub.ytd_gross > 0 || stub.ytd_net > 0) && (
          <div className="bg-muted/50 rounded-lg p-3 flex justify-between text-sm">
            <div><p className="text-[11px] uppercase text-muted-foreground">YTD Gross</p><p className="font-semibold">${Number(stub.ytd_gross).toFixed(2)}</p></div>
            <div className="text-right"><p className="text-[11px] uppercase text-muted-foreground">YTD Net</p><p className="font-semibold text-emerald-600">${Number(stub.ytd_net).toFixed(2)}</p></div>
          </div>
        )}

        {stub.notes && <p className="text-xs text-muted-foreground"><strong>Notes:</strong> {stub.notes}</p>}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          {stub.stub_pdf_url && (
            <a href={stub.stub_pdf_url} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <Download className="h-4 w-4 mr-1" /> Download PDF
              </Button>
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={className || ''}>{value}</span>
    </div>
  );
}
