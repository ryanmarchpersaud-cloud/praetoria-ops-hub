import { buildResidentialSnowBody, RESIDENTIAL_SNOW_FIELD_SCHEMA, REQUIRED_SELECTION_KEYS } from '@/lib/agreementTemplates/residentialSnow';
import {
  buildCommercialSnowCombinedBody,
  COMMERCIAL_SNOW_COMBINED_FIELD_SCHEMA,
  COMMERCIAL_REQUIRED_SELECTION_KEYS,
} from '@/lib/agreementTemplates/commercialSnowCombined';
import {
  buildLandscapingCombinedBody,
  LANDSCAPING_COMBINED_FIELD_SCHEMA,
  LANDSCAPING_REQUIRED_SELECTION_KEYS,
} from '@/lib/agreementTemplates/landscapingCombined';
import {
  buildResidentialSeasonalSnowBody,
  RESIDENTIAL_SEASONAL_FIELD_SCHEMA,
  RESIDENTIAL_SEASONAL_REQUIRED_SELECTION_KEYS,
} from '@/lib/agreementTemplates/residentialSnowSeasonal';
import {
  buildJunkRemovalCombinedBody,
  JUNK_REMOVAL_COMBINED_FIELD_SCHEMA,
  JUNK_REMOVAL_REQUIRED_SELECTION_KEYS,
} from '@/lib/agreementTemplates/junkRemovalCombined';
import {
  buildDemolitionPhase1Body,
  DEMOLITION_PHASE1_FIELD_SCHEMA,
  DEMOLITION_PHASE1_REQUIRED_SELECTION_KEYS,
} from '@/lib/agreementTemplates/demolitionPhase1Combined';
import { combinedStatusMeta } from '@/lib/combinedDocument';

export const COMMERCIAL_SNOW_COMBINED_TYPE = 'commercial_snow_combined';
export const LANDSCAPING_COMBINED_TYPE = 'landscaping_combined';
export const RESIDENTIAL_SNOW_SEASONAL_TYPE = 'residential_snow_seasonal';
export const JUNK_REMOVAL_COMBINED_TYPE = 'junk_removal_combined';
export const DEMOLITION_PHASE1_COMBINED_TYPE = 'demolition_phase1_combined';

function isCommercialCombined(agreement: any) {
  return agreement?.document_type === COMMERCIAL_SNOW_COMBINED_TYPE;
}

function isLandscapingCombined(agreement: any) {
  return agreement?.document_type === LANDSCAPING_COMBINED_TYPE;
}

function isResidentialSeasonal(agreement: any) {
  return agreement?.document_type === RESIDENTIAL_SNOW_SEASONAL_TYPE;
}

function isJunkRemovalCombined(agreement: any) {
  return agreement?.document_type === JUNK_REMOVAL_COMBINED_TYPE;
}

function isDemolitionPhase1(agreement: any) {
  return agreement?.document_type === DEMOLITION_PHASE1_COMBINED_TYPE;
}


function isResidentialCombined(agreement: any) {
  return (
    agreement?.document_type === 'residential_snow_combined' ||
    (agreement?.is_combined_document &&
      !isCommercialCombined(agreement) &&
      !isLandscapingCombined(agreement) &&
      !isJunkRemovalCombined(agreement) &&
      !isDemolitionPhase1(agreement) &&
      !isResidentialSeasonal(agreement))
  );
}



/**
 * Combined quotation & service agreements are rendered from `merge_data` so the
 * quotation view and the agreement view can never drift apart. Everything else
 * uses its stored `body_html`.
 */
export function resolveAgreementBody(agreement: any): string {
  if (!agreement) return '';
  if (
    isCommercialCombined(agreement) ||
    isLandscapingCombined(agreement) ||
    isResidentialSeasonal(agreement) ||
    isJunkRemovalCombined(agreement) ||
    isDemolitionPhase1(agreement) ||
    isResidentialCombined(agreement)
  ) {
    const merge = { ...((agreement.merge_data || {}) as Record<string, string>) };
    merge.document_version = String(agreement.version || 1);
    merge.document_status_label = combinedStatusMeta(agreement.doc_status).label;
    if (agreement.agreement_number) merge.agreement_number = agreement.agreement_number;
    if (agreement.quotation_number) merge.quotation_number = agreement.quotation_number;

    if (isCommercialCombined(agreement)) return buildCommercialSnowCombinedBody(merge);
    if (isLandscapingCombined(agreement)) return buildLandscapingCombinedBody(merge);
    if (isResidentialSeasonal(agreement)) return buildResidentialSeasonalSnowBody(merge);
    if (isJunkRemovalCombined(agreement)) return buildJunkRemovalCombinedBody(merge);
    if (isDemolitionPhase1(agreement)) return buildDemolitionPhase1Body(merge);
    return buildResidentialSnowBody(merge, { provisional: agreement.doc_status === 'provisional_estimate' });
  }
  return agreement.body_html || '';
}

/** Combined documents always use their master field schema. */
export function resolveAgreementSchema(agreement: any) {
  if (isCommercialCombined(agreement)) return COMMERCIAL_SNOW_COMBINED_FIELD_SCHEMA;
  if (isLandscapingCombined(agreement)) return LANDSCAPING_COMBINED_FIELD_SCHEMA;
  if (isResidentialSeasonal(agreement)) return RESIDENTIAL_SEASONAL_FIELD_SCHEMA;
  if (isJunkRemovalCombined(agreement)) return JUNK_REMOVAL_COMBINED_FIELD_SCHEMA;
  if (isDemolitionPhase1(agreement)) return DEMOLITION_PHASE1_FIELD_SCHEMA;
  if (isResidentialCombined(agreement)) return RESIDENTIAL_SNOW_FIELD_SCHEMA;
  const s = agreement?.field_schema;
  return Array.isArray(s) && s.length ? s : null;
}

/** Selection keys that must be answered before the customer may sign. */
export function resolveRequiredSelectionKeys(agreement: any): string[] {
  if (isCommercialCombined(agreement)) return COMMERCIAL_REQUIRED_SELECTION_KEYS;
  if (isLandscapingCombined(agreement)) return LANDSCAPING_REQUIRED_SELECTION_KEYS;
  if (isResidentialSeasonal(agreement)) return RESIDENTIAL_SEASONAL_REQUIRED_SELECTION_KEYS;
  if (isJunkRemovalCombined(agreement)) return JUNK_REMOVAL_REQUIRED_SELECTION_KEYS;
  if (isDemolitionPhase1(agreement)) return DEMOLITION_PHASE1_REQUIRED_SELECTION_KEYS;
  if (isResidentialCombined(agreement)) return REQUIRED_SELECTION_KEYS;

  return [];

}

