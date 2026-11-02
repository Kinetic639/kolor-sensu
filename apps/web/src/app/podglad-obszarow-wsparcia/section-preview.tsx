"use client";

import { useState } from "react";
import {
  SupportAreas,
  type SupportAreasProps,
} from "@repo/ui/public-site/support-areas";
import { WatercolorRevealDebugContext } from "@repo/ui/public-site/watercolor-reveal";
import styles from "./preview.module.css";

export function SectionPreview({ content }: { content: SupportAreasProps }) {
  const [revision, setRevision] = useState(0);
  const [slow, setSlow] = useState(false);
  return (
    <div className={styles.preview}>
      <nav className={styles.toolbar} aria-label="Sterowanie podglądem sekcji">
        <span>Obszary wsparcia · podgląd sekcji</span>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.replay}
            onClick={() => setRevision((value) => value + 1)}
          >
            ↻ Odtwórz reveal
          </button>
          <label>
            <input
              type="checkbox"
              checked={slow}
              onChange={(event) => {
                setSlow(event.target.checked);
                setRevision((value) => value + 1);
              }}
            />{" "}
            Zwolnione tempo
          </label>
          <a href="/">Strona główna</a>
        </div>
      </nav>
      <WatercolorRevealDebugContext.Provider
        key={revision}
        value={{
          onReveal: ({ timeline }) => {
            timeline.timeScale(slow ? 0.25 : 1);
          },
        }}
      >
        <SupportAreas {...content} />
      </WatercolorRevealDebugContext.Provider>
    </div>
  );
}
