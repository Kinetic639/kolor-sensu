/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/app-runtime", "@repo/ui"],
  typedRoutes: true,
};

export default nextConfig;
