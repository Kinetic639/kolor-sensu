import { type CSSProperties, useId } from "react";
import type { OfferPaint } from "./offer-tile";

// Crops of separate, original brush droplets (not synthetic circles).
const droplets = [
  [269, 209, 38, 38],
  [240, 1181, 26, 26],
  [713, 86, 20, 20],
  [227, 277, 17, 16],
  [173, 705, 17, 16],
  [375, 132, 13, 13],
  [754, 122, 14, 15],
  [674, 129, 17, 17],
  [192, 323, 21, 21],
  [177, 577, 12, 11],
  [202, 823, 17, 17],
  [226, 1216, 15, 15],
] as const;

/** Seeded scattering stays stable during hydration, without rows or a frame. */
function scatter(seed: number) {
  let state = (seed + 1) * 2654435761;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const zones = [
    [10, 90, -3, 23],
    [80, 104, 15, 92],
    [10, 90, 88, 105],
    [-4, 20, 15, 92],
  ] as const;
  const points: [number, number][] = [];
  for (let i = 0; i < 32; i++) {
    const [x0, x1, y0, y1] = zones[i % 4]!;
    for (let attempt = 0; attempt < 300; attempt++) {
      const x = x0 + random() * (x1 - x0),
        y = y0 + random() * (y1 - y0);
      if (x > 14 && x < 86 && y > 30 && y < 86) continue;
      if (x > 40 && x < 60 && y > 14 && y < 30) continue;
      if (points.some(([px, py]) => Math.hypot(x - px, (y - py) * 1.6) < 10))
        continue;
      points.push([x, y]);
      break;
    }
  }
  return points;
}

function mixedSizes(positions: readonly (readonly number[])[], seed: number) {
  let state = (seed + 17) * 2246822519;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const order = positions.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  // Spread the larger droplets spatially rather than assigning sizes to zones.
  const large = [order[0]!];
  while (large.length < Math.floor(positions.length / 4)) {
    const next = order
      .filter((index) => !large.includes(index))
      .reduce((best, index) => {
        const distance = (candidate: number) =>
          Math.min(
            ...large.map((other) =>
              Math.hypot(
                positions[candidate]![0]! - positions[other]![0]!,
                (positions[candidate]![1]! - positions[other]![1]!) * 1.6,
              ),
            ),
          );
        return distance(index) > distance(best) ? index : best;
      });
    large.push(next);
  }
  const sizes = positions.map(() => [5, 6, 6.5, 7][Math.floor(random() * 4)]!);
  large.forEach((index, at) => {
    sizes[index] = at % 2 ? 11 : 9.5;
  });
  order
    .filter((index) => !large.includes(index))
    .slice(0, Math.floor(positions.length / 4))
    .forEach((index, at) => {
      sizes[index] = at % 2 ? 4.5 : 3.5;
    });
  return sizes;
}

export function PaintDropletAccents({
  paint,
  seed,
}: {
  paint: OfferPaint;
  seed: number;
}) {
  const id = `droplet-color-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const positions = scatter(seed).filter(([, y]) => y < 30 || y > 86);
  const sizes = mixedSizes(positions, seed);
  // Separate shuffle: reveal order does not follow positions or sizes.
  let revealState = (seed + 71) * 3266489917;
  const randomReveal = () => {
    revealState = (Math.imul(revealState, 1664525) + 1013904223) >>> 0;
    return revealState / 4294967296;
  };
  const order = positions.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(randomReveal() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const revealDelays: number[] = [];
  for (let start = 0; start < order.length; start += 3) {
    const delay = Math.floor(start / 3) * 190 + Math.round(randomReveal() * 20);
    order.slice(start, start + 3).forEach((index) => {
      revealDelays[index] = delay;
    });
  }
  return (
    <div
      className="ks-why-us__droplets"
      aria-hidden="true"
      data-tone={paint.startsWith("pink") ? "pink" : "green"}
    >
      <svg
        width="0"
        height="0"
        focusable="false"
        className="pointer-events-none absolute"
      >
        <defs>
          <filter id={id} colorInterpolationFilters="sRGB">
            <feFlood floodColor="currentColor" result="ink" />
            <feComposite in="ink" in2="SourceAlpha" operator="in" />
          </filter>
        </defs>
      </svg>
      {positions.map(([x, y], index) => {
        const box = droplets[(index * 5 + seed * 3) % droplets.length]!;
        const size = sizes[index]!;
        const sign = (index + seed) % 2 ? -1 : 1;
        return (
          <svg
            key={index}
            className="ks-why-us__droplet"
            viewBox={box.join(" ")}
            focusable="false"
            style={
              {
                left: `${x}%`,
                top: `${y}%`,
                width: `${size}px`,
                height: `${(size * box[3]) / box[2]}px`,
                "--droplet-duration": `${4.5 + ((index * 7 + seed * 3) % 29) / 10}s`,
                "--droplet-delay": `${-(index * 1.73 + seed * 2.31)}s`,
                "--droplet-enter-delay": `${revealDelays[index]}ms`,
                "--droplet-x": `${sign * (1.2 + (index % 3) * 0.2)}px`,
                "--droplet-y": `${(index % 3 ? 1 : -1) * (1.3 + (index % 4) * 0.1)}px`,
                "--droplet-opacity": index % 5 === 2 ? 0.5 : 1,
                filter: `url(#${id})`,
              } as CSSProperties
            }
          >
            <image
              href="/watercolor/why-us-sage-1-droplets.webp"
              width="1086"
              height="1448"
            />
          </svg>
        );
      })}
    </div>
  );
}
