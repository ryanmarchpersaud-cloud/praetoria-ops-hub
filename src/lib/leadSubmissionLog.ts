/**
 * Client-side submission logger for lead create attempts.
 *
 * Records every attempt (start, success, failure) into the public.activities
 * table so the Activity page surfaces a complete audit trail — even when the
 * insert itself fails (RLS, network, schema cache, etc.).
 *
 * All writes are best-effort: logger failures must never block the user flow.
 */

import { supabase } from '@/integrations/supabase/client';

export type LeadSubmitOutcome = 'started' | 'success' | 'duplicate' | 'error';

interface LogParams {
  outcome: LeadSubmitOutcome;
  startedAt: number;
  payloadHash: string;
  userId?: string | null;
  recordId?: string | null;
  error?: unknown;
  extra?: Record<string, unknown>;
}

/**
 * Stable, non-cryptographic hash of the submission payload.
 * Used to correlate "started" / "success" / "error" rows for the same attempt
 * without persisting raw PII (name, phone, email) into the activity log.
 */
export function hashLeadPayload(payload: Record<string, unknown>): string {
  const normalized = JSON.stringify(payload, Object.keys(payload).sort());
  let h = 5381;
  for (let i = 0; i < normalized.length; i++) {
    h = ((h << 5) + h) ^ normalized.charCodeAt(i);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const ACTION_BY_OUTCOME: Record<LeadSubmitOutcome, string> = {
  started: 'Lead submit started',
  success: 'Lead submit succeeded',
  duplicate: 'Lead submit deduplicated',
  error: 'Lead submit failed',
};

const STATUS_BY_OUTCOME: Record<LeadSubmitOutcome, string> = {
  started: 'pending',
  success: 'success',
  duplicate: 'success',
  error: 'error',
};

export async function logLeadSubmission(params: LogParams): Promise<void> {
  try {
    const durationMs = Date.now() - params.startedAt;
    const errMessage =
      params.error instanceof Error
        ? params.error.message
        : params.error
        ? String((params.error as { message?: string })?.message ?? params.error)
        : null;

    await supabase.from('activities').insert({
      action_name: ACTION_BY_OUTCOME[params.outcome],
      workflow_name: 'lead_submission',
      record_type: 'lead',
      record_id: params.recordId ?? null,
      status: STATUS_BY_OUTCOME[params.outcome],
      user_id: params.userId ?? null,
      error_message: errMessage,
      payload_summary: {
        payload_hash: params.payloadHash,
        started_at: new Date(params.startedAt).toISOString(),
        duration_ms: durationMs,
        outcome: params.outcome,
        ...(params.extra ?? {}),
      } as never,
    } as never);
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[leadSubmissionLog] failed', err);
    }
  }
}
