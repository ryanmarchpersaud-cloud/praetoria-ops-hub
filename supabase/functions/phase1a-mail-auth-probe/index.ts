// TEMPORARY Phase 1A authentication-only probe.
// Read-only: LOGIN, LIST, EXAMINE (read-only), FETCH headers, LOGOUT.
// SMTP: AUTH, NOOP, RSET, QUIT. No message is ever sent, flagged, moved or deleted.
// This file is deleted immediately after the test run.

const enc = new TextEncoder();
const dec = new TextDecoder();

type Step = { step: string; ok: boolean; ms: number; detail?: string };

function redact(s: string, user: string, pass: string): string {
  let out = s;
  if (user) out = out.split(user).join("<REDACTED_USER>");
  if (pass) out = out.split(pass).join("<REDACTED_PASS>");
  return out.replace(/\r\n/g, " | ").slice(0, 400);
}

async function readUntil(
  conn: Deno.Conn,
  matcher: (buf: string) => boolean,
  timeoutMs = 15000,
): Promise<string> {
  const buf = new Uint8Array(65536);
  let acc = "";
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const n = await conn.read(buf);
    if (n === null) break;
    acc += dec.decode(buf.subarray(0, n));
    if (matcher(acc)) return acc;
  }
  return acc;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  const user = Deno.env.get("IONOS_STAGING_EMAIL_USER") ?? "";
  const pass = Deno.env.get("IONOS_STAGING_EMAIL_PASSWORD") ?? "";
  if (!user || !pass) {
    return Response.json({ error: "Staging mailbox secrets not configured" }, { status: 500 });
  }

  const imap: Step[] = [];
  const smtp: Step[] = [];
  let folders: string[] = [];
  let headers: string[] = [];
  let examineSummary = "";

  const timed = async (list: Step[], step: string, fn: () => Promise<string>) => {
    const t0 = performance.now();
    try {
      const detail = await fn();
      list.push({ step, ok: true, ms: Math.round(performance.now() - t0), detail: redact(detail, user, pass) });
      return true;
    } catch (e) {
      list.push({
        step,
        ok: false,
        ms: Math.round(performance.now() - t0),
        detail: redact(String(e), user, pass),
      });
      return false;
    }
  };

  // ---------- IMAP ----------
  let imapConn: Deno.TlsConn | null = null;
  try {
    await timed(imap, "imap:tls_connect:993", async () => {
      imapConn = await Deno.connectTls({ hostname: "imap.ionos.com", port: 993 });
      return await readUntil(imapConn, (b) => b.includes("\r\n"));
    });

    if (imapConn) {
      const c = imapConn as Deno.TlsConn;
      const cmd = async (tag: string, line: string) => {
        await c.write(enc.encode(`${tag} ${line}\r\n`));
        const res = await readUntil(c, (b) => new RegExp(`^${tag} (OK|NO|BAD)`, "m").test(b));
        if (new RegExp(`^${tag} (NO|BAD)`, "m").test(res)) throw new Error(res.trim());
        return res;
      };

      const authed = await timed(imap, "imap:login", async () => {
        const r = await cmd("a1", `LOGIN "${user}" "${pass}"`);
        return r.split("\r\n").filter((l) => l.startsWith("a1")).join(" ");
      });

      if (authed) {
        await timed(imap, "imap:list_folders", async () => {
          const r = await cmd("a2", `LIST "" "*"`);
          folders = r
            .split("\r\n")
            .filter((l) => l.startsWith("* LIST"))
            .map((l) => l.slice(l.lastIndexOf('"', l.length - 2) === -1 ? 0 : l.indexOf('"', l.lastIndexOf('/'))) || l)
            .map((l) => l.trim());
          folders = r.split("\r\n").filter((l) => l.startsWith("* LIST")).map((l) => l.trim());
          return `${folders.length} folders`;
        });

        await timed(imap, "imap:examine_inbox_readonly", async () => {
          const r = await cmd("a3", "EXAMINE INBOX");
          examineSummary = r
            .split("\r\n")
            .filter((l) => l.startsWith("*") || l.startsWith("a3"))
            .join(" | ");
          return examineSummary;
        });

        await timed(imap, "imap:fetch_headers_readonly", async () => {
          // BODY.PEEK never sets \Seen
          const r = await cmd("a4", "FETCH 1:3 (UID BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])");
          headers = r
            .split("\r\n")
            .filter((l) => /^(From|Subject|Date):/i.test(l) || l.startsWith("* "))
            .slice(0, 30);
          return `${headers.length} header lines`;
        });

        await timed(imap, "imap:logout", async () => {
          await c.write(enc.encode("a5 LOGOUT\r\n"));
          return await readUntil(c, (b) => b.includes("a5 OK"), 5000);
        });
      }
      try { c.close(); } catch { /* already closed */ }
    }
  } catch (e) {
    imap.push({ step: "imap:fatal", ok: false, ms: 0, detail: redact(String(e), user, pass) });
  }

  // ---------- SMTP (587 STARTTLS) ----------
  try {
    const t0 = performance.now();
    let conn: Deno.Conn = await Deno.connect({ hostname: "smtp.ionos.com", port: 587 });
    await readUntil(conn, (b) => b.includes("220"));
    await conn.write(enc.encode("EHLO praetoriagroup.ca\r\n"));
    await readUntil(conn, (b) => /^250 /m.test(b));
    await conn.write(enc.encode("STARTTLS\r\n"));
    await readUntil(conn, (b) => b.includes("220"));
    const tls = await Deno.startTls(conn as Deno.TcpConn, { hostname: "smtp.ionos.com" });
    await tls.write(enc.encode("EHLO praetoriagroup.ca\r\n"));
    const ehlo = await readUntil(tls, (b) => /^250 /m.test(b));
    smtp.push({ step: "smtp:587_starttls_ehlo", ok: true, ms: Math.round(performance.now() - t0), detail: redact(ehlo, user, pass) });

    const authLine = btoa(`\u0000${user}\u0000${pass}`);
    const t1 = performance.now();
    await tls.write(enc.encode(`AUTH PLAIN ${authLine}\r\n`));
    const authRes = await readUntil(tls, (b) => /^(235|5\d\d)/m.test(b));
    smtp.push({
      step: "smtp:auth_plain",
      ok: authRes.includes("235"),
      ms: Math.round(performance.now() - t1),
      detail: redact(authRes, user, pass),
    });

    await timed(smtp, "smtp:noop", async () => {
      await tls.write(enc.encode("NOOP\r\n"));
      return await readUntil(tls, (b) => /^250/m.test(b), 8000);
    });
    await timed(smtp, "smtp:rset", async () => {
      await tls.write(enc.encode("RSET\r\n"));
      return await readUntil(tls, (b) => /^250/m.test(b), 8000);
    });
    await timed(smtp, "smtp:quit", async () => {
      await tls.write(enc.encode("QUIT\r\n"));
      return await readUntil(tls, (b) => /^221/m.test(b), 8000);
    });
    try { tls.close(); } catch { /* already closed */ }
  } catch (e) {
    smtp.push({ step: "smtp:fatal", ok: false, ms: 0, detail: redact(String(e), user, pass) });
  }

  return Response.json({
    runtime: { deno: Deno.version.deno, v8: Deno.version.v8, ts: Deno.version.typescript },
    imap,
    smtp,
    folders,
    examine: examineSummary,
    header_sample_count: headers.length,
    note: "Read-only probe. No flags set, no messages modified, no mail sent.",
  });
});
