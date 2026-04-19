import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/", destination: "/onboarding.html" },
      { source: "/pathway", destination: "/pathway.html" },
    ];
  },
};

export default nextConfig;
