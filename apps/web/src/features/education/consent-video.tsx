"use client";

import {
  COOKIE_CONSENT_EVENT,
  type CookieChoice,
} from "@repo/ui/public-site/cookie-consent";
import { Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { VideoEmbed } from "./ebook-view";

// An e-book's film (decided 21.10): until the visitor clicks "Odtwórz
// film", only the e-book's cover, with nothing loaded from YouTube or
// Vimeo; the click loads the player, which sets its provider's cookies
// ("Mapy, filmy i treści zewnętrzne" in the cookie notice: the click is
// the consent for this visit). Withdrawn in the notice, the player goes.

export function ConsentVideo({
  video,
  title,
  posterUrl,
}: {
  video: VideoEmbed;
  /** What the film is about: the e-book's title. */
  title: string;
  posterUrl: string | null;
}) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const onChoice = (event: Event) => {
      if ((event as CustomEvent<CookieChoice>).detail !== "all")
        setPlaying(false);
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onChoice);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onChoice);
  }, []);

  return (
    <figure className="grid gap-3">
      <div className="rounded-card bg-beige relative aspect-video w-full overflow-hidden">
        {playing ? (
          <iframe
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
            referrerPolicy="strict-origin-when-cross-origin"
            src={video.embedUrl}
            title={`Film: ${title}`}
          />
        ) : (
          <>
            {posterUrl ? (
              <Image
                alt=""
                className="object-cover opacity-60"
                fill
                sizes="(min-width: 1024px) 30rem, 100vw"
                src={posterUrl}
              />
            ) : null}
            <div className="absolute inset-0 grid place-content-center justify-items-center p-6">
              <button
                className="bg-surface text-ink focus-visible:outline-ring flex items-center gap-2 rounded-full px-5 py-3 font-semibold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                onClick={() => setPlaying(true)}
                type="button"
              >
                <Play aria-hidden="true" className="size-5" />
                Odtwórz film
              </button>
            </div>
          </>
        )}
      </div>
      <figcaption className="text-small text-text-muted">
        Film z serwisu {video.provider} wczytuje się po kliknięciu i może
        zapisać pliki cookies {video.provider}.
      </figcaption>
    </figure>
  );
}
