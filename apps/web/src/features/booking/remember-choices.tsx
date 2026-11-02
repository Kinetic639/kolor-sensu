"use client";

import { useEffect } from "react";
import { memoryCookie, resumeCookie } from "./wizard-memory-cookie";

// The wizard shown remembers its choices (#164), once the page is really
// on screen: never for a link the router fetched ahead.
export function RememberChoices({ value }: { value: string | null }) {
  useEffect(() => {
    if (!value) return;
    document.cookie = memoryCookie(
      value,
      window.location.protocol === "https:",
    );
  }, [value]);
  return null;
}

// Where the booking was left, for the header's "Dokończ rezerwację"
// (card 11); null clears it (booked, or nothing begun).
export function ResumeBooking({ href }: { href: string | null }) {
  useEffect(() => {
    document.cookie = resumeCookie(href, window.location.protocol === "https:");
  }, [href]);
  return null;
}
