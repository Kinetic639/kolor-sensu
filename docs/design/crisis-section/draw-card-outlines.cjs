// Reproducible brush outlines with tapered, overlapping top-center ends.
// The gaps, small deviations and low-opacity bristles are intentional.
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "../../..");
const nextRequire = createRequire(
  require.resolve("next/package.json", {
    paths: [path.join(root, "apps/web")],
  }),
);
const sharp = nextRequire("sharp");
const output = path.join(root, "apps/web/public/crisis");

function outline(variant, color, { offset, mirrored }) {
  // Uneven but quiet curvature: no wobbly cartoon frame or perfect corners.
  const paths = [
    `M ${470 + offset} 38 C ${490 + offset} 41 ${504 + offset} 35 ${526 + offset} 31 C ${601 + offset * 0.35} 25 674 26 742 28 C 811 29 873 22 915 31 C 937 36 935 69 934 104 C 931 194 938 269 933 351 S 938 511 930 588 C 928 611 902 610 876 610 C 729 614 621 606 494 611 S 244 608 116 611 C 73 612 36 615 29 596 C 23 579 30 524 28 473 C 23 357 31 263 27 163 C 25 112 22 68 32 43 C 39 25 68 29 105 28 C 204 25 286 32 381 27 C ${431 + offset * 0.5} 25 ${470 + offset} 35 ${496 + offset} 24`,
    `M ${465 + offset} 40 C ${491 + offset} 43 ${506 + offset} 36 ${530 + offset} 32 C ${608 + offset * 0.35} 27 679 31 748 27 C 815 25 878 28 914 34 C 936 40 930 65 932 99 C 938 211 928 301 934 398 S 930 519 934 580 C 937 608 908 611 872 608 C 745 603 635 616 511 609 S 277 614 157 609 C 107 606 56 617 36 606 C 20 597 29 565 26 532 C 21 415 31 326 27 223 S 30 87 31 58 C 32 31 58 31 91 31 C 198 28 299 34 404 29 C ${445 + offset * 0.5} 28 ${478 + offset} 34 ${506 + offset} 21`,
  ];
  const d = paths[variant];
  const bristles = [
    [0, 0, 5, 0.8],
    [0.85, -0.8, 0.7, 0.26],
    [-0.9, 0.6, 0.6, 0.23],
    [0.3, 1.7, 0.65, 0.16],
  ];
  // The two tips bypass each other. One stays nearly horizontal; the
  // other lifts gently. They taper rather than curl into a hook.
  const tips = [
    "M 438 40 Q 455 40 470 35.5 L 470 40.5 Q 454 42 438 40 Z M 495 21.7 Q 507 18 514 14 Q 508 23 497 26.3 Z",
    "M 435 42 Q 450 43 465 37.5 L 465 42.5 Q 449 45 435 42 Z M 505 18.7 Q 516 14 523 10 Q 516 20 507 23.3 Z",
  ];
  let coordinate = 0;
  const shiftedTips = tips[variant].replace(/-?\d+(?:\.\d+)?/g, (value) => {
    const isX = coordinate++ % 2 === 0;
    return isX ? String(Number(value) + offset) : value;
  });
  const transform = mirrored ? ' transform="translate(960 0) scale(-1 1)"' : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640" preserveAspectRatio="none"><g${transform}>${bristles
    .map(
      ([x, y, width, opacity]) =>
        `<path data-outline-stroke="" d="${d}" transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="${width}" stroke-opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("")}${shiftedTips
    .split(/(?=M )/)
    .filter(Boolean)
    .map(
      (tip, index) =>
        `<path data-outline-tip="${index === 0 ? "start" : "end"}" d="${tip}" fill="${color}" fill-opacity="0.8"/>`,
    )
    .join("")}</g></svg>`;
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  for (const [color, pigment] of [
    ["pink", "#b7807e"],
    ["green", "#769471"],
  ]) {
    for (let variant = 0; variant < 2; variant++) {
      const name = `crisis-outline-${color}-${variant + 1}`;
      // Four independent joins. The two green frames reverse which end
      // sits above the other; reflection also varies their side contours.
      const configurations =
        color === "pink"
          ? [
              { offset: -70, mirrored: false },
              { offset: 80, mirrored: false },
            ]
          : [
              { offset: 50, mirrored: true },
              { offset: 15, mirrored: true },
            ];
      const svg = outline(variant, pigment, configurations[variant]);
      fs.writeFileSync(path.join(output, `${name}.svg`), svg);
      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      fs.writeFileSync(path.join(output, `${name}.png`), png);
      await sharp(png)
        .webp({ lossless: true })
        .toFile(path.join(output, `${name}.webp`));

      // Static paint follows the same organic contour as the animated
      // outline. Enlarge the wash before clipping so its ragged outer
      // edges do not become a second silhouette inside the card.
      const d = svg.match(/data-outline-stroke="" d="([^"]+)"/)[1];
      const mirror = configurations[variant].mirrored
        ? ' transform="translate(960 0) scale(-1 1)"'
        : "";
      const mask = await sharp(
        Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><g${mirror}><path d="${d} Z" fill="white"/></g></svg>`,
        ),
      )
        .png()
        .toBuffer();
      const fill = await sharp(
        path.join(output, `crisis-wash-${color}-${variant + 1}.png`),
      )
        .resize(1248, 832)
        .extract({ left: 144, top: 96, width: 960, height: 640 })
        .composite([{ input: mask, blend: "dest-in" }])
        .png()
        .toBuffer();
      const fillName = `crisis-fill-${color}-${variant + 1}`;
      fs.writeFileSync(path.join(output, `${fillName}.png`), fill);
      await sharp(fill)
        .webp({ quality: 88, alphaQuality: 100 })
        .toFile(path.join(output, `${fillName}.webp`));
    }
  }
  const art = ["pink-1", "green-1", "green-2", "pink-2"].map((name) => {
    const svg = fs.readFileSync(
      path.join(output, `crisis-outline-${name}.svg`),
      "utf8",
    );
    return {
      name,
      d: svg.match(/data-outline-stroke="" d="([^"]+)"/)[1],
      transform: svg.match(/<g transform="([^"]+)"/)?.[1] ?? "",
      start: svg.match(/data-outline-tip="start" d="([^"]+)"/)[1],
      end: svg.match(/data-outline-tip="end" d="([^"]+)"/)[1],
    };
  });
  const prettier = require(require.resolve("prettier", { paths: [root] }));
  fs.writeFileSync(
    path.join(root, "packages/ui/src/public-site/crisis-card-art.ts"),
    await prettier.format(
      `// Generated from the approved crisis outline SVG assets.\nexport const crisisCardArt = ${JSON.stringify(art)} as const;\n`,
      { parser: "typescript" },
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
