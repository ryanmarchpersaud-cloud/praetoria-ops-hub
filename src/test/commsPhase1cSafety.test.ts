import { describe, it, expect } from 'vitest';
import {
  evaluateAttachment,
  evaluateAttachmentSet,
  canDownloadAttachment,
  sanitizeFilename,
  storagePath,
  ATTACHMENT_BUCKET,
  ATTACHMENT_INVARIANTS,
  MAX_ATTACHMENT_BYTES,
  SIGNED_URL_TTL_SECONDS,
} from '../../supabase/functions/_shared/comms/attachments.ts';
import {
  appendDecision,
  appendOutcome,
  buildAppendCommand,
  buildDuplicateSearch,
  appendRetryDelaySeconds,
  MAX_APPEND_ATTEMPTS,
  parseSearchUids,
  parseAppendUid,

} from '../../supabase/functions/_shared/comms/sentFolder.ts';
import {
  planInitialSync,
  defaultSyncConfig,
  establishBaseline,
  buildBackfillProposal,
  imapDate,
  type MailboxSyncConfig,
} from '../../supabase/functions/_shared/comms/initialSync.ts';

/** Phase 1C — synthetic fixtures only. Nothing is uploaded, opened or sent. */

describe('attachment safety (feature disabled)', () => {
  it('blocks executables', () => {
    const d = evaluateAttachment({ filename: 'setup.exe', mimeType: 'application/octet-stream', sizeBytes: 100 });
    expect(d.allowed).toBe(false);
    expect((d as { reason: string }).reason).toContain('blocked_executable_extension');
  });

  it('blocks double-extension disguises', () => {
    const d = evaluateAttachment({ filename: 'invoice.pdf.js', mimeType: 'application/pdf', sizeBytes: 100 });
    expect(d.allowed).toBe(false);
  });

  it('blocks macro-enabled office documents', () => {
    const d = evaluateAttachment({ filename: 'budget.xlsm', mimeType: 'application/vnd.ms-excel', sizeBytes: 100 });
    expect(d.allowed).toBe(false);
  });

  it('blocks a disallowed MIME type', () => {
    const d = evaluateAttachment({ filename: 'archive.zip', mimeType: 'application/zip', sizeBytes: 100 });
    expect(d.allowed).toBe(false);
  });

  it('blocks an extension/MIME mismatch', () => {
    const d = evaluateAttachment({ filename: 'photo.png', mimeType: 'application/pdf', sizeBytes: 100 });
    expect((d as { reason: string }).reason).toBe('extension_mime_mismatch');
  });

  it('blocks oversize files', () => {
    const d = evaluateAttachment({ filename: 'big.pdf', mimeType: 'application/pdf', sizeBytes: MAX_ATTACHMENT_BYTES + 1 });
    expect((d as { reason: string }).reason).toBe('file_too_large');
  });

  it('accepts a safe PDF but never marks it clean', () => {
    const d = evaluateAttachment({ filename: 'quote.pdf', mimeType: 'application/pdf', sizeBytes: 2048 });
    expect(d.allowed).toBe(true);
    expect((d as { scanStatus: string }).scanStatus).toBe('pending');
  });

  it('rejects the whole set when the file count limit is exceeded', () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ filename: `f${i}.pdf`, mimeType: 'application/pdf', sizeBytes: 10 }));
    expect(evaluateAttachmentSet(many).accepted).toHaveLength(0);
  });

  it('rejects the whole set when total size is exceeded', () => {
    const heavy = Array.from({ length: 4 }, (_, i) => ({ filename: `f${i}.pdf`, mimeType: 'application/pdf', sizeBytes: 9 * 1024 * 1024 }));
    expect(evaluateAttachmentSet(heavy).accepted).toHaveLength(0);
  });

  it('sanitises path traversal in filenames', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
    expect(storagePath('mb', 'msg', 'att', '../evil.pdf')).toBe('mb/msg/att-evil.pdf');
  });

  it('uses a private bucket and short-lived links only', () => {
    expect(ATTACHMENT_BUCKET).toBe('comms-attachments');
    expect(SIGNED_URL_TTL_SECONDS).toBeLessThanOrEqual(300);
    expect(ATTACHMENT_INVARIANTS).toEqual({ autoOpen: false, inlinePreview: false, sendToAI: false, publicBucket: false });
  });

  it('denies download while the feature is disabled', () => {
    const d = canDownloadAttachment({ attachmentsEnabled: false, scanStatus: 'clean', requesterIsAdmin: true, requesterIsAssignedRep: false });
    expect(d).toEqual({ allowed: false, reason: 'attachments_disabled' });
  });

  it('denies download to users without message permission', () => {
    const d = canDownloadAttachment({ attachmentsEnabled: true, scanStatus: 'clean', requesterIsAdmin: false, requesterIsAssignedRep: false });
    expect(d).toEqual({ allowed: false, reason: 'not_permitted' });
  });

  it('denies download for pending and quarantined files', () => {
    expect(canDownloadAttachment({ attachmentsEnabled: true, scanStatus: 'pending', requesterIsAdmin: true, requesterIsAssignedRep: false }).allowed).toBe(false);
    expect(canDownloadAttachment({ attachmentsEnabled: true, scanStatus: 'quarantined', requesterIsAdmin: true, requesterIsAssignedRep: false }).allowed).toBe(false);
  });

  it('allows a scanned-clean file to an authorised user as a short-lived link', () => {
    const d = canDownloadAttachment({ attachmentsEnabled: true, scanStatus: 'clean', requesterIsAdmin: false, requesterIsAssignedRep: true });
    expect(d).toEqual({ allowed: true, ttlSeconds: SIGNED_URL_TTL_SECONDS });
  });
});

