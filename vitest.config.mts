import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const exclude = ["node_modules/**", "stage/**", ".next/**", "capture/**", "extension/**"];

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "server-only": fileURLToPath(new URL("node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    projects: [
      { extends: true, test: { name: "node", include: ["**/*.test.ts"], exclude } },
      { extends: true, test: { name: "dom", include: ["**/*.test.tsx"], exclude, environment: "jsdom" } },
    ],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "components/app/use*.ts"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "lib/catalog/schema.ts", "lib/deal.ts"],
      reporter: ["text-summary", "html"],
      thresholds: {
        "lib/**": { lines: 85, statements: 85, functions: 85, branches: 80 },
        "components/app/**": { lines: 30, statements: 30, functions: 30, branches: 25 },
      },
    },
  },
});
