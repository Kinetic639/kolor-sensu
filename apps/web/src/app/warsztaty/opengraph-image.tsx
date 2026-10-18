import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og-image";

export const alt = "Warsztaty · Kolor Sensu";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default function Image() {
  return renderOgImage("Warsztaty");
}
