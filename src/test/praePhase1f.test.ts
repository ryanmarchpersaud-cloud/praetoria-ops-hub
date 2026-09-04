// Phase 1F — controlled pilot boundary tests: action allow-list, risk flags,
// live state derivation and the edit-invalidation rule.
import { describe, it, expect } from 'vitest';
import {
  assessPraeRisk,
  derivePraeLiveState,
  hasCriticalRisk,
  isPraeActionAllowed,
  PRAE_ALLOWED_ACTIONS,
} from '@/lib/praeRisk';
import { buildEmailBinding, buildReplyDraft, summarizeThread } from '@/lib/praeCompose';

describe('Prae action allow-list', () => {
  it('permits only email_reply', () => {
    expect(PRAE_ALLOWED_ACTIONS).toEqual(['email_reply']);
    expect(isPraeActionAllowed('email_reply')).toBe(true);
    for (const a of ['sms_reply', 'email_send', 'invoice_send', 'twilio_sms', '']) {
      expect(isPraeActionAllowed(a)).toBe(false);
    }
  });
});

describe('Prae risk flags', () => {
  const base = {
    inboundText: 'Hello, when is the next visit?',
    draftBody: 'We will confirm shortly.',
    draftSubject: 'Re: visit',
    recipient: 'someone@example.com',
    recipientKnown: true,
    fromLocked: true,
    aiUsed: false,
  };

  it('reports no critical risk for a benign reply', () => {
    const flags = assessPraeRisk(base);
    expect(hasCriticalRisk(flags)).toBe(false);
    expect(flags.some((f) => f.id === 'ai_not_used')).toBe(true);
  });

  it('flags banking and payroll content as critical', () => {
    expect(hasCriticalRisk(assessPraeRisk({ ...base, inboundText: 'here is my IBAN' }))).toBe(true);
    expect(hasCriticalRisk(assessPraeRisk({ ...base, draftBody: 'your pay stub is attached' }))).toBe(true);
  });

  it('flags an unlocked sender as critical and an unknown recipient as a warning', () => {
    const flags = assessPraeRisk({ ...base, fromLocked: false, recipientKnown: false });
    expect(flags.find((f) => f.id === 'sender_not_locked')?.severity).toBe('critical');
    expect(flags.find((f) => f.id === 'unknown_recipient')?.severity).toBe('warning');
  });
});

describe('Prae live state', () => {
  it('walks the real lifecycle', () => {
    expect(derivePraeLiveState({ hasSelection: false, hasDraft: false })).toBe('idle');
    expect(derivePraeLiveState({ hasSelection: true, hasDraft: false })).toBe('reviewing');
    expect(derivePraeLiveState({ hasSelection: true, hasDraft: false, busy: 'thinking' })).toBe('thinking');
    expect(derivePraeLiveState({ hasSelection: true, hasDraft: true })).toBe('preparing_draft');
    expect(derivePraeLiveState({ hasSelection: true, hasDraft: true, approvalState: 'pending' })).toBe('waiting_for_approval');
    expect(derivePraeLiveState({ hasSelection: true, hasDraft: true, approvalState: 'approved' })).toBe('approved');
    expect(derivePraeLiveState({ hasSelection: true, hasDraft: true, approvalState: 'approved', executionState: 'executing' })).toBe('sending');
    expect(derivePraeLiveState({ hasSelection: true, hasDraft: true, approvalState: 'approved', executionState: 'complete' })).toBe('complete');
    expect(derivePraeLiveState({ hasSelection: true, hasDraft: true, approvalState: 'approved', executionState: 'failed' })).toBe('needs_attention');
    expect(derivePraeLiveState({ hasSelection: true, hasDraft: true, approvalState: 'invalidated' })).toBe('needs_attention');
  });
});

describe('Prae binding is locked to the thread', () => {
  it('binds exactly one recipient, no cc and no attachments', () => {
    const built = buildEmailBinding({
      from: 'admin@praetoriagroup.ca',
      to: 'Customer@Example.com',
      subject: 'Re: test',
      body: 'Hello',
    });
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.binding).toEqual({
        channel: 'email',
        from: 'admin@praetoriagroup.ca',
        to: ['customer@example.com'],
        cc: [],
        subject: 'Re: test',
        body: 'Hello',
        attachments: [],
      });
    }
  });

  it('rejects an invalid recipient or empty body', () => {
    expect(buildEmailBinding({ from: 'a@b.ca', to: 'nope', subject: 's', body: 'b' }).ok).toBe(false);
    expect(buildEmailBinding({ from: 'a@b.ca', to: 'c@d.ca', subject: 's', body: '  ' }).ok).toBe(false);
  });

  it('produces a rule-based draft and summary with no AI', () => {
    expect(buildReplyDraft({ senderName: 'Ryan', subject: 'Question' }).subject).toBe('Re: Question');
    expect(summarizeThread([]).aiUsed).toBe(false);
  });
});
