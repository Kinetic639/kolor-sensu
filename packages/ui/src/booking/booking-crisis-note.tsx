import { crisisLineHref } from "../public-site/crisis-strip";
import { PageLink as Link } from "../public-site/page-link";

// Help in a crisis on every step of the booking wizard (#247): 112 when a
// life is at risk, one free line of support (116 123 when the CMS has it,
// else its first other line) and the way to the page about help. The
// numbers are the crisis strip's, edited in one place in the CMS.

export interface BookingCrisisLine {
  number: string;
  label: string;
  detail: string;
}

export function BookingCrisisNote({
  lines,
  href,
}: {
  lines: readonly BookingCrisisLine[];
  href: string;
}) {
  const emergency = lines.find((line) => line.number === "112");
  const support =
    lines.find((line) => line.number === "116 123") ??
    lines.find((line) => line.number !== "112");
  const phone =
    "text-ink font-semibold tabular-nums underline underline-offset-2";
  return (
    <aside
      aria-label="Pomoc w kryzysie"
      className="rounded-card-sm bg-bg text-small text-text-muted p-4"
    >
      <p>
        <strong className="text-ink">W kryzysie?</strong>{" "}
        {emergency ? (
          <>
            Gdy życie jest w zagrożeniu, dzwoń pod{" "}
            <a className={phone} href={crisisLineHref(emergency.number)}>
              {emergency.number}
            </a>
            .{" "}
          </>
        ) : null}
        {support ? (
          <>
            {support.label}
            {support.detail ? ` (${support.detail})` : ""}:{" "}
            <a className={phone} href={crisisLineHref(support.number)}>
              {support.number}
            </a>
            .{" "}
          </>
        ) : null}
        <Link
          className="text-primary-strong font-semibold underline underline-offset-2"
          href={href}
        >
          Pomoc w kryzysie
        </Link>
      </p>
    </aside>
  );
}
