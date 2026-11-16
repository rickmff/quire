import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { existsSync, readdirSync } from "node:fs";
import type { Plugin } from "vite";
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
function publicBase(): Plugin {
  let base = "/";
  const files = existsSync(r("./public")) ? readdirSync(r("./public")) : [];
  return {
    name: "public-base",
    configResolved(c) {
      base = c.base;
    },
    transform(code, id) {
      if (base === "/" || id.includes("node_modules") || !files.length) return;
      let out = code;
      for (const f of files) for (const q of [`"`, `'`]) out = out.replaceAll(`${q}/${f}${q}`, `${q}${base}${f}${q}`);
      return out === code ? undefined : { code: out, map: null };
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwind(), publicBase()],
  resolve: {
    alias: [
      { find: /^next\/image$/, replacement: r("./src/shims/image.tsx") },
      { find: /^next\/link$/, replacement: r("./src/shims/link.tsx") },
      { find: /^next\/dynamic$/, replacement: r("./src/shims/dynamic.tsx") },
      { find: /^next\/navigation$/, replacement: r("./src/shims/navigation.ts") },
      { find: /^shiki$/, replacement: r("./src/shims/shiki.ts") },
      { find: /^cn$/, replacement: r("./src/lib/utils.ts") },
      { find: /^@\//, replacement: r("./src") + "/" },
    ],
  },
  define: { "process.env": "{}" },
  optimizeDeps: { entries: ["src/**/*.tsx"] },
  server: { port: Number(process.env.PORT || 5180), strictPort: true, hmr: { overlay: false } },
});
