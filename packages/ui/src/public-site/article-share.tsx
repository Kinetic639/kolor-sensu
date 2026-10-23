"use client";

import { Check, Link2, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

// Sharing an article without any tracking script: "Kopiuj link"; where the
// device can share (a phone), its own "Udostępnij"; elsewhere a plain link
// to Facebook's sharer. The address is the article's canonical one.

const BUTTON =
  "text-small text-ink border-border hover:bg-cream focus-visible:outline-ring inline-flex h-10 items-center gap-2 rounded-full border px-4 focus-visible:outline-2 focus-visible:outline-offset-2";

export function ArticleShare({ url, title }: { url: string; title: string }) {
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanShare(
      typeof navigator.share === "function" &&
        window.matchMedia("(pointer: coarse)").matches,
    );
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Skopiuj link do artykułu:", url);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={BUTTON} onClick={copy} type="button">
        {copied ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <Link2 aria-hidden="true" className="size-4" />
        )}
        {copied ? "Skopiowano" : "Kopiuj link"}
      </button>
      {canShare ? (
        <button
          className={BUTTON}
          onClick={() => void navigator.share({ title, url }).catch(() => {})}
          type="button"
        >
          <Share2 aria-hidden="true" className="size-4" />
          Udostępnij
        </button>
      ) : (
        <a
          className={BUTTON}
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          Udostępnij na Facebooku
          <span className="sr-only"> (otwiera się w nowej karcie)</span>
        </a>
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? "Link skopiowany" : ""}
      </span>
    </div>
  );
}
