"use client";

// The first-visit intro's motion (SiteIntro, site-intro.tsx): one GSAP
// timeline, about 4.4 s, started as soon as this hydrates, and only if the
// intro's inline script marked it to play. Until then the first paint shows
// the closed bud on paper, which is where the timeline begins anyway. Every
// segment has its own easing, so nothing moves at a constant speed:
//
//   0.00–0.90  a watercolor patch spreads behind the penguin
//   0.00–0.50  the bud breathes (the petals ease out and back by a degree)
//   0.25–1.00  the centre leaf lifts a touch, then slides down, speeding up
//   0.60–2.00  the top petals open and fold behind the main leaves, settling
//              with a tiny rebound; the middle petals 0.15 s later
//   0.70–2.10  the penguin rises out of the bud (scale 0.8 to 1) with a small
//              stretch and squash
//   1.35–2.20  "Witaj" writes itself in, letter by letter
//   1.90–2.40  the pink swash is drawn under it; the name and tagline follow
//   2.45–2.65  a blink (the eye arcs straighten for a moment)
//   2.90–3.35  the smile: the arcs turn into the logo's waves
//   3.90–4.40  the paper fades away (INTRO_HANDOFF: the page's reveals start
//              as it begins; reveal-support.ts reads data-intro-end)
//
// Without JavaScript, or if this never runs, public-site.css fades the
// paper out after a few seconds anyway.

import { introPenguin } from "./intro-penguin.data";
import { useLazyGsap } from "./lazy-gsap";

/** Seconds into the timeline when the paper starts to fade. */
export const INTRO_HANDOFF = 3.9;
const FADE = 0.5;

export function IntroMotion({ id }: { id: string }) {
  useLazyGsap(
    ({ gsap }) => {
      const intro = document.getElementById(id);
      if (!intro || intro.dataset.intro !== "play") return;

      const q = <T extends Element>(selector: string) =>
        Array.from(intro.querySelectorAll<T>(selector));
      const one = (selector: string) => intro.querySelector(selector);
      const { pivot, bud, eyes } = introPenguin;
      const svgOrigin = `${pivot.x} ${pivot.y}`;
      const sideSign = (el: Element) =>
        (el as HTMLElement).dataset.side === "left" ? 1 : -1;
      const petals = (part: "top" | "middle") =>
        q<SVGGElement>(`.ks-intro__petal[data-part="${part}"]`);
      const eyePaths = q<SVGPathElement>(".ks-intro__eye");
      const eyeTo = (state: keyof typeof eyes) => ({
        attr: {
          d: (_: number, el: Element) =>
            eyes[state][
              (el as SVGPathElement).dataset.side as "left" | "right"
            ],
        },
      });

      // Take over: the stylesheet's fallback fade stops applying.
      intro.dataset.motion = "on";
      intro.dataset.introEnd = String(
        Math.round(performance.now() + INTRO_HANDOFF * 1000),
      );

      // The bud's pose, as GSAP transforms about the pivot (the markup already
      // draws the same pose, so nothing moves here).
      gsap.set(one(".ks-intro__body"), { svgOrigin, scale: bud.body });
      for (const part of ["top", "middle"] as const) {
        for (const petal of petals(part)) {
          gsap.set(petal, {
            svgOrigin,
            rotation: sideSign(petal) * bud[part].rotate,
            scale: bud[part].scale,
          });
        }
      }

      const tl = gsap.timeline({
        onComplete: () => {
          intro.dataset.intro = "done";
        },
      });

      tl.from(
        one(".ks-intro__wash"),
        {
          opacity: 0,
          scale: 0.7,
          rotation: -4,
          duration: 0.9,
          ease: "power2.out",
        },
        0,
      );

      // The bud breathes once.
      for (const part of ["top", "middle"] as const) {
        tl.to(
          petals(part),
          {
            rotation: (_: number, el: Element) =>
              sideSign(el) * (bud[part].rotate + 1),
            duration: 0.25,
            ease: "sine.inOut",
            yoyo: true,
            repeat: 1,
          },
          0,
        );
      }

      // The centre leaf: a little lift, then down and away, speeding up.
      tl.to(
        one(".ks-intro__centre-leaf"),
        { y: -8, duration: 0.2, ease: "sine.inOut" },
        0.25,
      ).to(
        one(".ks-intro__centre-leaf"),
        { y: 490, duration: 0.55, ease: "power2.in" },
        0.45,
      );

      // The petals open, top pair first, and settle behind the main leaves
      // with a tiny rebound inwards (never outwards: they stay hidden).
      for (const [part, at] of [
        ["top", 0.6],
        ["middle", 0.75],
      ] as const) {
        tl.to(
          petals(part),
          { rotation: 0, scale: 1, duration: 1, ease: "power3.out" },
          at,
        )
          .to(
            petals(part),
            {
              rotation: (_: number, el: Element) => sideSign(el) * 1.2,
              duration: 0.2,
              ease: "sine.out",
            },
            at + 1,
          )
          .to(
            petals(part),
            { rotation: 0, duration: 0.2, ease: "sine.inOut" },
            at + 1.2,
          );
      }

      // The penguin rises out of the bud, with a small stretch and squash.
      tl.to(
        one(".ks-intro__body"),
        { scaleX: 1.02, scaleY: 1.05, duration: 0.95, ease: "power2.out" },
        0.7,
      )
        .to(
          one(".ks-intro__body"),
          { scaleX: 1.005, scaleY: 0.97, duration: 0.2, ease: "sine.inOut" },
          1.65,
        )
        .to(
          one(".ks-intro__body"),
          { scaleX: 1, scaleY: 1, duration: 0.25, ease: "sine.out" },
          1.85,
        );

      // "Witaj", letter by letter, as if written.
      tl.from(
        q(".ks-intro__letter"),
        {
          opacity: 0,
          yPercent: 35,
          rotation: -8,
          duration: 0.7,
          ease: "back.out(1.6)",
          stagger: 0.06,
        },
        1.35,
      )
        .fromTo(
          one(".ks-intro__swash"),
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", duration: 0.5, ease: "power2.inOut" },
          1.9,
        )
        .from(
          q(".ks-intro__line"),
          {
            opacity: 0,
            y: 8,
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.15,
          },
          2.2,
        );

      // A blink, then the smile.
      tl.to(
        eyePaths,
        { ...eyeTo("blink"), duration: 0.08, ease: "power1.in" },
        2.45,
      )
        .to(
          eyePaths,
          { ...eyeTo("open"), duration: 0.12, ease: "power1.out" },
          2.53,
        )
        .to(
          eyePaths,
          { ...eyeTo("smile"), duration: 0.45, ease: "power2.inOut" },
          2.9,
        )
        .to(
          one(".ks-intro__body"),
          {
            scaleX: 1.015,
            scaleY: 0.985,
            duration: 0.2,
            ease: "sine.inOut",
            yoyo: true,
            repeat: 1,
          },
          2.95,
        );

      // The paper fades away; the page underneath is already there.
      tl.to(
        intro,
        { opacity: 0, duration: FADE, ease: "power1.inOut" },
        INTRO_HANDOFF,
      );
    },
    { start: "now" },
  );

  return null;
}
