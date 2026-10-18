import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteName, siteTagline } from "@/content/site";

// The picture a shared link shows (Open Graph, 1200 × 630): the site's
// paper with its pink-to-sage watercolor, faint, the owl, the name with
// "Sensu" in brand green, the tagline, and the page's own title above the
// name (none on the home page). Made at build time by each page's
// opengraph-image.tsx; the fonts are the site's (OFL, assets/fonts).

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";

const colors = {
  paper: "#f8f7f3",
  ink: "#16302f",
  green: "#45684a",
  pink: "#9c5754",
  muted: "#566461",
};

const file = (...path: string[]) => readFile(join(process.cwd(), ...path));

export async function renderOgImage(title?: string) {
  // Static WOFF files (the image renderer reads no variable fonts or
  // WOFF2), latin and latin-ext for the Polish letters.
  const [lora, loraExt, figtree, figtreeExt, logo, wash] = await Promise.all([
    file("assets", "fonts", "lora-latin-600-normal.woff"),
    file("assets", "fonts", "lora-latin-ext-600-normal.woff"),
    file("assets", "fonts", "figtree-latin-500-normal.woff"),
    file("assets", "fonts", "figtree-latin-ext-500-normal.woff"),
    file("public", "brand", "kolor-sensu-logo.png"),
    // watercolor-background.webp as PNG (the renderer reads no WebP).
    file("assets", "og-wash.png"),
  ]);
  const png = (data: Buffer) =>
    `data:image/png;base64,${data.toString("base64")}`;
  const logoSrc = png(logo);
  const washSrc = png(wash);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: colors.paper,
        fontFamily: "Figtree",
      }}
    >
      {/* The site's watercolor, faint, behind the words. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain img */}
      <img
        alt=""
        height={564}
        src={washSrc}
        style={{ position: "absolute", right: -90, top: 40, opacity: 0.38 }}
        width={900}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 56,
          padding: "0 96px",
          width: "100%",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain img */}
        <img alt="" height={300} src={logoSrc} width={330} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {title ? (
            <div
              style={{
                color: colors.pink,
                fontSize: 30,
                fontWeight: 500,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              {title}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontFamily: "Lora",
              fontSize: 104,
              lineHeight: 1,
              color: colors.ink,
            }}
          >
            {siteName.split(" ")[0]}&nbsp;
            <span style={{ color: colors.green }}>
              {siteName.split(" ").slice(1).join(" ")}
            </span>
          </div>
          <div style={{ color: colors.muted, fontSize: 38 }}>{siteTagline}</div>
        </div>
      </div>
    </div>,
    {
      ...ogImageSize,
      fonts: [
        { name: "Lora", data: lora, style: "normal", weight: 600 },
        { name: "Lora", data: loraExt, style: "normal", weight: 600 },
        { name: "Figtree", data: figtree, style: "normal", weight: 500 },
        { name: "Figtree", data: figtreeExt, style: "normal", weight: 500 },
      ],
    },
  );
}
