import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "64kb" },
    proxyClientMaxBodySize: "64kb",
  },
};

export default nextConfig;
