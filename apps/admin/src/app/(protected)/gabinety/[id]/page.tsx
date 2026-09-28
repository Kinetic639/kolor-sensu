import {
  loadAdminRoom,
  loadRoomExceptions,
  loadRoomProfile,
  loadRoomSchedule,
  type AdminRoomModel,
} from "@/features/rooms/loaders";
import { OpeningHoursEditor } from "@/features/rooms/opening-hours-editor";
import { RefreshOnReturn } from "@/features/rooms/refresh-on-return";
import { RoomProfileTab, RoomSettingsTab } from "@/features/rooms/room-detail";
import { RoomExceptions } from "@/features/rooms/room-exceptions";
import { RoomHeader } from "@/features/rooms/room-header";
import { RoomScheduleView } from "@/features/rooms/room-schedule-view";
import {
  loadRoomParams,
  type RoomParams,
} from "@/features/rooms/search-params";
import { notFound } from "next/navigation";

// Each tab loads only what it shows.
async function RoomTabContent({
  model,
  params,
}: {
  model: AdminRoomModel;
  params: RoomParams;
}) {
  switch (params.zakladka) {
    case "grafik": {
      const schedule = await loadRoomSchedule(model, params.tydzien);
      return (
        <RoomScheduleView
          model={schedule.model}
          roomId={model.room.id}
          roomName={model.room.name}
          today={schedule.today}
        />
      );
    }
    case "godziny": {
      const { today, exceptions } = await loadRoomExceptions(model.room.id);
      return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start">
          <OpeningHoursEditor
            hours={model.openingHours}
            roomId={model.room.id}
          />
          <RoomExceptions
            exceptions={exceptions}
            roomId={model.room.id}
            today={today}
          />
        </div>
      );
    }
    case "profil": {
      const profile = await loadRoomProfile(model.room.id);
      return <RoomProfileTab model={{ ...model, ...profile }} />;
    }
    case "ustawienia":
      return <RoomSettingsTab model={model} />;
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
    <div className="space-y-5">
      <RefreshOnReturn />
      <RoomHeader model={model} tab={roomParams.zakladka} />
      <RoomTabContent model={model} params={roomParams} />
    </div>
  );
}
