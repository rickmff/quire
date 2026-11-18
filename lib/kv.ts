import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { redis } from "./redis";

export type KV = {
  name: string;
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

function cloudflare(): KV | null {
  const { CF_ACCOUNT_ID: acct, CF_KV_NAMESPACE_ID: ns, CF_API_TOKEN: token } = process.env;
  if (!acct || !ns || !token) return null;
  const base = `https://api.cloudflare.com/client/v4/accounts/${acct}/storage/kv/namespaces/${ns}/values/`;
  const headers = { authorization: `Bearer ${token}` };
  return {
    name: "cloudflare-kv",
    async get(key) {
      const r = await fetch(base + encodeURIComponent(key), { headers, cache: "no-store" });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`KV get ${r.status}`);
      return r.text();
    },
    async put(key, value) {
      const r = await fetch(base + encodeURIComponent(key), { method: "PUT", headers, body: value });
      if (!r.ok) throw new Error(`KV put ${r.status}`);
    },
  };
}

function upstash(): KV | null {
  const db = redis();
  if (!db) return null;
  return {
    name: "upstash",
    get: async (key) => (await db.run(["GET", key])) as string | null,
    put: async (key, value) => void (await db.run(["SET", key, value])),
  };
}

export function withFallback(primary: KV, legacy: KV): KV {
  return {
    name: `${primary.name}+${legacy.name}`,
    async get(key) {
      const value = await primary.get(key);
      if (value !== null) return value;
      const old = await legacy.get(key).catch(() => null);
      if (old !== null) await primary.put(key, old);
      return old;
    },
    put: (key, value) => primary.put(key, value),
  };
}

function files(): KV | null {
  if (process.env.NODE_ENV === "production" && process.env.QUIRE_FILE_STORE !== "1") return null;
  const dir = join(process.cwd(), ".data");
  const path = (key: string) => join(dir, key.replace(/[^a-z0-9:_-]/gi, "_") + ".json");
  return {
    name: "files",
    async get(key) {
      try {
        return await readFile(path(key), "utf8");
      } catch {
        return null;
      }
    },
    async put(key, value) {
      await mkdir(dir, { recursive: true });
      await writeFile(path(key), value);
    },
  };
}

let cached: KV | null | undefined;
export function kv(): KV | null {
  if (cached === undefined) {
    const primary = upstash();
    const legacy = cloudflare();
    cached = primary && legacy ? withFallback(primary, legacy) : (primary ?? legacy ?? files());
  }
  return cached;
}
