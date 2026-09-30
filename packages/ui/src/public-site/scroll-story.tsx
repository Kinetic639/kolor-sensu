"use client";

// The scroll story of the "living" homepage: scroll changes the state of
// the composition instead of fading sections in one by one. The sections
// stay exactly where they are; behind them runs a separate narrative layer.
//
//   ScrollStory       the story's root. Adds the depth of a very subtle
//                     parallax (a picture's watercolor backdrop almost
//                     still, its photo a little more, the side washes
//                     slower than the page) and marks the stations that no
//                     path runs to when they come into view.
//   ScrollStoryPath   one long, wide watercolor band behind the whole page,
//                     from its top left corner down behind the footer,
//                     painted in by the scroll: its paint front follows a
//                     line a little below the middle of the screen, so the
//                     brush seems to lead the reader down the page. Its
//                     layer is positioned in SiteLayout's root (relative,
//                     its own stacking context), so it spans the header and
//                     the footer too. The artwork is laid between anchors
//                     (StoryAnchor, the footer's data-story-anchor) to the
//                     sections' real heights. Stations ([data-story-station])
//                     get their local reaction when the front reaches them,
//                     and the WatercolorImages inside wait for it before
//                     painting themselves in. Artwork, time maps and the
//                     front's table: scroll-story.data.ts
//                     (generate-scroll-story.mjs). Desktop and phone have
//                     their own path.
//   StorySplash       paint spilled at the side of the screen: it lands and
//                     spreads out in blooms, once, as its section comes in.
//
// Server HTML and no script, reduced motion or WebKit (no SVG masks on
// HTML elements): the finished composition, everything painted. With a
// script, public-site.css keeps the painted layers hidden until it takes
// over (and shows them anyway after 3 s, should it never run).

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { type CSSProperties, type ReactNode, useMemo, useRef } from "react";
import { cn } from "../lib/utils";
import { matches, svgMasksSupported } from "./reveal-support";
import { scrollStory } from "./scroll-story.data";
import {
  createScrollMatte,
  interpolate,
  type ScrollMatte,
} from "./scroll-story-matte";
import { WatercolorRevealGateContext } from "./watercolor-reveal";

gsap.registerPlugin(useGSAP);

type PathLayout = keyof typeof scrollStory.paths;
const pathLayouts = Object.keys(scrollStory.paths) as PathLayout[];

/** Where the paint front sits, as a share of the viewport's height. */
export const FRONT_LINE = 0.62;

// Whether this browser gets the animated story at all.
function animated() {
  return (
    matches("(scripting: enabled)") &&
    !matches("(prefers-reduced-motion: reduce)") &&
    svgMasksSupported()
  );
}

const percent = (value: number) => `${Math.round(value * 1e5) / 1e3}%`;

// ------------------------------------------------------------- ScrollStory

export function ScrollStory({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || !animated()) return;
      gsap.registerPlugin(ScrollTrigger);
      root.dataset.story = "live";

      // Depth, not 3D: a few pixels each, tied to how far the element has
      // travelled through the viewport.
      const drift = (targets: Element[], distance: number, trigger?: Element) =>
        targets.forEach((target) =>
          gsap.fromTo(
            target,
            { y: -distance },
            {
              y: distance,
              ease: "none",
              scrollTrigger: {
                trigger: trigger ?? target,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.8,
              },
            },
          ),
        );
      for (const picture of root.querySelectorAll(".ks-wc")) {
        drift(
          Array.from(picture.querySelectorAll(".ks-wc__backdrop")),
          2,
          picture,
        );
        drift(
          Array.from(picture.querySelectorAll(".ks-wc__photo")),
          9,
          picture,
        );
      }

      // Stations outside a path: reached as they come into view.
      for (const station of root.querySelectorAll<HTMLElement>(
        "[data-story-station]",
      )) {
        if (station.closest("[data-story-path]")) continue;
        ScrollTrigger.create({
          trigger: station,
          start: `top ${FRONT_LINE * 100}%`,
          once: true,
          onEnter: () => {
            station.dataset.reached = "";
          },
        });
      }
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn("ks-story", className)}>
      {children}
    </div>
  );
}

