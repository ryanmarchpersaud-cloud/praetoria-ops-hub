// Phase 1C — runtime-agnostic MIME parsing for inbound email.
// Pure functions only (no Deno APIs) so they are unit-testable.
// Never executes content, never fetches remote resources, never calls AI.

export const MAX_BODY_CHARS = 100_000;
export const MAX_PARTS = 100;
export const MAX_DEPTH = 10;

export type ParsedAddress = { name: string | null; address: string | null };

export type ParsedAttachment = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  encoding: string;
  contentId: string | null;
  inline: boolean;
};

export type ParsedMessage = {
  headers: Record<string, string>;
  subject: string | null;
  from: ParsedAddress;
  to: string | null;
  cc: string | null;
  date: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  text: string | null;
  html: string | null;
  attachments: ParsedAttachment[];
  truncated: boolean;
  malformed: boolean;
  notes: string[];
};

/** Split raw RFC822 into a header block and a body. Tolerates bare LF. */
export function splitHeaders(raw: string): { headerBlock: string; body: string } {
  const norm = raw.replace(/\r\n/g, "\n");
  const idx = norm.indexOf("\n\n");
  if (idx === -1) return { headerBlock: norm, body: "" };
  return { headerBlock: norm.slice(0, idx), body: norm.slice(idx + 2) };
}

/** Parse a header block into a lowercase-keyed map, unfolding continuations. */
export function parseHeaders(headerBlock: string): Record<string, string> {
  const out: Record<string, string> = {};
  const unfolded = headerBlock.replace(/\r?\n[ \t]+/g, " ");
  for (const line of unfolded.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9-]+):\s?([\s\S]*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    out[key] = out[key] ? `${out[key]}, ${m[2].trim()}` : m[2].trim();
  }
  return out;
}

function b64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/[^A-Za-z0-9+/=]/g, "");
  try {
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return new Uint8Array(0);
  }
}

