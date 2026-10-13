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
      // Room photos: the public room-media bucket.
      {
        protocol: /** @type {"https" | "http"} */ (
          new URL(supabaseUrl).protocol.replace(":", "")
        ),
        hostname: new URL(supabaseUrl).hostname,
        pathname: "/storage/v1/object/public/room-media/**",
      },
      // The site's own photos (support areas): the public site-media bucket.
      {
        protocol: /** @type {"https" | "http"} */ (
          new URL(supabaseUrl).protocol.replace(":", "")
        ),
        hostname: new URL(supabaseUrl).hostname,
        pathname: "/storage/v1/object/public/site-media/**",
      },
    ]
  : [];

// Search engines index production only (Vercel sets VERCEL_ENV to
// "production" for main): DEV, staging and local runs ask them not to.
const indexable = process.env.VERCEL_ENV === "production";

/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/app-runtime", "@repo/ui"],
  typedRoutes: true,
  async headers() {
    return indexable
      ? []
      : [
          {
            source: "/:path*",
            headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
          },
        ];
  },
  images: {
    // AVIF first (about 20% smaller than WebP; slower only on the first,
    // uncached request), WebP for browsers without AVIF.
    formats: ["image/avif", "image/webp"],
    remotePatterns: storagePatterns,
  },
};

export default nextConfig;
