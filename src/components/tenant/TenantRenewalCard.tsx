import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Check, HelpCircle, XCircle, Mail } from 'lucide-react';
import { useTenantRenewal, useTenantRespondRenewal } from '@/hooks/pm/useLeaseRenewals';
import { formatStatusLabel } from '@/lib/statusLabel';
import { toast } from 'sonner';

export function TenantRenewalCard() {
  const { data: renewal, isLoading } = useTenantRenewal();
  const respond = useTenantRespondRenewal();

  if (isLoading || !renewal) return null;

  const submit = async (response: 'interested' | 'questions' | 'not_renewing') => {
    try {
      await respond.mutateAsync({ id: renewal.id, response });
      toast.success('Response sent to Praetoria Group.');
    } catch (e: any) { toast.error(e.message); }
  };

  const alreadyResponded = !!renewal.tenant_response;

  return (
    <Card className="border-emerald-300 bg-emerald-50/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-emerald-900 flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Lease Renewal
          </CardTitle>
          <Badge className="bg-emerald-700">{formatStatusLabel(renewal.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Current lease end</p>
            <p className="font-semibold">{renewal.current_lease_end_date ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Proposed term</p>
            <p className="font-semibold">
              {renewal.proposed_start_date ?? '—'} → {renewal.proposed_end_date ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Proposed rent</p>
            <p className="font-semibold">
              {renewal.proposed_rent ? `$${Number(renewal.proposed_rent).toFixed(2)}` : '—'}
              <span className="text-xs text-muted-foreground ml-1">/ {renewal.rent_frequency || 'monthly'}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Your response</p>
            <p className="font-semibold">{renewal.tenant_response ? formatStatusLabel(renewal.tenant_response) : '—'}</p>
          </div>
        </div>

        {renewal.tenant_visible_note && (
          <div className="bg-white border rounded p-3 text-xs whitespace-pre-wrap">
            <p className="font-semibold text-emerald-900 mb-1">Note from Praetoria</p>
            {renewal.tenant_visible_note}
          </div>
        )}

        <div className="text-[11px] text-muted-foreground italic border-l-2 border-emerald-300 pl-2">
          This renewal information is for review and communication only. Final lease terms must be confirmed by Praetoria Group.
        </div>

        {!alreadyResponded ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" onClick={() => submit('interested')}>
              <Check className="h-3 w-3 mr-1" /> Interested in renewing
            </Button>
            <Button size="sm" variant="outline" onClick={() => submit('questions')}>
              <HelpCircle className="h-3 w-3 mr-1" /> I have questions
            </Button>
            <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => submit('not_renewing')}>
              <XCircle className="h-3 w-3 mr-1" /> Not renewing
            </Button>
          </div>
        ) : (
          <p className="text-xs text-emerald-800">Thank you — your response was received.</p>
        )}

        <Button asChild variant="ghost" size="sm" className="w-full">
          <a href="mailto:ops@praetoriagroup.ca">
            <Mail className="h-3 w-3 mr-1" /> Contact Praetoria (ops@praetoriagroup.ca)
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
