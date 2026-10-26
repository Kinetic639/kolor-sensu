"use client";

import { type ReactNode, useRef, useState, useSyncExternalStore } from "react";
import { educationStyles as styles } from "./education-styles";

/** Only the controls run in the browser; article cards arrive rendered by the server. */
export function EducationArticleGallery({ slides }: { slides: ReactNode[] }) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const go = (index: number) => {
    const element = track.current;
    if (!element) return;
    const next = Math.max(0, Math.min(slides.length - 1, index));
    element.scrollTo({
      left: next * element.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  return (
    <div
      className={styles.gallery}
      role="region"
      aria-roledescription="karuzela"
      aria-label="Najnowsze artykuły"
    >
      <div
        className={styles.galleryTrack}
        ref={track}
        onScroll={() => {
          const element = track.current;
          if (element?.clientWidth)
            setActive(Math.round(element.scrollLeft / element.clientWidth));
        }}
      >
        {slides.map((slide, index) => (
          <div
            className={styles.gallerySlide}
            key={index}
            role="group"
            aria-roledescription="slajd"
            aria-label={`${index + 1} z ${slides.length}`}
            inert={hydrated && active !== index}
          >
            {slide}
          </div>
        ))}
      </div>
      {slides.length > 1 ? (
        <div className={styles.galleryControls}>
          <p
            className={styles.galleryCount}
            aria-live="polite"
            aria-atomic="true"
          >
            <span>{String(active + 1).padStart(2, "0")}</span> /{" "}
            {String(slides.length).padStart(2, "0")}
          </p>
          <div className={styles.galleryDots} aria-label="Wybierz slajd">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Artykuł ${index + 1}`}
                aria-current={active === index ? "true" : undefined}
                onClick={() => go(index)}
              >
                <span />
              </button>
            ))}
          </div>
          <div className={styles.galleryArrows}>
            <button
              type="button"
              aria-label="Poprzedni slajd"
              disabled={active === 0}
              onClick={() => go(active - 1)}
            >
              <DrawnArrow reverse />
            </button>
            <button
              type="button"
              aria-label="Następny slajd"
              disabled={active === slides.length - 1}
              onClick={() => go(active + 1)}
            >
              <DrawnArrow />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const subscribe = () => () => {};

function DrawnArrow({ reverse = false }: { reverse?: boolean }) {
  return (
    <svg
      width="32"
      height="26"
      viewBox="0 0 34 26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
      style={reverse ? { transform: "rotate(180deg)" } : undefined}
    >
      <path d="M3 14 C11 12.5 19 14.3 30 12 M22 5 C24 8 27 10.5 30 12 C27 15 24.5 18 22 21" />
      <path d="M4 14.7 C12 13.3 20 15 29 12.8" strokeWidth=".45" opacity=".4" />
    </svg>
  );
}
