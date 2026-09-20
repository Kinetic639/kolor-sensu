import { createPublicClient } from "@/lib/supabase/public";
import { listPublicLocations } from "@repo/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const locations = await listPublicLocations(createPublicClient());
  return NextResponse.json(locations);
}
