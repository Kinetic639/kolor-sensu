// Browser checks and scheduling shared by the public site's client-side
// reveals (WatercolorReveal, SpecialistReveal, OfferReveal, CaptionMotion).
// Only call these from effects: they read window.

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

// public-site.css shows a revealed element anyway 3 s after the page loads,
// if no script took over ("safety net"). Before that it cannot have fired,
// so there is no need to read computed styles (which forces a style
// recalculation of the whole page while it is still hydrating).
const FALLBACK_DELAY = 3000;

/** Whether the stylesheet's no-script fallback already showed `root`. */
export function shownByFallback(
  root: Element,
  property: string,
  shown: string,
) {
  return (
    performance.now() >= FALLBACK_DELAY &&
    getComputedStyle(root).getPropertyValue(property).trim() === shown
  );
}

/**
 * Two moments of a reveal: `near` when the element is still about half a
 * screen away (load, decode and build the animation then, so nothing is left
 * to do when it starts), `visible` when `threshold` of it is on screen (play
 * it). Each fires once; without IntersectionObserver both fire at once.
 * Returns a function that stops watching.
 */
export function watchReveal(
  root: Element,
  {
    threshold,
    near,
    visible,
  }: { threshold: number; near: () => void; visible: () => void },
) {
  if (typeof IntersectionObserver !== "function") {
    near();
    visible();
    return () => {};
  }
  const once = (callback: () => void, options: IntersectionObserverInit) => {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        callback();
      }
    }, options);
    observer.observe(root);
    return observer;
  };
  const early = once(near, { rootMargin: "50% 0px 50% 0px" });
  const late = once(
    () => {
      near();
      visible();
    },
    { threshold },
  );
  return () => {
    early.disconnect();
    late.disconnect();
  };
}
