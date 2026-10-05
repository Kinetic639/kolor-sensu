import { loadEmailPreviews } from "@/features/emails/loaders";
import { emailHref, loadEmailParams } from "@/features/emails/search-params";
import { cn } from "@repo/ui/lib/utils";
import { DetailSection, ROW_LINE } from "@repo/ui/detail-page";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import { Paperclip } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

// CMS → E-maile: every e-mail a client gets, in groups, each with when it
// goes; the chosen one beside, as the client sees it (or its plain text),
// built by the site from a sample visit with the centre's own contact,
// company and reminder settings. Read only: the words live in the code.

export default async function EmailsPage({
  searchParams,
}: PageProps<"/maile">) {
  const { mail, widok } = loadEmailParams(await searchParams);
  const emails = await loadEmailPreviews();

  if (!emails) {
    return (
      <FullBleed>
        <PageTitle>E-maile</PageTitle>
        <p className="p-6 text-[0.8125rem] text-[var(--text-muted)]">
          Nie udało się pobrać e-maili ze strony. Sprawdź, czy strona działa, i
          odśwież.
        </p>
      </FullBleed>
    );
  }

  const chosen = emails.find((email) => email.key === mail) ?? emails[0]!;
  const groups = [...new Set(emails.map((email) => email.group))];

  return (
    <FullBleed>
      <PageTitle>E-maile</PageTitle>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--surface)] lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:overflow-hidden">
        <nav
          aria-label="E-maile do klientów"
          className="min-w-0 border-b border-[var(--border)] lg:overflow-y-auto lg:border-r lg:border-b-0"
        >
          {groups.map((group) => (
            <DetailSection key={group} title={group}>
              <ul>
                {emails
                  .filter((email) => email.group === group)
                  .map((email) => {
                    const current = email.key === chosen.key;
                    return (
                      <li key={email.key}>
                        <Link
                          aria-current={current ? "page" : undefined}
                          className={cn(
                            "grid gap-0.5 border-b px-3.5 py-2 last:border-b-0 hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none focus-visible:ring-inset",
                            ROW_LINE,
                            current &&
                              "bg-[var(--surface-muted)] shadow-[inset_2px_0_0_var(--primary)]",
                          )}
                          href={emailHref({ mail: email.key, widok }) as Route}
                          scroll={false}
                        >
                          <span className="text-[0.8125rem] font-medium text-[var(--text)]">
                            {email.name}
                          </span>
                          <span className="text-[0.75rem] text-[var(--text-muted)]">
                            {email.when}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </DetailSection>
          ))}
        </nav>

        <section
          aria-label={`Podgląd: ${chosen.name}`}
          className="flex min-h-[70vh] min-w-0 flex-col lg:min-h-0"
        >
          <div className="grid shrink-0 gap-1 border-b border-[var(--border)] px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-[0.9375rem] font-semibold text-[var(--text)]">
                {chosen.name}
              </h2>
              <span className="text-[0.75rem] text-[var(--text-muted)]">
                {chosen.when}
              </span>
              <nav
                aria-label="Widok e-maila"
                className="ml-auto flex rounded-[6px] border border-[var(--border)] p-0.5 text-[0.75rem]"
              >
                {(
                  [
                    ["wyglad", "Wygląd"],
                    ["tekst", "Tekst"],
                  ] as const
                ).map(([key, label]) => (
                  <Link
                    aria-current={widok === key ? "page" : undefined}
                    className={cn(
                      "rounded-[4px] px-2 py-0.5",
                      widok === key
                        ? "bg-[var(--surface-muted)] font-medium text-[var(--text)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text)]",
                    )}
                    href={emailHref({ mail: chosen.key, widok: key }) as Route}
                    key={key}
                    scroll={false}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[0.75rem]">
              <dt className="text-[var(--text-muted)]">Temat</dt>
              <dd className="font-medium break-words text-[var(--text)]">
                {chosen.subject}
              </dd>
              <dt className="text-[var(--text-muted)]">Zajawka</dt>
              <dd className="break-words text-[var(--text-muted)]">
                {chosen.preview}
              </dd>
              {chosen.attachment ? (
                <>
                  <dt className="text-[var(--text-muted)]">Załącznik</dt>
                  <dd className="inline-flex items-center gap-1 text-[var(--text)]">
                    <Paperclip aria-hidden="true" className="size-3.5" />
                    {chosen.attachment}
                  </dd>
                </>
              ) : null}
            </dl>
          </div>
          {widok === "tekst" ? (
            <pre className="min-h-0 flex-1 overflow-auto bg-[var(--surface-subtle)] p-4 font-mono text-[0.75rem] leading-5 whitespace-pre-wrap text-[var(--text)]">
              {chosen.text}
            </pre>
          ) : (
            <iframe
              className="min-h-[60vh] w-full flex-1 border-0 bg-white"
              sandbox=""
              srcDoc={chosen.html}
              title={`Wygląd e-maila: ${chosen.name}`}
            />
          )}
          <p className="shrink-0 border-t border-[var(--border)] px-3.5 py-2 text-[0.75rem] text-[var(--text-muted)]">
            Przykładowa wizyta i klient. Kontakt, dane firmy i godziny
            przypomnień są z Ustawień.
          </p>
        </section>
      </div>
    </FullBleed>
  );
}
