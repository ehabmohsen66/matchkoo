import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      { source: "/app", destination: "/app.html" },
    ];
  },
};

export default nextConfig;
