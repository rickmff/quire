// Downloads the external assets the Quire stage demos load, for hosts the capture machine
// cannot reach. Run it on a machine with open network access:
//
//   node fetch-assets.mjs urls.txt <outDir>
//
// Writes one file per URL plus manifest.json ({ url: { file, type } }). JSON responses
// (the react-tweet API) are scanned for twimg URLs, which are fetched too.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const [list, out] = process.argv.slice(2);
if (!list || !out) { console.log("usage: node fetch-assets.mjs urls.txt <outDir>"); process.exit(1); }
mkdirSync(out, { recursive: true });
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/svg+xml": "svg", "image/gif": "gif", "video/webm": "webm", "video/mp4": "mp4", "application/json": "json" };
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const queue = readFileSync(list, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
const seen = new Set(), manifest = {};
let ok = 0, failed = 0;

while (queue.length) {
  const url = queue.shift();
  if (seen.has(url)) continue;
  seen.add(url);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
    if (!r.ok) { failed++; console.log("FAIL", r.status, url); continue; }
    const type = (r.headers.get("content-type") || "application/octet-stream").split(";")[0].trim();
    const buf = Buffer.from(await r.arrayBuffer());
    const file = createHash("sha1").update(url).digest("hex").slice(0, 16) + "." + (EXT[type] || "bin");
    writeFileSync(join(out, file), buf);
    manifest[url] = { file, type };
    ok++;
    console.log("ok", type, buf.length, url.slice(0, 110));
    if (type === "application/json") {
      for (const m of buf.toString("utf8").matchAll(/https:\/\/(?:pbs|abs|video)\.twimg\.com\/[^"\s\\]+/g)) {
        queue.push(m[0]);
        // react-tweet asks for media in named sizes.
        if (m[0].includes("/media/")) {
          const u = new URL(m[0]), ext = u.pathname.split(".").pop();
          for (const size of ["small", "medium", "large", "360x360", "900x900"]) queue.push(`${u.origin}${u.pathname.replace(/\.\w+$/, "")}?format=${ext}&name=${size}`);
        }
      }
    }
  } catch (e) { failed++; console.log("ERR", url, e.message); }
}
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 1));
console.log(`done: ${ok} saved, ${failed} failed -> ${out}`);
