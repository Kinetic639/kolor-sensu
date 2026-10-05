import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// A link made on the server (the invitation from the centre): its
// token signs the person in, then they go on (to set their password).

type LinkType = "invite" | "magiclink" | "recovery";
const TYPES = new Set<string>(["invite", "magiclink", "recovery"]);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as LinkType | null;
  const requestedNext = url.searchParams.get("next");
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/";

  if (!tokenHash || !type || !TYPES.has(type)) {
    return NextResponse.redirect(
      new URL("/login?error=invalid-callback", url.origin),
    );
  }

  const client = await createClient();
  const { error } = await client.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });
  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=invalid-callback", url.origin),
    );
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
