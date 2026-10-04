import { ArrowUpRight } from "lucide-react";
import { PageLink as Link } from "../public-site/page-link";

// The end of a roster's row: straight to the resource's own page, no menu
// to open first. A click on it does not open the row.

export function RosterOpenLink({
  href,
  name,
  title,
}: {
  href: string;
  /** Whose page, for its name: `Otwórz stronę: Gabinet Zielony`. */
  name: string;
  /** The tooltip, e.g. `Otwórz stronę gabinetu`. */
  title: string;
}) {
  return (
    <Link
      aria-label={`Otwórz stronę: ${name}`}
      className="inline-grid size-7 place-items-center rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      href={href}
      title={title}
    >
      <ArrowUpRight aria-hidden="true" className="size-4" />
    </Link>
  );
}
