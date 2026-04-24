import { useState } from 'react';
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, ChevronRight, Building2, User, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PROVINCES, CUSTOMER_TYPES, ACCOUNT_TYPES, BILLING_METHODS, COMMUNICATION_METHODS, LEAD_SOURCES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

const SelectField = ({ label, name, options, defaultValue }: { label: string; name: string; options: readonly string[]; defaultValue?: string }) => (
  <div>
    <Label>{label}</Label>
    <select name={name} defaultValue={defaultValue || ''} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
      <option value="">—</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="pt-2">
    <Separator className="mb-3" />
    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{children}</h3>
  </div>
);

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accountType, setAccountType] = useState('Individual');
  const [billingSameAsService, setBillingSameAsService] = useState(true);
  const [requiresPo, setRequiresPo] = useState(false);
  const [portalAccess, setPortalAccess] = useState(false);
  const [isProtected, setIsProtected] = useState(false);
  const { data: customers = [], isLoading } = useCustomers(search || undefined);
  const createCustomer = useCreateCustomer();
  const { toast } = useToast();

  const isCompany = accountType === 'Company';

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => (fd.get(k) as string) || null;
    try {
      await createCustomer.mutateAsync({
        first_name: fd.get('first_name') as string,
        last_name: fd.get('last_name') as string,
        customer_type: g('customer_type') || 'Residential',
        account_type: accountType,
        company_name: g('company_name'),
        company_legal_name: g('company_legal_name'),
        operating_name: g('operating_name'),
        primary_contact_title: g('primary_contact_title'),
        email: g('email'),
        phone: g('phone'),
        secondary_email: g('secondary_email'),
        // Billing contact
        billing_contact_name: g('billing_contact_name'),
        billing_contact_email: g('billing_contact_email'),
        billing_contact_phone: g('billing_contact_phone'),
        accounts_payable_email: g('accounts_payable_email'),
        preferred_billing_method: g('preferred_billing_method'),
        requires_po_number: requiresPo,
        // Site contact
        site_contact_name: g('site_contact_name'),
        site_contact_phone: g('site_contact_phone'),
        site_contact_email: g('site_contact_email'),
        project_notes: g('project_notes'),
        // Service address
        address_line_1: g('address_line_1'),
        city: g('city'),
        province: g('province'),
        postal_code: g('postal_code'),
        // Billing address
        billing_address_same_as_service: billingSameAsService,
        billing_address_line_1: billingSameAsService ? null : g('billing_address_line_1'),
        billing_city: billingSameAsService ? null : g('billing_city'),
        billing_province: billingSameAsService ? null : g('billing_province'),
        billing_postal_code: billingSameAsService ? null : g('billing_postal_code'),
        // Portal / comms
        portal_access_enabled: portalAccess,
        preferred_communication_method: g('preferred_communication_method'),
        referral_source: g('referral_source'),
        notes: g('notes'),
        is_protected: isProtected,
      });
      toast({ title: 'Customer created' });
      setDialogOpen(false);
      setAccountType('Individual');
      setBillingSameAsService(true);
      setRequiresPo(false);
      setPortalAccess(false);
      setIsProtected(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} total customers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) { setAccountType('Individual'); setBillingSameAsService(true); setRequiresPo(false); setPortalAccess(false); setIsProtected(false); }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Customer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              {/* ── Account & Customer Type ── */}
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Customer Type" name="customer_type" options={CUSTOMER_TYPES} defaultValue="Residential" />
                <div>
                  <Label>Account Type</Label>
                  <div className="flex gap-2 mt-1">
                    {ACCOUNT_TYPES.map(t => (
                      <Button key={t} type="button" size="sm" variant={accountType === t ? 'default' : 'outline'}
                        onClick={() => setAccountType(t)} className="flex-1 gap-1.5">
                        {t === 'Individual' ? <User className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Company Info (Company only) ── */}
              {isCompany && (
                <>
                  <SectionHeader>Company Information</SectionHeader>
                  <div><Label>Company Name *</Label><Input name="company_name" required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Legal Name</Label><Input name="company_legal_name" /></div>
                    <div><Label>Operating / DBA Name</Label><Input name="operating_name" /></div>
                  </div>
                </>
              )}

              {/* ── Primary Contact ── */}
              <SectionHeader>{isCompany ? 'Primary Contact' : 'Contact Information'}</SectionHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name *</Label><Input name="first_name" required /></div>
                <div><Label>Last Name *</Label><Input name="last_name" required /></div>
              </div>
              {isCompany && (
                <div><Label>Title / Role</Label><Input name="primary_contact_title" placeholder="e.g. Project Manager" /></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input name="email" type="email" /></div>
                <div><Label>Phone</Label><Input name="phone" /></div>
              </div>
              <div><Label>Secondary Email</Label><Input name="secondary_email" type="email" /></div>

              {/* ── Billing Contact (Company only) ── */}
              {isCompany && (
                <>
                  <SectionHeader>Billing Contact</SectionHeader>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Billing Contact Name</Label><Input name="billing_contact_name" /></div>
                    <div><Label>Billing Contact Phone</Label><Input name="billing_contact_phone" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Billing Contact Email</Label><Input name="billing_contact_email" type="email" /></div>
                    <div><Label>Accounts Payable Email</Label><Input name="accounts_payable_email" type="email" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField label="Preferred Billing Method" name="preferred_billing_method" options={BILLING_METHODS} />
                    <div className="flex items-end gap-2 pb-1">
                      <Switch checked={requiresPo} onCheckedChange={setRequiresPo} id="requires_po" />
                      <Label htmlFor="requires_po" className="cursor-pointer">Requires PO / Job Number</Label>
                    </div>
                  </div>
                </>
              )}

              {/* ── Site / Project Contact (Company only) ── */}
              {isCompany && (
                <>
                  <SectionHeader>Site / Project Contact</SectionHeader>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Site Contact Name</Label><Input name="site_contact_name" /></div>
                    <div><Label>Site Contact Phone</Label><Input name="site_contact_phone" /></div>
                    <div><Label>Site Contact Email</Label><Input name="site_contact_email" type="email" /></div>
                  </div>
                  <div><Label>Project / Contractor Notes</Label><Textarea name="project_notes" rows={2} /></div>
                </>
              )}

              {/* ── Service Address ── */}
              <SectionHeader>Service Address</SectionHeader>
              <div><Label>Address</Label><Input name="address_line_1" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>City</Label><Input name="city" /></div>
                <SelectField label="Province" name="province" options={PROVINCES} />
                <div><Label>Postal Code</Label><Input name="postal_code" /></div>
              </div>

              {/* ── Billing Address ── */}
              {isCompany && (
                <>
                  <SectionHeader>Billing Address</SectionHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Switch checked={billingSameAsService} onCheckedChange={setBillingSameAsService} id="billing_same" />
                    <Label htmlFor="billing_same" className="cursor-pointer text-sm">Same as service address</Label>
                  </div>
                  {!billingSameAsService && (
                    <>
                      <div><Label>Billing Address</Label><Input name="billing_address_line_1" /></div>
                      <div className="grid grid-cols-3 gap-3">
                        <div><Label>City</Label><Input name="billing_city" /></div>
                        <SelectField label="Province" name="billing_province" options={PROVINCES} />
                        <div><Label>Postal Code</Label><Input name="billing_postal_code" /></div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── Portal & Communication ── */}
              <SectionHeader>Portal & Communication</SectionHeader>
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Preferred Communication" name="preferred_communication_method" options={COMMUNICATION_METHODS} defaultValue="Email" />
                <SelectField label="Referral / Lead Source" name="referral_source" options={LEAD_SOURCES} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={portalAccess} onCheckedChange={setPortalAccess} id="portal_access" />
                <Label htmlFor="portal_access" className="cursor-pointer text-sm">Enable Portal Access</Label>
              </div>

              {/* ── Notes ── */}
              <SectionHeader>Notes</SectionHeader>
              <div><Label>Internal Notes</Label><Textarea name="notes" rows={2} /></div>

              {/* ── Protected (real customer) ── */}
              <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                <Switch checked={isProtected} onCheckedChange={setIsProtected} id="is_protected" />
                <div className="flex-1">
                  <Label htmlFor="is_protected" className="cursor-pointer text-sm flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Protected real customer
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Mark migrated/real customers so automation and AI assistants will not modify or message them.</p>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={createCustomer.isPending}>
                {createCustomer.isPending ? 'Creating...' : 'Add Customer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-lg border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Company</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Phone</TableHead>
              <TableHead className="hidden lg:table-cell">City</TableHead>
              <TableHead className="hidden lg:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : customers.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
            ) : (
              customers.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/customers/${c.id}`)}>
                  <TableCell className="font-medium">
                    <Link to={`/customers/${c.id}`} className="hover:text-primary inline-flex items-center gap-1.5">
                      {(c as any).is_protected && (
                        <ShieldCheck className="h-4 w-4 text-primary shrink-0" aria-label="Protected real customer" />
                      )}
                      <span>{c.first_name} {c.last_name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{c.company_name || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{c.customer_type || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{c.email || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{c.phone || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{c.city || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="w-8"><Link to={`/customers/${c.id}`}><ChevronRight className="h-4 w-4 text-muted-foreground/40" /></Link></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
