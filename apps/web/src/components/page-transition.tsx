"use client";

import { usePathname } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  ViewTransition,
  type ReactNode,
} from "react";

// Moving between pages: the browser's View Transitions, through React's
// <ViewTransition> (Next's links navigate in a transition). Keyed by the
// path, so only a new page animates (not the search's changes, e.g. the
// booking wizard's steps): the old page leaves quickly, the new one rises
// gently into place (globals.css). The header and the footer stay still;
// without View Transitions (or with reduced motion) the page simply swaps.
//
// A new page starts at its top: Next scrolls only to where the changed
// part of the page begins, and only when it judges it out of view, so a
// page left scrolled could open part way down. Before the new page is
// drawn (and its transition's picture taken) it is put at the top; back
// and forward keep the browser's own place, and a link to a place on the
// page (`#…`) goes there.

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const first = useRef(true);
  const restoring = useRef(false);

  useEffect(() => {
    const onPop = () => {
      restoring.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (restoring.current) {
      restoring.current = false;
      return;
    }
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <ViewTransition
      default="none"
      enter="ks-page-enter"
      exit="ks-page-exit"
      key={pathname}
    >
      <div>{children}</div>
    </ViewTransition>
  );
}
