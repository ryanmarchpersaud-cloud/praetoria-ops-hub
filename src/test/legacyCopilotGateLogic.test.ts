import { describe, it, expect } from 'vitest';
import { isLegacyChatCopilotEnabled } from '../../supabase/functions/chat-copilot/legacyGate.ts';

describe('isLegacyChatCopilotEnabled - Fail-Closed Logic', () => {
  it('enables ONLY on exact string "true"', () => {
    expect(isLegacyChatCopilotEnabled('true')).toBe(true);
  });

  it('fails-closed on missing value (undefined)', () => {
    expect(isLegacyChatCopilotEnabled(undefined)).toBe(false);
  });

  it('fails-closed on null value', () => {
    expect(isLegacyChatCopilotEnabled(null)).toBe(false);
  });

  it('fails-closed on "false"', () => {
    expect(isLegacyChatCopilotEnabled('false')).toBe(false);
  });

  it('fails-closed on malformed values', () => {
    expect(isLegacyChatCopilotEnabled('')).toBe(false);
    expect(isLegacyChatCopilotEnabled('1')).toBe(false);
    expect(isLegacyChatCopilotEnabled('yes')).toBe(false);
    expect(isLegacyChatCopilotEnabled('TRUE')).toBe(false);
    expect(isLegacyChatCopilotEnabled('true ')).toBe(false);
    expect(isLegacyChatCopilotEnabled(' true')).toBe(false);
    expect(isLegacyChatCopilotEnabled('on')).toBe(false);
  });
});
