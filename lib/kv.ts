import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

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
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const call = async (cmd: string[]) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(cmd),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Redis ${r.status}`);
    return (await r.json()).result as string | null;
  };
  return {
    name: "upstash",
    get: (key) => call(["GET", key]),
    put: async (key, value) => void (await call(["SET", key, value])),
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
  if (cached === undefined) cached = cloudflare() ?? upstash() ?? files();
  return cached;
}
