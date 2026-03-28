import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  // Ensure native addon is copied into `.next/standalone` for Docker deploys.
  outputFileTracingIncludes: {
    "*": ["./node_modules/better-sqlite3/**/*"],
  },
};

export default nextConfig;