describe('sent-folder consistency', () => {
  const verified = { name: 'Sent Items', source: 'special_use' as const, verifiedAt: '2026-09-03T00:00:00Z' };
  const base = { sendState: 'sent' as const, sentCopyEnabled: true, messageIdHeader: '<a@b>', existsInSentFolder: false, attempts: 0, sentFolder: verified };

  it('never appends before SMTP acceptance', () => {
    expect(appendDecision({ ...base, sendState: 'sending' })).toEqual({ action: 'skip', status: 'not_attempted', reason: 'smtp_not_accepted' });
    expect(appendDecision({ ...base, sendState: 'failed' }).action).toBe('skip');
  });

  it('stays inert while the feature is disabled', () => {
    expect(appendDecision({ ...base, sentCopyEnabled: false }).reason).toBe('sent_copy_disabled');
  });

  it('deduplicates by Message-ID', () => {
    expect(appendDecision({ ...base, existsInSentFolder: true })).toEqual({ action: 'skip', status: 'skipped_duplicate', reason: 'duplicate_message_id' });
  });

  it('appends after acceptance when enabled and not duplicated', () => {
    expect(appendDecision(base)).toEqual({ action: 'append', reason: 'accepted' });
  });

  it('marks sent_copy_pending and retries the append only — never the email', () => {
    const out = appendOutcome(false, 1);
    expect(out.sent_copy_status).toBe('sent_copy_pending');
    expect(out.retry_append_only).toBe(true);
    expect(out.resend_email).toBe(false);
  });

  it('gives up on the append after the attempt cap, still without resending', () => {
    const out = appendOutcome(false, MAX_APPEND_ATTEMPTS);
    expect(out.sent_copy_status).toBe('failed');
    expect(out.resend_email).toBe(false);
    expect(appendDecision({ ...base, attempts: MAX_APPEND_ATTEMPTS }).action).toBe('skip');
  });

  it('builds safe IMAP commands against the verified folder', () => {
    expect(buildAppendCommand(verified, 'Subject: x\r\n\r\nbody')).toBe('APPEND "Sent Items" (\\Seen) {18}');
    expect(buildDuplicateSearch(verified, '<id@x>\r\nDELETE')).not.toContain('\r\n');
  });

  it('backs off between append retries', () => {
    expect(appendRetryDelaySeconds(1)).toBe(30);
    expect(appendRetryDelaySeconds(4)).toBe(240);
    expect(appendRetryDelaySeconds(20)).toBe(3600);
  });
});

