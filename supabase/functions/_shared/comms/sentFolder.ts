// Phase 1C — Sent-folder consistency design (prepared, not executed).
//
// Invariant: the SMTP send and the IMAP APPEND are two independent steps.
// An append is only ever attempted AFTER SMTP acceptance, and a failed append
// NEVER causes the email to be resent — only the append is retried.

export type SendState = "draft" | "sending" | "sent" | "failed";
export type SentCopyStatus = "not_attempted" | "sent_copy_pending" | "appended" | "skipped_duplicate" | "failed";

export type AppendContext = {
  sendState: SendState;
  sentCopyEnabled: boolean;
  messageIdHeader: string | null;
  existsInSentFolder: boolean;
  attempts: number;
};

export const MAX_APPEND_ATTEMPTS = 5;

export type AppendDecision =
  | { action: "append"; reason: "accepted" }
  | { action: "skip"; status: SentCopyStatus; reason: string };

/** Decide whether the Sent-folder append may run. Never triggers a resend. */
export function appendDecision(ctx: AppendContext): AppendDecision {
  if (ctx.sendState !== "sent") return { action: "skip", status: "not_attempted", reason: "smtp_not_accepted" };
  if (!ctx.sentCopyEnabled) return { action: "skip", status: "not_attempted", reason: "sent_copy_disabled" };
  if (!ctx.messageIdHeader) return { action: "skip", status: "failed", reason: "missing_message_id" };
  if (ctx.existsInSentFolder) return { action: "skip", status: "skipped_duplicate", reason: "duplicate_message_id" };
  if (ctx.attempts >= MAX_APPEND_ATTEMPTS) return { action: "skip", status: "failed", reason: "max_attempts_reached" };
  return { action: "append", reason: "accepted" };
}

/** Outcome mapping after an append attempt. The email is never re-sent. */
export function appendOutcome(ok: boolean, attempts: number): {
  sent_copy_status: SentCopyStatus;
  sent_copy_attempts: number;
  retry_append_only: boolean;
  resend_email: false;
} {
  if (ok) {
    return { sent_copy_status: "appended", sent_copy_attempts: attempts, retry_append_only: false, resend_email: false };
  }
  const exhausted = attempts >= MAX_APPEND_ATTEMPTS;
  return {
    sent_copy_status: exhausted ? "failed" : "sent_copy_pending",
    sent_copy_attempts: attempts,
    retry_append_only: !exhausted,
    resend_email: false,
  };
}

/** IMAP search used to deduplicate by Message-ID before appending. */
export function buildDuplicateSearch(folder: string, messageId: string): string {
  const safeFolder = folder.replace(/["\\]/g, "");
  const safeId = messageId.replace(/["\\\r\n]/g, "");
  return `UID SEARCH HEADER "Message-ID" "${safeId}" IN "${safeFolder}"`.replace(/ IN "[^"]*"$/, "");
}

/** IMAP APPEND command header line for a fully rendered RFC822 message. */
export function buildAppendCommand(folder: string, rfc822: string, flags = "\\Seen"): string {
  const safeFolder = folder.replace(/["\\\r\n]/g, "");
  const octets = new TextEncoder().encode(rfc822).length;
  return `APPEND "${safeFolder}" (${flags}) {${octets}}`;
}

/** Exponential retry schedule (seconds) for append-only retries. */
export function appendRetryDelaySeconds(attempt: number): number {
  return Math.min(3600, 30 * Math.pow(2, Math.max(0, attempt - 1)));
}
