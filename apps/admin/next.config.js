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
  transpilePackages: ["@repo/app-runtime", "@repo/supabase", "@repo/ui"],
  typedRoutes: true,
};

export default nextConfig;
