import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// `npm run build` runs the OpenNext build, so OpenNext must call Next directly
// instead of `npm run build`, or it would call itself.
export default {
  ...defineCloudflareConfig(),
  buildCommand: "npm run build:next",
};
