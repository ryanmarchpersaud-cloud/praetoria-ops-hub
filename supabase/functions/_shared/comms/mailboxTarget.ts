// Production pilot mailbox selection (pure, testable, fail-closed).
//
// Rules:
//  * The production pilot is only ever used when comms_settings.production_pilot_enabled
//    is exactly true AND exactly one active production mailbox exists.
//  * Production NEVER silently falls back to staging and staging never runs while the
//    production pilot is enabled.
//  * Credentials are resolved from the mailbox's secret-name reference only; no password
//    is ever read from, or written to, a database row.

export type MailboxRow = {
  id: string;
  label?: string | null;
  email_address: string;
  environment: string;
  division: string | null;
  credential_secret_prefix: string | null;
  is_active: boolean;
  inbound_enabled: boolean;
  outbound_enabled: boolean;
  emergency_paused: boolean;
};

export type TargetResult<T> =
  | { ok: true; mailbox: T; environment: "staging" | "production" }
  | { ok: false; reason: string };

export function selectTargetMailbox<T extends MailboxRow>(
  mailboxes: readonly T[],
  productionPilotEnabled: boolean,
): TargetResult<T> {
  const active = mailboxes.filter((m) => m.is_active);
  if (productionPilotEnabled === true) {
    const prod = active.filter((m) => m.environment === "production");
    if (prod.length === 0) return { ok: false, reason: "no_active_production_mailbox" };
    if (prod.length > 1) return { ok: false, reason: "multiple_active_production_mailboxes" };
    if (prod[0].emergency_paused) return { ok: false, reason: "mailbox_emergency_paused" };
    return { ok: true, mailbox: prod[0], environment: "production" };
  }
  const staging = active.filter((m) => m.environment === "staging");
  if (staging.length === 0) return { ok: false, reason: "no_active_staging_mailbox" };
  if (staging[0].emergency_paused) return { ok: false, reason: "mailbox_emergency_paused" };
  return { ok: true, mailbox: staging[0], environment: "staging" };
}

const PREFIX_RE = /^[A-Z][A-Z0-9_]{3,60}$/;

export function credentialEnvNames(prefix: string | null | undefined):
  | { ok: true; userVar: string; passVar: string }
  | { ok: false; reason: string } {
  if (!prefix || !PREFIX_RE.test(prefix)) return { ok: false, reason: "invalid_credential_reference" };
  return { ok: true, userVar: `${prefix}_USER`, passVar: `${prefix}_PASSWORD` };
}

/** Recipient policy: staging is allow-list only; production may be restricted by an optional allow-list. */
export function recipientPolicy(
  environment: "staging" | "production",
  settings: { staging_recipient_allowlist?: string[] | null; production_recipient_allowlist?: string[] | null },
): { enforceAllowlist: boolean; allowlist: string[] } {
  if (environment === "staging") {
    return { enforceAllowlist: true, allowlist: settings.staging_recipient_allowlist ?? [] };
  }
  const list = settings.production_recipient_allowlist ?? [];
  return { enforceAllowlist: list.length > 0, allowlist: list };
}

/** The scheduler may authenticate with either configured server-side secret. */
export function schedulerSecretMatches(
  provided: string | null,
  configured: readonly (string | undefined | null)[],
): boolean {
  const valid = configured.filter((c): c is string => typeof c === "string" && c.length >= 16);
  if (valid.length === 0 || !provided) return false;
  let match = false;
  for (const c of valid) {
    if (provided.length !== c.length) continue;
    let diff = 0;
    for (let i = 0; i < c.length; i++) diff |= provided.charCodeAt(i) ^ c.charCodeAt(i);
    if (diff === 0) match = true;
  }
  return match;
}
