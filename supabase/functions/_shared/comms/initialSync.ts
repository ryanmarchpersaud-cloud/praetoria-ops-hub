// Phase 1C — safe initial synchronisation rules.
// A mailbox never silently imports its complete history.

export type SyncStartMode = "future_only" | "approved_backfill";

export type MailboxSyncConfig = {
  environment: "staging" | "production";
  syncStartMode: SyncStartMode;
  baselineUid: number | null;
  backfillApprovedBy: string | null;
  backfillApprovedAt: string | null;
  backfillFromUid: number | null;
  backfillToUid: number | null;
  backfillFromDate: string | null;
  backfillToDate: string | null;
};

/** Every production mailbox starts here. */
export function defaultSyncConfig(environment: "staging" | "production"): MailboxSyncConfig {
  return {
    environment,
    syncStartMode: "future_only",
    baselineUid: null,
    backfillApprovedBy: null,
    backfillApprovedAt: null,
    backfillFromUid: null,
    backfillToUid: null,
    backfillFromDate: null,
    backfillToDate: null,
  };
}

/** The baseline is the mailbox's current highest UID; nothing at or below it is imported. */
export function establishBaseline(uidNext: number, existingBaseline: number | null): number {
  if (existingBaseline !== null && existingBaseline > 0) return existingBaseline;
  return Math.max(0, Math.floor(uidNext) - 1);
}

export type SyncPlan =
  | { mode: "future_only"; searchCommand: string; fromUid: number; note: string }
  | { mode: "approved_backfill"; searchCommand: string; note: string }
  | { mode: "blocked"; reason: string };

/** Build the IMAP search for a run. Read-only; callers use EXAMINE + BODY.PEEK. */
export function planInitialSync(cfg: MailboxSyncConfig, uidNext: number): SyncPlan {
  if (cfg.syncStartMode === "future_only") {
    const baseline = establishBaseline(uidNext, cfg.baselineUid);
    return {
      mode: "future_only",
      fromUid: baseline + 1,
      searchCommand: `UID SEARCH UID ${baseline + 1}:*`,
      note: `Baseline UID ${baseline}. Only mail arriving after this point is imported.`,
    };
  }

  if (!cfg.backfillApprovedBy || !cfg.backfillApprovedAt) {
    return { mode: "blocked", reason: "backfill_requires_owner_approval" };
  }

  if (cfg.backfillFromUid !== null && cfg.backfillToUid !== null) {
    if (cfg.backfillToUid < cfg.backfillFromUid) return { mode: "blocked", reason: "invalid_uid_range" };
    return {
      mode: "approved_backfill",
      searchCommand: `UID SEARCH UID ${cfg.backfillFromUid}:${cfg.backfillToUid}`,
      note: `Approved UID range ${cfg.backfillFromUid}-${cfg.backfillToUid}.`,
    };
  }

  if (cfg.backfillFromDate && cfg.backfillToDate) {
    const since = imapDate(cfg.backfillFromDate);
    const before = imapDate(cfg.backfillToDate);
    if (!since || !before) return { mode: "blocked", reason: "invalid_date_range" };
    return {
      mode: "approved_backfill",
      searchCommand: `UID SEARCH SINCE ${since} BEFORE ${before}`,
      note: `Approved date range ${since} to ${before}.`,
    };
  }

  return { mode: "blocked", reason: "backfill_range_missing" };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** RFC 3501 date literal, e.g. 01-Sep-2026. */
export function imapDate(iso: string): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${String(d.getUTCDate()).padStart(2, "0")}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

export type BackfillProposal = {
  mailbox: string;
  mode: SyncStartMode;
  baselineUid: number | null;
  range: string;
  estimatedMessageCount: number;
  requiresOwnerApproval: boolean;
  approved: boolean;
  willImport: boolean;
};

/**
 * The proposal shown to an administrator BEFORE any backfill runs.
 * `willImport` is false until an owner approval is recorded.
 */
export function buildBackfillProposal(
  mailboxAddress: string,
  cfg: MailboxSyncConfig,
  matchedUids: number[],
): BackfillProposal {
  const approved = !!(cfg.backfillApprovedBy && cfg.backfillApprovedAt);
  const range = cfg.backfillFromUid !== null && cfg.backfillToUid !== null
    ? `UID ${cfg.backfillFromUid}-${cfg.backfillToUid}`
    : cfg.backfillFromDate && cfg.backfillToDate
    ? `${cfg.backfillFromDate} to ${cfg.backfillToDate}`
    : "not specified";
  return {
    mailbox: mailboxAddress,
    mode: cfg.syncStartMode,
    baselineUid: cfg.baselineUid,
    range,
    estimatedMessageCount: matchedUids.length,
    requiresOwnerApproval: true,
    approved,
    willImport: approved && cfg.syncStartMode === "approved_backfill" && range !== "not specified",
  };
}
