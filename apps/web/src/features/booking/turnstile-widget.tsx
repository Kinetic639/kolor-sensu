"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile inside a form: renders the check and adds its token
// to the form as `cf-turnstile-response`. Rendered explicitly, so it also
// works after client-side navigation, when the script is already loaded.

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.turnstile) return resolve();
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.append(script);
    }
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(), { once: true });
  });
}

export interface TurnstileEvents {
  /** The check passed: its token is in the form. */
  onVerify?: () => void;
  /** The token ran out; Turnstile checks again by itself. */
  onExpire?: () => void;
  /** The check failed, timed out, or Turnstile did not load. */
  onError?: () => void;
}

export function TurnstileWidget({
  siteKey,
  ...events
}: { siteKey: string } & TurnstileEvents) {
  const container = useRef<HTMLDivElement>(null);
  // The latest handlers, without rendering the check again for each.
  const handlers = useRef(events);
  useEffect(() => {
    handlers.current = events;
  });

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId = window.turnstile.render(container.current, {
          sitekey: siteKey,
          language: "pl",
          theme: "light",
          size: "flexible",
          callback: () => handlers.current.onVerify?.(),
          "expired-callback": () => handlers.current.onExpire?.(),
          "error-callback": () => handlers.current.onError?.(),
          "timeout-callback": () => handlers.current.onError?.(),
        });
      })
      .catch(() => {
        console.error("[booking] Turnstile could not load");
        handlers.current.onError?.();
      });
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  return <div className="min-h-[65px]" ref={container} />;
}
