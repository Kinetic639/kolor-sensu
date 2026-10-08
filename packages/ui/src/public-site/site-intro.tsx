import { IntroMotion } from "./intro-motion";
import { IntroPenguin } from "./intro-penguin";
import { brandTagline } from "./site-logo";

// Server-safe. A brand intro on a visitor's first page view: on paper, over
// a watercolor patch, a closed flower bud opens and the penguin rises out of
// it; a big handwritten "Witaj" writes itself in under it with a pink brush
// swash, then the name and tagline; the penguin blinks and smiles, and the
// paper fades away. About 4.4 s.
//
// The first paint already shows the paper and the closed bud (all markup,
// public-site.css, .ks-intro); the motion is one GSAP timeline
// (IntroMotion, intro-motion.tsx) that starts as soon as it hydrates. It
// never blocks the page: it takes no clicks, holds no focus and is hidden
// from assistive technology; the page underneath is already rendered and
// readable (LCP, SEO unaffected). If the motion never starts, the
// stylesheet fades the paper out after a few seconds anyway.
//
// The inline script right after it decides, before the first paint, whether
// it plays: only on the first visit (remembered in localStorage), not under
// reduced motion, and not where storage is blocked (it would otherwise play
// on every page). It records when it started; once the motion runs it also
// records when the paper starts to fade, so the page's reveals can wait for
// it (reveal-support.ts, introRemaining). Without JavaScript it never shows.

export const introStorageKey = "ks-intro";

const id = "ks-intro";
const script = `(function(){var e=document.getElementById("${id}");if(!e)return;try{if(localStorage.getItem("${introStorageKey}"))return;localStorage.setItem("${introStorageKey}","1")}catch(_){return}if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;e.dataset.introAt=String(Math.round(performance.now()));e.dataset.intro="play"})()`;

const greeting = "Witaj";

export interface SiteIntroProps {
  /** Play it now, whatever was seen before (Storybook). */
  replay?: boolean;
}

export function SiteIntro({ replay = false }: SiteIntroProps) {
  return (
    <>
      <div
        id={id}
        className="ks-intro"
        aria-hidden="true"
        data-intro={replay ? "play" : undefined}
        // The script below sets data-intro before React hydrates.
        suppressHydrationWarning
      >
        <div className="ks-intro__stage">
          <span className="ks-intro__wash" />
          <IntroPenguin className="ks-intro__penguin" />
          <p className="ks-intro__greeting">
            {Array.from(greeting, (letter, index) => (
              <span key={index} className="ks-intro__letter">
                {letter}
              </span>
            ))}
          </p>
          <svg
            className="ks-intro__swash"
            viewBox="0 0 240 22"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M3 17.5C46 11 118 6.2 236 5.2C238 5.4 238 6.6 236 7C150 9.4 82 13.4 9 20.4C4.6 20.9 1.4 18.6 3 17.5Z" />
            <path
              d="M58 14.6C100 11.4 150 9.6 205 9.2C160 11.2 110 13.4 62 16.2Z"
              opacity="0.55"
            />
          </svg>
          <span className="ks-intro__line ks-intro__name">Kolor Sensu</span>
          <span className="ks-intro__line ks-intro__tagline">
            {brandTagline}
          </span>
        </div>
      </div>
      {replay ? null : <script dangerouslySetInnerHTML={{ __html: script }} />}
      <IntroMotion id={id} />
    </>
  );
}
