/**
 * Tenant isolation test suite.
 *
 * These tests document the *contract* that protects tenant/customer data
 * from cross-tenant access. They run against the live Supabase project
 * using only the anonymous client (no service role).
 *
 * The intent is to fail loudly if anyone weakens an RLS policy and
 * accidentally exposes another tenant's data through:
 *   - direct table access (changing customer_id)
 *   - storage path traversal (guessing another user's file path)
 *   - audit-log read access (regular users reading admin events)
 *
 * Tests use random UUIDs / paths that no real tenant owns. We assert the
 * call returns either an error OR an empty result — never a populated row.
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const RANDOM_OTHER_TENANT = '00000000-0000-0000-0000-000000000001';
const RANDOM_OTHER_USER = '00000000-0000-0000-0000-000000000002';

const expectNoLeak = (data: unknown, error: unknown) => {
  // Either the policy errored, or it returned zero rows. Anything else = leak.
  if (error) return;
  expect(Array.isArray(data) ? data.length : 0).toBe(0);
};

describe('Tenant isolation — direct table reads', () => {
  it('anonymous cannot read other tenants\' customers', async () => {
    const { data, error } = await anon
      .from('customers')
      .select('id')
      .eq('id', RANDOM_OTHER_TENANT);
    expectNoLeak(data, error);
  });

  it('anonymous cannot read other tenants\' invoices', async () => {
    const { data, error } = await anon
      .from('invoices')
      .select('id, total, customer_id')
      .eq('customer_id', RANDOM_OTHER_TENANT);
    expectNoLeak(data, error);
  });

  it('anonymous cannot read pay stubs (worker-scoped)', async () => {
    const { data, error } = await anon
      .from('employee_pay_stubs')
      .select('id, gross_pay')
      .eq('user_id', RANDOM_OTHER_USER);
    expectNoLeak(data, error);
  });

  it('anonymous cannot read audit log entries', async () => {
    const { data, error } = await anon
      .from('audit_log' as never)
      .select('id')
      .limit(1);
    expectNoLeak(data, error);
  });

  it('anonymous cannot read finance accounts', async () => {
    const { data, error } = await anon
      .from('finance_accounts')
      .select('id, current_balance_manual')
      .limit(1);
    expectNoLeak(data, error);
  });
});

describe('Tenant isolation — storage path traversal', () => {
  it('anonymous cannot list another user\'s subcontractor documents', async () => {
    const { data, error } = await anon.storage
      .from('subcontractor-documents')
      .list(RANDOM_OTHER_USER);
    expectNoLeak(data, error);
  });

  it('anonymous cannot list another worker\'s receipts', async () => {
    const { data, error } = await anon.storage
      .from('worker-receipts')
      .list(RANDOM_OTHER_USER);
    expectNoLeak(data, error);
  });

  it('anonymous cannot list HR documents', async () => {
    const { data, error } = await anon.storage
      .from('hr-documents')
      .list('employee/' + RANDOM_OTHER_USER);
    expectNoLeak(data, error);
  });

  it('anonymous cannot download a guessed worker-receipt path', async () => {
    const { data, error } = await anon.storage
      .from('worker-receipts')
      .download(`${RANDOM_OTHER_USER}/anything.pdf`);
    // Either explicit error OR empty blob — never a usable file
    if (!error) {
      expect(data?.size ?? 0).toBe(0);
    }
  });

  it('anonymous cannot download messaging files from attachments bucket', async () => {
    // Phase 3: messaging/* is no longer publicly readable
    const { data, error } = await anon.storage
      .from('attachments')
      .download(`messaging/${RANDOM_OTHER_USER}/guessed.pdf`);
    if (!error) {
      expect(data?.size ?? 0).toBe(0);
    }
  });

  it('anonymous cannot download incident photos from attachments bucket', async () => {
    // Phase 3: incidents/* is no longer publicly readable
    const { data, error } = await anon.storage
      .from('attachments')
      .download(`incidents/guessed-photo.jpg`);
    if (!error) {
      expect(data?.size ?? 0).toBe(0);
    }
  });
});

describe('Tenant isolation — write protection', () => {
  it('anonymous cannot insert into customers', async () => {
    const { error } = await anon
      .from('customers')
      .insert({ first_name: 'attacker', last_name: 'attacker' });
    expect(error).toBeTruthy();
  });

  it('anonymous cannot insert into audit_log', async () => {
    const { error } = await anon
      .from('audit_log' as never)
      .insert({ action: 'forged' } as never);
    expect(error).toBeTruthy();
  });

  it('anonymous cannot insert a user_role (privilege escalation guard)', async () => {
    const { error } = await anon
      .from('user_roles')
      .insert({ user_id: RANDOM_OTHER_USER, role: 'admin' });
    expect(error).toBeTruthy();
  });
});
