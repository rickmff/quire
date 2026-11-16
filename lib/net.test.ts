import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchText, readCapped, safeUrl } from "./net";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async (host: string) => {
    const table: Record<string, string> = {
      "public.example": "93.184.216.34",
      "rebind.example": "10.0.0.7",
      "metadata.example": "169.254.169.254",
    };
    const address = table[host];
    if (!address) throw new Error("ENOTFOUND");
    return [{ address, family: 4 }];
  }),
}));

afterEach(() => vi.unstubAllGlobals());

describe("safeUrl", () => {
  it("accepts a public http or https link", async () => {
    expect((await safeUrl("https://public.example/docs"))?.href).toBe("https://public.example/docs");
  });

  it.each([
    "javascript:alert(1)",
    "file:///etc/passwd",
    "ftp://public.example/",
    "http://localhost:3000/",
    "http://app.localhost/",
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://[::ffff:10.0.0.1]/",
    "http://2130706433/",
    "http://rebind.example/",
    "http://metadata.example/latest",
    "https://user:secret@public.example/",
    "https://unknown.example/",
    "not a url",
  ])("refuses %s", async (raw) => {
    expect(await safeUrl(raw)).toBeNull();
  });
});

describe("fetchText", () => {
  it("follows a redirect to another public page", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "/moved" } }))
      .mockResolvedValueOnce(new Response("<html>ok</html>", { headers: { "content-type": "text/html" } }));
    vi.stubGlobal("fetch", fetchMock);
    const page = await fetchText("https://public.example/start");
    expect(page).toEqual({ url: "https://public.example/moved", text: "<html>ok</html>", type: "text/html" });
    expect(fetchMock.mock.calls[0][1].redirect).toBe("manual");
  });

  it("stops at a redirect into a private network", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchText("https://public.example/")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after too many redirects", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 302, headers: { location: "/again" } }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchText("https://public.example/")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});

describe("readCapped", () => {
  it("stops reading at the byte limit", async () => {
    const res = new Response("a".repeat(5000));
    expect(await readCapped(res, 1000)).toHaveLength(1000);
  });

  it("returns the whole body when it fits", async () => {
    expect(await readCapped(new Response("short"), 1000)).toBe("short");
  });
});
