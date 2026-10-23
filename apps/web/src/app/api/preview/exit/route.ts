import { isSafePreviewPath } from "@repo/app-runtime/cms-preview";
import { draftMode } from "next/headers";

// "Zakończ podgląd": turns Draft Mode off and goes back to the page the
// admin was on (a path on this site only, else the homepage), now as
// visitors see it. A form posts here; a GET (a typed address) works too.

export const dynamic = "force-dynamic";

async function exit(path: unknown) {
  (await draftMode()).disable();
  return new Response(null, {
    status: 303,
    headers: {
      "cache-control": "no-store",
      location: isSafePreviewPath(path) ? path : "/",
    },
  });
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  return exit(form?.get("sciezka"));
}

export async function GET(request: Request) {
  return exit(new URL(request.url).searchParams.get("sciezka"));
}
