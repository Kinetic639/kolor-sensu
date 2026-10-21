// SupportAreas' motion (support-areas.tsx), run once GSAP is loaded:
//
//   fall in   the drops land one by one, as paint dropped on paper, when
//             the section is first reached;
//   drift     while the section crosses the screen the drops rise at two
//             depths ("near" a little, "far" more) and the blot's wash
//             sinks against them, so the paint sits on layers of paper;
//   lean      a mouse over the stage pulls the drops after it and moves
//             the photo inside the blot's edge the other way, as through
//             a window.
//
// And the thread: a pink line from the chosen drop to the blot, drawn
// again whenever another drop is chosen and kept on the drops as they
// move. Under reduced motion only the thread is drawn, without drawing in.

import type { GsapKit } from "./lazy-gsap";
import { matches } from "./reveal-support";

/** How far drops and wash drift either side of rest, in px. */
export const AREA_DRIFT = { near: 90, far: 200, wash: 90, center: 30 };

/** How far the mouse leans the layers, in px, at the stage's edge. */
const LEAN = { near: 10, far: 24, picture: -14, wash: -20 };

/**
 * Lays the thread from the chosen drop to the blot's edge, a gentle arc
 * with a dot at the drop; `draw` draws it in from the drop (skipped under
 * reduced motion).
 */
