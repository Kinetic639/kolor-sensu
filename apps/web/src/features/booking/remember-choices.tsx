"use client";

import { useEffect } from "react";
import { memoryCookie } from "./wizard-memory-cookie";

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
