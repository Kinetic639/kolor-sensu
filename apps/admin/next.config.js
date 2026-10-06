import process from "node:process";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

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
  // The site's painted assets (watercolor splashes, masks, the portrait
  // placeholder), for the profile preview: served by the public site, not
  // copied here.
  async rewrites() {
    return [
      {
        source: "/watercolor/:path*",
        destination: `${webUrl}/watercolor/:path*`,
      },
      {
        source: "/images/specjalista.svg",
        destination: `${webUrl}/images/specjalista.svg`,
      },
    ];
  },
  experimental: {
    // A page seen in the last 30 s (e.g. the table again after closing a
    // visit) comes back from the browser's memory instead of the server.
    // Changes still show at once: actions and live updates refresh it.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
