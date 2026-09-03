// Phase 1C — server-side HTML sanitisation for inbound email.
// Plain text is the default rendering; sanitised HTML is opt-in and still
// blocks remote images, tracking pixels, scripts and every form of active content.

const ALLOWED_TAGS = new Set([
  "a", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6",
  "hr", "i", "li", "ol", "p", "pre", "span", "strong", "table", "tbody", "td", "tfoot",
  "th", "thead", "tr", "u", "ul", "img",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
  img: new Set(["alt", "title", "width", "height"]),
};

const STRIP_WITH_CONTENT = /<(script|style|iframe|object|embed|applet|form|svg|math|link|meta|base|noscript)\b[\s\S]*?(<\/\1\s*>|$)/gi;

export type SanitizeResult = {
  html: string;
  blockedRemoteImages: number;
  blockedTrackingPixels: number;
  removedTags: string[];
  removedEventHandlers: number;
};

function isTrackingPixel(tag: string): boolean {
  const w = Number(tag.match(/\bwidth\s*=\s*"?(\d+)/i)?.[1] ?? NaN);
  const h = Number(tag.match(/\bheight\s*=\s*"?(\d+)/i)?.[1] ?? NaN);
  if (Number.isFinite(w) && Number.isFinite(h) && w <= 2 && h <= 2) return true;
  return /display\s*:\s*none|visibility\s*:\s*hidden/i.test(tag);
}

/**
 * Sanitise untrusted email HTML.
 * @param allowRemoteImages defaults to false — remote image sources are always
 * stripped unless an administrator explicitly enables them.
 */
export function sanitizeEmailHtml(input: string, allowRemoteImages = false): SanitizeResult {
  const result: SanitizeResult = {
    html: "",
    blockedRemoteImages: 0,
    blockedTrackingPixels: 0,
    removedTags: [],
    removedEventHandlers: 0,
  };
  if (!input) return result;

  let html = input.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(STRIP_WITH_CONTENT, (_m, tag: string) => {
    result.removedTags.push(String(tag).toLowerCase());
    return "";
  });

  html = html.replace(/<\/?([A-Za-z][A-Za-z0-9-]*)\b([^>]*)>/g, (full, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    const closing = full.startsWith("</");

    if (!ALLOWED_TAGS.has(tag)) {
      if (!result.removedTags.includes(tag)) result.removedTags.push(tag);
      return "";
    }
    if (closing) return `</${tag}>`;

    if (tag === "img") {
      if (isTrackingPixel(full)) {
        result.blockedTrackingPixels++;
        return "";
      }
      const src = rawAttrs.match(/\bsrc\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/i);
      const url = (src?.[2] ?? src?.[3] ?? src?.[1] ?? "").trim();
      if (url && /^(https?:)?\/\//i.test(url) && !allowRemoteImages) result.blockedRemoteImages++;
      else if (url && !allowRemoteImages) result.blockedRemoteImages++;
    }

    const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
    const attrs: string[] = [];
    const attrRe = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/g;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(rawAttrs)) !== null) {
      const name = m[1].toLowerCase();
      const value = (m[3] ?? m[4] ?? m[2] ?? "").trim();
      if (/^on/i.test(name)) {
        result.removedEventHandlers++;
        continue;
      }
      if (!allowed.has(name)) continue;
      if (name === "href") {
        if (!/^(https?:|mailto:)/i.test(value)) continue;
      }
      attrs.push(`${name}="${value.replace(/"/g, "&quot;")}"`);
    }

    if (tag === "img") {
      // Remote sources are never emitted; the image is rendered as a blocked placeholder.
      attrs.push('data-blocked-remote="true"');
    }
    if (tag === "a") attrs.push('rel="noopener noreferrer nofollow"', 'target="_blank"');

    return `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>`;
  });

  // Defence in depth: neutralise any surviving active-content scheme.
  html = html.replace(/javascript:/gi, "").replace(/data:text\/html/gi, "");

  result.html = html.trim();
  return result;
}
