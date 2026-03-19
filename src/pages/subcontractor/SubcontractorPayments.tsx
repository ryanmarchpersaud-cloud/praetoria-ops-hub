import { useSubcontractorProfile, useSubcontractorPayments } from '@/hooks/useSubcontractor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DollarSign, CreditCard, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';

export default function SubcontractorPayments() {
  const { data: profile } = useSubcontractorProfile();
  const { data: payments = [], isLoading } = useSubcontractorPayments(profile?.id);
  const queryClient = useQueryClient();
  const [cardOpen, setCardOpen] = useState(false);
  const [cardForm, setCardForm] = useState({ card_brand: '', card_last4: '', billing_email: '' });

  const { data: billing } = useQuery({
    queryKey: ['subcontractor_billing_profile', profile?.id],
    queryFn: async () => {
      if (!profile) return null;
      const { data, error } = await supabase
        .from('subcontractor_billing_profiles')
        .select('*')
        .eq('subcontractor_id', profile.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  const upsertBilling = useMutation({
    mutationFn: async (form: typeof cardForm) => {
      if (!profile) throw new Error('No profile');
      const payload = {
        subcontractor_id: profile.id,
        card_brand: form.card_brand || 'Visa',
        card_last4: form.card_last4,
        billing_email: form.billing_email || null,
        payment_method_present: !!form.card_last4,
        payment_preference: 'credit_card',
        updated_at: new Date().toISOString(),
      };
      if (billing?.id) {
        const { error } = await supabase.from('subcontractor_billing_profiles').update(payload).eq('id', billing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subcontractor_billing_profiles').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractor_billing_profile'] });
      toast.success('Payment method saved');
      setCardOpen(false);
    },
    onError: () => toast.error('Failed to save payment method'),
  });

  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);

  return (
    <div className="px-4 pt-6 pb-4 space-y-4 max-w-lg animate-fade-in">
      <h1 className="text-lg font-bold text-foreground">Payments</h1>

      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">${totalPaid.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total Paid to Date</p>
        </CardContent>
      </Card>

      {/* Payment method on file */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Payment Method on File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {billing?.payment_method_present ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{billing.card_brand || 'Card'} •••• {billing.card_last4 || '****'}</span>
              </div>
              {billing.billing_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{billing.billing_email}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No payment method on file.</p>
          )}

          <Dialog open={cardOpen} onOpenChange={setCardOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <CreditCard className="h-3.5 w-3.5 mr-1" />
                {billing?.payment_method_present ? 'Update Card' : 'Add Credit Card'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{billing?.payment_method_present ? 'Update' : 'Add'} Credit Card</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs">Card Brand</Label>
                  <Input
                    placeholder="Visa, Mastercard, etc."
                    value={cardForm.card_brand}
                    onChange={e => setCardForm(f => ({ ...f, card_brand: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Last 4 Digits</Label>
                  <Input
                    placeholder="1234"
                    maxLength={4}
                    value={cardForm.card_last4}
                    onChange={e => setCardForm(f => ({ ...f, card_last4: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Billing Email (optional)</Label>
                  <Input
                    type="email"
                    placeholder="billing@company.com"
                    value={cardForm.billing_email}
                    onChange={e => setCardForm(f => ({ ...f, billing_email: e.target.value }))}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!cardForm.card_last4 || cardForm.card_last4.length < 4}
                  onClick={() => upsertBilling.mutate(cardForm)}
                >
                  Save Payment Method
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <h2 className="text-sm font-semibold text-foreground">Recent Payments</h2>
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
      ) : payments.length === 0 ? (
        <Card><CardContent className="py-8 text-center">
          <DollarSign className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No payments recorded yet</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {payments.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">${Number(p.amount).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{p.payment_date ? format(new Date(p.payment_date), 'MMM d, yyyy') : '—'}{p.payment_method ? ` · ${p.payment_method}` : ''}</p>
                </div>
                {p.reference_number && <span className="text-[10px] text-muted-foreground font-mono">{p.reference_number}</span>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
