import { DETAIL_BUTTON } from "@repo/ui/detail-page";
import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";
import { CmsSection } from "./cms-section";
import {
  type RoomsPeekModel,
  roomsPeekNote,
  roomsPeekSource,
  roomsPeekStatus,
} from "./rooms-peek";

// Home → "Zajrzyj do środka" (the row of the rooms' photos): where its
// photos come from, how many the site shows now (or that it is hidden and
// why), a way to Gabinety, then its header. Without the count (it could
// not load) the header still edits.

export const ROOMS_PEEK_TITLE = "Zajrzyj do środka";

export function RoomsPeekSection({
  model,
  header,
}: {
  model: RoomsPeekModel | null;
  header: ReactNode;
}) {
  const hidden = model?.photos === 0;
  return (
    <CmsSection
      note={model ? roomsPeekNote(model) : "zdjęcia gabinetów"}
      title={ROOMS_PEEK_TITLE}
    >
      <div className="flex flex-col gap-2 px-3.5 py-2.5 text-[0.75rem]">
        <p className="m-0 text-[var(--text-muted)]">{roomsPeekSource}</p>
        <p
          className={cn(
            "m-0",
            hidden ? "text-[var(--danger)]" : "text-[var(--text)]",
          )}
          role="status"
        >
          {model
            ? roomsPeekStatus(model)
            : "Nie udało się sprawdzić, ile zdjęć gabinetów pokaże strona."}
        </p>
        <Link className={cn(DETAIL_BUTTON, "self-start")} href="/gabinety">
          {hidden ? "Dodaj zdjęcia w Gabinety" : "Przejdź do Gabinetów"}
        </Link>
      </div>
      {header}
    </CmsSection>
  );
}