function decodeBytes(bytes: Uint8Array, charset: string): string {
  const cs = (charset || "utf-8").toLowerCase().replace(/^"|"$/g, "");
  try {
    return new TextDecoder(cs === "us-ascii" ? "utf-8" : cs, { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
}

/** Decode quoted-printable to bytes (charset applied separately). */
export function decodeQuotedPrintableBytes(input: string): Uint8Array {
  const joined = input.replace(/=\r?\n/g, "");
  const out: number[] = [];
  for (let i = 0; i < joined.length; i++) {
    const ch = joined[i];
    if (ch === "=" && /^[0-9A-Fa-f]{2}$/.test(joined.slice(i + 1, i + 3))) {
      out.push(parseInt(joined.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      const code = joined.charCodeAt(i);
      if (code < 128) out.push(code);
      else for (const b of new TextEncoder().encode(ch)) out.push(b);
    }
  }
  return new Uint8Array(out);
}

export function decodeBody(content: string, encoding: string, charset: string): string {
  const enc = (encoding || "7bit").toLowerCase().trim();
  if (enc === "base64") return decodeBytes(b64ToBytes(content), charset);
  if (enc === "quoted-printable") return decodeBytes(decodeQuotedPrintableBytes(content), charset);
  return decodeBytes(new TextEncoder().encode(content), charset);
}

/** RFC 2047 encoded-word decoding for subjects and display names. */
export function decodeMimeWords(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(
    /=\?([^?]+)\?([BbQq])\?([^?]*)\?=(\s*)(?==\?|$|[^\s])?/g,
    (_m, charset: string, enc: string, text: string) => {
      if (enc.toUpperCase() === "B") return decodeBytes(b64ToBytes(text), charset);
      const qp = text.replace(/_/g, " ");
      return decodeBytes(decodeQuotedPrintableBytes(qp), charset);
    },
  ).replace(/\s+(?=$)/, "").trim();
}

export function parseAddress(raw: string | null | undefined): ParsedAddress {
  if (!raw) return { name: null, address: null };
  const decoded = decodeMimeWords(raw);
  const m = decoded.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].replace(/^["']|["']$/g, "").trim() || null, address: m[2].trim().toLowerCase() };
  const bare = decoded.trim();
  return { name: null, address: bare ? bare.toLowerCase() : null };
}

function contentTypeParams(value: string | undefined): { type: string; params: Record<string, string> } {
  if (!value) return { type: "text/plain", params: {} };
  const [typePart, ...rest] = value.split(";");
  const params: Record<string, string> = {};
  for (const chunk of rest) {
    const m = chunk.match(/([\w*-]+)\s*=\s*("([^"]*)"|[^;]+)/);
    if (m) params[m[1].toLowerCase().replace(/\*$/, "")] = (m[3] ?? m[2]).trim();
  }
  return { type: typePart.trim().toLowerCase() || "text/plain", params };
}

type PartAccumulator = { text: string[]; html: string[]; attachments: ParsedAttachment[]; notes: string[]; count: number };

function walkPart(headerBlock: string, body: string, depth: number, acc: PartAccumulator) {
  if (depth > MAX_DEPTH) {
    acc.notes.push("max_depth_exceeded");
    return;
  }
  if (acc.count >= MAX_PARTS) {
    acc.notes.push("max_parts_exceeded");
    return;
  }
  acc.count++;

  const headers = parseHeaders(headerBlock);
  const { type, params } = contentTypeParams(headers["content-type"]);
  const encoding = headers["content-transfer-encoding"] ?? "7bit";
  const disposition = (headers["content-disposition"] ?? "").toLowerCase();
  const filename = decodeMimeWords(
    contentTypeParams(headers["content-disposition"]).params["filename"] ?? params["name"] ?? "",
  );

  const isAttachment = disposition.startsWith("attachment") || (!!filename && !type.startsWith("text/"));

  if (type.startsWith("multipart/")) {
    const boundary = params["boundary"];
    if (!boundary) {
      acc.notes.push("multipart_without_boundary");
      acc.text.push(body.trim());
      return;
    }
    const segments = body.split(`--${boundary}`);
    if (segments.length < 2) acc.notes.push("boundary_not_found");
    for (const seg of segments.slice(1)) {
      const trimmed = seg.replace(/^--\s*$/m, "");
      if (!trimmed.trim() || /^--/.test(seg.trim())) continue;
      const sub = splitHeaders(trimmed.replace(/^\n/, ""));
      walkPart(sub.headerBlock, sub.body, depth + 1, acc);
    }
    return;
  }

  if (type === "message/rfc822") {
    const inner = splitHeaders(body);
    acc.notes.push("nested_rfc822");
    walkPart(inner.headerBlock, inner.body, depth + 1, acc);
    return;
  }

  if (isAttachment) {
    const raw = body.trim();
    const sizeBytes = encoding.toLowerCase().trim() === "base64"
      ? Math.floor((raw.replace(/\s/g, "").length * 3) / 4)
      : new TextEncoder().encode(raw).length;
    acc.attachments.push({
      filename: filename || "unnamed",
      mimeType: type,
      sizeBytes,
      encoding: encoding.toLowerCase().trim(),
      contentId: (headers["content-id"] ?? null)?.replace(/^<|>$/g, "") ?? null,
      inline: disposition.startsWith("inline"),
    });
    return;
  }

  const decoded = decodeBody(body, encoding, params["charset"] ?? "utf-8");
  if (type === "text/html") acc.html.push(decoded);
  else acc.text.push(decoded);
}

export function parseMessage(raw: string): ParsedMessage {
  const notes: string[] = [];
  const { headerBlock, body } = splitHeaders(raw ?? "");
  const headers = parseHeaders(headerBlock);
  if (Object.keys(headers).length === 0) notes.push("no_headers");

  const acc: PartAccumulator = { text: [], html: [], attachments: [], notes, count: 0 };
  try {
    walkPart(headerBlock, body, 0, acc);
  } catch {
    notes.push("parse_error");
    acc.text.push(body);
  }

  let text = acc.text.join("\n\n").trim() || null;
  let html = acc.html.join("\n").trim() || null;
  let truncated = false;
  if (text && text.length > MAX_BODY_CHARS) {
    text = text.slice(0, MAX_BODY_CHARS);
    truncated = true;
  }
  if (html && html.length > MAX_BODY_CHARS) {
    html = html.slice(0, MAX_BODY_CHARS);
    truncated = true;
  }

  const references = (headers["references"] ?? "").match(/<[^>]+>/g) ?? [];
  const inReplyTo = (headers["in-reply-to"] ?? "").match(/<[^>]+>/)?.[0] ?? null;

  return {
    headers,
    subject: headers["subject"] ? decodeMimeWords(headers["subject"]) : null,
    from: parseAddress(headers["from"]),
    to: headers["to"] ? decodeMimeWords(headers["to"]) : null,
    cc: headers["cc"] ? decodeMimeWords(headers["cc"]) : null,
    date: headers["date"] ?? null,
    messageId: (headers["message-id"] ?? "").match(/<[^>]+>/)?.[0] ?? null,
    inReplyTo,
    references,
    text,
    html,
    attachments: acc.attachments,
    truncated,
    malformed: notes.some((n) =>
      ["no_headers", "parse_error", "multipart_without_boundary", "boundary_not_found"].includes(n)
    ),
    notes,
  };
}

/** Full thread reference chain for a reply, oldest first, de-duplicated. */
export function threadChain(parsed: ParsedMessage): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...parsed.references, ...(parsed.inReplyTo ? [parsed.inReplyTo] : [])]) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** Plain-text fallback derived from HTML when no text/plain part exists. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
