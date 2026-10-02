import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // undici is used directly (custom DNS-guarded Agent); keep it as a real node_module.
  serverExternalPackages: ["undici"],
  // Read at runtime with fs (lib/optout.ts); make sure it ships with the functions that check it.
  outputFileTracingIncludes: {
    "/r/[domain]": ["./data/optout.txt"],
    "/r/[domain]/opengraph-image": ["./data/optout.txt"],
    "/api/scan": ["./data/optout.txt"],
  },
};

export default nextConfig;
