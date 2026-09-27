import { gsap } from "gsap";
import { type ReactNode, useEffect, useState } from "react";

// Storybook-only helpers shared by the public-site animation stories
// (WatercolorImage, SpecialistWatercolorCard). Not exported from the package.

export function Label({ children }: { children: string }) {
  return (
    <p className="text-eyebrow text-text-muted mb-3 uppercase">{children}</p>
  );
}

/**
 * Remounts its children on "Odtwórz ponownie", so the entrance animation
 * plays again. `speed` scales every GSAP animation on the page (1 = real).
 */
export function Replay({
  children,
  speed = 1,
}: {
  children: (run: number) => ReactNode;
  speed?: number;
}) {
  const [run, setRun] = useState(0);
  // Set before the children mount, so their timeline starts at this speed.
  useState(() => gsap.globalTimeline.timeScale(speed));
  useEffect(() => {
    gsap.globalTimeline.timeScale(speed);
    return () => {
      gsap.globalTimeline.timeScale(1);
    };
  }, [speed]);

  return (
    <div className="grid gap-4">
      <div>
        <button
          type="button"
          onClick={() => setRun((value) => value + 1)}
          className="border-border-strong text-small hover:bg-surface-muted rounded-full border px-4 py-1.5 font-semibold"
        >
          Odtwórz ponownie
        </button>
      </div>
      <div key={run}>{children(run)}</div>
    </div>
  );
}

/**
 * Makes the page behave as if the visitor prefers reduced motion (the
 * operating-system setting), while this story is open: the component's
 * script through matchMedia, the stylesheet through `styles`, which should
 * restate the component's prefers-reduced-motion rules under
 * `.ks-story-reduced`. To check the real thing, use DevTools > Rendering >
 * "Emulate CSS media feature prefers-reduced-motion".
 */
export function PrefersReducedMotion({
  styles,
  children,
}: {
  styles: string;
  children: ReactNode;
}) {
  useState(() => {
    const real = window.matchMedia.bind(window);
    const stub = (query: string) =>
      query.includes("prefers-reduced-motion: reduce")
        ? { ...real(query), matches: true, media: query }
        : real(query);
    Object.assign(stub, { real });
    window.matchMedia = stub as typeof window.matchMedia;
  });
  useEffect(
    () => () => {
      const real = (window.matchMedia as { real?: typeof window.matchMedia })
        .real;
      if (real) window.matchMedia = real;
    },
    [],
  );
  return (
    <div className="ks-story-reduced">
      <style>{styles}</style>
      {children}
    </div>
  );
}

/** Reads a GSAP timeline's playhead every frame. */
export function usePlayhead(timeline?: gsap.core.Timeline) {
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (!timeline) return;
    let frame = 0;
    const read = () => {
      setTime(timeline.time());
      frame = requestAnimationFrame(read);
    };
    frame = requestAnimationFrame(read);
    return () => cancelAnimationFrame(frame);
  }, [timeline]);
  return time;
}
