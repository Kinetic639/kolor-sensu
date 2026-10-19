import {
  previewEntryUrl,
  signPreviewToken,
} from "@repo/app-runtime/cms-preview";
import {
  CMS_PAGE_SITE_PATHS,
  parseCmsPreviewPage,
} from "@/features/cms/preview";
import { requirePortalRole } from "@/lib/auth";

// The CMS's "Podgląd" (a link opening a new tab): for a signed-in admin,
// signs a token for the page's path on the site with CMS_PREVIEW_SECRET and
// sends the tab to the site's /api/preview, which turns the preview on.
// Outside (protected)/ (a route handler has no layout), so it checks the
// admin itself: anyone else goes to the login or "no access".

export const dynamic = "force-dynamic";

function refuse(status: number, message: string) {
  return new Response(message, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

export async function GET(request: Request) {
  await requirePortalRole();

  const page = parseCmsPreviewPage(
    new URL(request.url).searchParams.get("strona"),
  );
  if (!page) return refuse(404, "Nie ma takiej strony.");

  const secret = process.env.CMS_PREVIEW_SECRET;
  if (!secret) return refuse(500, "Podgląd nie jest skonfigurowany.");

  const token = signPreviewToken({ path: CMS_PAGE_SITE_PATHS[page], secret });
  return new Response(null, {
    status: 303,
    headers: {
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      location: previewEntryUrl(
        process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
        token,
      ),
    },
  });
}
