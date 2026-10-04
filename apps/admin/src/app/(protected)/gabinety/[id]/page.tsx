import {
  loadAdminRoom,
  loadRoomExceptions,
  loadRoomProfile,
  type AdminRoomModel,
} from "@/features/rooms/loaders";
import { OpeningHoursEditor } from "@/features/rooms/opening-hours-editor";
import { RefreshOnReturn } from "@/features/rooms/refresh-on-return";
import {
  RoomPhotos,
  RoomProfileForm,
  RoomSettingsTab,
} from "@/features/rooms/room-detail";
import { RoomExceptions } from "@/features/rooms/room-exceptions";
import { centreSettings } from "@/lib/reference-data";
import {
  ROOM_TAB_LABELS,
  RoomOverview,
  RoomPageBar,
  RoomSchedule,
  RoomWeekAside,
} from "@/features/rooms/room-page";
import { loadRoomWeek } from "@/features/rooms/roster-loader";
import {
  loadRoomParams,
  ROOM_TABS,
  roomHref,
  type RoomParams,
} from "@/features/rooms/search-params";
import { formatDateRangeShort, addDays } from "@repo/scheduling";
import { DetailBody, DetailTabs } from "@repo/ui/detail-page";
import { FullBleed } from "@repo/ui/full-bleed";
import { notFound } from "next/navigation";

// A room's page: the bar with what it is and its state, the sections as
// tabs in the address; each tab loads only what it shows (the week for
// the overview and the schedule).

async function Tab({
  model,
  params,
}: {
  model: AdminRoomModel;
  params: RoomParams;
}) {
  switch (params.zakladka) {
    case "przeglad": {
      const week = await loadRoomWeek(model.room.id);
      if (!week) notFound();
      return (
        <DetailBody
          aside={
            <RoomWeekAside
              label={formatDateRangeShort(week.week, addDays(week.week, 6))}
              row={week.row}
            />
          }
          asideLabel="Ten tydzień"
        >
          <RoomOverview model={model} row={week.row} />
        </DetailBody>
      );
    }
    case "grafik": {
      const week = await loadRoomWeek(model.room.id, params.tydzien);
      if (!week) notFound();
      return (
        <RoomSchedule
          model={model}
          hideClosed={params.zamkniete}
          schedule={week.schedule}
          thisWeek={week.thisWeek}
          week={week.week}
        />
      );
    }
    case "godziny": {
      const [{ today, exceptions }, settings] = await Promise.all([
        loadRoomExceptions(model.room.id),
        centreSettings(),
      ]);
      return (
        <DetailBody
          aside={
            <RoomExceptions
              exceptions={exceptions}
              roomId={model.room.id}
              step={settings.slotStepMinutes}
              today={today}
            />
          }
          asideLabel="Wyjątki"
        >
          <OpeningHoursEditor
            hours={model.openingHours}
            roomId={model.room.id}
            step={settings.slotStepMinutes}
          />
        </DetailBody>
      );
    }
    case "profil": {
      const detail = { ...model, ...(await loadRoomProfile(model.room.id)) };
      // The photos on the left, the form beside them.
      return (
        <DetailBody
          aside={<RoomPhotos model={detail} />}
          asideLabel="Zdjęcia"
          asideSide="left"
        >
          <RoomProfileForm model={detail} />
        </DetailBody>
      );
    }
    case "ustawienia":
      return (
        <DetailBody>
          <RoomSettingsTab model={model} />
        </DetailBody>
      );
  }
}

export default async function RoomDetailPage({
  params,
  searchParams,
}: PageProps<"/gabinety/[id]">) {
  const [{ id }, roomParams] = await Promise.all([
    params,
    loadRoomParams(searchParams),
  ]);
  const model = await loadAdminRoom(id);
  if (!model) notFound();

  return (
    <FullBleed>
      <RefreshOnReturn />
      <RoomPageBar model={model} tab={roomParams.zakladka} />
      <DetailTabs
        active={roomParams.zakladka}
        label="Sekcje gabinetu"
        tabs={ROOM_TABS.map((key) => ({
          key,
          label: ROOM_TAB_LABELS[key],
          href: roomHref(model.room.id, { zakladka: key }),
        }))}
      />
      <Tab model={model} params={roomParams} />
    </FullBleed>
  );
}