export function drawThread(root: HTMLElement, draw: boolean) {
  const svg = root.querySelector<SVGSVGElement>(".ks-areas__thread");
  const line = svg?.querySelector<SVGPathElement>(".ks-areas__thread-line");
  const dot = svg?.querySelector<SVGCircleElement>(".ks-areas__thread-dot");
  const center = root.querySelector<HTMLElement>(".ks-areas__center");
  const drop = root.querySelector<HTMLElement>(
    '.ks-areas__dot[aria-pressed="true"] .ks-areas__drop',
  );
  if (!svg || !line || !dot || !center || !drop) return;

  const frame = root.getBoundingClientRect();
  if (!frame.width) return;
  const a = drop.getBoundingClientRect();
  const b = center.getBoundingClientRect();
  const from = {
    x: a.left + a.width / 2 - frame.left,
    y: a.top + a.height / 2 - frame.top,
  };
  const to = {
    x: b.left + b.width / 2 - frame.left,
    y: b.top + b.height / 2 - frame.top,
  };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (!length) return;
  const ux = dx / length;
  const uy = dy / length;
  // From just outside the drop to just inside the blot's ragged edge.
  const start = {
    x: from.x + ux * a.width * 0.46,
    y: from.y + uy * a.height * 0.46,
  };
  const end = { x: to.x - ux * b.width * 0.47, y: to.y - uy * b.height * 0.47 };
  const span = Math.hypot(end.x - start.x, end.y - start.y);
  // Bowed to one side, always the same way round.
  const bow = span * 0.22;
  const control = {
    x: (start.x + end.x) / 2 - uy * bow,
    y: (start.y + end.y) / 2 + ux * bow,
  };

  svg.setAttribute("viewBox", `0 0 ${frame.width} ${frame.height}`);
  line.setAttribute(
    "d",
    `M${start.x.toFixed(1)} ${start.y.toFixed(1)} Q${control.x.toFixed(1)} ${control.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
  );
  dot.setAttribute("cx", start.x.toFixed(1));
  dot.setAttribute("cy", start.y.toFixed(1));

  if (
    !draw ||
    typeof line.animate !== "function" ||
    typeof line.getTotalLength !== "function" ||
    matches("(prefers-reduced-motion: reduce)")
  ) {
    return;
  }
  const total = line.getTotalLength();
  line.animate(
    [
      { strokeDasharray: `${total}`, strokeDashoffset: `${total}` },
      { strokeDasharray: `${total}`, strokeDashoffset: "0" },
    ],
    { duration: 900, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
  dot.animate(
    [
      { opacity: 0, scale: 0 },
      { opacity: 1, scale: 1 },
    ],
    {
      duration: 400,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
  );
}

export function animateSupportAreas(
  { gsap, ScrollTrigger }: GsapKit,
  root: HTMLElement | null,
) {
  if (
    !root ||
    !matches("(scripting: enabled)") ||
    matches("(prefers-reduced-motion: reduce)")
  ) {
    return;
  }
  // Registered here, not at module scope (as in ParallaxLayer).
  gsap.registerPlugin(ScrollTrigger);

  const floats = root.querySelectorAll<HTMLElement>(".ks-areas__float");
  const redraw = () => drawThread(root, false);

  // Fall in: each drop lands, spreads a little past its size and settles.
  gsap.from(floats, {
    autoAlpha: 0,
    scale: 0.3,
    rotate: -25,
    y: -40,
    duration: 1.2,
    ease: "elastic.out(1, 0.7)",
    stagger: { each: 0.09, from: "random" },
    scrollTrigger: { trigger: root, start: "top 78%", once: true },
    onUpdate: redraw,
  });

  if (!matches("(min-width: 64rem)")) return;

  // Drift: the farther the paint, the more it travels.
  const scrub = {
    trigger: root,
    start: "top bottom",
    end: "bottom top",
    scrub: 0.8,
  };
  root.querySelectorAll<HTMLElement>(".ks-areas__item").forEach((item) => {
    const far = item.dataset.depth === "far";
    const drift = far ? AREA_DRIFT.far : AREA_DRIFT.near;
    gsap.fromTo(
      item,
      { y: drift, rotate: far ? -6 : -2 },
      {
        y: -drift,
        rotate: far ? 6 : 2,
        ease: "none",
        scrollTrigger: scrub,
      },
    );
  });
  gsap.fromTo(
    root.querySelector(".ks-areas__wash"),
    { y: -AREA_DRIFT.wash, rotate: -5 },
    { y: AREA_DRIFT.wash, rotate: 5, ease: "none", scrollTrigger: scrub },
  );
  gsap.fromTo(
    root.querySelector(".ks-areas__center"),
    { y: AREA_DRIFT.center },
    { y: -AREA_DRIFT.center, ease: "none", scrollTrigger: scrub },
  );

  // Lean: smoothed, so the paint follows the mouse lazily.
  const leanTo = (selector: string, depth: number) =>
    Array.from(root.querySelectorAll<HTMLElement>(selector)).map((el) => ({
      depth,
      x: gsap.quickTo(el, "x", { duration: 1.1, ease: "power3.out" }),
      y: gsap.quickTo(el, "y", { duration: 1.1, ease: "power3.out" }),
    }));
  const layers = [
    ...leanTo('.ks-areas__item[data-depth="near"] .ks-areas__dot', LEAN.near),
    ...leanTo('.ks-areas__item[data-depth="far"] .ks-areas__dot', LEAN.far),
    ...leanTo(".ks-areas__pictures", LEAN.picture),
    ...leanTo(".ks-areas__wash-layer", LEAN.wash),
  ];
  const lean = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const frame = root.getBoundingClientRect();
    const mx = ((event.clientX - frame.left) / frame.width) * 2 - 1;
    const my = ((event.clientY - frame.top) / frame.height) * 2 - 1;
    for (const layer of layers) {
      layer.x(mx * layer.depth);
      layer.y(my * layer.depth);
    }
  };
  const rest = () => {
    for (const layer of layers) {
      layer.x(0);
      layer.y(0);
    }
  };
  root.addEventListener("pointermove", lean);
  root.addEventListener("pointerleave", rest);

  // Keep the thread on the moving drop while the stage is on screen.
  const follow = ScrollTrigger.create({
    trigger: root,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) =>
      self.isActive ? gsap.ticker.add(redraw) : gsap.ticker.remove(redraw),
  });
  if (follow.isActive) gsap.ticker.add(redraw);

  return () => {
    root.removeEventListener("pointermove", lean);
    root.removeEventListener("pointerleave", rest);
    gsap.ticker.remove(redraw);
  };
}
