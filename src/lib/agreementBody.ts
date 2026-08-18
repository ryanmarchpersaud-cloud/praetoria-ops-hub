import { buildResidentialSnowBody, RESIDENTIAL_SNOW_FIELD_SCHEMA } from '@/lib/agreementTemplates/residentialSnow';
import { combinedStatusMeta } from '@/lib/combinedDocument';

/**
 * Combined quotation & service agreements are rendered from `merge_data` so the
 * quotation view and the agreement view can never drift apart. Everything else
 * uses its stored `body_html`.
 */
export function resolveAgreementBody(agreement: any): string {
  if (!agreement) return '';
  if (agreement.document_type === 'residential_snow_combined' || agreement.is_combined_document) {
    const merge = { ...((agreement.merge_data || {}) as Record<string, string>) };
    merge.document_version = String(agreement.version || 1);
    merge.document_status_label = combinedStatusMeta(agreement.doc_status).label;
    if (agreement.agreement_number) merge.agreement_number = agreement.agreement_number;
    if (agreement.quotation_number) merge.quotation_number = agreement.quotation_number;
    return buildResidentialSnowBody(merge, { provisional: agreement.doc_status === 'provisional_estimate' });
  }
  return agreement.body_html || '';
}

/** Combined documents always use the master residential field schema. */
export function resolveAgreementSchema(agreement: any) {
  if (agreement?.document_type === 'residential_snow_combined' || agreement?.is_combined_document) {
    return RESIDENTIAL_SNOW_FIELD_SCHEMA;
  }
  const s = agreement?.field_schema;
  return Array.isArray(s) && s.length ? s : null;
}
