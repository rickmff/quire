import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Server-only helpers for fetching user-supplied URLs without reaching
// private network addresses.

function isPrivate(ip: string) {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 || a === 127 || a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

export async function safeUrl(raw: string): Promise<URL | null> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.hostname === "localhost") return null;
  // Local sandboxes without DNS can opt out; never set this in production.
  if (process.env.QUIRE_SKIP_DNS_CHECK === "1") return u;
  try {
    const addrs = isIP(u.hostname)
      ? [{ address: u.hostname }]
      : await lookup(u.hostname, { all: true });
    if (addrs.some((a) => isPrivate(a.address))) return null;
  } catch {
    return null;
  }
  return u;
}

const UA = "Mozilla/5.0 (compatible; QuireBot/0.1; +https://github.com/rickmff/quire)";

// Fetch a public URL as text. Checks every redirect hop and caps the size.
export async function fetchText(
  raw: string,
  opts: { accept?: string; max?: number; timeout?: number } = {},
): Promise<{ url: string; text: string; type: string } | null> {
  let target = raw;
  for (let hop = 0; hop < 4; hop++) {
    const u = await safeUrl(target);
    if (!u) return null;
    let res: Response;
    try {
      res = await fetch(u.href, {
        redirect: "manual",
        signal: AbortSignal.timeout(opts.timeout ?? 8000),
        headers: { "user-agent": UA, accept: opts.accept ?? "text/html" },
      });
    } catch {
      return null;
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      target = new URL(loc, u).href;
      continue;
    }
    if (!res.ok) return null;
    const text = (await res.text()).slice(0, opts.max ?? 2_000_000);
    return { url: u.href, text, type: res.headers.get("content-type") ?? "" };
  }
  return null;
}

export async function fetchJSON<T = unknown>(raw: string): Promise<T | null> {
  const r = await fetchText(raw, { accept: "application/json" });
  if (!r) return null;
  try {
    return JSON.parse(r.text) as T;
  } catch {
    return null;
  }
}
