// Prae production connection — deterministic, NON-AI composition helpers.
//
// Nothing in this module contacts an AI gateway. Summaries are extractive and
// drafts are template-based, so real customer content never leaves the app
// while the AI privacy gate is unresolved.

export type PraeThreadMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  from_address: string | null;
  subject: string | null;
  body_text: string | null;
  sent_at: string | null;
};

const clean = (v: string | null | undefined) => (v ?? '').replace(/\s+/g, ' ').trim();

/** Extractive, rule-based thread summary. No model call. */
export function summarizeThread(messages: readonly PraeThreadMessage[]): {
  headline: string;
  bullets: string[];
  aiUsed: false;
} {
  if (messages.length === 0) {
    return { headline: 'No messages in this thread.', bullets: [], aiUsed: false };
  }
  const ordered = [...messages].sort(
    (a, b) => new Date(a.sent_at ?? 0).getTime() - new Date(b.sent_at ?? 0).getTime(),
  );
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const inbound = ordered.filter((m) => m.direction === 'inbound').length;

  const bullets: string[] = [
    `${ordered.length} message${ordered.length === 1 ? '' : 's'} (${inbound} received).`,
    `Subject: ${clean(first.subject) || '(no subject)'}`,
    `Latest from ${clean(last.from_address) || 'unknown sender'}${
      last.sent_at ? ` on ${new Date(last.sent_at).toLocaleString()}` : ''
    }.`,
  ];
  const lastText = clean(last.body_text);
  if (lastText) bullets.push(`Latest message opens: “${lastText.slice(0, 180)}”`);

  return {
    headline: `Thread summary — ${clean(first.subject) || '(no subject)'}`,
    bullets,
    aiUsed: false,
  };
}

/** Template-based reply draft. The operator edits it before any approval. */
export function buildReplyDraft(input: {
  senderName?: string | null;
  subject: string | null;
  signatureName?: string;
}): { subject: string; body: string } {
  const base = clean(input.subject) || '(no subject)';
  const subject = /^re:/i.test(base) ? base : `Re: ${base}`;
  const greeting = clean(input.senderName) ? `Hello ${clean(input.senderName)},` : 'Hello,';
  const body = [
    greeting,
    '',
    'Thank you for your message. We have received it and are reviewing the details.',
    'We will follow up shortly with next steps.',
    '',
    'Kind regards,',
    input.signatureName ?? 'Praetoria Group Administration',
  ].join('\n');
  return { subject, body };
}

export type EmailBinding = {
  channel: 'email';
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  attachments: never[];
};

/** Builds the exact content binding submitted for server-side hashing. */
export function buildEmailBinding(input: {
  from: string;
  to: string;
  subject: string;
  body: string;
}): { ok: true; binding: EmailBinding } | { ok: false; error: string } {
  const to = clean(input.to).toLowerCase();
  const from = clean(input.from).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: 'Invalid recipient address' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) return { ok: false, error: 'Invalid sender address' };
  const subject = clean(input.subject);
  if (!subject) return { ok: false, error: 'Subject is required' };
  const body = (input.body ?? '').trim();
  if (!body) return { ok: false, error: 'Message body is required' };
  return {
    ok: true,
    binding: { channel: 'email', from, to: [to], cc: [], subject, body, attachments: [] },
  };
}

export type PraeExecutionStatus =
  | 'waiting_for_approval'
  | 'approved'
  | 'sending'
  | 'complete'
  | 'failed';

/** Maps stored approval state + execution state to the single status shown to the operator. */
export function praeExecutionStatus(
  state: string | null | undefined,
  executionState: string | null | undefined,
): PraeExecutionStatus {
  if (executionState === 'complete') return 'complete';
  if (executionState === 'failed') return 'failed';
  if (executionState === 'executing') return 'sending';
  if (state === 'approved') return 'approved';
  return 'waiting_for_approval';
}
