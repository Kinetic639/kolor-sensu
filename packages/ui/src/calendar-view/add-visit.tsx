import { MousePointerClick, Plus, X } from "lucide-react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";

// Adding a visit (K5): "+ Nowa wizyta" (small, at the toolbar's end) turns
// the grid into a picker, and a slim bar under the toolbar says so, with
// a way in by hand (the keyboard's) and a way out; the grid stays where
// it is. Links: the mode is in the address.

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
        "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-[0.75rem] font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:outline-none",
        active
          ? "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-muted)]"
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
  moving,
}: {
  /** The form without a picked place. */
  manualHref: string;
  cancelHref: string;
  /** Moving this visit (the centre, R12) instead of adding one. */
  moving?: { reference: string; label: string };
}) {
  return (
    <div
      className="flex min-h-[34px] shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[var(--primary-soft)] py-1 pr-1.5 pl-3 text-[0.8125rem] text-[var(--primary)]"
      role="status"
    >
      <MousePointerClick aria-hidden="true" className="size-4 shrink-0" />
      <p className="min-w-0">
        <span className="font-semibold">
          {moving
            ? `Przesuwanie wizyty ${moving.reference}`
            : "Wybierz wolne miejsce w siatce"}
        </span>
        <span className="text-[color-mix(in_srgb,var(--primary)_75%,var(--text))]">
          {moving
            ? ` · ${moving.label}: kliknij nową godzinę`
            : " · godzinę i osobę lub gabinet; wizyta w siatce wciąż otwiera swoje szczegóły"}
        </span>
      </p>
      <span className="ml-auto flex items-center gap-1">
        <Link
          className="inline-flex h-6 items-center rounded-[5px] border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[var(--surface)] px-2 text-[0.75rem] font-medium text-[var(--primary)] hover:bg-[var(--surface-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          href={manualHref}
          scroll={false}
        >
          Otwórz formularz ręcznie
        </Link>
        <Link
          className="inline-flex h-6 items-center rounded-[5px] px-2 text-[0.75rem] font-medium text-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          href={cancelHref}
          scroll={false}
        >
          Anuluj
        </Link>
      </span>
    </div>
  );
}
