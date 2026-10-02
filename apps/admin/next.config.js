import process from "node:process";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: new URL(supabaseUrl).protocol.replace(":", ""),
            hostname: new URL(supabaseUrl).hostname,
            pathname: "/storage/v1/object/sign/**",
          },
        ]
      : [],
  },
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
