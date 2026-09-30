import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow self-signed certs from DevNet sandbox in development
  // (NODE_TLS_REJECT_UNAUTHORIZED is set in the Cisco client as well)
};

export default nextConfig;
