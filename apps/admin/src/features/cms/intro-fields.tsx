"use client";

import type { PageHeaderContent } from "@repo/contracts";
import { PageHeaderFields } from "./header-block";

// A page's top in the CMS: its header, edited as the sections' headers are
// (header-block.tsx), with the title's two lines. Shows what the draft's
// check flags under `intro`.

export function IntroFields({
  id,
  value,
  onChange,
  problems = {},
  leadHint,
}: {
  id: string;
  value: PageHeaderContent;
  onChange: (intro: PageHeaderContent) => void;
  problems?: Record<string, true>;
  leadHint?: string;
}) {
  const flagged = Object.keys(problems).filter((path) =>
    path.startsWith("intro"),
  );
  const problem =
    flagged.length === 0
      ? null
      : flagged.some((path) => path.startsWith("intro.title"))
        ? "Wpisz tytuł strony (pierwszy wiersz)."
        : "Popraw nagłówek strony.";
  return (
    <PageHeaderFields
      id={id}
      leadHint={leadHint}
      onChange={onChange}
      problem={problem}
      value={value}
    />
  );
}

/** Which fields a draft's check flags, as "path.to.field" → true. */
export function problemsOf(issues: readonly { path: PropertyKey[] }[]) {
  return Object.fromEntries(
    issues.map((issue) => [issue.path.map(String).join("."), true as const]),
  );
}
