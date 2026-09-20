import { createPublicClient } from "@/lib/supabase/public";
import { getPublicServiceBySlug } from "@repo/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(createPublicClient(), slug);

  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(service);
}
