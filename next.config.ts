import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    incomingRequests: false,
  },
  experimental: {
    serverActions: {
      // Photos may be up to 5 MB each and a request can hold several.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;