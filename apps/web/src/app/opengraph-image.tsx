import { ogImageContentType, ogImageSize, renderOgImage } from "@/lib/og-image";

export const alt = "Kolor Sensu, centrum psychoterapii i rozwoju";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default function Image() {
  return renderOgImage();
}
