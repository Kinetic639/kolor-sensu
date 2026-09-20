import { createSupabaseServerClient } from "@repo/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { getPublicSupabaseEnvironment } from "./lib/supabase/environment";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const client = createSupabaseServerClient(getPublicSupabaseEnvironment(), {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) =>
        request.cookies.set(name, value),
      );
      response = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, options, value }) =>
        response.cookies.set(name, value, options),
      );
    },
  });

  await client.auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
