import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og-image";

export const alt = "Pliki cookies · Kolor Sensu";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default function Image() {
  return renderOgImage("Pliki cookies");
}
