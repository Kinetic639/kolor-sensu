"use client";

// A crowd of outlined negative thoughts in pink, rows drifting apart as the
// band scrolls by (after #12's DriftingWords, pure CSS). Each one hides a
// positive thought. Point at a negative thought (or tap it) and it
// dissolves like mist, its letters drifting apart (letterDrift), while the
// positive one condenses in its place, in pastel green; the crowd around
// gently makes room for it. A thought once turned stays so until the page
// is loaded again.
//
// The script only marks the turned word (data-found) and eases its width
// from one thought to the other; the stylesheet draws the rest with
// transitions (public-site.css, "Thoughts lens"). Under reduced motion the
// turn is instant.
//
// The pictures of words are hidden from assistive tech; the band is a
// region named by `label`, and the positive thoughts are read as a list.

import { useEffect, useRef } from "react";
import { cn } from "../lib/utils";
import { letterDrift } from "./thoughts-mist";

export interface ThoughtsLensProps {
  /** Negative thoughts and feelings: short, many (they make the crowd). */
  negative: readonly string[];
  /** Positive thoughts, one under each negative one, in turn. */
  positive: readonly string[];
  /** The band's name for assistive tech. */
  label: string;
  /** How many rows the crowd takes. */
  rows?: number;
  className?: string;
}

/** Deals the thoughts into `count` rows, one by one. */
export function splitRows(thoughts: readonly string[], count: number) {
  const rows: string[][] = Array.from({ length: count }, () => []);
  thoughts.forEach((thought, index) => rows[index % count]!.push(thought));
  return rows;
}

/** Turns a negative word into its positive thought, for good. */
export function turn(word: HTMLElement) {
  if (word.hasAttribute("data-found")) return;
  const hope = word.querySelector<HTMLElement>(".ks-thoughts__hope");
  // From the negative thought's width to the positive one's, so the crowd
  // around moves aside smoothly (public-site.css eases the width).
  word.style.width = `${word.offsetWidth}px`;
  void word.offsetWidth;
  word.setAttribute("data-found", "");
  if (hope) word.style.width = `${hope.offsetWidth}px`;
}

export function ThoughtsLens({
  negative,
  positive,
  label,
  rows = 2,
  className,
}: ThoughtsLensProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // Pointing with a mouse, or tapping: the word under it turns.
    const over = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      const word = target?.closest<HTMLElement>(".ks-thoughts__word");
      if (word && root.contains(word)) turn(word);
    };
    root.addEventListener("pointerover", over);
    return () => root.removeEventListener("pointerover", over);
  }, []);

  // Every letter of the crowd gets its own way to drift (thoughts-mist.ts),
  // and every word its own positive thought, both counted across the whole
  // band, so neighbours differ.
  let letter = 0;
  let word = 0;
  const lettersOf = (thought: string) =>
    Array.from(thought, (character, index) => {
      if (character === " ") return " ";
      const { x, y, turn: angle } = letterDrift(letter++);
      return (
        <span
          key={index}
          style={
            {
              "--ks-drift-x": `${x}em`,
              "--ks-drift-y": `${y}em`,
              "--ks-drift-turn": `${angle}deg`,
            } as React.CSSProperties
          }
        >
          {character}
        </span>
      );
    });

  return (
    <section
      ref={ref}
      aria-label={label}
      className={cn("ks-thoughts", className)}
    >
      <ul className="sr-only">
        {positive.map((thought) => (
          <li key={thought}>{thought}</li>
        ))}
      </ul>
      <div className="ks-thoughts__noise" aria-hidden="true">
        {splitRows(negative, rows).map((row, index) => (
          <p key={index} className="ks-thoughts__row">
            {/* Three times over, so a row never runs out while it drifts,
                even on wide screens. */}
            {[0, 1, 2].map((copy) => (
              <span key={copy} className="ks-thoughts__run">
                {row.map((thought) => {
                  const index = word++;
                  return (
                    <span
                      key={thought}
                      // Every other word is filled instead of outlined,
                      // so neighbours read apart (its positive thought
                      // the other way round).
                      className={cn(
                        "ks-thoughts__word",
                        index % 2 === 1 && "ks-thoughts__word--filled",
                      )}
                    >
                      <span className="ks-thoughts__fear">
                        {lettersOf(thought)}
                      </span>
                      <span className="ks-thoughts__hope">
                        {positive[index % positive.length]}
                      </span>
                    </span>
                  );
                })}
              </span>
            ))}
          </p>
        ))}
      </div>
    </section>
  );
}
