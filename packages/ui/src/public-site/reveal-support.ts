// Browser checks shared by the public site's client-side reveals
// (WatercolorReveal, CaptionMotion, SpecialistReveal). Only call these from
// effects: they read window.

export function matches(query: string) {
  return typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : false;
}

// SVG masks on HTML elements (mask-image: url(#…)) work in Chromium and
// Firefox. WebKit ignores them; public-site.css makes the same distinction
// with the same test.
export function svgMasksSupported() {
  return !(
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("font", "-apple-system-body")
  );
}

export function decoded(image: HTMLImageElement) {
  return typeof image.decode === "function"
    ? image.decode().catch(() => undefined)
    : undefined;
}

export function preload(url: string) {
  const image = new Image();
  image.src = url;
  return decoded(image);
}
