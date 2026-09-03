import { describe, it, expect } from 'vitest';
import fn from '../../supabase/functions/chat-copilot/index.ts?raw';
import layout from '../components/AppLayout.tsx?raw';

describe('Phase 1D.2 — legacy co-pilot gate is fail-closed', () => {
  it('returns a neutral 403 message with no operational detail', () => {
    expect(fn).toContain('"Legacy AI Co-pilot disabled"');
    expect(fn).toContain('status: 403');
  });

  it('checks the gate after auth but before service-role client, queries and gateway', () => {
    const authIdx = fn.indexOf('const auth = await requireAuth(req)');
    const gateIdx = fn.indexOf('Deno.env.get("LEGACY_CHAT_COPILOT_ENABLED")');
    const clientIdx = fn.indexOf('createClient(');
    const contextIdx = fn.indexOf('getOperationalContext(supabase)');
    const gatewayIdx = fn.indexOf('ai.gateway.lovable.dev');
    const roleIdx = fn.indexOf('requireRole(auth');
    const keyIdx = fn.indexOf('Deno.env.get("LOVABLE_API_KEY")');

    expect(authIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeGreaterThan(authIdx);
    for (const idx of [clientIdx, contextIdx, gatewayIdx, roleIdx, keyIdx]) {
      expect(idx).toBeGreaterThan(gateIdx);
    }
  });

  it('has exactly one gate check and no bypass fallback', () => {
    expect(fn.match(/Deno\.env\.get\("LEGACY_CHAT_COPILOT_ENABLED"\)/g)?.length).toBe(1);
    expect(fn).not.toMatch(/LEGACY_CHAT_COPILOT_ENABLED[^)]*\)\s*(\?\?|\|\|)/);
  });
});

describe('Phase 1D.2 — Prae is the only assistant launcher', () => {
  it('AppLayout no longer imports or renders AICopilot', () => {
    expect(layout).not.toMatch(/import\s*\{\s*AICopilot/);
    expect(layout).not.toContain('<AICopilot');
  });

  it('AppLayout still renders the Prae launcher', () => {
    expect(layout).toContain('<PraeLauncher');
  });
});
