import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isPrivateAddress } from "./ip";

export async function safeUrl(raw: string): Promise<URL | null> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) return null;
  if (process.env.QUIRE_SKIP_DNS_CHECK === "1") return u;
  try {
    const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) return null;
  } catch {
    return null;
  }
  return u;
}

const UA = "Mozilla/5.0 (compatible; QuireBot/0.1; +https://github.com/rickmff/quire)";

const DEFAULT_MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 4;

export async function readCapped(res: Response, maxBytes: number): Promise<string | null> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let read = 0;
  try {
    while (read < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value.subarray(0, maxBytes - read);
      read += chunk.byteLength;
      text += decoder.decode(chunk, { stream: true });
    }
    return text + decoder.decode();
  } catch {
    return null;
  } finally {
    reader.cancel().catch(() => {});
  }
}

export async function fetchText(
  raw: string,
  opts: { accept?: string; max?: number; timeout?: number } = {},
): Promise<{ url: string; text: string; type: string } | null> {
  let target = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
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
    const text = await readCapped(res, opts.max ?? DEFAULT_MAX_BYTES);
    if (text === null) return null;
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
