import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values.map(v => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',');
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [toCsvRow(headers), ...rows.map(r => toCsvRow(r))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportInvoices(dateFrom?: string, dateTo?: string) {
  let q = supabase.from('invoices').select(`
    id, invoice_number, status, issue_date, due_date, paid_at, subtotal, tax, gst_rate, pst_rate, gst_amount, pst_amount, total, amount_paid, balance_due,
    customers(first_name, last_name, company_name, email),
    properties(property_name, address_line_1),
    jobs(job_number, job_title)
  `).order('issue_date', { ascending: false });
  if (dateFrom) q = q.gte('issue_date', dateFrom);
  if (dateTo) q = q.lte('issue_date', dateTo);
  const { data, error } = await q;
  if (error) throw error;
  if (!data?.length) return 0;

  // Pull payments for these invoices in one batch for method + Stripe ref
  const invoiceIds = data.map((i: any) => i.id);
  const { data: pays } = await supabase
    .from('finance_payments')
    .select('invoice_id, payment_method, reference_number, stripe_payment_intent_id, payment_date')
    .in('invoice_id', invoiceIds);
  const payMap: Record<string, { methods: string[]; refs: string[] }> = {};
  (pays || []).forEach((p: any) => {
    const k = p.invoice_id;
    if (!k) return;
    if (!payMap[k]) payMap[k] = { methods: [], refs: [] };
    if (p.payment_method) payMap[k].methods.push(String(p.payment_method));
    const ref = p.stripe_payment_intent_id || p.reference_number;
    if (ref) payMap[k].refs.push(String(ref));
  });

  const headers = [
    'Invoice #', 'Status', 'Issue Date', 'Due Date', 'Paid Date',
    'Customer', 'Email',
    'Property', 'Job #',
    'Subtotal', 'GST Rate', 'GST', 'PST Rate', 'PST', 'Total Tax',
    'Total', 'Amount Paid', 'Balance Due',
    'Payment Method', 'Payment Reference',
  ];
  const rows = data.map((i: any) => {
    const c = i.customers;
    const name = c ? [c.first_name, c.last_name].filter(Boolean).join(' ').trim() : '';
    const gstPct = i.gst_rate != null ? (Number(i.gst_rate) * 100).toFixed(2) + '%' : '';
    const pstPct = i.pst_rate != null ? (Number(i.pst_rate) * 100).toFixed(2) + '%' : '';
    const pm = payMap[i.id];
    const propLabel = i.properties?.property_name || i.properties?.address_line_1 || '';
    return [
      i.invoice_number, i.status, i.issue_date, i.due_date, i.paid_at ? String(i.paid_at).slice(0, 10) : '',
      c?.company_name || name, c?.email || '',
      propLabel, i.jobs?.job_number || '',
      i.subtotal ?? '', gstPct, i.gst_amount ?? '', pstPct, i.pst_amount ?? '', i.tax ?? '',
      i.total ?? '', i.amount_paid ?? '', i.balance_due ?? '',
      pm ? Array.from(new Set(pm.methods)).join('; ') : '',
      pm ? Array.from(new Set(pm.refs)).join('; ') : '',
    ];
  });
  downloadCsv(`invoices-export-${format(new Date(), 'yyyy-MM-dd')}.csv`, headers, rows);
  return rows.length;
}

export async function exportPayments(dateFrom?: string, dateTo?: string) {
  let q = supabase.from('finance_payments').select(`
    payment_number, payment_date, amount, payment_method, payment_type, status, reference_number, notes,
    customers(first_name, last_name, company_name)
  `).order('payment_date', { ascending: false });
  if (dateFrom) q = q.gte('payment_date', dateFrom);
  if (dateTo) q = q.lte('payment_date', dateTo);
  const { data } = await q;
  if (!data?.length) return 0;

  const headers = ['Payment #', 'Date', 'Amount', 'Method', 'Type', 'Status', 'Reference', 'Customer', 'Notes'];
  const rows = data.map((p: any) => {
    const c = p.customers;
    const name = c ? [c.first_name, c.last_name].filter(Boolean).join(' ') : '';
    return [p.payment_number, p.payment_date, p.amount, p.payment_method, p.payment_type, p.status, p.reference_number, c?.company_name || name, p.notes];
  });
  downloadCsv(`payments-export-${format(new Date(), 'yyyy-MM-dd')}.csv`, headers, rows);
  return rows.length;
}

export async function exportExpenses(dateFrom?: string, dateTo?: string) {
  let q = supabase.from('finance_expenses').select(`
    expense_number, expense_date, description, category, amount_subtotal, amount_tax, amount_total, payment_method, status, notes,
    finance_vendors(vendor_name)
  `).order('expense_date', { ascending: false });
  if (dateFrom) q = q.gte('expense_date', dateFrom);
  if (dateTo) q = q.lte('expense_date', dateTo);
  const { data } = await q;
  if (!data?.length) return 0;

  const headers = ['Expense #', 'Date', 'Description', 'Category', 'Vendor', 'Subtotal', 'Tax', 'Total', 'Method', 'Status', 'Notes'];
  const rows = data.map((e: any) => [
    e.expense_number, e.expense_date, e.description, e.category,
    (e as any).finance_vendors?.vendor_name, e.amount_subtotal, e.amount_tax, e.amount_total,
    e.payment_method, e.status, e.notes,
  ]);
  downloadCsv(`expenses-export-${format(new Date(), 'yyyy-MM-dd')}.csv`, headers, rows);
  return rows.length;
}

export async function exportCustomers() {
  const { data } = await supabase.from('customers').select('first_name, last_name, company_name, email, phone, address_line_1, city, province, postal_code').order('last_name');
  if (!data?.length) return 0;

  const headers = ['First Name', 'Last Name', 'Company', 'Email', 'Phone', 'Address', 'City', 'Province', 'Postal Code'];
  const rows = data.map((c: any) => [c.first_name, c.last_name, c.company_name, c.email, c.phone, c.address_line_1, c.city, c.province, c.postal_code]);
  downloadCsv(`customers-export-${format(new Date(), 'yyyy-MM-dd')}.csv`, headers, rows);
  return rows.length;
}

export async function exportVendors() {
  const { data } = await supabase.from('vendors').select('vendor_name, contact_name, email, phone, address_line_1, city, province, postal_code, category, status');
  if (!data?.length) return 0;

  const headers = ['Vendor Name', 'Contact', 'Email', 'Phone', 'Address', 'City', 'Province', 'Postal Code', 'Category', 'Status'];
  const rows = data.map((v: any) => [v.vendor_name, v.contact_name, v.email, v.phone, v.address_line_1, v.city, v.province, v.postal_code, v.category, v.status]);
  downloadCsv(`vendors-export-${format(new Date(), 'yyyy-MM-dd')}.csv`, headers, rows);
  return rows.length;
}
