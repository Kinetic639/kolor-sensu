import { getSiteContentDraftVersion } from "@repo/supabase";
import { NextResponse } from "next/server";
import { isPreview } from "@/lib/preview";
import { createSecretClient } from "@/lib/supabase/secret";

// The preview bar asks here every few seconds when the CMS content last
// changed; when the answer moves (the admin saved a draft) it refreshes the
// page. Only in the preview: without Draft Mode's cookie it says nothing.

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };

export async function GET() {
  if (!(await isPreview())) {
    return NextResponse.json(
      { error: "Not in preview" },
      { status: 401, headers: NO_STORE },
    );
  }
  try {
    const version = await getSiteContentDraftVersion(createSecretClient());
    return NextResponse.json({ version }, { headers: NO_STORE });
  } catch (error) {
    console.error("[preview] version failed:", error);
    return NextResponse.json(
      { error: "Unavailable" },
      { status: 503, headers: NO_STORE },
    );
  }
}
