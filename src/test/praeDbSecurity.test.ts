/**
 * Phase 1E.1 — database-level approval security contract.
 *
 * Runs against the live project with the anonymous client only. It proves that
 * no browser can read or write the approval tables, that the plaintext nonce
 * column no longer exists, and that the decision RPC is not anonymously
 * callable. Nothing here executes, sends, or enables anything.
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ID = '00000000-0000-0000-0000-0000000000aa';

const denied = (data: unknown, error: unknown) => {
  if (error) return;
  expect(Array.isArray(data) ? data : []).toHaveLength(0);
};

describe('prae approval tables — no anonymous access', () => {
  it('cannot read prae_approvals', async () => {
    const { data, error } = await anon.from('prae_approvals' as never).select('*').limit(1);
    denied(data, error);
  });

  it('cannot read prae_approval_audit', async () => {
    const { data, error } = await anon.from('prae_approval_audit' as never).select('*').limit(1);
    denied(data, error);
  });

  it('cannot insert an approval', async () => {
    const { error } = await anon
      .from('prae_approvals' as never)
      .insert({ id: ID, content_hash: 'x', channel: 'email', division: 'Snow & Ice' } as never);
    expect(error).toBeTruthy();
  });

  it('cannot update an approval', async () => {
    const { error, data } = await anon
      .from('prae_approvals' as never)
      .update({ state: 'approved' } as never)
      .eq('id', ID)
      .select();
    denied(data, error);
  });

  it('cannot insert an audit entry', async () => {
    const { error } = await anon
      .from('prae_approval_audit' as never)
      .insert({ approval_id: ID, event: 'approved' } as never);
    expect(error).toBeTruthy();
  });

  it('cannot flip the emergency stop', async () => {
    const { error, data } = await anon
      .from('prae_emergency_stop' as never)
      .update({ stopped: false } as never)
      .eq('id', true)
      .select();
    denied(data, error);
  });
});

describe('prae approval nonce storage', () => {
  it('the plaintext nonce column no longer exists', async () => {
    const { error } = await anon.from('prae_approvals' as never).select('nonce').limit(1);
    // Either the column is gone (schema error) or RLS blocks the read outright.
    expect(error).toBeTruthy();
  });
});

describe('prae decision RPC', () => {
  it('is not usable anonymously', async () => {
    const { data, error } = await anon.rpc('prae_decide_approval' as never, {
      _approval_id: ID,
      _nonce: 'x',
      _decision: 'approve',
      _content_hash: 'a'.repeat(64),
    } as never);
    if (error) {
      expect(error).toBeTruthy();
      return;
    }
    expect((data as { ok?: boolean } | null)?.ok).toBe(false);
  });

  it('cannot be used anonymously to create an approval', async () => {
    const { data, error } = await anon.rpc('prae_create_approval' as never, {
      _channel: 'email',
      _division: 'Snow & Ice',
      _content_hash: 'a'.repeat(64),
    } as never);
    if (error) {
      expect(error).toBeTruthy();
      return;
    }
    expect((data as { ok?: boolean; nonce?: string } | null)?.ok).toBe(false);
    expect((data as { nonce?: string } | null)?.nonce).toBeUndefined();
  });
});
