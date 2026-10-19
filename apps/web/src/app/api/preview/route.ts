import { verifyPreviewToken } from "@repo/app-runtime/cms-preview";
import { draftMode } from "next/headers";

// The CMS preview's way in: the admin portal's "Podgląd" opens
// /api/preview?token=… in a new tab. A good token (signed with the shared
// CMS_PREVIEW_SECRET, a couple of minutes old at most, naming a path on this
// site) turns Draft Mode on and sends the browser to that path, which then
// shows the CMS drafts. Anything else is refused and changes nothing.

export const dynamic = "force-dynamic";

const NO_STORE = {
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
};

function refuse(status: number, message: string) {
  return new Response(message, {
    status,
    headers: { ...NO_STORE, "content-type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const secret = process.env.CMS_PREVIEW_SECRET;
  if (!secret) return refuse(500, "Podgląd nie jest skonfigurowany.");

  const token = new URL(request.url).searchParams.get("token") ?? "";
  const check = verifyPreviewToken(token, { secret });
  if (!check.ok) {
    return refuse(
      401,
      check.reason === "expired"
        ? "Link do podglądu wygasł. Otwórz podgląd ponownie z CMS."
        : "Nieprawidłowy link do podglądu.",
    );
  }

  (await draftMode()).enable();
  // Relative: the browser stays on this site, whatever the path says.
  return new Response(null, {
    status: 307,
    headers: { ...NO_STORE, location: check.path },
  });
}
