import { spawn, spawnSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const CLI = fileURLToPath(new URL("../import-library.ts", import.meta.url));
const runCli = (...args: string[]) => spawnSync("node", [CLI, ...args], { encoding: "utf8", timeout: 30000 });
const runCliAsync = (...args: string[]) =>
  new Promise<{ status: number | null; stderr: string }>((resolve) => {
    const child = spawn("node", [CLI, ...args]);
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => resolve({ status, stderr }));
  });

describe("npm run import", () => {
  it("refuses a step name it does not know", () => {
    const r = runCli("--id", "x", "--from", "catlog");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('--from "catlog" is not a step');
  });

  it("refuses an unknown --until instead of asking for --id", () => {
    const r = runCli("https://example.com", "--until", "recrod");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('--until "recrod" is not a step');
  });

  it("refuses --from after --until", () => {
    const r = runCli("--id", "x", "--from", "publish", "--until", "stage");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("comes after");
  });

  describe("with a server already on the stage port", () => {
    let server: Server;
    let port: number;
    beforeAll(async () => {
      server = createServer((_, res) => res.end("old stage"));
      await new Promise<void>((resolve) => server.listen(0, resolve));
      port = (server.address() as AddressInfo).port;
    });
    afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

    it("stops instead of recording against the old server", async () => {
      const r = await runCliAsync("--id", "x", "--from", "record", "--until", "record", "--port", String(port));
      expect(r.status).toBe(2);
      expect(r.stderr).toContain(`port ${port} is already in use`);
    });
  });
});
