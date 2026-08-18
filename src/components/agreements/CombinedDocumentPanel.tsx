import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, BadgeCheck, ClipboardList, DollarSign, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  ACTIVATION_PENDING_BANNER, ACTIVATION_REQUIREMENTS, PROVISIONAL_BANNER,
  activationState, combinedStatusMeta, COMBINED_DOC_STATUSES, unresolvedPricingKeys, TBD,
} from '@/lib/combinedDocument';
import { buildResidentialSnowBody } from '@/lib/agreementTemplates/residentialSnow';

const PRICING_FIELDS: { key: string; label: string }[] = [
  { key: 'monthly_price', label: 'Monthly / 28-day service price' },
  { key: 'billing_periods', label: 'Number of billing periods' },
  { key: 'seasonal_subtotal', label: 'Seasonal subtotal' },
  { key: 'gst_amount', label: 'GST (5%)' },
  { key: 'pst_treatment', label: 'PST treatment' },
  { key: 'total_price', label: 'Total customer price' },
  { key: 'billing_frequency', label: 'Billing frequency' },
  { key: 'additional_visit_rate', label: 'Additional visit rate' },
  { key: 'worker_hour_rate', label: 'Additional worker-hour rate' },
  { key: 'travel_mobilization', label: 'Travel / mobilization charge' },
  { key: 'heavy_snow_threshold', label: 'Heavy-snow threshold' },
  { key: 'heavy_snow_charge', label: 'Heavy-snow charge' },
  { key: 'deicer_application_charge', label: 'De-icer application charge' },
  { key: 'deicer_material_charge', label: 'De-icer material charge' },
  { key: 'emergency_callout_charge', label: 'Emergency call-out charge' },
  { key: 'hauling_charge', label: 'Snow-hauling and disposal charge' },
  { key: 'response_target', label: 'Response target' },
  { key: 'payment_terms', label: 'Payment terms' },
  { key: 'late_fee', label: 'Late fee (single value)' },
  { key: 'interest_rate', label: 'Interest on overdue balances (single value)' },
  { key: 'suspension_rule', label: 'Non-payment suspension rule (single value)' },
  { key: 'cancellation_terms', label: 'Cancellation terms' },
  { key: 'renewal_terms', label: 'Renewal terms' },
];

