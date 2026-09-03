// Phase 1C.1 — IMAP folder discovery (read-only LIST / SPECIAL-USE).
//
// Invariants:
//  * The Sent folder is NEVER assumed or hard-coded. It is discovered from the
//    server's LIST response and stored per mailbox.
//  * Zero or multiple \Sent candidates fail closed and require owner selection.
//  * Mailbox names are encoded (modified UTF-7) and quoted before use.
//  * Discovery never creates, renames, subscribes to or modifies a folder.

export type ListEntry = {
  attributes: string[];
  delimiter: string | null;
  name: string;
  raw: string;
};

/** LIST command used for discovery. RETURN (SPECIAL-USE) is requested when advertised. */
export function buildListCommand(supportsSpecialUse: boolean): string {
  return supportsSpecialUse ? `LIST "" "*" RETURN (SPECIAL-USE)` : `LIST "" "*"`;
}

export function serverSupportsSpecialUse(capabilityLine: string): boolean {
  return /\bSPECIAL-USE\b/i.test(capabilityLine);
}

/** Parse untagged `* LIST (attrs) "delim" name` lines. Tolerant of junk lines. */
export function parseListResponse(response: string): ListEntry[] {
  const entries: ListEntry[] = [];
  for (const rawLine of response.split(/\r?\n/)) {
    const line = rawLine.trim();
    const m = line.match(/^\*\s+(?:LIST|LSUB|XLIST)\s+\(([^)]*)\)\s+(NIL|"(?:[^"\\]|\\.)*"|\S+)\s+(.+)$/i);
    if (!m) continue;
    const attributes = m[1].split(/\s+/).filter(Boolean);
    const delimRaw = m[2];
    const delimiter = /^NIL$/i.test(delimRaw) ? null : unquote(delimRaw);
    const name = decodeModifiedUtf7(unquote(m[3].trim()));
    entries.push({ attributes, delimiter, name, raw: line });
  }
  return entries;
}

function unquote(v: string): string {
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1).replace(/\\(["\\])/g, "$1");
  }
  return v;
}

export type SentFolderResult =
  | { ok: true; name: string; source: "special_use"; entry: ListEntry }
  | { ok: false; reason: "no_sent_folder" | "multiple_sent_folders" | "unsafe_folder_name"; candidates: string[] };

/** Identify the unique mailbox carrying the \Sent attribute. Fail closed otherwise. */
export function discoverSentFolder(entries: ListEntry[]): SentFolderResult {
  const candidates = entries.filter((e) =>
    e.attributes.some((a) => a.toLowerCase() === "\\sent")
  );
  if (candidates.length === 0) {
    return { ok: false, reason: "no_sent_folder", candidates: entries.map((e) => e.name) };
  }
  if (candidates.length > 1) {
    return { ok: false, reason: "multiple_sent_folders", candidates: candidates.map((e) => e.name) };
  }
  const entry = candidates[0];
  if (!isSafeMailboxName(entry.name)) {
    return { ok: false, reason: "unsafe_folder_name", candidates: [entry.name] };
  }
  return { ok: true, name: entry.name, source: "special_use", entry };
}

/** Reject control characters, CRLF injection and empty names. */
export function isSafeMailboxName(name: string): boolean {
  if (!name || name.length > 255) return false;
  // deno-lint-ignore no-control-regex
  if (/[\r\n\u0000\u2028\u2029]/.test(name)) return false;
  // deno-lint-ignore no-control-regex
  if (/[\x00-\x1f\x7f]/.test(name)) return false;
  return true;
}

/** RFC 3501 modified UTF-7 encoding for mailbox names. */
export function encodeModifiedUtf7(name: string): string {
  let out = "";
  let buf = "";
  const flush = () => {
    if (!buf) return;
    const bytes: number[] = [];
    for (const ch of buf) {
      const cp = ch.codePointAt(0)!;
      if (cp > 0xffff) {
        const v = cp - 0x10000;
        const hi = 0xd800 + (v >> 10), lo = 0xdc00 + (v & 0x3ff);
        bytes.push(hi >> 8, hi & 0xff, lo >> 8, lo & 0xff);
      } else {
        bytes.push(cp >> 8, cp & 0xff);
      }
    }
    let b64 = btoa(String.fromCharCode(...bytes)).replace(/=+$/, "").replace(/\//g, ",");
    out += `&${b64}-`;
    buf = "";
  };
  for (const ch of name) {
    const cp = ch.codePointAt(0)!;
    if (cp === 0x26) { flush(); out += "&-"; continue; }
    if (cp >= 0x20 && cp <= 0x7e) { flush(); out += ch; continue; }
    buf += ch;
  }
  flush();
  return out;
}

/** RFC 3501 modified UTF-7 decoding (inverse of encodeModifiedUtf7). */
export function decodeModifiedUtf7(name: string): string {
  return name.replace(/&([^-]*)-/g, (_m, b64: string) => {
    if (b64 === "") return "&";
    try {
      const bin = atob(b64.replace(/,/g, "/") + "===".slice((b64.length + 3) % 4));
      let s = "";
      for (let i = 0; i + 1 < bin.length; i += 2) {
        s += String.fromCharCode((bin.charCodeAt(i) << 8) | bin.charCodeAt(i + 1));
      }
      return s;
    } catch {
      return _m;
    }
  });
}

/** Encode + quote a mailbox name for use in an IMAP command. Throws on unsafe input. */
export function quoteMailbox(name: string): string {
  if (!isSafeMailboxName(name)) {
    throw new Error(`Unsafe mailbox name rejected`);
  }
  const encoded = encodeModifiedUtf7(name);
  return `"${encoded.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