describe('initial synchronisation safeguards', () => {
  it('defaults every mailbox — production included — to future_only', () => {
    expect(defaultSyncConfig('production').syncStartMode).toBe('future_only');
    expect(defaultSyncConfig('staging').syncStartMode).toBe('future_only');
  });

  it('establishes a baseline at the current highest UID', () => {
    expect(establishBaseline(501, null)).toBe(500);
    expect(establishBaseline(900, 500)).toBe(500);
  });

  it('imports only mail arriving after the baseline', () => {
    const plan = planInitialSync(defaultSyncConfig('production'), 4001);
    expect(plan.mode).toBe('future_only');
    expect((plan as { searchCommand: string }).searchCommand).toBe('UID SEARCH UID 4001:*');
  });

  it('blocks a backfill without owner approval', () => {
    const cfg: MailboxSyncConfig = { ...defaultSyncConfig('production'), syncStartMode: 'approved_backfill', backfillFromUid: 1, backfillToUid: 50 };
    expect(planInitialSync(cfg, 4001)).toEqual({ mode: 'blocked', reason: 'backfill_requires_owner_approval' });
  });

  it('blocks an approved backfill with no range (never imports full history)', () => {
    const cfg: MailboxSyncConfig = {
      ...defaultSyncConfig('production'),
      syncStartMode: 'approved_backfill',
      backfillApprovedBy: 'owner-uuid',
      backfillApprovedAt: '2026-09-03T00:00:00Z',
    };
    expect(planInitialSync(cfg, 4001)).toEqual({ mode: 'blocked', reason: 'backfill_range_missing' });
  });

  it('runs an approved UID-range backfill', () => {
    const cfg: MailboxSyncConfig = {
      ...defaultSyncConfig('production'),
      syncStartMode: 'approved_backfill',
      backfillApprovedBy: 'owner-uuid',
      backfillApprovedAt: '2026-09-03T00:00:00Z',
      backfillFromUid: 100,
      backfillToUid: 150,
    };
    expect((planInitialSync(cfg, 4001) as { searchCommand: string }).searchCommand).toBe('UID SEARCH UID 100:150');
  });

  it('runs an approved date-range backfill', () => {
    const cfg: MailboxSyncConfig = {
      ...defaultSyncConfig('production'),
      syncStartMode: 'approved_backfill',
      backfillApprovedBy: 'owner-uuid',
      backfillApprovedAt: '2026-09-03T00:00:00Z',
      backfillFromDate: '2026-08-01T00:00:00Z',
      backfillToDate: '2026-09-01T00:00:00Z',
    };
    expect((planInitialSync(cfg, 4001) as { searchCommand: string }).searchCommand).toBe('UID SEARCH SINCE 01-Aug-2026 BEFORE 01-Sep-2026');
    expect(imapDate('not-a-date')).toBeNull();
  });

  it('shows a proposal with an estimated count before any backfill', () => {
    const cfg: MailboxSyncConfig = {
      ...defaultSyncConfig('production'),
      syncStartMode: 'approved_backfill',
      backfillFromUid: 100,
      backfillToUid: 150,
    };
    const proposal = buildBackfillProposal('ops@example.com', cfg, [100, 101, 102]);
    expect(proposal.estimatedMessageCount).toBe(3);
    expect(proposal.requiresOwnerApproval).toBe(true);
    expect(proposal.approved).toBe(false);
    expect(proposal.willImport).toBe(false);
  });
});

