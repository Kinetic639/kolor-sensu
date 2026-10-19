import { isPreview } from "@/lib/preview";
import { PreviewBarView } from "./preview-bar-view";

/**
 * In the CMS preview only (Draft Mode): the bar over the page and a
 * `noindex` (React puts the meta tag in the head), so a preview is never
 * indexed. For visitors it renders nothing, and the page stays
 * prerendered: draftMode() reads as off while prerendering.
 */
export async function PreviewBar() {
  if (!(await isPreview())) return null;
  return (
    <>
      <meta content="noindex, nofollow" name="robots" />
      {/* Room under the footer, so the bar never covers its last line. */}
      <div aria-hidden="true" className="h-16" />
      <PreviewBarView />
    </>
  );
}
