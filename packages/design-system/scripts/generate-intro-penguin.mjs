#!/usr/bin/env node
// Generates the shapes of the animated penguin (the first-visit intro,
// SiteIntro in packages/ui/src/public-site/site-intro.tsx, and
// PenguinLoader in penguin-loader.tsx) from the logo
// (apps/web/public/brand/kolor-sensu-logo.svg, the source of truth), plus
// the parts the intro adds to it:
//
//   eyes     three states of one stroked path, all with the same commands so
//            they morph into each other: "open" (a plain arc), "blink" (the
//            arc straightened) and "smile" (the logo's wave). The right eye
//            mirrors the left.
//   petals   the bud: the leaf shape again, turned and enlarged about the
//            point where the leaves meet (pivot), plus a narrow centre leaf
//            standing on the axis behind them. The bud poses below were
//            chosen so the penguin, at its starting scale, is fully hidden.
//
// Coordinates: the logo's own (viewBox -25 -5 700 600, axis x = 325).
//
// Output: packages/ui/src/public-site/intro-penguin.data.ts
// Run:    pnpm --filter @repo/design-system generate:intro

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { stdout } from "node:process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const source = resolve(root, "apps/web/public/brand/kolor-sensu-logo.svg");
const target = resolve(
  root,
  "packages/ui/src/public-site/intro-penguin.data.ts",
);

const svg = readFileSync(source, "utf8");

function grab(pattern, what) {
  const match = svg.match(pattern);
  if (!match) throw new Error(`kolor-sensu-logo.svg: no ${what}`);
  return match[1];
}

const viewBox = grab(/<svg[^>]*viewBox="([^"]+)"/, "viewBox");
const ellipse = grab(/<g id="head">\s*<ellipse ([^/]+)\/>/, "head ellipse");
const head = {
  cx: Number(ellipse.match(/cx="([^"]+)"/)[1]),
  cy: Number(ellipse.match(/cy="([^"]+)"/)[1]),
  rx: Number(ellipse.match(/rx="([^"]+)"/)[1]),
  ry: Number(ellipse.match(/ry="([^"]+)"/)[1]),
};

const faceFill = grab(
  /<g id="face"[^>]*>\s*<path fill="[^"]+" stroke="none" d="([^"]+)"/,
  "face fill",
);
const faceLeft = grab(/id="face-left" d="([^"]+)"/, "left cheek");
const faceRight = grab(/id="face-right" d="([^"]+)"/, "right cheek");
const beak = grab(/<g id="beak">\s*<path fill="[^"]+" d="([^"]+)"/, "beak");
const leaf = (side) => ({
  shape: grab(
    new RegExp(`<g id="leaf-${side}">\\s*<path fill="[^"]+" d="([^"]+)"`),
    `${side} leaf`,
  ),
  tip: grab(
    new RegExp(
      `<g id="leaf-${side}">[\\s\\S]*?<path fill="#233b49" stroke="none" d="([^"]+)"`,
    ),
    `${side} tip`,
  ),
});
const feetGroup = grab(/<g id="feet"[^>]*>([\s\S]*?)<\/g>/, "feet");
const feet = [
  ...feetGroup.matchAll(
    /<path (?:fill="([^"]+)" )?(?:id="[^"]+" )?d="([^"]+)"/g,
  ),
].map(([, fill, d]) => ({ dark: !fill, d }));
if (feet.length !== 4)
  throw new Error("kolor-sensu-logo.svg: expected 4 foot paths");

// Where the two leaves meet, above the feet: everything turns and scales here.
const pivot = { x: 325, y: head.cy + head.ry };

// ---- eyes: seven points (M + two cubics) per state, left eye
const eyeStates = {
  open: [
    [166, 258],
    [172, 249],
    [185, 243],
    [201, 243],
    [217, 243],
    [230, 249],
    [236, 258],
  ],
  blink: [
    [166, 254],
    [178, 254],
    [190, 254],
    [201, 254],
    [212, 254],
    [224, 254],
    [236, 254],
  ],
  smile: [
    [166, 258],
    [180, 257],
    [191, 250],
    [205, 248],
    [218, 246],
    [227, 250],
    [236, 258],
  ],
};
const pathOf = (points) => {
  const p = points.map(([x, y]) => `${x} ${y}`);
  return `M${p[0]} C${p[1]} ${p[2]} ${p[3]} C${p[4]} ${p[5]} ${p[6]}`;
};
const mirror = (points) => points.map(([x, y]) => [2 * pivot.x - x, y]);
const eyes = Object.fromEntries(
  Object.entries(eyeStates).map(([state, points]) => [
    state,
    { left: pathOf(points), right: pathOf(mirror(points)) },
  ]),
);

// ---- centre leaf: two arcs from its foot to a sharp top on the axis
const centre = { top: 96, bottom: 560, halfWidth: 100 };
const h = centre.bottom - centre.top;
const r = ((h * h) / 4 + centre.halfWidth ** 2) / (2 * centre.halfWidth);
const centreLeaf =
  `M${pivot.x} ${centre.top} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${pivot.x} ${centre.bottom} ` +
  `A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${pivot.x} ${centre.top} Z`;

// ---- the closed bud (degrees clockwise for the left side, scale) and the
// penguin's scale inside it
const bud = {
  body: 0.8,
  top: { rotate: 38, scale: 1.15 },
  middle: { rotate: 20, scale: 1.12 },
};

const data = {
  viewBox,
  pivot,
  head,
  face: { fill: faceFill, left: faceLeft, right: faceRight },
  beak,
  leaves: { left: leaf("left"), right: leaf("right") },
  feet,
  eyes,
  centreLeaf,
  bud,
  colors: {
    ink: "#233b49",
    inkDark: "#1a2b35",
    head: "#3e5767",
    face: "#f3eae5",
    leaf: "#9dc495",
    // the head seen through a see-through leaf (fill, outline)
    leafHead: "#82a787",
    leafLine: "#5a7b67",
  },
};

const out = `// Generated by packages/design-system/scripts/generate-intro-penguin.mjs
// from apps/web/public/brand/kolor-sensu-logo.svg. Do not edit: change the
// logo (or the intro's eyes and bud there) and run
// \`pnpm --filter @repo/design-system generate:intro\`.
//
// The animated penguin (site-intro.tsx, penguin-loader.tsx), in the logo's own
// coordinates (axis x = ${pivot.x}): its parts, the three states of the
// eyes (same commands, so they morph), the bud's centre leaf, the closed
// bud's pose and the colours.

export const introPenguin = ${JSON.stringify(data, null, 2)} as const;
`;

writeFileSync(target, out);
stdout.write(`intro penguin -> ${target}\n`);
