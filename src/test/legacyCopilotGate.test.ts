import { describe, it, expect } from 'vitest';
import { isLegacyChatCopilotEnabled } from '../../supabase/functions/chat-copilot/legacyGate.ts';
import fn from '../../supabase/functions/chat-copilot/index.ts?raw';
import gate from '../../supabase/functions/chat-copilot/legacyGate.ts?raw';
import layout from '../components/AppLayout.tsx?raw';

describe('Phase 1D.2 — legacy co-pilot gate logic (Fail-Closed)', () => {
  it('enables ONLY on exact string "true"', () => {
    expect(isLegacyChatCopilotEnabled('true')).toBe(true);
  });

  it('fails-closed on missing, false, or malformed values', () => {
    expect(isLegacyChatCopilotEnabled(undefined)).toBe(false);
    expect(isLegacyChatCopilotEnabled(null)).toBe(false);
    expect(isLegacyChatCopilotEnabled('')).toBe(false);
    expect(isLegacyChatCopilotEnabled('false')).toBe(false);
    expect(isLegacyChatCopilotEnabled('1')).toBe(false);
    expect(isLegacyChatCopilotEnabled('TRUE')).toBe(false);
    expect(isLegacyChatCopilotEnabled('true ')).toBe(false);
  });
});

describe('Phase 1D.2 — legacy co-pilot gate reachability proof', () => {
  it('returns a neutral 403 message with no operational detail', () => {
    expect(gate).toContain('"Legacy AI Co-pilot disabled"');
    expect(gate).toContain('status: 403');
  });

  it('checks the gate after auth but before service-role client, queries and gateway', () => {
    const authIdx = fn.indexOf('const auth = await requireAuth(req)');
    const gateIdx = fn.indexOf('Deno.env.get("LEGACY_CHAT_COPILOT_ENABLED")');
    const clientIdx = fn.indexOf('createClient(');
    const contextIdx = fn.indexOf('getOperationalContext(supabase)');
    const gatewayIdx = fn.indexOf('ai.gateway.lovable.dev');
    const roleIdx = fn.indexOf('requireRole(auth');

    expect(authIdx).toBeGreaterThan(-1); // Auth check missing
    expect(gateIdx).toBeGreaterThan(authIdx); // Gate check must happen after auth

    // Proving the disabled path returns before sensitive work
    const returnIdx = fn.indexOf('if (disabledResponse) return disabledResponse;');
    expect(returnIdx).toBeGreaterThan(gateIdx);

    for (const idx of [clientIdx, contextIdx, gatewayIdx, roleIdx]) {
      // Every sensitive operation must appear after the gate's early return
      expect(idx).toBeGreaterThan(returnIdx);
    }
  });

  it('has exactly one gate check and no bypass fallback', () => {
    expect(fn.match(/Deno\.env\.get\("LEGACY_CHAT_COPILOT_ENABLED"\)/g)?.length).toBe(1);
    expect(fn).not.toMatch(/LEGACY_CHAT_COPILOT_ENABLED[^)]*\)\s*(\?\?|\|\|)/);
  });
});

describe('Phase 1D.2 — UI Proof', () => {
  it('AppLayout no longer imports or renders AICopilot', () => {
    expect(layout).not.toMatch(/import\s*\{\s*AICopilot/);
    expect(layout).not.toContain('<AICopilot');
  });

  it('AppLayout still renders the Prae launcher', () => {
    expect(layout).toContain('<PraeLauncher');
  });
});
