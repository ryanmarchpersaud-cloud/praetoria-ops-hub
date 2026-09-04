// Production pilot boundary tests: mailbox selection, credential resolution,
// recipient policy, scheduler auth and the non-AI composition helpers.
import { describe, it, expect } from 'vitest';
import {
  credentialEnvNames,
  recipientPolicy,
  schedulerSecretMatches,
  selectTargetMailbox,
  type MailboxRow,
} from '../../supabase/functions/_shared/comms/mailboxTarget.ts';
import { validateRecipientForPolicy } from '../../supabase/functions/comms-smtp-send/core.ts';
import { authorizeSchedulerRequest } from '../../supabase/functions/comms-imap-poll/core.ts';
import {
  buildEmailBinding,
  buildReplyDraft,
  praeExecutionStatus,
  summarizeThread,
} from '@/lib/praeCompose';

const mb = (over: Partial<MailboxRow>): MailboxRow => ({
  id: 'm1',
  email_address: 'x@praetoriagroup.ca',
  environment: 'staging',
  division: 'staging',
  credential_secret_prefix: 'IONOS_STAGING_EMAIL',
  is_active: true,
  inbound_enabled: true,
  outbound_enabled: true,
  emergency_paused: false,
  ...over,
});

describe('mailbox selection', () => {
  const staging = mb({ id: 's' });
  const prod = mb({
    id: 'p',
    environment: 'production',
    division: 'administration',
    email_address: 'admin@praetoriagroup.ca',
    credential_secret_prefix: 'IONOS_PROD_ADMIN_EMAIL',
  });

  it('uses staging while the production pilot is off', () => {
    const r = selectTargetMailbox([staging, prod], false);
    expect(r).toMatchObject({ ok: true, environment: 'staging' });
  });

  it('uses the production mailbox when the pilot is on', () => {
    const r = selectTargetMailbox([staging, prod], true);
    expect(r).toMatchObject({ ok: true, environment: 'production' });
    expect(r.ok && r.mailbox.id).toBe('p');
  });

  it('never falls back from production to staging', () => {
    const r = selectTargetMailbox([staging], true);
    expect(r).toEqual({ ok: false, reason: 'no_active_production_mailbox' });
  });

  it('refuses ambiguous production configuration', () => {
    const r = selectTargetMailbox([prod, { ...prod, id: 'p2' }], true);
    expect(r).toEqual({ ok: false, reason: 'multiple_active_production_mailboxes' });
  });

  it('honours the per-mailbox emergency pause', () => {
    const r = selectTargetMailbox([{ ...prod, emergency_paused: true }], true);
    expect(r).toEqual({ ok: false, reason: 'mailbox_emergency_paused' });
  });

  it('ignores inactive mailboxes', () => {
    const r = selectTargetMailbox([{ ...prod, is_active: false }], true);
    expect(r.ok).toBe(false);
  });
});

describe('credential resolution', () => {
  it('derives env var names from the secret-name reference only', () => {
    expect(credentialEnvNames('IONOS_PROD_ADMIN_EMAIL')).toEqual({
      ok: true,
      userVar: 'IONOS_PROD_ADMIN_EMAIL_USER',
      passVar: 'IONOS_PROD_ADMIN_EMAIL_PASSWORD',
    });
  });

  it('rejects missing or malformed references', () => {
    for (const bad of [null, '', 'lower_case', 'A B', '../etc']) {
      expect(credentialEnvNames(bad as string)).toEqual({
        ok: false,
        reason: 'invalid_credential_reference',
      });
    }
  });
});

describe('recipient policy', () => {
  const settings = {
    staging_recipient_allowlist: ['admin@praetoriagroup.ca'],
    production_recipient_allowlist: [] as string[],
  };

  it('always enforces the staging allow-list', () => {
    const p = recipientPolicy('staging', settings);
    expect(p.enforceAllowlist).toBe(true);
    expect(validateRecipientForPolicy('someone@else.com', p).ok).toBe(false);
    expect(validateRecipientForPolicy('admin@praetoriagroup.ca', p).ok).toBe(true);
  });

  it('enforces a production allow-list when one is configured', () => {
    const p = recipientPolicy('production', {
      ...settings,
      production_recipient_allowlist: ['admin@praetoriagroup.ca'],
    });
    expect(p.enforceAllowlist).toBe(true);
    expect(validateRecipientForPolicy('customer@example.com', p).ok).toBe(false);
  });

  it('allows a single valid address when no production allow-list is set', () => {
    const p = recipientPolicy('production', settings);
    expect(validateRecipientForPolicy('customer@example.com', p)).toEqual({
      ok: true,
      address: 'customer@example.com',
    });
    expect(validateRecipientForPolicy('a@b.com, c@d.com', p).ok).toBe(false);
    expect(validateRecipientForPolicy('not-an-email', p).ok).toBe(false);
  });
});

