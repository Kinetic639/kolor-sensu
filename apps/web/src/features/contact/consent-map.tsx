"use client";

import {
  COOKIE_CONSENT_EVENT,
  cookieConsentAllows,
  type CookieChoice,
} from "@repo/ui/public-site/cookie-consent";
import { MapPin } from "lucide-react";
import { LocationMapPlaceholder } from "@repo/ui/public-site/location-map-placeholder";
import { useEffect, useState } from "react";

// Kontakt → the map (decided 19.10): Google's embedded map, which sets its
// own cookies, so it loads only once the visitor allowed "Mapy i treści
// zewnętrzne" (the cookie notice), or asks for it here ("Pokaż mapę", for
// this visit). Withdrawn in the notice, it goes at once. Until then a plain
// tile stands in its place; the address and "Pokaż na mapie" stay beside
// it either way.

export function ConsentMap({
  address,
  painted = false,
}: {
  address: string;
  painted?: boolean;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (cookieConsentAllows("external")) setShown(true);
    const onChoice = (event: Event) => {
      setShown((event as CustomEvent<CookieChoice>).detail === "all");
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onChoice);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onChoice);
  }, []);

  const src = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

  return (
    <div
      className={
        painted
          ? "ks-location-map"
          : "rounded-card bg-beige relative aspect-[4/3] w-full overflow-hidden"
      }
    >
      {shown ? (
        <iframe
          allowFullScreen
          className={
            painted
              ? "ks-location-map__iframe"
              : "absolute inset-0 h-full w-full border-0"
          }
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={src}
          title={`Mapa: ${address}`}
        />
      ) : painted ? (
        <LocationMapPlaceholder
          address={address}
          onShowMap={() => setShown(true)}
        />
      ) : (
        <div className="absolute inset-0 grid place-content-center justify-items-center gap-3 p-6 text-center">
          <MapPin aria-hidden="true" className="text-primary size-8" />
          <p className="text-body text-ink max-w-xs">
            Mapa Google zapisuje własne pliki cookies, więc pokazujemy ją po
            Twojej zgodzie.
          </p>
          <button
            className="bg-surface text-ink focus-visible:outline-ring rounded-full px-5 py-2.5 font-semibold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() => setShown(true)}
            type="button"
          >
            Pokaż mapę
          </button>
        </div>
      )}
    </div>
  );
}
