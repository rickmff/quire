import { describe, expect, it } from "vitest";
import { parseClientError } from "@/lib/clientError";

describe("parseClientError", () => {
  it("keeps the message, the path, the source and a trimmed stack", () => {
    const out = parseClientError(
      JSON.stringify({ message: " boom ", path: "/app", source: "boundary", stack: "x".repeat(3000), digest: "d1" }),
    );
    expect(out).toMatchObject({ message: "boom", path: "/app", source: "boundary", digest: "d1" });
    expect(out?.stack).toHaveLength(2000);
  });

  it("refuses a report without a message, with a path off the site, or too large", () => {
    expect(parseClientError(JSON.stringify({ path: "/app" }))).toBeNull();
    expect(parseClientError(JSON.stringify({ message: "x", path: "https://evil.dev" }))).toBeNull();
    expect(parseClientError(JSON.stringify({ message: "x".repeat(9000), path: "/" }))).toBeNull();
    expect(parseClientError("{nope")).toBeNull();
  });

  it("defaults the source to the window", () => {
    expect(parseClientError(JSON.stringify({ message: "x", path: "/" }))?.source).toBe("window");
  });
});