describe('scheduler authorization', () => {
  const secret = 'a'.repeat(48);
  const other = 'b'.repeat(48);

  it('accepts either configured server-side secret', () => {
    expect(schedulerSecretMatches(secret, [secret, other])).toBe(true);
    expect(schedulerSecretMatches(other, [secret, other])).toBe(true);
  });

  it('fails closed with no configured secret or a wrong value', () => {
    expect(schedulerSecretMatches(secret, [])).toBe(false);
    expect(schedulerSecretMatches('c'.repeat(48), [secret])).toBe(false);
    expect(schedulerSecretMatches(null, [secret])).toBe(false);
  });

  it('authorizes the poller with the cron secret and rejects everything else', () => {
    expect(authorizeSchedulerRequest('POST', other, [secret, other])).toEqual({ ok: true });
    expect(authorizeSchedulerRequest('GET', other, [secret, other])).toMatchObject({ status: 405 });
    expect(authorizeSchedulerRequest('POST', 'nope', [secret, other])).toMatchObject({ status: 401 });
    expect(authorizeSchedulerRequest('POST', other, [])).toMatchObject({ status: 500 });
    expect(
      authorizeSchedulerRequest('POST', secret, [secret], secret),
    ).toMatchObject({ status: 500 });
  });
});

describe('non-AI composition', () => {
  const messages = [
    {
      id: '1',
      direction: 'inbound' as const,
      from_address: 'client@example.com',
      subject: 'Snow contract',
      body_text: 'Please confirm the seasonal start date.',
      sent_at: '2026-01-02T10:00:00Z',
    },
    {
      id: '2',
      direction: 'outbound' as const,
      from_address: 'admin@praetoriagroup.ca',
      subject: 'Re: Snow contract',
      body_text: 'Reviewing now.',
      sent_at: '2026-01-02T12:00:00Z',
    },
  ];

  it('summarizes without any AI call', () => {
    const s = summarizeThread(messages);
    expect(s.aiUsed).toBe(false);
    expect(s.headline).toContain('Snow contract');
    expect(s.bullets.length).toBeGreaterThan(2);
    expect(summarizeThread([]).bullets).toEqual([]);
  });

  it('builds a template reply that keeps a single Re: prefix', () => {
    expect(buildReplyDraft({ subject: 'Snow contract' }).subject).toBe('Re: Snow contract');
    expect(buildReplyDraft({ subject: 'Re: Snow contract' }).subject).toBe('Re: Snow contract');
    expect(buildReplyDraft({ senderName: 'Dana', subject: 'x' }).body).toContain('Hello Dana,');
  });

  it('builds a complete email binding and rejects invalid input', () => {
    const ok = buildEmailBinding({
      from: 'Admin@Praetoriagroup.ca',
      to: 'Client@Example.com',
      subject: ' Re: Snow contract ',
      body: 'Hello',
    });
    expect(ok).toEqual({
      ok: true,
      binding: {
        channel: 'email',
        from: 'admin@praetoriagroup.ca',
        to: ['client@example.com'],
        cc: [],
        subject: 'Re: Snow contract',
        body: 'Hello',
        attachments: [],
      },
    });
    expect(buildEmailBinding({ from: 'a@b.com', to: 'bad', subject: 's', body: 'b' }).ok).toBe(false);
    expect(buildEmailBinding({ from: 'a@b.com', to: 'c@d.com', subject: '', body: 'b' }).ok).toBe(false);
    expect(buildEmailBinding({ from: 'a@b.com', to: 'c@d.com', subject: 's', body: '  ' }).ok).toBe(false);
  });

  it('never includes a content hash in the binding the browser submits', () => {
    const r = buildEmailBinding({ from: 'a@b.com', to: 'c@d.com', subject: 's', body: 'b' });
    expect(r.ok && Object.keys(r.binding)).toEqual([
      'channel', 'from', 'to', 'cc', 'subject', 'body', 'attachments',
    ]);
  });

  it('maps approval and execution state to one operator status', () => {
    expect(praeExecutionStatus('pending', 'not_started')).toBe('waiting_for_approval');
    expect(praeExecutionStatus('approved', 'not_started')).toBe('approved');
    expect(praeExecutionStatus('approved', 'executing')).toBe('sending');
    expect(praeExecutionStatus('approved', 'complete')).toBe('complete');
    expect(praeExecutionStatus('approved', 'failed')).toBe('failed');
  });
});
