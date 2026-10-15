import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    incomingRequests: false,
  },
  experimental: {
    serverActions: {
      // Safety net: photos are shrunk in the browser first.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;