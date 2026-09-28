/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@repo/app-runtime",
    "@repo/scheduling",
    "@repo/supabase",
    "@repo/ui",
  ],
  typedRoutes: true,
};

export default nextConfig;
