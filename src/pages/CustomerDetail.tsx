import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, MapPin, Mail, Phone, Building2, UserPlus, Check, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PROVINCES } from '@/lib/constants';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id);
  const updateCustomer = useUpdateCustomer();
  const { toast } = useToast();

  const [form, setForm] = useState<any>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviting, setInviting] = useState(false);

  // Initialize form when customer loads
  if (customer && !form) {
    setForm(customer);
    setInviteEmail(customer.email || '');
  }

  const { data: properties = [] } = useQuery({
    queryKey: ['customer_properties', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('properties')
        .select('id, property_name, city, status')
        .eq('customer_id', id)
        .order('property_name');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Loading...</div>;
  if (!customer) return <div className="p-8 text-muted-foreground text-sm">Customer not found</div>;

  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    if (!id || !form) return;
    try {
      await updateCustomer.mutateAsync({
        id,
        first_name: form.first_name,
        last_name: form.last_name,
        company_name: form.company_name || null,
        email: form.email || null,
        phone: form.phone || null,
        address_line_1: form.address_line_1 || null,
        city: form.city || null,
        province: form.province || null,
        postal_code: form.postal_code || null,
        notes: form.notes || null,
      });
      toast({ title: 'Customer saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !invitePassword || invitePassword.length < 6) {
      toast({ title: 'Error', description: 'Email and password (min 6 chars) are required', variant: 'destructive' });
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-customer', {
        body: { customer_id: id, email: inviteEmail, password: invitePassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Portal account created', description: data.message });
      setInviteOpen(false);
      // Refresh customer data
      window.location.reload();
    } catch (err: any) {
      toast({ title: 'Invitation failed', description: err.message, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const hasPortalAccess = !!customer.user_id;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-xl font-bold">{customer.first_name} {customer.last_name}</h1>
          {customer.company_name && <p className="text-xs text-muted-foreground">{customer.company_name}</p>}
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1 h-11" disabled={updateCustomer.isPending}>
          <Save className="h-4 w-4 mr-2" /> Save
        </Button>
        {!hasPortalAccess ? (
          <Button variant="outline" className="h-11 gap-2" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" /> Invite to Portal
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 h-11 rounded-md border bg-muted/50 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-accent" /> Portal active
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {/* Contact info */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">First Name *</Label><Input value={form?.first_name || ''} onChange={e => set('first_name', e.target.value)} /></div>
                <div><Label className="text-xs">Last Name *</Label><Input value={form?.last_name || ''} onChange={e => set('last_name', e.target.value)} /></div>
              </div>
              <div><Label className="text-xs">Company</Label><Input value={form?.company_name || ''} onChange={e => set('company_name', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                  <Input type="email" value={form?.email || ''} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
                  <Input value={form?.phone || ''} onChange={e => set('phone', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><Label className="text-xs">Street Address</Label><Input value={form?.address_line_1 || ''} onChange={e => set('address_line_1', e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">City</Label><Input value={form?.city || ''} onChange={e => set('city', e.target.value)} /></div>
                <div>
                  <Label className="text-xs">Province</Label>
                  <select value={form?.province || ''} onChange={e => set('province', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    <option value="">—</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs">Postal Code</Label><Input value={form?.postal_code || ''} onChange={e => set('postal_code', e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-4">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form?.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Properties */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Properties ({(properties as any[]).length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(properties as any[]).length === 0 ? (
                <p className="text-xs text-muted-foreground">No properties linked.</p>
              ) : (
                (properties as any[]).map((p: any) => (
                  <Link key={p.id} to={`/properties/${p.id}`} className="block text-sm text-primary hover:underline">
                    {p.property_name}
                    {p.city && <span className="text-xs text-muted-foreground ml-1">({p.city})</span>}
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm mx-3">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Invite to Customer Portal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Create a portal login for <strong>{customer.first_name} {customer.last_name}</strong>. 
              They'll be able to view their properties, visits, photos, quotes, and submit service requests.
            </p>
            <div>
              <Label className="text-xs">Portal Login Email *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <Label className="text-xs">Temporary Password *</Label>
              <Input
                type="text"
                value={invitePassword}
                onChange={e => setInvitePassword(e.target.value)}
                placeholder="Min 6 characters"
                minLength={6}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Share this password with the customer. They can change it later.</p>
            </div>
            <Button
              className="w-full h-11"
              disabled={inviting || !inviteEmail || invitePassword.length < 6}
              onClick={handleInvite}
            >
              {inviting ? 'Creating account...' : 'Create Portal Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
