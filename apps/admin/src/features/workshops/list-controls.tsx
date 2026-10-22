"use client";

import type { WorkshopVisibility } from "@repo/supabase/workshops-admin";
import { TableSearch } from "@repo/ui/data-table";
import { useSave } from "@/lib/use-save";
import { setWorkshopVisibilityAction } from "./actions";
import { workshopListParsers } from "./search-params";

// Warsztaty's list controls: the search in the address (the server filters
// again) and the site's two switches: Warsztaty in the menu, the coming
// workshops on the homepage.

const PARSERS = { q: workshopListParsers.q };

export function WorkshopSearch() {
  return (
    <TableSearch
      label="Szukaj warsztatu"
      parsers={PARSERS}
      placeholder="Szukaj warsztatu…"
    />
  );
}

export function VisibilitySwitches({
  visibility,
}: {
  visibility: WorkshopVisibility;
}) {
  const { isPending, run } = useSave();
  const toggle = (patch: Partial<WorkshopVisibility>) =>
    run(() => setWorkshopVisibilityAction(patch), "Zapisano");
  return (
    <fieldset className="flex items-center gap-3 text-[0.8125rem]">
      <legend className="sr-only">Na stronie</legend>
      <label className="flex items-center gap-1.5">
        <input
          checked={visibility.inMenu}
          className="size-4 accent-[var(--primary)]"
          disabled={isPending}
          onChange={(event) => toggle({ inMenu: event.target.checked })}
          type="checkbox"
        />
        W menu strony
      </label>
      <label className="flex items-center gap-1.5">
        <input
          checked={visibility.onHome}
          className="size-4 accent-[var(--primary)]"
          disabled={isPending}
          onChange={(event) => toggle({ onHome: event.target.checked })}
          type="checkbox"
        />
        Na stronie głównej
      </label>
    </fieldset>
  );
}
