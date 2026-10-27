"use client";

import { useEffect, useRef } from "react";

/** A fresh brush pass on both enter and leave, independent of the link hit area. */
export function HoverPaint() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const paint = ref.current;
    const card = paint?.closest<HTMLElement>(".ks-wk");
    if (!paint || !card) return;
    let hovered = card.matches(":hover");
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
    card.addEventListener("mouseenter", enter);
    card.addEventListener("mouseleave", leave);
    card.addEventListener("focusin", focus);
    card.addEventListener("focusout", blur);
    update();
    return () => {
      card.removeEventListener("mouseenter", enter);
      card.removeEventListener("mouseleave", leave);
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
