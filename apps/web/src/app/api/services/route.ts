import { createPublicClient } from "@/lib/supabase/public";
import { listPublicServices } from "@repo/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const services = await listPublicServices(createPublicClient());
  return NextResponse.json(services);
}
