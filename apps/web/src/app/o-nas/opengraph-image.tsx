import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og-image";

export const alt = "O nas · Kolor Sensu";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default function Image() {
  return renderOgImage("O nas");
}
