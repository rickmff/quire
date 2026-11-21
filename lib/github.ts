import "server-only";

export type GitFile = { path: string; content?: Buffer; deleted?: boolean };

export function githubFromEnv(env: NodeJS.ProcessEnv = process.env) {
  const token = env.QUIRE_GITHUB_TOKEN;
  const repo = env.QUIRE_GITHUB_REPO ?? "rickmff/quire";
  if (!token) return null;
  const call = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const r = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`GitHub ${method} ${path} ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return (await r.json()) as T;
  };
  return {
    repo,
    async blob(content: Buffer) {
      const { sha } = await call<{ sha: string }>("POST", "/git/blobs", {
        content: content.toString("base64"),
        encoding: "base64",
      });
      return sha;
    },
    async openPullRequest(p: {
      parent: string;
      branch: string;
      title: string;
      body: string;
      base: string;
      entries: { path: string; sha: string | null }[];
    }) {
      const parent = await call<{ tree: { sha: string } }>("GET", `/git/commits/${p.parent}`);
      const tree = await call<{ sha: string }>("POST", "/git/trees", {
        base_tree: parent.tree.sha,
        tree: p.entries.map((e) => ({ path: e.path, mode: "100644", type: "blob", sha: e.sha })),
      });
      const commit = await call<{ sha: string }>("POST", "/git/commits", {
        message: p.title,
        tree: tree.sha,
        parents: [p.parent],
      });
      await call("POST", "/git/refs", { ref: `refs/heads/${p.branch}`, sha: commit.sha });
      const pr = await call<{ html_url: string }>("POST", "/pulls", {
        title: p.title,
        head: p.branch,
        base: p.base,
        body: p.body,
      });
      return pr.html_url;
    },
  };
}