// --------------------------------------------------------- ScrollStoryPath

// Design px of a path ↔ px from the top of the ScrollStoryPath element.
interface Scale {
  toPage: [number, number][];
  fromPage: [number, number][];
}
const plainScale: Scale = {
  toPage: [
    [0, 0],
    [1, 1],
  ],
  fromPage: [
    [0, 0],
    [1, 1],
  ],
};

function measureScale(
  rect: DOMRect,
  path: (typeof scrollStory.paths)[PathLayout],
): Scale {
  const rows: [number, number][] = [[0, 0]];
  const anchors = (
    Object.entries(path.anchors) as [StoryAnchorName, number][]
  ).sort((a, b) => a[1] - b[1]);
  for (const [name, designTop] of anchors) {
    const element = document.querySelector(`[data-story-anchor="${name}"]`);
    if (!element) continue;
    const top = element.getBoundingClientRect().top - rect.top;
    if (top > rows[rows.length - 1]![1] && top < rect.height) {
      rows.push([designTop, top]);
    }
  }
  rows.push([
    path.height,
    Math.max(rect.height, rows[rows.length - 1]![1] + 1),
  ]);
  return { toPage: rows, fromPage: rows.map(([a, b]) => [b, a]) };
}

export type StoryAnchorName =
  | "hero"
  | "steps"
  | "offer"
  | "guided"
  | "specialists"
  | "bento"
  | "rooms"
  | "workshops"
  | "faq"
  | "cta"
  | "footer";

/**
 * Marks where a section of a ScrollStoryPath starts, so the path's artwork
 * is laid beside it (the names are the sections the artwork was drawn for).
 */
export function StoryAnchor({
  name,
  className,
  children,
}: {
  name: StoryAnchorName;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-story-anchor={name} className={className}>
      {children}
    </div>
  );
}

interface Waiting {
  element: HTMLElement;
  resolve: () => void;
}

