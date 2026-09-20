import { Button } from "./button";

export interface TestContentBlockProps {
  heading: string;
  body: string;
  buttonLabel?: string | null;
}

/**
 * The one Home CMS content block for this phase. Deliberately not a
 * generic/dispatching renderer — the public site's page structure is
 * code-owned; this component just renders the one predefined, typed
 * content contract (`HomePageContent`) Admin can edit.
 */
export function TestContentBlock({
  heading,
  body,
  buttonLabel,
}: TestContentBlockProps) {
  return (
    <section className="space-y-4 py-10 text-center">
      <h1 className="font-heading text-4xl leading-tight font-semibold text-[var(--text)] sm:text-5xl">
        {heading}
      </h1>
      <p className="mx-auto max-w-2xl text-base leading-relaxed whitespace-pre-line text-[var(--text-muted)]">
        {body}
      </p>
      {buttonLabel ? <Button>{buttonLabel}</Button> : null}
    </section>
  );
}
