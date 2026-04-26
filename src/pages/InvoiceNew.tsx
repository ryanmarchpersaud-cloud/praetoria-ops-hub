import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useCustomers } from '@/hooks/useCustomers';
import { useJobs } from '@/hooks/useJobs';
import { useProperties } from '@/hooks/useProperties';
import { useCreateInvoice } from '@/hooks/useInvoices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

export default function InvoiceNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: customers = [] } = useCustomers();
  const { data: jobs = [] } = useJobs();
  const { data: properties = [] } = useProperties();
  const createInvoice = useCreateInvoice();

  const today = format(new Date(), 'yyyy-MM-dd');
  const defaultDue = format(addDays(new Date(), 30), 'yyyy-MM-dd');

  const [form, setForm] = useState({
    customer_id: searchParams.get('customer_id') || '',
    job_id: '',
    property_id: '',
    issue_date: today,
    due_date: defaultDue,
    tax_rate: '0.11',
    customer_memo: '',
    internal_notes: '',
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  // Filter jobs/properties by selected customer
  const filteredJobs = form.customer_id
    ? jobs.filter((j: any) => j.customer_id === form.customer_id)
    : jobs;
  const filteredProperties = form.customer_id
    ? properties.filter((p: any) => p.customer_id === form.customer_id)
    : properties;

  // Auto-fill property when job is selected
  const handleJobChange = (jobId: string) => {
    update('job_id', jobId);
    if (jobId) {
      const job = jobs.find((j: any) => j.id === jobId);
      if (job?.property_id && !form.property_id) {
        update('property_id', job.property_id);
      }
      if (job?.customer_id && !form.customer_id) {
        update('customer_id', job.customer_id);
      }
    }
  };

  const handleSubmit = async () => {
    if (!form.customer_id) {
      toast.error('Please select a customer');
      return;
    }

    try {
      const payload: any = {
        customer_id: form.customer_id,
        invoice_number: '',
        issue_date: form.issue_date,
        due_date: form.due_date,
        tax_rate: parseFloat(form.tax_rate) || 0.11,
        customer_memo: form.customer_memo || null,
        internal_notes: form.internal_notes || null,
        status: 'Draft',
      };
      if (form.job_id) payload.job_id = form.job_id;
      if (form.property_id) payload.property_id = form.property_id;

      const data = await createInvoice.mutateAsync(payload);
      toast.success('Invoice created — add your line items');
      navigate(`/invoices/${data.id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create invoice');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-2">
        <Link to="/invoices" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" /> New Invoice
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create a draft invoice, then add line items
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Customer */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Customer & Job</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Customer *</Label>
              <Select value={form.customer_id} onValueChange={v => update('customer_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                      {c.company_name ? ` — ${c.company_name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Job (optional)</Label>
              <Select value={form.job_id} onValueChange={handleJobChange}>
                <SelectTrigger><SelectValue placeholder="Link to job..." /></SelectTrigger>
                <SelectContent>
                  {filteredJobs.map((j: any) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.job_number} — {j.job_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Property (optional)</Label>
              <Select value={form.property_id} onValueChange={v => update('property_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select property..." /></SelectTrigger>
                <SelectContent>
                  {filteredProperties.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Dates & Tax */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Dates & Tax</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Issue Date</Label>
              <Input type="date" value={form.issue_date} onChange={e => update('issue_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => update('due_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tax Rate</Label>
              <Select value={form.tax_rate} onValueChange={v => update('tax_rate', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No Tax (0%)</SelectItem>
                  <SelectItem value="0.05">GST Only (5%)</SelectItem>
                  <SelectItem value="0.08">PST Only (8%)</SelectItem>
                  <SelectItem value="0.11">HST (13%)</SelectItem>
                  <SelectItem value="0.15">HST (15%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Memo & Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Memo & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Customer Memo</Label>
              <Textarea
                rows={3}
                placeholder="Message shown on the invoice (e.g. Thank you for your business!)"
                value={form.customer_memo}
                onChange={e => update('customer_memo', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Internal Notes</Label>
              <Textarea
                rows={3}
                placeholder="Private notes (not shown to customer)"
                value={form.internal_notes}
                onChange={e => update('internal_notes', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate('/invoices')}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={createInvoice.isPending}>
          {createInvoice.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          Create Draft Invoice
        </Button>
      </div>
    </div>
  );
}