describe("Phase 1C sent-copy IMAP response parsing", () => {
  it("parses UIDs from a SEARCH response", () => {
    expect(parseSearchUids("* SEARCH 12 44 99\r\na1 OK SEARCH completed\r\n")).toEqual([12, 44, 99]);
  });

  it("returns no UIDs for an empty SEARCH result", () => {
    expect(parseSearchUids("* SEARCH\r\na1 OK SEARCH completed\r\n")).toEqual([]);
  });

  it("de-duplicates repeated UIDs", () => {
    expect(parseSearchUids("* SEARCH 7 7\r\na1 OK\r\n")).toEqual([7]);
  });

  it("parses APPENDUID from a tagged OK", () => {
    expect(parseAppendUid("a3 OK [APPENDUID 1568901234 4711] APPEND completed\r\n"))
      .toEqual({ uidValidity: 1568901234, uid: 4711 });
  });

  it("returns null when the server omits APPENDUID", () => {
    expect(parseAppendUid("a3 OK APPEND completed\r\n")).toBeNull();
  });
});

// ---------------------------------------------------------------- Phase 1D
import {
  resolveSentCopyStatus,
  isTerminalSentCopyStatus,
} from '../../supabase/functions/_shared/comms/sentFolder.ts';
import { PRAE_ACTIONS, PRAE_STATUS_LABEL } from '@/components/prae/praeDemoData';

describe('Phase 1D — sent-copy status integrity', () => {
  it('keeps appended as the final status when a retry finds a duplicate', () => {
    const r = resolveSentCopyStatus('appended', 'skipped_duplicate');
    expect(r.status).toBe('appended');
    expect(r.retryOutcome).toBe('skipped_duplicate');
    expect(r.preserved).toBe(true);
  });

  it('keeps appended even if a later attempt errors', () => {
    expect(resolveSentCopyStatus('appended', 'sent_copy_pending').status).toBe('appended');
    expect(resolveSentCopyStatus('appended', 'failed').status).toBe('appended');
  });

  it('records skipped_duplicate as the status when nothing was appended yet', () => {
    const r = resolveSentCopyStatus('not_attempted', 'skipped_duplicate');
    expect(r.status).toBe('skipped_duplicate');
    expect(r.preserved).toBe(false);
  });

  it('treats only appended as terminal', () => {
    expect(isTerminalSentCopyStatus('appended')).toBe(true);
    expect(isTerminalSentCopyStatus('skipped_duplicate')).toBe(false);
    expect(isTerminalSentCopyStatus(null)).toBe(false);
  });
});

describe('Phase 1D — Prae interface shell', () => {
  it('exposes the five action cards, all disabled', () => {
    expect(PRAE_ACTIONS.map((a) => a.id)).toEqual([
      'summarize_thread', 'draft_reply', 'find_customer', 'prepare_follow_up', 'review_required',
    ]);
    expect(PRAE_ACTIONS.every((a) => a.enabled === false)).toBe(true);
  });

  it('requires explicit approval for every acting card and shows the exact proposal', () => {
    for (const id of ['draft_reply', 'prepare_follow_up', 'review_required']) {
      const a = PRAE_ACTIONS.find((x) => x.id === id)!;
      expect(a.demo.approvalRequired).toBe(true);
      expect(a.demo.lines.length).toBeGreaterThan(0);
    }
  });

  it('uses synthetic demo content only', () => {
    const blob = JSON.stringify(PRAE_ACTIONS);
    expect(blob).not.toMatch(/praetoriagroup\.ca/);
    expect(blob).toMatch(/example\.com/);
  });

  it('defines all six status indicators', () => {
    expect(Object.values(PRAE_STATUS_LABEL)).toEqual([
      'Idle', 'Listening', 'Thinking', 'Preparing Draft', 'Waiting for Approval', 'Complete',
    ]);
  });
});
