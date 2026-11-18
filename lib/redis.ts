import "server-only";

export type Command = (string | number)[];

export type Redis = {
  run(cmd: Command): Promise<unknown>;
  pipeline(cmds: Command[]): Promise<unknown[]>;
};

export function redisFromEnv(env: NodeJS.ProcessEnv = process.env): Redis | null {
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const base = url.replace(/\/$/, "");
  const post = async (path: string, body: unknown) => {
    const r = await fetch(base + path, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Redis ${r.status}`);
    return r.json();
  };
  return {
    run: async (cmd) => (await post("", cmd)).result,
    pipeline: async (cmds) => {
      const replies = (await post("/pipeline", cmds)) as { result?: unknown; error?: string }[];
      return replies.map((reply) => {
        if (reply.error) throw new Error(`Redis ${reply.error}`);
        return reply.result;
      });
    },
  };
}

let cached: Redis | null | undefined;
export function redis(): Redis | null {
  if (cached === undefined) cached = redisFromEnv();
  return cached;
}
