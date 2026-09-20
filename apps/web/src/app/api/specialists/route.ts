import { createPublicClient } from "@/lib/supabase/public";
import { listPublishedSpecialists } from "@repo/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const specialists = await listPublishedSpecialists(createPublicClient());
  return NextResponse.json(specialists);
}
