import { writeFile } from "node:fs/promises";

// A solid centre meets short overlapping curved brush marks. Their varying
// coverage lets the coloured backplate show through without a blurred halo.
const point = (angle, radius) =>
  [512 + Math.cos(angle) * radius, 512 + Math.sin(angle) * radius]
    .map((value) => value.toFixed(2))
    .join(" ");
const outline =
  Array.from({ length: 720 }, (_, index) => {
    const angle = (index / 720) * Math.PI * 2;
    const radius =
      444 +
      Math.sin(angle * 5) * 2.5 +
      Math.sin(angle * 11) * 2.1 +
      Math.sin(angle * 23) * 1.3 +
      Math.sin(angle * 41) * 0.8;
    return `${index ? "L" : "M"}${point(angle, radius)}`;
  }).join(" ") + " Z";
function brushArc(start, length, radius, width, seed) {
  const side = (direction) =>
    Array.from({ length: 37 }, (_, index) => {
      const t = index / 36;
      const angle = start + length * t;
      const pressure = 0.2 + 0.8 * Math.sin(Math.PI * t) ** 0.55;
      const wobble =
        Math.sin(angle * 17 + seed) * 1.6 + Math.sin(angle * 37) * 0.6;
      return point(angle, radius + wobble + (direction * width * pressure) / 2);
    });
  return `M${side(1).join(" L")} L${side(-1).reverse().join(" L")} Z`;
}
const strokes = [];
// Keep the approved edge intact and repeat its outer photo filaments in two
// additional sparse rings, rather than cutting into the solid photograph.
for (let row = 0; row < 2; row++) {
  const count = row === 0 ? 38 : 25;
  for (let index = 0; index < count; index++) {
    strokes.push(
      `<path d="${brushArc(index * 2.399963 + row * 0.71, 0.08 + (index % 8) * 0.03, 501 + row * 7 + Math.sin(index * 1.7), 2 + (index % 3), index + row * 11)}" opacity="${0.2 + (index % 5) * 0.08}"/>`,
    );
  }
}
// The dense inner marks overlap the solid centre; outer filaments taper
// independently so the transition follows the physical motion of a brush.
for (let index = 0; index < 59; index++) {
  const start = index * 2.399963;
  strokes.push(
    `<path d="${brushArc(start, 0.19 + (index % 7) * 0.035, 452 + (index % 5), 27 + (index % 7), index)}" opacity=".96"/>`,
  );
  strokes.push(
    `<path d="${brushArc(start + 0.06, 0.13 + (index % 9) * 0.028, 470 + (index % 7), 16 + (index % 10), index + 3)}" opacity="${0.5 + (index % 4) * 0.12}"/>`,
  );
  strokes.push(
    `<path d="${brushArc(start + 0.02, 0.08 + (index % 8) * 0.03, 492 + (index % 6), 3 + (index % 6), index + 7)}" opacity="${0.2 + (index % 5) * 0.08}"/>`,
  );
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">

<g fill="white"><path d="${outline}"/>${strokes.join("\n")}</g>
</svg>\n`;
await writeFile(
  new URL(
    "../apps/web/public/watercolor/circle-concepts/photo-edge-mask-v6.svg",
    import.meta.url,
  ),
  svg,
);