export function CombinedDocumentPanel({ agreement, userId }: { agreement: any; userId?: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const merge = (agreement.merge_data || {}) as Record<string, string>;
  const [draft, setDraft] = useState<Record<string, string>>(merge);
  const [busy, setBusy] = useState(false);

  const docStatus = agreement.doc_status || 'draft_internal_review';
  const meta = combinedStatusMeta(docStatus);
  const isProvisional = docStatus === 'provisional_estimate';
  const signed = Boolean(agreement.customer_signed_at);
  const pricingApproved = Boolean(agreement.pricing_approved_at);
  const unresolved = useMemo(() => unresolvedPricingKeys(draft), [draft]);

  const checklist = (agreement.activation_checklist || {}) as Record<string, boolean>;
  const activation = activationState(checklist, { signed, pricingApproved });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['agreement'] });
    qc.invalidateQueries({ queryKey: ['agreements'] });
  };

  const patch = async (updates: Record<string, unknown>) => {
    setBusy(true);
    try {
      const { error } = await supabase.from('agreements').update(updates).eq('id', agreement.id);
      if (error) throw error;
      refresh();
    } catch (e: any) {
      toast.error(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const savePricing = async () => {
    if (signed) { toast.error('A signed document cannot be edited. Create a new version instead.'); return; }
    const nextMerge = { ...draft, document_status_label: meta.label, document_version: String(agreement.version || 1) };
    const body = buildResidentialSnowBody(nextMerge, { provisional: isProvisional });
    await patch({
      merge_data: nextMerge,
      body_html: body,
      has_unresolved_values: unresolvedPricingKeys(nextMerge).length > 0,
    });
    toast.success('Pricing updated');
  };

  const approvePricing = async () => {
    if (unresolved.length) { toast.error('Resolve every TBD value before approving the final price'); return; }
    await patch({
      pricing_approved_at: new Date().toISOString(),
      pricing_approved_by: userId ?? null,
      has_unresolved_values: false,
    });
    await supabase.from('agreement_audit_log').insert({
      agreement_id: agreement.id, action: 'final_pricing_approved', performed_by: userId ?? null,
    });
    toast.success('Final pricing approved');
  };

  /** Produce the FINAL version the customer must review and sign. */
  const publishFinalVersion = async () => {
    if (!pricingApproved) { toast.error('Final pricing must be approved first'); return; }
    setBusy(true);
    try {
      const nextVersion = (agreement.version || 1) + 1;
      const nextMerge = {
        ...draft,
        document_version: String(nextVersion),
        document_status_label: combinedStatusMeta('final_quotation').label,
        issued_date: new Date().toISOString().slice(0, 10),
      };
      const body = buildResidentialSnowBody(nextMerge, { provisional: false });

      if (signed) {
        // Never overwrite a signed version — issue a new one and supersede the old.
        const { data: created, error } = await supabase.from('agreements').insert({
          title: agreement.title,
          category: agreement.category,
          document_type: agreement.document_type,
          body_html: body,
          field_schema: agreement.field_schema,
          field_values: {},
          merge_data: nextMerge,
          recipient_type: agreement.recipient_type,
          recipient_name: agreement.recipient_name,
          recipient_email: agreement.recipient_email,
          recipient_user_id: agreement.recipient_user_id,
          customer_id: agreement.customer_id,
          property_id: agreement.property_id,
          quote_id: agreement.quote_id,
          quotation_number: agreement.quotation_number,
          is_combined_document: true,
          doc_status: 'final_quotation',
          pricing_approved_at: agreement.pricing_approved_at,
          pricing_approved_by: agreement.pricing_approved_by,
          has_unresolved_values: false,
          activation_checklist: checklist,
          status: 'ready_to_send',
          version: nextVersion,
          parent_agreement_id: agreement.id,
          relationship_type: 'amendment',
          season_start: agreement.season_start,
          season_end: agreement.season_end,
          created_by: userId ?? null,
        }).select().single();
        if (error) throw error;

        await supabase.from('agreements').update({ status: 'superseded', superseded_by: created.id }).eq('id', agreement.id);
        await supabase.from('agreement_audit_log').insert([
          { agreement_id: created.id, action: 'final_version_issued', performed_by: userId ?? null },
          { agreement_id: agreement.id, action: 'superseded', performed_by: userId ?? null },
        ]);
        toast.success('Final version created — the customer must review and sign it');
        refresh();
        navigate(`/agreements/${created.id}`);
      } else {
        await patch({
          merge_data: nextMerge,
          body_html: body,
          doc_status: 'final_quotation',
          version: nextVersion,
          status: 'ready_to_send',
          has_unresolved_values: false,
        });
        toast.success('Final quotation published — ready to send');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleRequirement = async (key: string, value: boolean) => {
    await patch({ activation_checklist: { ...checklist, [key]: value } });
  };

  const activate = async () => {
    if (!activation.allComplete) { toast.error('All activation requirements must be complete'); return; }
    await patch({ doc_status: 'active_service_agreement' });
    await supabase.from('agreement_audit_log').insert({
      agreement_id: agreement.id, action: 'service_activated', performed_by: userId ?? null,
    });
    toast.success('Service agreement activated');
  };

  return (
    <div className="space-y-4">
      {isProvisional && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
          {PROVISIONAL_BANNER}
        </div>
      )}
      {docStatus !== 'active_service_agreement' && !isProvisional && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-900">
          {ACTIVATION_PENDING_BANNER}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" /> Combined Document Status
          </CardTitle>
          <Badge className={meta.className}>{meta.short}</Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-muted-foreground">Quotation</span><div className="font-mono">{agreement.quotation_number || '—'}</div></div>
            <div><span className="text-muted-foreground">Agreement</span><div className="font-mono">{agreement.agreement_number || '—'}</div></div>
            <div><span className="text-muted-foreground">Version</span><div>v{agreement.version || 1}</div></div>
            <div><span className="text-muted-foreground">Signed</span><div>{signed ? 'Yes — locked' : 'No'}</div></div>
          </div>
          <div>
            <Label className="text-xs">Lifecycle Status</Label>
            <Select
              value={docStatus}
              onValueChange={(v) => patch({ doc_status: v }).then(() => toast.success('Status updated')).catch(() => undefined)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMBINED_DOC_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value} disabled={s.value === 'active_service_agreement' && !activation.allComplete}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isProvisional && (
              <p className="text-xs text-muted-foreground mt-1">
                A provisional estimate may be acknowledged by the customer but never activates service, billing or dispatch.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Pricing, Charges &amp; Policy Values
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {unresolved.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{unresolved.length} value(s) still TBD. Final publication is blocked until every value is resolved.</span>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {PRICING_FIELDS.map((f) => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                <Input
                  value={draft[f.key] ?? ''}
                  placeholder={TBD}
                  disabled={signed}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={savePricing} disabled={busy || signed}>Save Values</Button>
            <Button size="sm" onClick={approvePricing} disabled={busy || pricingApproved || unresolved.length > 0}>
              <BadgeCheck className="h-4 w-4 mr-1" />
              {pricingApproved ? 'Final Pricing Approved' : 'Approve Final Pricing (Ryan)'}
            </Button>
            <Button size="sm" variant="secondary" onClick={publishFinalVersion} disabled={busy || !pricingApproved}>
              Publish Final Version for Signature
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" /> Activation Requirements ({activation.completed}/{activation.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activation.items.map((item) => (
            <label key={item.key} className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={item.done}
                disabled={Boolean(item.autoKey) || busy}
                onCheckedChange={(v) => toggleRequirement(item.key, v === true)}
              />
              <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                {item.label}
                {item.autoKey && <span className="text-xs text-muted-foreground"> (tracked automatically)</span>}
              </span>
            </label>
          ))}
          <Button
            size="sm"
            className="mt-2"
            onClick={activate}
            disabled={busy || !activation.allComplete || docStatus === 'active_service_agreement'}
          >
            Activate Service Agreement
          </Button>
          {!activation.allComplete && (
            <p className="text-xs text-muted-foreground">{ACTIVATION_PENDING_BANNER}</p>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Requirements tracked: {ACTIVATION_REQUIREMENTS.length}. Signed versions are preserved and never overwritten.
      </p>
    </div>
  );
}
