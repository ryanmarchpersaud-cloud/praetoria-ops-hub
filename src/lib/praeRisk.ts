// Phase 1F — Prae risk flags and action allow-list.
//
// Pure, deterministic, no network and no AI. Used to show the operator what is
// risky about a proposed reply BEFORE they approve it, and to keep the pilot
// restricted to a single action type.

/** The only action type permitted during the owner-only controlled pilot. */
export const PRAE_ALLOWED_ACTIONS = ['email_reply'] as const;
export type PraeActionType = typeof PRAE_ALLOWED_ACTIONS[number];

export function isPraeActionAllowed(action: string): action is PraeActionType {
  return (PRAE_ALLOWED_ACTIONS as readonly string[]).includes(action);
}

export type PraeRiskFlag = {
  id: string;
  label: string;
  severity: 'info' | 'warning' | 'critical';
};

const FINANCIAL = /\b(iban|swift|routing|account\s*number|bank|e-?transfer|wire|credit\s*card|cvv|invoice\s*payment|refund)\b/i;
const SENSITIVE_PII = /\b(sin|social\s*insurance|date\s*of\s*birth|dob|passport|driver'?s?\s*licen[cs]e|payroll|pay\s*stub|wage|salary)\b/i;
const ATTACHMENT_HINT = /\b(attach(ed|ment|ments)?|enclosed|see\s+the\s+pdf)\b/i;
const URL_HINT = /https?:\/\//i;
const LEGAL = /\b(lawyer|attorney|legal action|lawsuit|liability claim|insurance claim)\b/i;

/**
 * Flags computed from the inbound thread text and the proposed reply.
 * `recipientKnown` is true when the recipient resolves to a permitted customer.
 */
export function assessPraeRisk(input: {
  inboundText: string;
  draftBody: string;
  draftSubject: string;
  recipient: string;
  recipientKnown: boolean;
  fromLocked: boolean;
  aiUsed: boolean;
}): PraeRiskFlag[] {
  const flags: PraeRiskFlag[] = [];
  const haystack = `${input.inboundText}\n${input.draftSubject}\n${input.draftBody}`;

  if (FINANCIAL.test(haystack)) {
    flags.push({ id: 'financial_content', label: 'Mentions banking or payment details', severity: 'critical' });
  }
  if (SENSITIVE_PII.test(haystack)) {
    flags.push({ id: 'sensitive_personal', label: 'Mentions sensitive personal or payroll information', severity: 'critical' });
  }
  if (LEGAL.test(haystack)) {
    flags.push({ id: 'legal_content', label: 'Mentions legal or insurance matters — review carefully', severity: 'warning' });
  }
  if (ATTACHMENT_HINT.test(haystack)) {
    flags.push({ id: 'attachment_reference', label: 'References an attachment (attachments are disabled)', severity: 'warning' });
  }
  if (URL_HINT.test(input.draftBody)) {
    flags.push({ id: 'outbound_link', label: 'Reply contains a link', severity: 'warning' });
  }
  if (!input.recipientKnown) {
    flags.push({ id: 'unknown_recipient', label: 'Recipient does not match a known customer record', severity: 'warning' });
  }
  if (!input.fromLocked) {
    flags.push({ id: 'sender_not_locked', label: 'Sender address is not the authorised pilot mailbox', severity: 'critical' });
  }
  flags.push({
    id: input.aiUsed ? 'ai_used' : 'ai_not_used',
    label: input.aiUsed ? 'AI was used to prepare this draft' : 'No AI was used — rule-based draft',
    severity: 'info',
  });
  return flags;
}

export function hasCriticalRisk(flags: readonly PraeRiskFlag[]): boolean {
  return flags.some((f) => f.severity === 'critical');
}

/** Genuine Prae working states shown in the interface. */
export type PraeLiveState =
  | 'idle'
  | 'reviewing'
  | 'thinking'
  | 'preparing_draft'
  | 'waiting_for_approval'
  | 'approved'
  | 'sending'
  | 'complete'
  | 'needs_attention';

export const PRAE_LIVE_STATE_LABEL: Record<PraeLiveState, string> = {
  idle: 'Idle',
  reviewing: 'Reviewing',
  thinking: 'Thinking',
  preparing_draft: 'Preparing draft',
  waiting_for_approval: 'Waiting for approval',
  approved: 'Approved',
  sending: 'Sending',
  complete: 'Complete',
  needs_attention: 'Failed / needs attention',
};

/** Derives the visible state from the real approval + execution records. */
export function derivePraeLiveState(input: {
  hasSelection: boolean;
  hasDraft: boolean;
  approvalState?: string | null;
  executionState?: string | null;
  busy?: 'reviewing' | 'thinking' | null;
  lastError?: boolean;
}): PraeLiveState {
  if (input.lastError) return 'needs_attention';
  if (input.executionState === 'failed') return 'needs_attention';
  if (input.executionState === 'complete') return 'complete';
  if (input.executionState === 'executing') return 'sending';
  if (input.approvalState === 'rejected' || input.approvalState === 'invalidated') return 'needs_attention';
  if (input.approvalState === 'approved') return 'approved';
  if (input.approvalState === 'pending') return 'waiting_for_approval';
  if (input.busy) return input.busy;
  if (input.hasDraft) return 'preparing_draft';
  if (input.hasSelection) return 'reviewing';
  return 'idle';
}
