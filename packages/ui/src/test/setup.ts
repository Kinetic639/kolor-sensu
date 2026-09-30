import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

if (typeof document !== "undefined") {
  document.elementFromPoint ??= () => null;
  Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect ??= () => new DOMRect();
  HTMLElement.prototype.scrollIntoView ??= () => undefined;
  // Radix measures some controls (e.g. the checkbox) with it.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  cleanup();
  if (typeof document !== "undefined") {
    document.body.removeAttribute("data-scroll-locked");
    document.body.style.removeProperty("pointer-events");
  }
});
