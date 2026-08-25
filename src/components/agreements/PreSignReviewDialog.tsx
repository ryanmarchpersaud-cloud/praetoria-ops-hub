import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { AgreementFieldValues } from '@/lib/agreementFields';
import { TBD, isTbd } from '@/lib/combinedDocument';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agreement: any;
  values: AgreementFieldValues;
  provisional: boolean;
  submitting: boolean;
  onConfirm: () => void;
  onDecline: () => void;
  /** Selection keys that are still blank — signing is blocked while any remain. */
  missingSelections: string[];
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-[minmax(140px,38%)_1fr] gap-3 border-b border-border py-2 text-sm last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium break-words">{value || <span className="text-muted-foreground">{TBD}</span>}</span>
  </div>
);

export function PreSignReviewDialog({
  open, onOpenChange, agreement, values, provisional, submitting, onConfirm, onDecline, missingSelections,
}: Props) {
  const m = (agreement?.merge_data || {}) as Record<string, string>;
  const fallbacks: Record<string, string> = {
    agreement_number: agreement?.agreement_number || '',
    quotation_number: agreement?.quotation_number || '',
    document_version: String(agreement?.version || 1),
  };
  const val = (k: string) => (isTbd(m[k]) ? (fallbacks[k] || TBD) : m[k]);
  const sel = (k: string) => (values?.[k] ? String(values[k]) : '');

  const trigger = sel('snowfall_trigger').startsWith('Other written amount')
    ? sel('snowfall_trigger_other')
    : sel('snowfall_trigger');

  const isCommercial = agreement?.document_type === 'commercial_snow_combined';

  const areas = (isCommercial
    ? [
        ['Front / access area', sel('area_front')],
        ['Main entrance', sel('area_entrance')],
        ['Back / rear area', sel('area_back')],
      ]
    : [
        ['Driveway', sel('area_driveway')],
        ['Walkways', sel('area_walkways')],
        ['Steps / entrance', sel('area_steps')],
        ['City sidewalk', sel('area_sidewalk')],
      ]
  ).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ');

  const blocked = missingSelections.length > 0;

  const commercialBody = (
    <>
      <Row label="Customer" value={val('customer_name')} />
      <Row label="Authorized representative" value={sel('customer_rep_name')} />
      <Row label="Property" value={`${val('service_address')}, ${val('service_city')}, ${val('service_province')}`} />
      <Row label="Quotation / Agreement" value={`${val('quotation_number')} · ${val('agreement_number')} (v${val('document_version')})`} />
      <Row label="Selected service plan" value={sel('service_option')} />
      {sel('service_option').startsWith('OPTION 2') && (
        <Row label="Active service month(s)" value={sel('option2_months')} />
      )}
      <Row
        label="Option 1 — Automatic Per-Visit"
        value={`${val('option1_rate')}/hour per equipment unit · ${val('option1_minimum_hours')} minimum · ${val('option1_minimum_charge')} minimum visit charge · automatic dispatch`}
      />
      <Row
        label="Option 2 — Month-to-Month On-Call"
        value={`${val('option2_hourly_rate')}/hour per equipment unit · ${val('option2_minimum_hours')} minimum · ${val('option2_minimum_charge')} minimum visit charge · you call when service is required`}
      />
      <Row
        label="Option 3 — Full Season Automatic"
        value={`${val('option3_monthly_rate')}/month × ${val('option3_months')} months · seasonal contract value ${val('option3_season_total')} · ${val('season_start_date')} to ${val('season_end_date')} · automatic dispatch`}
      />
      <Row label="Options are alternatives" value="Only the one option you select applies — the options are never added together." />
      <Row label="Snowfall trigger" value={trigger} />
      <Row
        label={`Heavy Snow Events (over ${val('heavy_snow_threshold')})`}
        value={`Standard pricing applies through ${val('heavy_snow_threshold')} per event. Tier 1 (10.1–15 cm): ${val('heavy_snow_tier1')} · Tier 2 (15.1–20 cm): ${val('heavy_snow_tier2')} · Severe (over 20 cm): ${val('heavy_snow_tier3')}`}
      />
      <Row label="Included service areas" value={areas} />
      <Row label="Snow placement" value={sel('snow_placement')} />
      <Row label="Hauling" value={sel('hauling_authorization')} />
      <Row label="Site contact" value={sel('site_contact_name')} />
      <Row label="Photos" value={sel('photo_consent')} />
      <Row label="Payment" value={`${sel('payment_method')} · ${val('payment_terms')}`} />
      <Row label="Tax treatment" value={val('pst_treatment')} />
      <Row label="Cancellation terms" value={val('cancellation_terms')} />
    </>
  );


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 max-h-[92vh]">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Review before you sign</DialogTitle>
          <DialogDescription>
            Please confirm everything below is correct. You can go back and correct any error, or decline, before signing.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[62vh] px-6">
          <div className="pb-4">
            {provisional && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900 mb-3">
                PROVISIONAL ESTIMATE ONLY — NOT A CONFIRMED PRICE OR SERVICE COMMITMENT. Acknowledging this document does
                not activate service and is not acceptance of any later final price.
              </div>
            )}
            {blocked && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive mb-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{missingSelections.length} required selection(s) are still blank. Acceptance is blocked until every selection is answered.</span>
              </div>
            )}

            {isCommercial ? commercialBody : (
              <>
                <Row label="Customer" value={val('customer_name')} />
                <Row label="Property" value={`${val('service_address')}, ${val('service_city')}, ${val('service_province')}`} />
                <Row label="Quotation / Agreement" value={`${val('quotation_number')} · ${val('agreement_number')} (v${val('document_version')})`} />
                <Row label="Service period" value={`${val('season_start_date')} to ${val('season_end_date')}`} />
                <Row
                  label="Price and tax"
                  value={provisional
                    ? `Estimated range ${val('estimate_range')} per month before tax — not a final price`
                    : `${val('total_price')} total (GST ${val('gst_amount')}; ${val('pst_treatment')})`}
                />
                <Row label="Billing frequency" value={val('billing_frequency')} />
                <Row label="Snowfall trigger" value={trigger} />
                <Row label="Included service areas" value={areas} />
                <Row label="Visit plan and included-visit limit" value={sel('visit_plan')} />
                <Row label="Response target" value={val('response_target')} />
                <Row
                  label="Additional charges"
                  value={`Additional visit ${val('additional_visit_rate')} · Additional labour ${val('worker_hour_rate')} per worker-hour (1 hour minimum, each worker billed separately) · Travel/mobilization ${val('travel_mobilization')} · Heavy snow ${val('heavy_snow_charge')} · De-icer ${val('deicer_application_charge')} + materials ${val('deicer_material_charge')} · Emergency call-out ${val('emergency_callout_charge')} · Hauling ${val('hauling_charge')}`}
                />
                <Row label="Cancellation terms" value={val('cancellation_terms')} />
                <Row
                  label="Your authorizations"
                  value={`Snow storage: ${sel('snow_storage_location')} · De-icing: ${sel('deicing_authorization')} · Hauling: ${sel('hauling_authorization')} · Windrow returns: ${sel('windrow_returns')} · Photos: ${sel('photo_consent')} · Payment: ${sel('payment_method')}`}
                />
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6 pt-2 gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Go back and correct</Button>
          <Button variant="outline" onClick={onDecline} disabled={submitting}>Decline</Button>
          <Button onClick={onConfirm} disabled={submitting || blocked}>
            {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {provisional ? 'Acknowledge & Sign' : 'Agree & Sign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
