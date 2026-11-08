import type { NextConfig } from "next";

const backend = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

/**
 * The browser only ever talks to this origin. /api/* is proxied to Laravel,
 * so its session and XSRF cookies are first-party and images, CSV and ZIP
 * downloads stream through untouched. The "ZIP ready" email links to
 * /g/{token}/exports/{id} with a signature for that exact path, so it is
 * proxied as-is.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/api/:path*", destination: `${backend}/api/:path*` },
        { source: "/g/:token/exports/:export", destination: `${backend}/g/:token/exports/:export` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
