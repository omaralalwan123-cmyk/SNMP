import type { NextConfig } from "next";

// Django backend (snmp_project). Requests to /api/* are proxied there so the
// browser talks to a single origin and no CORS setup is needed.
const API_URL = process.env.SNMP_API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        // Django routes end with a trailing slash
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*/`,
      },
    ];
  },
};

export default nextConfig;
