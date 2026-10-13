"use client";

// A hairline ring trailing the mouse, after Talking Walls: it lags behind,
// turns along the way and stretches like a spring on a quick move
// (cursor-ring-motion.ts), then settles back into a circle. Over links it
// steps aside; over offer tiles and specialist cards it becomes a "Zobacz"
// disc (data-cursor-label gives another word). The real cursor stays; this
// only accompanies it. Mouse only; never shown for touch or under reduced
// motion (CSS in public-site.css, "Cursor").

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useRef } from "react";
import { followStep, type Point, ringShape } from "./cursor-ring-motion";
import { matches } from "./reveal-support";

gsap.registerPlugin(useGSAP);

const VIEW_TARGETS = ".ks-of, .ks-sp, [data-cursor-label]";
const LINK_TARGETS = "a, button, summary, label, [role='button']";

export function CursorRing() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const cursor = ref.current;
    const ring = cursor?.querySelector<HTMLElement>(".ks-cursor__ring");
    const label = cursor?.querySelector<HTMLElement>(".ks-cursor__label");
    if (
      !cursor ||
      !ring ||
      !label ||
      !matches("(pointer: fine)") ||
      matches("(prefers-reduced-motion: reduce)")
    ) {
      return;
    }

    const place = gsap.quickSetter(cursor, "css") as (vars: object) => void;
    let mouse: Point | null = null;
    let at: Point = { x: 0, y: 0 };
    let settled: string | undefined;

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      // The first move puts the ring right under the mouse, not flying in
      // from a corner.
      if (!mouse) at = { x: event.clientX, y: event.clientY };
      mouse = { x: event.clientX, y: event.clientY };
      const target = event.target instanceof Element ? event.target : null;
      const view = target?.closest<HTMLElement>(VIEW_TARGETS);
      cursor.dataset.state = view
        ? "view"
        : target?.closest(LINK_TARGETS)
          ? "link"
          : "rest";
      const word = view?.dataset.cursorLabel ?? "Zobacz";
      if (label.textContent !== word) {
        label.textContent = word;
        ring.style.setProperty("--ks-cursor-chars", String(word.length));
      }
    };
    const leave = () => {
      cursor.dataset.state = "away";
    };
    const frame = () => {
      // Nothing to do until the mouse comes, nor once the ring has caught
      // up with it and settled.
      if (!mouse || (at === mouse && settled === cursor.dataset.state)) return;
      at = followStep(at, mouse, gsap.ticker.deltaRatio());
      if (Math.hypot(mouse.x - at.x, mouse.y - at.y) < 0.1) {
        at = mouse;
        settled = cursor.dataset.state;
      }
      // Only the plain ring springs; the link and Zobacz shapes stay round
      // and upright, so their word reads.
      const { rotation, stretch } =
        cursor.dataset.state === "rest"
          ? ringShape(at, mouse)
          : { rotation: 0, stretch: 0 };
      place({ x: at.x, y: at.y, rotation });
      ring.style.setProperty("--ks-cursor-stretch", `${stretch}px`);
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    gsap.ticker.add(frame);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      gsap.ticker.remove(frame);
    };
  });

  return (
    <div ref={ref} className="ks-cursor" data-state="away" aria-hidden="true">
      <div className="ks-cursor__ring">
        <span className="ks-cursor__label">Zobacz</span>
      </div>
    </div>
  );
}
