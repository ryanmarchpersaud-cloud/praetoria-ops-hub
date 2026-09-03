// Phase 1C — attachment safety foundation. BUILT BUT DISABLED.
// Nothing in this module writes storage or opens a file; it only decides
// whether an attachment would ever be allowed, and under which constraints.

export const ATTACHMENT_BUCKET = "comms-attachments"; // private bucket, no public policies
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB per file
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;
export const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
export const SIGNED_URL_TTL_SECONDS = 120; // short-lived download access

/** Executable / active-content extensions that are always blocked. */
export const BLOCKED_EXTENSIONS = [
  "exe", "com", "scr", "pif", "bat", "cmd", "msi", "msp", "cpl", "dll", "sys",
  "js", "jse", "vbs", "vbe", "wsf", "wsh", "ps1", "psm1", "sh", "bash", "jar",
  "app", "apk", "dmg", "pkg", "deb", "rpm", "lnk", "reg", "hta", "chm", "iso",
  "docm", "xlsm", "pptm", "dotm", "xlam", "scf", "gadget", "inf", "url",
];

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const MIME_EXTENSIONS: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
  "text/plain": ["txt", "log"],
  "text/csv": ["csv"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
};

export type ScanStatus = "pending" | "clean" | "quarantined" | "blocked";

export type AttachmentCandidate = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export type AttachmentDecision =
  | { allowed: true; sanitizedFilename: string; extension: string; scanStatus: "pending" }
  | { allowed: false; reason: string; scanStatus: "blocked" };

/** Strip directories, control characters and double extensions tricks. */
export function sanitizeFilename(raw: string): string {
  const base = (raw || "unnamed").split(/[\\/]/).pop() ?? "unnamed";
  return base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .slice(0, 120) || "unnamed";
}

export function fileExtension(filename: string): string {
  const parts = sanitizeFilename(filename).toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

/** All extensions present in the name (catches invoice.pdf.exe). */
export function allExtensions(filename: string): string[] {
  return sanitizeFilename(filename).toLowerCase().split(".").slice(1);
}

export function evaluateAttachment(candidate: AttachmentCandidate): AttachmentDecision {
  const sanitizedFilename = sanitizeFilename(candidate.filename);
  const ext = fileExtension(sanitizedFilename);
  const mime = (candidate.mimeType || "").toLowerCase().split(";")[0].trim();

  if (!ext) return { allowed: false, reason: "missing_file_extension", scanStatus: "blocked" };
  for (const e of allExtensions(sanitizedFilename)) {
    if (BLOCKED_EXTENSIONS.includes(e)) {
      return { allowed: false, reason: `blocked_executable_extension:${e}`, scanStatus: "blocked" };
    }
  }
  if (candidate.sizeBytes <= 0) return { allowed: false, reason: "empty_file", scanStatus: "blocked" };
  if (candidate.sizeBytes > MAX_ATTACHMENT_BYTES) {
    return { allowed: false, reason: "file_too_large", scanStatus: "blocked" };
  }
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    return { allowed: false, reason: `mime_type_not_allowed:${mime || "unknown"}`, scanStatus: "blocked" };
  }
  if (!(MIME_EXTENSIONS[mime] ?? []).includes(ext)) {
    return { allowed: false, reason: "extension_mime_mismatch", scanStatus: "blocked" };
  }
  // Always "pending": a file is never treated as clean until scanning reports it.
  return { allowed: true, sanitizedFilename, extension: ext, scanStatus: "pending" };
}

export function evaluateAttachmentSet(candidates: AttachmentCandidate[]) {
  if (candidates.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    return { accepted: [], rejected: candidates.map((c) => ({ candidate: c, reason: "too_many_attachments" })) };
  }
  const total = candidates.reduce((s, c) => s + Math.max(0, c.sizeBytes), 0);
  if (total > MAX_TOTAL_BYTES) {
    return { accepted: [], rejected: candidates.map((c) => ({ candidate: c, reason: "total_size_exceeded" })) };
  }
  const accepted: Array<{ candidate: AttachmentCandidate; decision: AttachmentDecision }> = [];
  const rejected: Array<{ candidate: AttachmentCandidate; reason: string }> = [];
  for (const c of candidates) {
    const decision = evaluateAttachment(c);
    if (decision.allowed) accepted.push({ candidate: c, decision });
    else rejected.push({ candidate: c, reason: decision.reason });
  }
  return { accepted, rejected };
}

/** Private storage key: never guessable, always scoped to the message. */
export function storagePath(mailboxId: string, messageId: string, attachmentId: string, filename: string): string {
  return `${mailboxId}/${messageId}/${attachmentId}-${sanitizeFilename(filename)}`;
}

export type DownloadContext = {
  attachmentsEnabled: boolean;
  scanStatus: ScanStatus;
  requesterIsAdmin: boolean;
  requesterIsAssignedRep: boolean;
};

export type DownloadDecision = { allowed: true; ttlSeconds: number } | { allowed: false; reason: string };

/**
 * Access to an attachment mirrors access to its message, and a file is only
 * ever released as a short-lived signed URL after it has been scanned clean.
 */
export function canDownloadAttachment(ctx: DownloadContext): DownloadDecision {
  if (!ctx.attachmentsEnabled) return { allowed: false, reason: "attachments_disabled" };
  if (!ctx.requesterIsAdmin && !ctx.requesterIsAssignedRep) return { allowed: false, reason: "not_permitted" };
  if (ctx.scanStatus === "quarantined") return { allowed: false, reason: "quarantined" };
  if (ctx.scanStatus === "blocked") return { allowed: false, reason: "blocked" };
  if (ctx.scanStatus !== "clean") return { allowed: false, reason: "scan_pending" };
  return { allowed: true, ttlSeconds: SIGNED_URL_TTL_SECONDS };
}

/** Attachments are never auto-opened, never previewed inline and never sent to AI. */
export const ATTACHMENT_INVARIANTS = {
  autoOpen: false,
  inlinePreview: false,
  sendToAI: false,
  publicBucket: false,
} as const;
