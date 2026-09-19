import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Type safety is non-negotiable in production.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "2mb", // reduced from 5mb — we don't need that much
    },
  },

  // Security headers applied to every response
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Kiosk routes get their own CSP later; for now, allow inline styles for Tailwind
        source: "/kiosk/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },

  // Redirect old URL patterns to new ones
  async redirects() {
    return [
      { source: "/dashboard", destination: "/admin", permanent: true },
      { source: "/tv", destination: "/departures", permanent: true },
    ];
  },
};

export default nextConfig;
