import { createPublicClient } from "@/lib/supabase/public";
import { listPublicSpecialistOffersForService } from "@repo/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const offers = await listPublicSpecialistOffersForService(
    createPublicClient(),
    slug,
  );
  return NextResponse.json(offers);
}
