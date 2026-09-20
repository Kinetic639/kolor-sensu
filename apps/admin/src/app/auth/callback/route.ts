import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/";

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=invalid-callback", requestUrl.origin),
    );
  }

  const client = await createClient();
  const { error } = await client.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=invalid-callback", requestUrl.origin),
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
