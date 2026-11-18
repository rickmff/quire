import { describe, expect, it } from "vitest";
import { isCrossSite } from "./security";

const req = (headers: Record<string, string>) =>
  new Request("https://quire.fyi/api/capture", { method: "POST", headers: { host: "quire.fyi", ...headers } });

describe("isCrossSite", () => {
  it("lets the app's own pages through", () => {
    expect(isCrossSite(req({ "sec-fetch-site": "same-origin", origin: "https://quire.fyi" }))).toBe(false);
  });

  it("lets clients with no browser headers through", () => {
    expect(isCrossSite(req({}))).toBe(false);
  });

  it("refuses a request a browser marks as cross-site or same-site", () => {
    expect(isCrossSite(req({ "sec-fetch-site": "cross-site" }))).toBe(true);
    expect(isCrossSite(req({ "sec-fetch-site": "same-site" }))).toBe(true);
  });

  it("refuses an Origin from another host", () => {
    expect(isCrossSite(req({ origin: "https://evil.example" }))).toBe(true);
    expect(isCrossSite(req({ origin: "null" }))).toBe(true);
  });
});
