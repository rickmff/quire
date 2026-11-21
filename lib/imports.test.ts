import { describe, expect, it } from "vitest";
import { batches, changedFiles, isAdmin, parseRequest } from "./imports";

const TOKEN = "a".repeat(40);
const req = (auth?: string) =>
  new Request("https://quire.fyi/api/library-imports", { headers: auth ? { authorization: auth } : {} });

describe("isAdmin", () => {
  it("accepts the bearer token", () => {
    expect(isAdmin(req(`Bearer ${TOKEN}`), TOKEN)).toBe(true);
  });

  it("refuses a wrong or missing token", () => {
    expect(isAdmin(req(`Bearer ${"b".repeat(40)}`), TOKEN)).toBe(false);
    expect(isAdmin(req(), TOKEN)).toBe(false);
  });

  it("refuses everyone when the token is unset or short", () => {
    expect(isAdmin(req("Bearer short"), "short")).toBe(false);
    expect(isAdmin(req(`Bearer ${TOKEN}`), undefined)).toBe(false);
  });
});

describe("parseRequest", () => {
  it("keeps the known fields", () => {
    expect(parseRequest({ url: "https://eldoraui.site", repo: "karthikmudunuri/eldoraui", extra: "x" })).toEqual({
      url: "https://eldoraui.site",
      repo: "karthikmudunuri/eldoraui",
    });
  });

  it("accepts a registry scope", () => {
    expect(parseRequest({ url: "@eldoraui" })?.url).toBe("@eldoraui");
  });

  it("refuses URLs that could break out of the shell", () => {
    expect(parseRequest({ url: "https://a.dev/'; rm -rf ~" })).toBeNull();
    expect(parseRequest({ url: "http://a.dev" })).toBeNull();
    expect(parseRequest({ url: "https://a.dev", repo: "a/b;c" })).toBeNull();
    expect(parseRequest({ url: "https://a.dev", id: "Bad Id" })).toBeNull();
  });

  it("needs a docs template with {name}", () => {
    expect(parseRequest({ url: "https://a.dev", docs: "https://a.dev/docs/{name}" })?.docs).toBe(
      "https://a.dev/docs/{name}",
    );
    expect(parseRequest({ url: "https://a.dev", docs: "https://a.dev/docs" })).toBeNull();
  });
});

it("batches splits a list into groups", () => {
  expect(batches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
});

it("changedFiles reads git status", () => {
  expect(changedFiles(" M lib/catalog/data.json\n?? public/stage/x/index.html\n D old.json\n")).toEqual([
    { status: "M", path: "lib/catalog/data.json" },
    { status: "??", path: "public/stage/x/index.html" },
    { status: "D", path: "old.json" },
  ]);
});
