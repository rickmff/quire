import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
      "@next/next/no-img-element": "off",
      "max-lines": ["error", { max: 400, skipBlankLines: true }],
    },
  },
  {
    files: ["components/Quire3D.tsx", "**/*.test.ts", "**/*.test.tsx", "e2e/**"],
    rules: { "max-lines": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/**",
    "stage/**",
    "capture/**",
    "extension/**",
    "node_modules/**",
    "coverage/**",
    "app/.well-known/workflow/**",
  ]),
]);
