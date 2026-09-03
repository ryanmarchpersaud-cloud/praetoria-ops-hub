/**
 * Phase 1A — Communications Hub isolation contract.
 *
 * Proves that an unauthenticated / unauthorized caller cannot read another
 * division's or representative's correspondence, mailbox configuration,
 * sync state, settings or audit history — and cannot write to any of it.
 *
 * Runs against the live project with the anonymous client only.
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const OTHER_USER = '00000000-0000-0000-0000-000000000042';

const expectNoLeak = (data: unknown, error: unknown) => {
  if (error) return;
  expect(Array.isArray(data) ? data.length : 0).toBe(0);
};

describe('Communications Hub — read isolation', () => {
  it('cannot read imported messages', async () => {
    const { data, error } = await anon.from('comms_messages' as never).select('id').limit(5);
    expectNoLeak(data, error);
  });

  it('cannot read another representative\'s messages by filtering on their user id', async () => {
    const { data, error } = await anon
      .from('comms_messages' as never)
      .select('id, subject, body_text')
      .eq('assigned_rep_user_id', OTHER_USER);
    expectNoLeak(data, error);
  });

  it('cannot read another division\'s messages', async () => {
    const { data, error } = await anon
      .from('comms_messages' as never)
      .select('id, subject')
      .eq('division', 'staging');
    expectNoLeak(data, error);
  });

  it('cannot read mailbox configuration', async () => {
    const { data, error } = await anon.from('comms_mailboxes' as never).select('id, email_address').limit(5);
    expectNoLeak(data, error);
  });

  it('cannot read sync state', async () => {
    const { data, error } = await anon.from('comms_sync_state' as never).select('mailbox_id').limit(5);
    expectNoLeak(data, error);
  });

  it('cannot read communication settings', async () => {
    const { data, error } = await anon.from('comms_settings' as never).select('polling_enabled').limit(1);
    expectNoLeak(data, error);
  });

  it('cannot read the communications audit log', async () => {
    const { data, error } = await anon.from('comms_audit_log' as never).select('id').limit(5);
    expectNoLeak(data, error);
  });
});

describe('Communications Hub — write protection', () => {
  it('cannot insert a forged message', async () => {
    const { error } = await anon
      .from('comms_messages' as never)
      .insert({ mailbox_id: OTHER_USER, imap_uid: 1, subject: 'forged' } as never);
    expect(error).toBeTruthy();
  });

  it('cannot register a mailbox', async () => {
    const { error } = await anon
      .from('comms_mailboxes' as never)
      .insert({ label: 'rogue', email_address: 'x@y.z', credential_secret_prefix: 'X' } as never);
    expect(error).toBeTruthy();
  });

  it('cannot flip the global polling switch', async () => {
    const { data, error } = await anon
      .from('comms_settings' as never)
      .update({ polling_enabled: true } as never)
      .eq('id', true)
      .select();
    // Either rejected outright, or silently affected zero rows — never a change.
    if (!error) {
      expect(Array.isArray(data) ? data.length : 0).toBe(0);
    }
  });


  it('cannot forge an audit record', async () => {
    const { error } = await anon
      .from('comms_audit_log' as never)
      .insert({ event: 'forged' } as never);
    expect(error).toBeTruthy();
  });
});
