import { NextResponse, type NextRequest } from "next/server";
import {
  MEMORY_COOKIE,
  rememberedHref,
} from "@/features/booking/wizard-memory";

// The booking wizard's memory (#164): a visit to the wizard from elsewhere
// gets the visitor's last choices back, by a redirect to the full address.
// The cookie itself is written by the wizard's page, in the browser.

export function proxy(request: NextRequest) {
  if (request.method !== "GET") return NextResponse.next();
  const href = rememberedHref({
    searchParams: request.nextUrl.searchParams,
    memory: request.cookies.get(MEMORY_COOKIE)?.value ?? null,
    referer: request.headers.get("referer"),
    origin: request.nextUrl.origin,
  });
  return href
    ? NextResponse.redirect(new URL(href, request.url))
    : NextResponse.next();
}

export const config = { matcher: "/umow-wizyte" };
