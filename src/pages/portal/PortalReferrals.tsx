import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from '@/components/StatusBadge';
import { Gift, Plus, Users, DollarSign, Share2 } from 'lucide-react';

export default function PortalReferrals() {
  const { data: customer } = useCustomerProfile();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ referral_name: '', referral_email: '', referral_phone: '', referral_address: '', notes: '' });

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['customer_referrals', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await (supabase.from('customer_referrals' as any) as any)
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  const submitReferral = useMutation({
    mutationFn: async () => {
      if (!customer) throw new Error('Not authenticated');
      const { error } = await (supabase.from('customer_referrals' as any) as any).insert({
        customer_id: customer.id,
        referral_name: form.referral_name.trim(),
        referral_email: form.referral_email.trim() || null,
        referral_phone: form.referral_phone.trim() || null,
        referral_address: form.referral_address.trim() || null,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer_referrals'] });
      setDialogOpen(false);
      setForm({ referral_name: '', referral_email: '', referral_phone: '', referral_address: '', notes: '' });
      toast({ title: 'Referral submitted!', description: 'Thank you for the referral. We\'ll reach out to them.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const totalCredits = referrals.filter((r: any) => r.status === 'Rewarded').reduce((sum: number, r: any) => sum + Number(r.reward_value || 0), 0);
  const pendingCount = referrals.filter((r: any) => r.status === 'Pending').length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Gift className="h-5 w-5 text-primary" /> Referral Program
      </h1>
      <p className="text-xs text-muted-foreground">
        Refer a friend or neighbor and earn credits when they sign up for Praetoria services.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Users className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-lg font-bold">{referrals.length}</p>
            <p className="text-[10px] text-muted-foreground">Referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Share2 className="h-4 w-4 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{pendingCount}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <DollarSign className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-lg font-bold font-mono">${totalCredits.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">Earned</p>
          </CardContent>
        </Card>
      </div>

      <Button className="w-full" onClick={() => setDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> Refer a Friend
      </Button>

      {/* Referral history */}
      {referrals.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Referral History</h2>
          {referrals.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{r.referral_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.referral_email || r.referral_phone || 'No contact info'}
                    {r.referral_address && ` · ${r.referral_address}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={r.status} />
                  {r.status === 'Rewarded' && Number(r.reward_value) > 0 && (
                    <p className="text-xs text-emerald-600 font-medium mt-1">${Number(r.reward_value).toFixed(0)} credit</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {referrals.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <Gift className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">No referrals yet. Refer a friend and earn credits!</p>
          </CardContent>
        </Card>
      )}

      {/* Referral dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md mx-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" /> Refer a Friend
            </DialogTitle>
            <DialogDescription>Tell us about the person you'd like to refer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Their Name *</Label>
              <Input value={form.referral_name} onChange={e => setForm(f => ({ ...f, referral_name: e.target.value }))} placeholder="Full name" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Email (optional)</Label>
              <Input type="email" value={form.referral_email} onChange={e => setForm(f => ({ ...f, referral_email: e.target.value }))} placeholder="email@example.com" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Phone (optional)</Label>
              <Input type="tel" value={form.referral_phone} onChange={e => setForm(f => ({ ...f, referral_phone: e.target.value }))} placeholder="(555) 123-4567" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Address (optional)</Label>
              <Input value={form.referral_address} onChange={e => setForm(f => ({ ...f, referral_address: e.target.value }))} placeholder="Street address or area" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. They need snow removal, mention I referred them..." className="mt-1" />
            </div>
            <Button className="w-full" disabled={!form.referral_name.trim() || submitReferral.isPending} onClick={() => submitReferral.mutate()}>
              {submitReferral.isPending ? 'Submitting...' : 'Submit Referral'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
