import type { NextConfig } from "next";

const LANGS = ["en", "ar", "de", "es", "fr"];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    const langRewrites = LANGS.flatMap((lang) => [
      { source: `/${lang}/app`, destination: "/app.html" },
      { source: `/${lang}/app/:path*`, destination: "/app.html" },
    ]);
    return [
      { source: "/app", destination: "/app.html" },
      { source: "/app/:path*", destination: "/app.html" },
      ...langRewrites,
    ];
  },
};

export default nextConfig;
