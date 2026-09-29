import { useId, type ReactNode } from "react";
import { PageLink as Link } from "../public-site/page-link";

// "Twoja rezerwacja": what the client has chosen so far, each with a way to
// change it, and what is still to choose. The step's action goes below.

export interface BookingSummaryItem {
  key: string;
  icon: ReactNode;
  label: string;
  /** The choice; without it, the placeholder is shown. */
  value?: ReactNode;
  /** A second line under the value (e.g. the specialist's title). */
  detail?: ReactNode;
  placeholder?: string;
  changeHref?: string;
}

export interface BookingSummaryProps {
  items: BookingSummaryItem[];
  title?: string;
  /** The step's action and notices. */
  children?: ReactNode;
}

export function BookingSummary({
  items,
  title = "Twoja rezerwacja",
  children,
}: BookingSummaryProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-card border-border/70 bg-surface shadow-card border p-5 sm:p-6"
    >
      <h2 className="font-display text-title text-ink" id={titleId}>
        {title}
      </h2>
      <ul className="divide-border/70 mt-3 divide-y">
        {items.map((item) => (
          <li className="flex items-start gap-3 py-3" key={item.key}>
            <span
              aria-hidden="true"
              className="bg-primary-soft text-primary-strong flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full [&_svg]:size-5"
            >
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-small text-ink font-semibold">{item.label}</p>
              <p className="text-small text-text-muted">
                {item.value ?? item.placeholder}
                {item.value && item.detail ? (
                  <span className="block">{item.detail}</span>
                ) : null}
              </p>
            </div>
            {item.value && item.changeHref ? (
              <Link
                aria-label={`Zmień: ${item.label}`}
                className="text-small text-primary-strong hover:text-primary focus-visible:outline-ring shrink-0 font-semibold underline underline-offset-4 focus-visible:outline-2"
                href={item.changeHref}
              >
                Zmień
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      {children ? <div className="mt-3 grid gap-3">{children}</div> : null}
    </section>
  );
}
