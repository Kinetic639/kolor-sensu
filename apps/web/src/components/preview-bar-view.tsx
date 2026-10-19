"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// The CMS preview's bar, fixed at the bottom of every page while the admin
// browses the drafts. It says the changes are not published yet and ends
// the preview. Every few seconds it asks the site when the CMS content last
// changed; when that moves (the admin saved a draft in the portal) it
// refreshes the page, which then shows the new draft. Asking a tiny route
// is the simplest thing that works across the portal's and the site's
// domains, with nothing new to install; it pauses while the tab is hidden.

export const PREVIEW_POLL_MS = 3000;

async function readVersion(): Promise<string | null | undefined> {
  try {
    const response = await fetch("/api/preview/version", {
      cache: "no-store",
    });
    if (!response.ok) return undefined;
    const body = (await response.json()) as { version?: string | null };
    return body.version ?? null;
  } catch {
    return undefined;
  }
}

export function PreviewBarView() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let known: string | null | undefined;
    let stopped = false;

    async function check() {
      if (stopped || document.visibilityState === "hidden") return;
      const version = await readVersion();
      if (stopped || version === undefined) return;
      if (known !== undefined && version !== known) router.refresh();
      known = version;
    }

    void check();
    const timer = window.setInterval(check, PREVIEW_POLL_MS);
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[1000] flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-[var(--color-border)] bg-[var(--color-ink)] px-4 py-2.5 text-sm text-[var(--color-on-primary)] shadow-[0_-4px_16px_rgb(0_0_0/0.12)]"
    >
      <span className="font-medium">
        Podgląd szkicu — zmiany nie są opublikowane
      </span>
      <form action="/api/preview/exit" method="post">
        <input name="sciezka" type="hidden" value={pathname} />
        <button
          className="min-h-9 rounded-full border border-current px-4 font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          type="submit"
        >
          Zakończ podgląd
        </button>
      </form>
    </div>
  );
}
