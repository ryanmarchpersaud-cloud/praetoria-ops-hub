import { buildResidentialSnowBody, RESIDENTIAL_SNOW_FIELD_SCHEMA, REQUIRED_SELECTION_KEYS } from '@/lib/agreementTemplates/residentialSnow';
import {
  buildCommercialSnowCombinedBody,
  COMMERCIAL_SNOW_COMBINED_FIELD_SCHEMA,
  COMMERCIAL_REQUIRED_SELECTION_KEYS,
} from '@/lib/agreementTemplates/commercialSnowCombined';
import { combinedStatusMeta } from '@/lib/combinedDocument';

export const COMMERCIAL_SNOW_COMBINED_TYPE = 'commercial_snow_combined';

function isCommercialCombined(agreement: any) {
  return agreement?.document_type === COMMERCIAL_SNOW_COMBINED_TYPE;
}

function isResidentialCombined(agreement: any) {
  return (
    agreement?.document_type === 'residential_snow_combined' ||
    (agreement?.is_combined_document && !isCommercialCombined(agreement))
  );
}

/**
 * Combined quotation & service agreements are rendered from `merge_data` so the
 * quotation view and the agreement view can never drift apart. Everything else
 * uses its stored `body_html`.
 */
export function resolveAgreementBody(agreement: any): string {
  if (!agreement) return '';
  if (isCommercialCombined(agreement) || isResidentialCombined(agreement)) {
    const merge = { ...((agreement.merge_data || {}) as Record<string, string>) };
    merge.document_version = String(agreement.version || 1);
    merge.document_status_label = combinedStatusMeta(agreement.doc_status).label;
    if (agreement.agreement_number) merge.agreement_number = agreement.agreement_number;
    if (agreement.quotation_number) merge.quotation_number = agreement.quotation_number;

    if (isCommercialCombined(agreement)) return buildCommercialSnowCombinedBody(merge);
    return buildResidentialSnowBody(merge, { provisional: agreement.doc_status === 'provisional_estimate' });
  }
  return agreement.body_html || '';
}

/** Combined documents always use their master field schema. */
export function resolveAgreementSchema(agreement: any) {
  if (isCommercialCombined(agreement)) return COMMERCIAL_SNOW_COMBINED_FIELD_SCHEMA;
  if (isResidentialCombined(agreement)) return RESIDENTIAL_SNOW_FIELD_SCHEMA;
  const s = agreement?.field_schema;
  return Array.isArray(s) && s.length ? s : null;
}

/** Selection keys that must be answered before the customer may sign. */
export function resolveRequiredSelectionKeys(agreement: any): string[] {
  if (isCommercialCombined(agreement)) return COMMERCIAL_REQUIRED_SELECTION_KEYS;
  if (isResidentialCombined(agreement)) return REQUIRED_SELECTION_KEYS;
  return [];
}
