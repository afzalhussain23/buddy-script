import type { NextConfig } from "next";

const remotePatterns: URL[] = [];
const r2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();

// remotePatterns is frozen into the build, so a missing var here silently ships
// a feed that throws "hostname is not configured" on every R2 post image. Fail
// the production build loudly instead.
if (!r2PublicBaseUrl && process.env.NODE_ENV === "production") {
  throw new Error(
    "R2_PUBLIC_BASE_URL must be set at build time so next/image can serve R2 post images.",
  );
}

if (r2PublicBaseUrl) {
  const r2Url = new URL(r2PublicBaseUrl);
  r2Url.pathname = `${r2Url.pathname.replace(/\/$/, "")}/**`;
  remotePatterns.push(r2Url);
}

const nextConfig: NextConfig = {
  images: { remotePatterns },
  experimental: {
    serverActions: { bodySizeLimit: "64kb" },
    proxyClientMaxBodySize: "64kb",
  },
};

export default nextConfig;
