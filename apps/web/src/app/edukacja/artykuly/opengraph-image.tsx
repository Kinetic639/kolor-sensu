import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og-image";

export const alt = "Artykuły · Kolor Sensu";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default function Image() {
  return renderOgImage("Artykuły");
}
