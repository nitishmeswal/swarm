import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    turbo: {
      resolveAlias: {
        '@': '.',  // Map @/ to the root directory
      },
    },
  },
};

export default nextConfig;
