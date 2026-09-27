// Server-side only: it reads the revalidation secret. Used by both portals
// after saving data the public site shows.

export type WebRevalidationTarget =
  | { path: string; type?: "page" }
  /** Everything under the root layout: header, footer, every page. */
  | { path: "/"; type: "layout" };

/**
 * Asks the public site to refresh the given pages now instead of waiting for
 * its periodic revalidation. The data is already saved, so a failure here is
 * logged, not thrown: the site catches up on its own within minutes.
 */
export async function revalidateWeb(targets: WebRevalidationTarget[]) {
  const secret = process.env.CMS_REVALIDATE_SECRET;
  if (!secret) {
    console.warn("[revalidate-web] CMS_REVALIDATE_SECRET is not configured");
    return;
  }
  const url = new URL(
    "/api/revalidate",
    process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
  );

  await Promise.all(
    targets.map(async (target) => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify(target),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        console.warn(`[revalidate-web] ${target.path} failed:`, error);
      }
    }),
  );
}
