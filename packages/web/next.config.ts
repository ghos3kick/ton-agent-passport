import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@agent-passport/sdk"],
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
};

export default nextConfig;
