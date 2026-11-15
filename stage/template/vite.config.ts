import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    alias: [
      { find: /^next\/image$/, replacement: r("./src/shims/image.tsx") },
      { find: /^next\/link$/, replacement: r("./src/shims/link.tsx") },
      { find: /^next\/dynamic$/, replacement: r("./src/shims/dynamic.tsx") },
      { find: /^next\/navigation$/, replacement: r("./src/shims/navigation.ts") },
      { find: /^cn$/, replacement: r("./src/lib/utils.ts") },
      { find: /^@\//, replacement: r("./src") + "/" },
    ],
  },
  define: { "process.env": "{}" },
  optimizeDeps: { entries: ["src/**/*.tsx"] },
  server: { port: Number(process.env.PORT || 5180), strictPort: true, hmr: { overlay: false } },
});
