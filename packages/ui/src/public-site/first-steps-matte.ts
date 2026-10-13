// The matte of FirstSteps' brush stroke (first-steps.tsx), after #11's
// scroll story and built like WatercolorImage's paint matte
// (watercolor-paint-matte.ts):
//
//   <mask>       referenced by the stroke's mask-image: url(#…)
//     time map   one opaque grey image over the whole stroke: when each
//                pixel gets paint (black first). Generated with the
//                stroke (generate-first-steps-ribbon.mjs): from both sides
//                to the middle, frayed along the bristles.
//     filter     shows the pixels whose time has come (a threshold on the
//                grey), with a short soft ramp: a ragged brush front, not
//                a moving edge. The band moves the threshold with scroll.

const SVG_NS = "http://www.w3.org/2000/svg";
let matteCount = 0;

export interface ScrollMatte {
  /** mask-image value for the layer. */
  url: string;
  /** Whether its time map has loaded (before that it would show all). */
  readonly ready: boolean;
  /** Moves the paint front: 0 nothing painted, 1 everything. */
  set(front: number): void;
  remove(): void;
}

// Colour matrix that shows the pixels with grey ≤ front: alpha =
// sharpness × (front − grey), clamped by the filter.
function frontValues(sharpness: number, front: number) {
  // Run a little past both ends, so 0 shows nothing and 1 everything.
  const f = -1 / sharpness + front * (1 + 2 / sharpness);
  const offset = Math.round(sharpness * f * 1000) / 1000;
  return `0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ${-sharpness} 0 0 0 ${offset}`;
}

/**
 * A matte over its layer's box, drawing `timeSrc` (any size: it is
 * stretched over the box), in its own hidden <svg> appended to `host`.
 */
export function createScrollMatte(
  host: Element,
  timeSrc: string,
  {
    sharpness = 32,
    onReady,
  }: { sharpness?: number; onReady?: () => void } = {},
): ScrollMatte {
  const document = host.ownerDocument;
  const id = `ks-steps-matte-${++matteCount}`;
  const element = <K extends keyof SVGElementTagNameMap>(
    name: K,
    attributes: Record<string, string | number>,
  ) => {
    const node = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) {
      node.setAttribute(key, String(value));
    }
    return node;
  };

  // The map is drawn in a 1000 x 1000 space scaled onto the box, so the
  // filter's region is plain user space.
  const size = 1000;
  const svg = element("svg", {
    class: "ks-steps__matte",
    width: 0,
    height: 0,
    "aria-hidden": "true",
    focusable: "false",
  });
  const mask = element("mask", {
    id,
    "mask-type": "alpha",
    maskUnits: "objectBoundingBox",
    maskContentUnits: "objectBoundingBox",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
  const filter = element("filter", {
    id: `${id}-front`,
    filterUnits: "userSpaceOnUse",
    x: 0,
    y: 0,
    width: size,
    height: size,
    "color-interpolation-filters": "sRGB",
  });
  const front = element("feColorMatrix", {
    type: "matrix",
    values: frontValues(sharpness, 0),
  });
  filter.append(front);
  const group = element("g", {
    transform: `scale(${1 / size})`,
    filter: `url(#${filter.id})`,
  });
  const map = element("image", {
    width: size,
    height: size,
    preserveAspectRatio: "none",
  });
  let ready = false;
  map.addEventListener(
    "load",
    () => {
      ready = true;
      onReady?.();
    },
    { once: true },
  );
  map.setAttribute("href", timeSrc);
  group.append(map);
  mask.append(group);
  const defs = element("defs", {});
  defs.append(filter, mask);
  svg.append(defs);
  host.append(svg);

  let last = -1;
  return {
    url: `url(#${id})`,
    get ready() {
      return ready;
    },
    set(value) {
      // A thousandth is below what the 8-bit map can show.
      const rounded = Math.round(value * 1000) / 1000;
      if (rounded === last) return;
      last = rounded;
      front.setAttribute("values", frontValues(sharpness, rounded));
    },
    remove() {
      svg.remove();
    },
  };
}
