import { readSiteContentDraft, withSiteContentDrafts } from "@repo/supabase";
import { draftMode } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";
import { createSecretClient } from "@/lib/supabase/secret";

// The CMS preview (docs/architecture/cms-domain.md, "Preview on the site"):
// an admin who opened it from the portal browses the site in Next's Draft
// Mode, and the site then shows the CMS drafts instead of the published
// content. Visitors never have Draft Mode: the pages they get stay
// prerendered and show only what is published.

/**
 * True while the request is in the CMS preview. False outside a request
 * (prerendering, generateStaticParams, the sitemap), where draftMode()
 * returns nothing or throws.
 */
export async function isPreview(): Promise<boolean> {
  try {
    return (await draftMode()).isEnabled;
  } catch {
    return false;
  }
}

/**
 * The client the site's loaders read with: the public one, under the
 * database's rules. In the preview, the same client reads the CMS sections'
 * drafts (and only those) through the service-role key, on the server.
 */
export async function createReadClient() {
  const client = createPublicClient();
  if (!(await isPreview())) return client;
  return withSiteContentDrafts(client, (key) =>
    readSiteContentDraft(createSecretClient(), key),
  );
}
