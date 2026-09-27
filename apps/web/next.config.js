import process from "node:process";

// Specialist photos are served from Supabase Storage (signed URLs of a
// private bucket); allow exactly that project's storage for next/image.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const storagePatterns = supabaseUrl
  ? [new URL("/storage/v1/object/sign/**", supabaseUrl)]
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
