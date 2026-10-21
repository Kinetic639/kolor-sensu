import { getEbook } from "@/lib/education-data";
import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og-image";

// An e-book's link preview without a cover or a sharing picture of its
// own: its title on the site's card (the page's own image wins when set).

export const alt = "E-book · Kolor Sensu";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ebook = await getEbook(slug);
  return renderOgImage(ebook?.title ?? "E-booki");
}
