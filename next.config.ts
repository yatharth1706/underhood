import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // undici is used directly (custom DNS-guarded Agent); keep it as a real node_module.
  serverExternalPackages: ["undici"],
  // Read at runtime with fs (lib/optout.ts, lib/traffic.ts); make sure they ship with the functions that use them.
  outputFileTracingIncludes: {
    "/r/[domain]": ["./data/optout.txt", "./data/rank.json"],
    "/r/[domain]/opengraph-image": ["./data/optout.txt", "./data/rank.json"],
    "/api/scan": ["./data/optout.txt", "./data/rank.json"],
    "/compare/[a]/[b]": ["./data/optout.txt", "./data/rank.json"],
  },
};

export default nextConfig;
