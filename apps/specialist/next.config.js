/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@repo/app-runtime",
    "@repo/scheduling",
    "@repo/supabase",
    "@repo/ui",
  ],
  typedRoutes: true,
  experimental: {
    // A page seen in the last 30 s (e.g. the table again after closing a
    // visit) comes back from the browser's memory instead of the server.
    // Changes still show at once: actions and live updates refresh it.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
