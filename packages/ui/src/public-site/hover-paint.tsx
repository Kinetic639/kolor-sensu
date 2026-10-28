"use client";

import { useEffect, useRef } from "react";

/** A fresh brush pass on both enter and leave, independent of the link hit area. */
export function HoverPaint() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const paint = ref.current;
    const card = paint?.closest<HTMLElement>(
      ".ks-wk, .ks-education-article, .ks-education-books",
    );
    if (!paint || !card) return;
    const targets = card.matches(".ks-education-books")
      ? [...card.querySelectorAll<HTMLElement>(".ks-education-book")]
      : [card];
    let hovered = targets.some((target) => target.matches(":hover"));
    let focused = card.contains(document.activeElement);
    const update = () => {
      if (!hovered && !focused && !paint.dataset.active) return;
      paint.dataset.active = "true";
      paint.dataset.tone = hovered || focused ? "pink" : "green";
    };
    const enter = () => {
      hovered = true;
      update();
    };
    const leave = () => {
      hovered = false;
      update();
    };
    const focus = () => {
      focused = true;
      update();
    };
    const blur = (event: FocusEvent) => {
      focused =
        event.relatedTarget instanceof Node &&
        card.contains(event.relatedTarget);
      update();
    };
    targets.forEach((target) => {
      target.addEventListener("mouseenter", enter);
      target.addEventListener("mouseleave", leave);
    });
    card.addEventListener("focusin", focus);
    card.addEventListener("focusout", blur);
    update();
    return () => {
      targets.forEach((target) => {
        target.removeEventListener("mouseenter", enter);
        target.removeEventListener("mouseleave", leave);
      });
      card.removeEventListener("focusin", focus);
      card.removeEventListener("focusout", blur);
    };
  }, []);
  return (
    <span
      ref={ref}
      className="ks-wk__hover-paint"
      data-animation="hover-paint"
      aria-hidden="true"
    >
      <span className="ks-wk__paint-pink" />
      <span className="ks-wk__paint-green" />
    </span>
  );
}
