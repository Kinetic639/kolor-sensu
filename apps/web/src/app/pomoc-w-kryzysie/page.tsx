import { crisisLineHref } from "@repo/ui/public-site";
import { Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { getCrisisHelp } from "@/lib/public-data";
import { pageMetadata } from "@/lib/page-metadata";

// Help in a crisis: what to do at once, 112 first, then the free lines of
// support. The numbers are the crisis strip's, edited in one place in the
// CMS ("Pomoc w kryzysie" on the home page's settings), so a change shows
// everywhere at once. Linked from every page's footer and from the strip.

// Title, description and link preview: the CMS's over the page's own.
export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("crisis_help");
}

export default async function CrisisHelpPage() {
  const crisis = await getCrisisHelp();
  const lines = crisis.lines.filter((line) => line.number !== "112");

  return (
    <>
      <PageIntro heading="Pomoc w kryzysie" accent="Nie musisz być z tym sam.">
        <a
          className="rounded-card bg-pink-strong text-surface focus-visible:outline-ring flex max-w-xl items-center gap-4 p-5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 lg:p-6"
          href={crisisLineHref("112")}
        >
          <Phone
            aria-hidden="true"
            className="size-8 shrink-0"
            strokeWidth={1.75}
          />
          <span className="grid gap-1">
            <span className="text-h3 font-display">Zadzwoń pod 112</span>
            <span className="text-body font-normal">
              gdy Twoje życie lub zdrowie albo życie innej osoby jest w
              bezpośrednim zagrożeniu
            </span>
          </span>
        </a>
        <p className="max-w-copy text-lead text-text-muted">
          Kolor Sensu nie udziela pomocy w nagłych wypadkach. Wizyty u nas
          umawia się z wyprzedzeniem, więc w kryzysie skorzystaj od razu z
          numerów poniżej. Są bezpłatne.
        </p>
      </PageIntro>
      <section className="max-w-page px-gutter pb-section-sm mx-auto grid gap-6">
        <h2 className="font-display text-h2 text-ink" id="telefony-wsparcia">
          Bezpłatne telefony wsparcia
        </h2>
        <ul
          aria-labelledby="telefony-wsparcia"
          className="grid gap-4 sm:grid-cols-2"
        >
          {lines.map((line) => (
            <li
              className="rounded-card border-border bg-surface grid gap-1 border p-5"
              key={line.number}
            >
              <a
                className="text-h3 font-display text-ink underline-offset-4 hover:underline"
                href={crisisLineHref(line.number)}
              >
                {line.number}
              </a>
              <span className="text-body text-ink">{line.label}</span>
              {line.detail ? (
                <span className="text-small text-text-muted">
                  {line.detail}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="max-w-copy text-body text-text-muted">
          Gdy minie to, co najtrudniejsze, możesz{" "}
          <Link
            className="text-ink underline underline-offset-4"
            href="/umow-wizyte"
          >
            umówić wizytę
          </Link>{" "}
          albo{" "}
          <Link
            className="text-ink underline underline-offset-4"
            href="/kontakt"
          >
            napisać do nas
          </Link>
          .
        </p>
      </section>
    </>
  );
}
