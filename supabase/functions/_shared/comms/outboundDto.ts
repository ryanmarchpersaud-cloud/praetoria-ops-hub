/**
 * Phase 1D.1 — browser response projection for outbound records.
 *
 * This is an ALLOW LIST, not a blacklist. Any column that is not named here is
 * dropped, so server-only or credential-bearing fields added in future
 * migrations are excluded by default rather than by remembering to redact them.
 *
 * Permanently excluded (do not add): rfc822_message (canonical MIME body),
 * smtp_result (raw SMTP transcript), and any future credential/transport field.
 */
export const OUTBOUND_SAFE_COLUMNS = [
  "id",
  "mailbox_id",
  "requested_by",
  "requested_by_email",
  "from_address",
  "to_address",
  "subject",
  "body_text",
  "idempotency_key",
  "message_id_header",
  "in_reply_to_id",
  "in_reply_to_header",
  "references_header",
  "status",
  "error_text",
  "created_at",
  "updated_at",
  "approved_at",
  "sent_at",
  "failed_at",
  "sent_copy_status",
  "sent_copy_attempts",
  "sent_copy_appended_at",
  "sent_copy_last_error",
  "sent_copy_last_retry_outcome",
  "sent_copy_last_retry_at",
] as const;

export type OutboundSafeColumn = typeof OUTBOUND_SAFE_COLUMNS[number];
export type OutboundDto = Partial<Record<OutboundSafeColumn, unknown>>;

/** Columns that must never reach a browser response under any circumstance. */
export const OUTBOUND_FORBIDDEN_COLUMNS = ["rfc822_message", "smtp_result"] as const;

/** Project a service-role row onto the approved browser DTO. */
export function toOutboundDto(
  record: Record<string, unknown> | null | undefined,
): OutboundDto | null {
  if (!record) return null;
  const dto: Record<string, unknown> = {};
  for (const key of OUTBOUND_SAFE_COLUMNS) {
    if (key in record) dto[key] = record[key];
  }
  return dto as OutboundDto;
}
