import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // undici is used directly (custom DNS-guarded Agent); keep it as a real node_module.
  serverExternalPackages: ["undici"],
};

export default nextConfig;