export function ScrollStoryPath({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Pictures waiting for the paint front (WatercolorImage's reveal gate).
  const waiting = useRef<Waiting[]>([]);
  const check = useRef<() => void>(() => {});

  const gate = useMemo(
    () => (element: HTMLElement) =>
      new Promise<void>((resolve) => {
        waiting.current.push({ element, resolve });
        check.current();
      }),
    [],
  );

  // Lay the artwork over the real sections: between two anchors
  // (StoryAnchor) the path is stretched to the section's real height, so it
  // stays beside the same sections whatever their content. Without anchors,
  // over the whole box.
  const scales = useRef<Record<PathLayout, Scale>>({
    desktop: plainScale,
    mobile: plainScale,
  });

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const layer = root.querySelector<HTMLElement>(".ks-story-path__layer");
      if (!layer) return;
      const lay = () => {
        const rect = layer.getBoundingClientRect();
        for (const name of pathLayouts) {
          const path = scrollStory.paths[name];
          const scale = measureScale(rect, path);
          scales.current[name] = scale;
          const tiles = root.querySelectorAll<HTMLElement>(
            `.ks-story-path__art[data-layout="${name}"] .ks-story-path__tile`,
          );
          path.tiles.forEach((tile, index) => {
            const element = tiles[index];
            if (!element) return;
            const top = interpolate(scale.toPage, tile.top);
            const bottom = interpolate(scale.toPage, tile.top + tile.height);
            element.style.top = `${top}px`;
            element.style.height = `${bottom - top}px`;
          });
        }
      };
      lay();
      const observer =
        typeof ResizeObserver === "function" ? new ResizeObserver(lay) : null;
      observer?.observe(layer);
      return () => observer?.disconnect();
    },
    { scope: ref },
  );

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const release = () => {
        for (const entry of waiting.current.splice(0)) entry.resolve();
      };
      if (!animated()) {
        root.dataset.path = "done";
        check.current = release;
        release();
        return;
      }
      gsap.registerPlugin(ScrollTrigger);

      const layout: PathLayout = matches("(width >= 64rem)")
        ? "desktop"
        : "mobile";
      const path = scrollStory.paths[layout];
      // Front table, both ways: time → height on the page, and back.
      const toY = path.front as unknown as [number, number][];
      const toTime = toY.map(([t, y]) => [y, t] as [number, number]);

      const art = root.querySelector<HTMLElement>(
        `.ks-story-path__art[data-layout="${layout}"]`,
      );
      if (!art) return;
      const tiles = Array.from(
        art.querySelectorAll<HTMLElement>(".ks-story-path__tile"),
      ).map((element, index) => ({
        element,
        data: path.tiles[index]!,
        matte: undefined as ScrollMatte | undefined,
        state: "hidden" as "hidden" | "active" | "painted",
      }));
      root.dataset.path = "live";

      const stations = Array.from(
        root.querySelectorAll<HTMLElement>("[data-story-station]"),
      );

      // Heights on the page, in the path's design px.
      let box = { top: 0, height: 1 };
      const layer = root.querySelector<HTMLElement>(".ks-story-path__layer")!;
      const measure = () => {
        const rect = layer.getBoundingClientRect();
        box = { top: rect.top + window.scrollY, height: rect.height || 1 };
      };
      const fromPage = (y: number) =>
        interpolate(scales.current[layout].fromPage, y);
      const designY = (element: HTMLElement, share: number) => {
        const rect = element.getBoundingClientRect();
        const top = rect.top + window.scrollY - box.top;
        return fromPage(top + rect.height * share);
      };
      const state = { time: 0 };
      const render = () => {
        const time = state.time;
        for (const tile of tiles) {
          const { t0, t1 } = tile.data;
          const next =
            time >= t1 ? "painted" : time <= t0 ? "hidden" : "active";
          if (next === "active") {
            tile.matte ??= createScrollMatte(art, tile.data.time);
            tile.matte.set((time - t0) / (t1 - t0));
          }
          if (next !== tile.state) {
            tile.state = next;
            tile.element.style.setProperty(
              "--ks-tile-mask",
              next === "painted"
                ? "none"
                : next === "active"
                  ? tile.matte!.url
                  : "",
            );
            if (next === "hidden") {
              tile.element.style.removeProperty("--ks-tile-mask");
            }
          }
        }
        // Stations the front has reached, once: they keep their reaction.
        const frontY = interpolate(toY, time);
        for (const station of stations) {
          if (station.dataset.reached === undefined) {
            if (designY(station, 0.35) <= frontY) station.dataset.reached = "";
          }
        }
        check.current();
      };
      check.current = () => {
        const frontY = interpolate(toY, state.time);
        waiting.current = waiting.current.filter((entry) => {
          if (designY(entry.element, 0.3) > frontY) return true;
          entry.resolve();
          return false;
        });
      };

      // Where the front should be for the current scroll. Over the last
      // screen of scroll the line slides down to the bottom of the screen,
      // so the brush reaches the end of the page (behind the footer).
      const target = () => {
        const view = window.innerHeight;
        const max = document.documentElement.scrollHeight - view;
        const tail = Math.min(
          1,
          Math.max(0, 1 - (max - window.scrollY) / view),
        );
        const line =
          window.scrollY +
          view * (FRONT_LINE + (1 - FRONT_LINE) * tail) -
          box.top;
        return interpolate(toTime, fromPage(line));
      };
      const follow = gsap.quickTo(state, "time", {
        duration: 0.9,
        ease: "power2.out",
        onUpdate: render,
      });

      measure();
      // First the brush paints the path down to the fold, then it follows
      // the scroll.
      let intro: gsap.core.Tween | undefined = gsap.to(state, {
        time: target(),
        duration: 1.6,
        ease: "power1.inOut",
        onUpdate: render,
        onComplete: () => {
          intro = undefined;
          follow(target(), state.time);
        },
      });
      render();

      ScrollTrigger.create({
        trigger: layer,
        start: "top bottom",
        end: "bottom bottom",
        onRefresh: () => {
          measure();
          if (!intro) follow(target(), state.time);
        },
        onUpdate: () => {
          if (!intro) follow(target());
        },
      });

      return () => {
        for (const tile of tiles) {
          tile.matte?.remove();
          tile.element.style.removeProperty("--ks-tile-mask");
        }
        delete root.dataset.path;
        check.current = release;
        release();
      };
    },
    { scope: ref },
  );

  return (
    <WatercolorRevealGateContext.Provider value={gate}>
      <div ref={ref} data-story-path className={cn("ks-story-path", className)}>
        <div className="ks-story-path__layer" aria-hidden="true">
          {pathLayouts.map((name) => {
            const path = scrollStory.paths[name];
            return (
              <div key={name} className="ks-story-path__art" data-layout={name}>
                {path.tiles.map((tile) => (
                  <div
                    key={tile.src}
                    className="ks-story-path__tile"
                    style={{
                      top: percent(tile.top / path.height),
                      height: percent(tile.height / path.height),
                    }}
                  >
                    <Image
                      src={tile.src}
                      alt=""
                      fill
                      unoptimized
                      sizes="100vw"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {children}
      </div>
    </WatercolorRevealGateContext.Provider>
  );
}

// ------------------------------------------------------------- StorySplash

export interface StorySplashProps {
  side: "left" | "right";
  tone: keyof typeof scrollStory.splashes;
  /** Vertical position in the parent (a positioned element), as CSS top. */
  at: string;
  className?: string;
}

export function StorySplash({ side, tone, at, className }: StorySplashProps) {
  const ref = useRef<HTMLDivElement>(null);
  const splash = scrollStory.splashes[tone];

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      if (!animated()) {
        root.dataset.splash = "done";
        return;
      }
      gsap.registerPlugin(ScrollTrigger);
      const paint = root.querySelector<HTMLElement>(".ks-story-splash__paint");
      if (!paint) return;
      const matte = createScrollMatte(root, splash.time, { sharpness: 18 });
      paint.style.setProperty("--ks-tile-mask", matte.url);
      root.dataset.splash = "live";
      // Spilled paint: it lands and runs out fast, then slows as it soaks
      // into the paper (the time map: blooms from where it landed). Once,
      // as its place comes into view.
      const state = { front: 0 };
      const spill = gsap
        .timeline({ paused: true })
        .to(state, {
          front: 1,
          duration: 1.8,
          ease: "power3.out",
          onUpdate: () => matte.set(state.front),
        })
        .fromTo(
          root,
          {
            scale: 0.94,
            transformOrigin: side === "right" ? "30% 45%" : "70% 45%",
          },
          { scale: 1, duration: 1.2, ease: "power2.out" },
          0,
        );
      ScrollTrigger.create({
        trigger: root,
        start: "top 85%",
        once: true,
        onEnter: () => {
          spill.play();
        },
      });
      // The side washes move slower than the page (the far background).
      gsap.fromTo(
        root,
        { y: 30 },
        {
          y: -30,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        },
      );
      return () => {
        matte.remove();
        paint.style.removeProperty("--ks-tile-mask");
      };
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-side={side}
      className={cn("ks-story-splash", className)}
      style={{ top: at } as CSSProperties}
    >
      <div className="ks-story-splash__paint">
        <Image src={splash.src} alt="" fill sizes="30vw" loading="lazy" />
      </div>
    </div>
  );
}
