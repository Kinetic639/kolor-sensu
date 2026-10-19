"use client";

import type { PageIntroContent } from "@repo/contracts";
import { TextField } from "./text-field";

// A page's top in the CMS (PageIntro): the small eyebrow, the title (the
// page's h1), its green second line and the lead. Marked invalid where the
// draft's check flags `intro.<field>`.

export function IntroFields({
  id,
  value,
  onChange,
  problems = {},
  leadHint,
}: {
  id: string;
  value: PageIntroContent;
  onChange: (intro: PageIntroContent) => void;
  problems?: Record<string, true>;
  leadHint?: string;
}) {
  const set = (patch: Partial<PageIntroContent>) =>
    onChange({ ...value, ...patch });
  return (
    <div className="grid gap-3.5 px-3.5 py-3 sm:grid-cols-2">
      <TextField
        className="sm:col-span-2"
        hint="Mały napis nad tytułem. Puste: bez napisu."
        id={`${id}-eyebrow`}
        label="Nadtytuł"
        maxLength={80}
        onChange={(eyebrow) => set({ eyebrow })}
        value={value.eyebrow}
      />
      <TextField
        id={`${id}-heading`}
        invalid={problems["intro.heading"]}
        label="Tytuł strony"
        maxLength={120}
        onChange={(heading) => set({ heading })}
        value={value.heading}
      />
      <TextField
        hint="Druga linia tytułu, na zielono. Puste: bez niej."
        id={`${id}-accent`}
        label="Akcent"
        maxLength={120}
        onChange={(accent) => set({ accent })}
        value={value.accent}
      />
      <TextField
        className="sm:col-span-2"
        hint={leadHint ?? "Puste: bez opisu."}
        id={`${id}-lead`}
        label="Opis pod tytułem"
        maxLength={600}
        multiline
        onChange={(lead) => set({ lead })}
        rows={3}
        value={value.lead}
      />
    </div>
  );
}

/** Which fields a draft's check flags, as "path.to.field" → true. */
export function problemsOf(issues: readonly { path: PropertyKey[] }[]) {
  return Object.fromEntries(
    issues.map((issue) => [issue.path.map(String).join("."), true as const]),
  );
}
