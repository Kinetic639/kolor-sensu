"use client";

// A hairline ring that trails the mouse (after Talking Walls): larger over
// links, a "Zobacz" disc over pictures and cards (data-cursor-label
// overrides the word). The real cursor stays; this only accompanies it.
// Mouse only; never shown for touch or under reduced motion (CSS in
// public-site.css, "Cursor").

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useRef } from "react";
import { matches } from "./reveal-support";

gsap.registerPlugin(useGSAP);

const VIEW_TARGETS = ".ks-wc, .ks-of, .ks-sp, [data-cursor-label]";

export function CursorRing() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const cursor = ref.current;
    if (
      !cursor ||
      !matches("(pointer: fine)") ||
      matches("(prefers-reduced-motion: reduce)")
    ) {
      return;
    }
    const label = cursor.querySelector<HTMLElement>(".ks-cursor__label");
    const x = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3.out" });
    const y = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3.out" });
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x(event.clientX);
      y(event.clientY);
      const target = event.target instanceof Element ? event.target : null;
      const view = target?.closest<HTMLElement>(VIEW_TARGETS);
      const link = target?.closest("a, button, summary, [role='button']");
      cursor.dataset.state = view ? "view" : link ? "link" : "rest";
      if (label) label.textContent = view?.dataset.cursorLabel ?? "Zobacz";
    };
    const leave = () => {
      cursor.dataset.state = "away";
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  });

  return (
    <div ref={ref} className="ks-cursor" data-state="away" aria-hidden="true">
      <span className="ks-cursor__label">Zobacz</span>
    </div>
  );
}
