"use client";

import { type ReactNode, useState } from "react";
import { type HomeRoomsGallery } from "@repo/contracts/rooms-peek";
import { SaveRow, SwitchRow } from "@/features/center/fields";
import { useSave } from "@/lib/use-save";
import { CmsSection } from "./cms-section";
import { updateHomeRoomsDraftAction } from "./actions";
import type { RoomsPeekModel } from "./rooms-peek";
import type { ContentViewModel } from "./types";

export const ROOMS_PEEK_TITLE = "Nasze gabinety";
export type RoomsPeekEditorModel = RoomsPeekModel &
  ContentViewModel<HomeRoomsGallery>;

export function RoomsPeekSection({
  model,
  header,
}: {
  model: RoomsPeekEditorModel | null;
  header: ReactNode;
}) {
  return (
    <CmsSection
      title={ROOMS_PEEK_TITLE}
      note="Malowany banner ze zdjęciami i podpisami"
    >
      {header}
      {model ? (
        <GalleryEditor model={model} />
      ) : (
        <p className="p-3 text-sm">
          Nie udało się wczytać ustawień zdjęć. Nagłówek nadal można edytować.
        </p>
      )}
    </CmsSection>
  );
}

function GalleryEditor({ model }: { model: RoomsPeekEditorModel }) {
  const [visible, setVisible] = useState(model.content.visible);
  const [saved, setSaved] = useState(model.content.visible);
  const { isPending, run } = useSave();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            updateHomeRoomsDraftAction({ visible, source: "auto", photos: [] }),
          "Zapisano szkic",
          () => setSaved(visible),
        );
      }}
    >
      <SwitchRow
        label="Pokazuj banner gabinetów"
        description="Bez zdjęć banner pozostaje ukryty."
        checked={visible}
        onCheckedChange={setVisible}
      />
      <div className="grid gap-3 px-3.5 py-3">
        <p className="text-sm text-[var(--text-muted)]">
          Zdjęcia, nazwy i podpisy są pobierane automatycznie z opublikowanych
          gabinetów. Każde zdjęcie ma własny podpis — edytuj go w zakładce
          Gabinety. Zdjęcie główne pojawia się jako pierwsze, a pozostałe w
          zapisanej kolejności. Strzałki zmieniają cały gabinet i pojawiają się
          dopiero, gdy więcej niż jeden gabinet ma zdjęcia.
        </p>
        <SaveRow dirty={visible !== saved} pending={isPending}>
          Zapisz szkic
        </SaveRow>
      </div>
    </form>
  );
}
