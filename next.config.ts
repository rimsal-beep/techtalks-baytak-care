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
  async headers() {
    return [
      {
        // These pages have a one-time token in the URL, so stop the browser
        // from passing that URL on in the Referer header.
        source: "/reset-password",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/verify-email",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;