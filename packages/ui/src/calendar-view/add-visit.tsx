import { CalendarPlus, Plus, X } from "lucide-react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";

// Adding a visit (K5), after the reference: "+ Nowa wizyta" turns the grid
// into a picker, and a banner says so, with a way in by hand (the
// keyboard's) and a way out. Links: the mode is in the address.

export function AddVisitButton({
  href,
  active,
}: {
  /** Turns adding on, or off when active. */
  href: string;
  active: boolean;
}) {
  return (
    <Link
      aria-pressed={active}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none",
        active
          ? "bg-[var(--warning-foreground)] text-white ring-2 ring-[color-mix(in_srgb,var(--warning)_45%,transparent)] ring-offset-2"
          : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]",
      )}
      href={href}
      role="button"
      scroll={false}
    >
      {active ? (
        <>
          <X aria-hidden="true" className="size-3.5" />
          Anuluj wybór
        </>
      ) : (
        <>
          <Plus aria-hidden="true" className="size-3.5" />
          Nowa wizyta
        </>
      )}
    </Link>
  );
}

export function AddVisitBanner({
  manualHref,
  cancelHref,
}: {
  /** The form without a picked place. */
  manualHref: string;
  cancelHref: string;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[var(--primary-soft)] p-3 shadow-sm sm:p-4"
      role="status"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
        >
          <CalendarPlus className="size-4" />
        </span>
        <div>
          <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--text)] sm:text-sm">
            Tryb dodawania nowej wizyty
            <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--primary)]">
              Wybierz miejsce w siatce
            </span>
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Kliknij wolne miejsce w kalendarzu, aby wybrać godzinę i osobę lub
            gabinet. Kliknięcie istniejącej wizyty wciąż otwiera jej szczegóły.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-foreground)] shadow-sm transition-colors hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          href={manualHref}
          scroll={false}
        >
          Otwórz formularz ręcznie
        </Link>
        <Link
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          href={cancelHref}
          scroll={false}
        >
          Anuluj
        </Link>
      </div>
    </div>
  );
}
