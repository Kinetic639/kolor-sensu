import { createPublicClient } from "@/lib/supabase/public";
import { getPublicCenterProfile } from "@repo/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getPublicCenterProfile(createPublicClient());
  if (!profile) {
    return NextResponse.json(null, { status: 404 });
  }
  return NextResponse.json(profile);
}
