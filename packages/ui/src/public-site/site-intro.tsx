// The intro's own, larger mark (apps/web/public/brand, generate:brand): 2x
// of its 96 px. The header's mark is unchanged.
const introMarkSrc = "/brand/logo-intro.png";

// Server-safe. A short brand intro on a visitor's first page view: paper,
// a watercolor patch spreading, the owl mark, the name and a brush swash,
// then it fades away and the page's own reveals start. About 1.5 s, all
// CSS (public-site.css, .ks-intro), so it runs from the first paint without
// waiting for any JavaScript bundle. It never blocks the page: it takes no
// clicks, holds no focus and is hidden from assistive technology; the page
// underneath is already rendered and readable (LCP, SEO unaffected).
//
// The inline script right after it decides, before the first paint, whether
// it plays: only on the first visit (remembered in localStorage), not under
// reduced motion, and not where storage is blocked (it would otherwise play
// on every page). It records when it started, so the page's reveals can
// wait for it (reveal-support.ts, introRemaining). Without JavaScript it
// never shows.

export const introStorageKey = "ks-intro";

const script = `(function(){var e=document.getElementById("ks-intro");if(!e)return;try{if(localStorage.getItem("${introStorageKey}"))return;localStorage.setItem("${introStorageKey}","1")}catch(_){return}if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;e.dataset.introAt=String(Math.round(performance.now()));e.dataset.intro="play"})()`;

export interface SiteIntroProps {
  /** Play it now, whatever was seen before (Storybook). */
  replay?: boolean;
}

export function SiteIntro({ replay = false }: SiteIntroProps) {
  return (
    <>
      <div
        id="ks-intro"
        className="ks-intro"
        aria-hidden="true"
        data-intro={replay ? "play" : undefined}
        // The script below sets data-intro before React hydrates.
        suppressHydrationWarning
      >
        <div className="ks-intro__stage">
          <span className="ks-intro__wash" />
          {/* Plain <img>: 14 kB, decorative, needs no optimisation. Lazy, so
              it is never fetched (nor preloaded) while the intro stays
              hidden, on every visit but the first. */}
          <img
            className="ks-intro__mark"
            src={introMarkSrc}
            alt=""
            width={106}
            height={96}
            loading="lazy"
            decoding="async"
          />
          <span className="ks-intro__name">Kolor Sensu</span>
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
          <span className="ks-intro__tagline">
            Centrum psychoterapii i rozwoju
          </span>
        </div>
      </div>
      {replay ? null : <script dangerouslySetInnerHTML={{ __html: script }} />}
    </>
  );
}
