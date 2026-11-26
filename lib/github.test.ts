import { afterEach, describe, expect, it, vi } from "vitest";
import { githubFromEnv } from "@/lib/github";

afterEach(() => vi.unstubAllGlobals());

const answers = (...bodies: unknown[]) => {
  const fetch = vi.fn();
  for (const b of bodies) fetch.mockResolvedValueOnce({ ok: true, json: async () => b, text: async () => "" });
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

describe("githubFromEnv", () => {
  it("is off without a token", () => {
    expect(githubFromEnv({} as unknown as NodeJS.ProcessEnv)).toBeNull();
  });

  it("uploads a blob as base64", async () => {
    const fetch = answers({ sha: "b1" });
    const gh = githubFromEnv({ QUIRE_GITHUB_TOKEN: "t", QUIRE_GITHUB_REPO: "o/r" } as unknown as NodeJS.ProcessEnv)!;
    expect(await gh.blob(Buffer.from("hi"))).toBe("b1");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.github.com/repos/o/r/git/blobs");
    expect(JSON.parse(init.body)).toEqual({ content: "aGk=", encoding: "base64" });
  });

  it("opens a pull request from a tree on top of the parent commit", async () => {
    const fetch = answers({ tree: { sha: "t0" } }, { sha: "t1" }, { sha: "c1" }, {}, { html_url: "https://pr" });
    const gh = githubFromEnv({ QUIRE_GITHUB_TOKEN: "t" } as unknown as NodeJS.ProcessEnv)!;
    const url = await gh.openPullRequest({
      parent: "p0",
      branch: "import/x",
      title: "Import X",
      body: "",
      base: "main",
      entries: [{ path: "a.json", sha: "b1" }],
    });
    expect(url).toBe("https://pr");
    expect(fetch.mock.calls.map((c) => `${c[1].method} ${c[0].split("/repos/rickmff/quire")[1]}`)).toEqual([
      "GET /git/commits/p0",
      "POST /git/trees",
      "POST /git/commits",
      "POST /git/refs",
      "POST /pulls",
    ]);
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ ref: "refs/heads/import/x", sha: "c1" });
  });

  it("throws with the status when GitHub refuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 422, text: async () => "bad" })),
    );
    await expect(
      githubFromEnv({ QUIRE_GITHUB_TOKEN: "t" } as unknown as NodeJS.ProcessEnv)!.blob(Buffer.from("")),
    ).rejects.toThrow("422: bad");
  });
});
