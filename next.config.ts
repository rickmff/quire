import type { NextConfig } from "next";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { withWorkflow } from "workflow/next";

const isDev = process.env.NODE_ENV !== "production";
const catalogVersion = createHash("sha256")
  .update(readFileSync("lib/catalog/data.json"))
  .update(process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "")
  .digest("hex")
  .slice(0, 12);

const previewsUrl = process.env.QUIRE_PREVIEWS_URL?.replace(/\/$/, "");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "script-src-attr 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const everywhere = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_CATALOG_VERSION: catalogVersion },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: previewsUrl ? [{ source: "/previews/:path*", destination: `${previewsUrl}/previews/:path*` }] : [],
    };
  },
  async headers() {
    return [
      { source: "/:path*", headers: everywhere },
      {
        source: "/((?!stage/).*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/api/catalog",
        has: [{ type: "query", key: "v" }],
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/stage/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default withWorkflow(nextConfig);
