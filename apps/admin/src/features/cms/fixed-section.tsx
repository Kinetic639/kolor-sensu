import { DetailSection } from "@repo/ui/detail-page";

// A section of the page whose content lives in the site's code: listed in
// its place, so the whole page reads top to bottom, with nothing to set.

export function FixedSection({
  title,
  children,
}: {
  title: string;
  children: string;
}) {
  return (
    <DetailSection note="treść stała" title={title}>
      <p className="px-3.5 py-2.5 text-[0.75rem] text-[var(--text-muted)]">
        {children}
      </p>
    </DetailSection>
  );
}

/** A section whose settings could not load: say so, keep the page working. */
export function UnavailableSection({ title }: { title: string }) {
  return (
    <DetailSection title={title}>
      <p
        className="px-3.5 py-2.5 text-[0.75rem] text-[var(--danger)]"
        role="status"
      >
        Nie udało się wczytać ustawień tej sekcji. Odśwież stronę; jeśli to nie
        pomoże, sekcja nie jest jeszcze gotowa w bazie danych.
      </p>
    </DetailSection>
  );
}
