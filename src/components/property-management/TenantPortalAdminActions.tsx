import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Megaphone, FileUp, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAdminCreateTenantNotice,
  useAdminCreateLedgerEntry,
  useAdminShareTenantDocument,
} from '@/hooks/useTenantPortalExt';

interface Props {
  tenantId: string;
  propertyId?: string | null;
}

export function TenantPortalAdminActions({ tenantId, propertyId }: Props) {
  const notice = useAdminCreateTenantNotice();
  const ledger = useAdminCreateLedgerEntry();
  const shareDoc = useAdminShareTenantDocument();

  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [noticeCategory, setNoticeCategory] = useState<'announcement' | 'notice' | 'maintenance_update'>('announcement');

  const [ledgerType, setLedgerType] = useState<'charge' | 'payment' | 'credit' | 'refund' | 'late_fee' | 'deposit'>('charge');
  const [ledgerAmount, setLedgerAmount] = useState('');
  const [ledgerDesc, setLedgerDesc] = useState('');

  const [docTitle, setDocTitle] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-emerald-700" /> Tenant Portal Actions
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Post notices, share documents, and record ledger entries visible to this tenant only.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Notice */}
        <div className="border rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Post Notice
          </p>
          <Input
            placeholder="Title"
            value={noticeTitle}
            onChange={e => setNoticeTitle(e.target.value)}
          />
          <Textarea
            placeholder="Body"
            rows={3}
            value={noticeBody}
            onChange={e => setNoticeBody(e.target.value)}
          />
          <Select value={noticeCategory} onValueChange={(v: any) => setNoticeCategory(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="notice">Notice</SelectItem>
              <SelectItem value="maintenance_update">Maintenance update</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="w-full bg-emerald-700 hover:bg-emerald-800"
            disabled={!noticeTitle || notice.isPending}
            onClick={async () => {
              try {
                await notice.mutateAsync({
                  tenant_id: tenantId,
                  property_id: propertyId ?? null,
                  title: noticeTitle,
                  body: noticeBody || undefined,
                  category: noticeCategory,
                });
                setNoticeTitle(''); setNoticeBody('');
                toast.success('Notice posted');
              } catch (e: any) { toast.error(e.message); }
            }}
          >
            Post
          </Button>
        </div>

        {/* Document */}
        <div className="border rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 flex items-center gap-1">
            <FileUp className="h-3 w-3" /> Share Document
          </p>
          <Input
            placeholder="Document title"
            value={docTitle}
            onChange={e => setDocTitle(e.target.value)}
          />
          <Input
            type="file"
            onChange={e => setDocFile(e.target.files?.[0] ?? null)}
          />
          <Button
            size="sm"
            className="w-full bg-emerald-700 hover:bg-emerald-800"
            disabled={!docTitle || !docFile || shareDoc.isPending}
            onClick={async () => {
              try {
                await shareDoc.mutateAsync({
                  tenant_id: tenantId,
                  property_id: propertyId ?? null,
                  title: docTitle,
                  file: docFile!,
                });
                setDocTitle(''); setDocFile(null);
                toast.success('Document shared with tenant');
              } catch (e: any) { toast.error(e.message); }
            }}
          >
            Share
          </Button>
        </div>

        {/* Ledger */}
        <div className="border rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Add Ledger Entry
          </p>
          <Select value={ledgerType} onValueChange={(v: any) => setLedgerType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="charge">Charge</SelectItem>
              <SelectItem value="payment">Payment received</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="late_fee">Late fee</SelectItem>
              <SelectItem value="deposit">Deposit</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={ledgerAmount}
            onChange={e => setLedgerAmount(e.target.value)}
          />
          <Input
            placeholder="Description (optional)"
            value={ledgerDesc}
            onChange={e => setLedgerDesc(e.target.value)}
          />
          <Button
            size="sm"
            className="w-full bg-emerald-700 hover:bg-emerald-800"
            disabled={!ledgerAmount || ledger.isPending}
            onClick={async () => {
              const amt = parseFloat(ledgerAmount);
              if (Number.isNaN(amt)) return toast.error('Invalid amount');
              try {
                await ledger.mutateAsync({
                  tenant_id: tenantId,
                  type: ledgerType,
                  amount: amt,
                  description: ledgerDesc || undefined,
                });
                setLedgerAmount(''); setLedgerDesc('');
                toast.success('Ledger entry added');
              } catch (e: any) { toast.error(e.message); }
            }}
          >
            Record
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface BusinessProps {
  form: any;
  setForm: (f: any) => void;
}

export function TenantBusinessFields({ form, setForm }: BusinessProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tenant Type &amp; Billing</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Tenant type</Label>
          <Select
            value={form.tenant_type ?? 'individual'}
            onValueChange={v => setForm({ ...form, tenant_type: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.tenant_type === 'business' && (
          <>
            <div><Label>Business name</Label><Input value={form.business_name ?? ''} onChange={e => setForm({ ...form, business_name: e.target.value })} /></div>
            <div><Label>Billing contact</Label><Input value={form.billing_contact_name ?? ''} onChange={e => setForm({ ...form, billing_contact_name: e.target.value })} /></div>
            <div><Label>Billing email</Label><Input value={form.billing_email ?? ''} onChange={e => setForm({ ...form, billing_email: e.target.value })} /></div>
            <div><Label>Billing phone</Label><Input value={form.billing_phone ?? ''} onChange={e => setForm({ ...form, billing_phone: e.target.value })} /></div>
            <div><Label>PO / reference</Label><Input value={form.po_reference ?? ''} onChange={e => setForm({ ...form, po_reference: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Business notes</Label><Textarea rows={2} value={form.business_notes ?? ''} onChange={e => setForm({ ...form, business_notes: e.target.value })} /></div>
          </>
        )}
        <div className="md:col-span-2 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Mailing address (optional)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Address line 1</Label><Input value={form.mailing_address_line_1 ?? ''} onChange={e => setForm({ ...form, mailing_address_line_1: e.target.value })} /></div>
            <div><Label>City</Label><Input value={form.mailing_city ?? ''} onChange={e => setForm({ ...form, mailing_city: e.target.value })} /></div>
            <div><Label>Province</Label><Input value={form.mailing_province ?? ''} onChange={e => setForm({ ...form, mailing_province: e.target.value })} /></div>
            <div><Label>Postal code</Label><Input value={form.mailing_postal_code ?? ''} onChange={e => setForm({ ...form, mailing_postal_code: e.target.value })} /></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
