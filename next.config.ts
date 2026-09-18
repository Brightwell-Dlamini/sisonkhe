import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // Large client components (SuperAdmin, FleetManager) — keep them client-only
  // and avoid accidental server imports of browser-only APIs.
};

export default nextConfig;
