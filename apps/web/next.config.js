import process from "node:process";

// Specialist photos are served from Supabase Storage (signed URLs of a
// private bucket); allow exactly that project's storage for next/image.
// An object pattern, not `new URL(...)`: a URL pattern also fixes the query
// string (to none), and every signed URL carries `?token=...`.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const storagePatterns = supabaseUrl
  ? [
      {
        protocol: /** @type {"https" | "http"} */ (
          new URL(supabaseUrl).protocol.replace(":", "")
        ),
        hostname: new URL(supabaseUrl).hostname,
        pathname: "/storage/v1/object/sign/**",
      },
    ]
  : [];

/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/app-runtime", "@repo/ui"],
  typedRoutes: true,
  images: {
    remotePatterns: storagePatterns,
  },
};

export default nextConfig;
