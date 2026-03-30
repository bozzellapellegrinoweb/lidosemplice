import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Anthropic SDK usa moduli Node.js nativi — non bundlare con webpack
  serverExternalPackages: ["@anthropic-ai/sdk"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
