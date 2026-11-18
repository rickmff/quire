import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { list, put } from "@vercel/blob";

const ROOT = process.argv[2] ?? process.cwd();
const DIR = join(ROOT, "public/previews");

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Set BLOB_READ_WRITE_TOKEN (vercel env pull) before uploading previews.");
  process.exit(1);
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

const remote = new Map();
let cursor;
do {
  const page = await list({ prefix: "previews/", cursor, limit: 1000 });
  for (const b of page.blobs) remote.set(b.pathname, b.size);
  cursor = page.cursor;
} while (cursor);

const files = walk(DIR).map((path) => ({ path, name: `previews/${relative(DIR, path).split(sep).join("/")}` }));
const changed = files.filter((f) => remote.get(f.name) !== statSync(f.path).size);

let done = 0;
const queue = [...changed];
const worker = async () => {
  for (let f = queue.shift(); f; f = queue.shift()) {
    await put(f.name, readFileSync(f.path), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 86_400,
    });
    done++;
    if (done % 50 === 0) console.log(`${done}/${changed.length}`);
  }
};
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`uploaded ${changed.length} of ${files.length} previews, ${files.length - changed.length} unchanged`);
