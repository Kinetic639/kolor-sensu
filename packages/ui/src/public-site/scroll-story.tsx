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
//   ScrollStoryPath   the supplied brush stroke behind the whole page, at
//                     its own proportions across the screen's width, copy
//                     under copy from the top left corner down behind the
//                     footer, painted in by the scroll: its paint front
//                     follows a line a little below the middle of the
//                     screen, so the brush seems to lead the reader down
//                     the page. Its layer is positioned in SiteLayout's
//                     root (relative, its own stacking context), so it
//                     spans the header and the footer too. Stations
//                     ([data-story-station]) get their local reaction when
//                     the front reaches them, and the WatercolorImages
//                     inside wait for it before painting themselves in.
//                     Artwork, time maps and the front's table:
//                     scroll-story.data.ts (generate-scroll-story.mjs).
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

const band = scrollStory.band;
/** Copies of the picture laid down the page (the page uses what it needs). */
const COPIES = 16;
// Time → height in a copy (a share of its height), and back.
const frontRows = band.front as unknown as [number, number][];
const backRows = frontRows.map(([t, y]) => [y, t] as [number, number]);

interface Waiting {
  element: HTMLElement;
  resolve: () => void;
}

interface Tile {
  element: HTMLElement;
  data: (typeof band.tiles)[number];
  copy: number;
  matte?: ScrollMatte;
  state: "hidden" | "active" | "painted";
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
      const layer = root.querySelector<HTMLElement>(".ks-story-path__layer");
      if (!layer) return;

      const tiles: Tile[] = Array.from(
        layer.querySelectorAll<HTMLElement>(".ks-story-path__tile"),
      ).map((element, index) => ({
        element,
        data: band.tiles[index % band.tiles.length]!,
        copy: Math.floor(index / band.tiles.length),
        state: "hidden",
      }));
      root.dataset.path = "live";

      const stations = Array.from(
        root.querySelectorAll<HTMLElement>("[data-story-station]"),
      );

      // The layer on the page: where it starts, how tall a copy is, how far
      // apart the copies are, how many it takes.
      let box = { top: 0, copy: 1, pitch: 1, copies: 1 };
      const measure = () => {
        const rect = layer.getBoundingClientRect();
        const copy = (rect.width * band.height) / band.width || 1;
        const pitch = (rect.width * band.pitch) / band.width || 1;
        box = {
          top: rect.top + window.scrollY,
          copy,
          pitch,
          copies: Math.min(COPIES, Math.max(1, Math.ceil(rect.height / pitch))),
        };
      };
      // Time (copy n paints from n to n + 1) ↔ px from the top of the layer.
      const yAt = (time: number) => {
        const copy = Math.min(Math.floor(time), box.copies - 1);
        return (
          copy * box.pitch + interpolate(frontRows, time - copy) * box.copy
        );
      };
      const timeAt = (y: number) => {
        const copy = Math.min(
          box.copies - 1,
          Math.max(0, Math.floor(y / box.pitch)),
        );
        return copy + interpolate(backRows, (y - copy * box.pitch) / box.copy);
      };
      const pageY = (element: HTMLElement, share: number) => {
        const rect = element.getBoundingClientRect();
        return rect.top + window.scrollY - box.top + rect.height * share;
      };

      const state = { time: 0 };
      const render = () => {
        const time = state.time;
        for (const tile of tiles) {
          if (tile.copy >= box.copies) continue;
          const local = time - tile.copy;
          const { t0, t1 } = tile.data;
          // A matte is made a little ahead of the front, so its map has
          // loaded by the time the brush gets there.
          if (!tile.matte && local > t0 - 0.06) {
            tile.matte = createScrollMatte(layer, tile.data.time, {
              sharpness: tile.data.sharpness,
              onReady: render,
            });
          }
          let next: Tile["state"] =
            local >= t1 ? "painted" : local <= t0 ? "hidden" : "active";
          // Until its map is there, a tile the front is in stays unpainted
          // (an empty matte would show all of it).
          if (next === "active" && !tile.matte?.ready) next = "hidden";
          if (next === "active") tile.matte!.set((local - t0) / (t1 - t0));
          if (next !== tile.state) {
            tile.state = next;
            if (next === "hidden") {
              tile.element.style.removeProperty("--ks-tile-mask");
            } else {
              tile.element.style.setProperty(
                "--ks-tile-mask",
                next === "painted" ? "none" : tile.matte!.url,
              );
            }
          }
        }
        // Stations the front has reached, once: they keep their reaction.
        const frontY = yAt(time);
        for (const station of stations) {
          if (station.dataset.reached === undefined) {
            if (pageY(station, 0.35) <= frontY) station.dataset.reached = "";
          }
        }
        check.current();
      };
      check.current = () => {
        const frontY = yAt(state.time);
        waiting.current = waiting.current.filter((entry) => {
          if (pageY(entry.element, 0.3) > frontY) return true;
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
        return timeAt(line);
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
        <div
          className="ks-story-path__layer"
          aria-hidden="true"
          style={
            {
              "--ks-band-ratio": band.height / band.width,
              "--ks-band-pitch": band.pitch / band.width,
            } as CSSProperties
          }
        >
          {Array.from({ length: COPIES }, (_, copy) => (
            <div
              key={copy}
              className="ks-story-path__copy"
              data-mirrored={copy % 2 === 1 ? "" : undefined}
              style={{ "--ks-copy": copy } as CSSProperties}
            >
              {band.tiles.map((tile) => (
                <div
                  key={tile.src}
                  className="ks-story-path__tile"
                  style={{
                    top: percent(tile.top / band.height),
                    height: percent(tile.height / band.height),
                  }}
                >
                  {/* Plain srcset: the picture at its size or twice it. */}
                  <img
                    src={tile.src}
                    srcSet={`${tile.src} ${band.width}w, ${tile.src2x} ${band.width * 2}w`}
                    sizes="100vw"
                    alt=""
                    width={band.width}
                    height={tile.height}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          ))}
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
