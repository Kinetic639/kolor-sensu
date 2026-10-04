import {
  openDaysOnly,
  type CalendarColumn,
  type CalendarNow,
  type MinuteRange,
} from "@repo/scheduling";
import {
  DaySchedule,
  Figures,
  ScheduleAgenda,
  ScheduleCanvas,
  ScheduleFrame,
  ScheduleToolbar,
  weekFigures,
} from "@repo/ui/calendar-view";
import {
  DETAIL_BUTTON,
  DetailBar,
  DetailProp,
  DetailProps,
  DetailSection,
} from "@repo/ui/detail-page";
import { scheduleWeekNav } from "@repo/ui/resource-roster";
import {
  RoomMark,
  RoomTodayPane,
  RoomUsersPane,
  type RoomRow,
} from "@repo/ui/rooms";
import { Tag } from "@repo/ui/visit-table";
import { ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminRoomModel } from "./loaders";
import { RoomSwitcher } from "./room-switcher";
import { roomHref, type RoomTab } from "./search-params";

// A room's page (Gabinety → a room), as a specialist's: one bar with what
// it is and its state, the sections as tabs in the address, the content in
// sections of rows; the week as the calendar draws it. Rendered on the
// server; only the forms and the room switcher run in the browser.

const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

/** Where a visit opens: the bookings, with it in the side panel. */
const visitHref = (visitId: string) =>
  `/rezerwacje?zakres=wszystkie&wizyta=${visitId}`;

/** `1 osoba`, `do 12 osób` */
export const capacityLabel = (capacity: number) =>
  capacity === 1 ? "1 osoba" : `do ${capacity} osób`;

function Muted({ children }: { children: ReactNode }) {
  return (
    <span className="text-[0.75rem] text-[var(--text-muted)]">{children}</span>
  );
}

export const ROOM_TAB_LABELS: Record<RoomTab, string> = {
  przeglad: "Przegląd",
  grafik: "Grafik",
  godziny: "Godziny otwarcia",
  profil: "Profil publiczny",
  ustawienia: "Ustawienia",
};

export function RoomPageBar({
  model,
  tab,
}: {
  model: AdminRoomModel;
  tab: RoomTab;
}) {
  const { room } = model;
  return (
    <DetailBar
      // Its state on the right; where it is and for how many: the overview.
      actions={
        <span className="flex flex-wrap items-center justify-end gap-1">
          <Tag tone={room.active ? "success" : "neutral"}>
            {room.active ? "Aktywny" : "Nieaktywny"}
          </Tag>
          <Tag tone={model.onSite ? "info" : "neutral"}>
            {model.onSite ? "Na stronie" : "Ukryty na stronie"}
          </Tag>
        </span>
      }
      back={{ href: "/gabinety", label: "Gabinety" }}
      leading={<RoomMark room={room} />}
      title={room.name}
      // The name is the way to another room.
      titleControl={
        <RoomSwitcher
          name={room.name}
          roomId={room.id}
          rooms={model.rooms}
          tab={tab}
        />
      }
    />
  );
}

/** Przegląd: what the room is, its hours, how the site shows it. */
export function RoomOverview({
  model,
  row,
}: {
  model: AdminRoomModel;
  row: RoomRow;
}) {
  const { room } = model;
  const tabLink = (zakladka: RoomTab, label: string) => (
    <Link
      className={DETAIL_BUTTON}
      href={roomHref(room.id, { zakladka }) as Route}
    >
      {label}
    </Link>
  );
  return (
    <>
      <DetailSection actions={tabLink("ustawienia", "Zmień")} title="Gabinet">
        <DetailProps>
          <DetailProp label="Lokalizacja">
            <span className="grid">
              <span>{model.locationName}</span>
              {model.address ? <Muted>{model.address}</Muted> : null}
            </span>
          </DetailProp>
          <DetailProp label="Pojemność">
            {capacityLabel(room.capacity)}
          </DetailProp>
          <DetailProp label="Stan">
            <Tag tone={room.active ? "success" : "neutral"}>
              {room.active ? "Aktywny" : "Nieaktywny"}
            </Tag>
          </DetailProp>
        </DetailProps>
      </DetailSection>
      <DetailSection
        actions={tabLink("godziny", "Zmień")}
        title="Godziny otwarcia"
      >
        <DetailProps>
          <DetailProp label="Tydzień">
            {row.hoursSummary ?? (
              <Muted>bez godzin: otwarty, gdy ktoś ma dyżur</Muted>
            )}
          </DetailProp>
          <DetailProp label="Wyjątki">
            {row.exceptions.length ? (
              <span className="grid gap-0.5">
                {row.exceptions.slice(0, 3).map((one) => (
                  <span key={one.key}>
                    <span className="font-mono text-[0.75rem] text-[var(--text-muted)]">
                      {one.date}
                    </span>{" "}
                    {one.text}
                  </span>
                ))}
              </span>
            ) : (
              <Muted>brak zaplanowanych</Muted>
            )}
          </DetailProp>
        </DetailProps>
      </DetailSection>
      <DetailSection
        actions={
          model.onSite ? (
            <a
              className={DETAIL_BUTTON}
              href={`${webUrl}/gabinety`}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden="true" />
              Podgląd
            </a>
          ) : (
            tabLink("profil", "Profil")
          )
        }
        title="Na stronie"
      >
        <DetailProps>
          <DetailProp label="Stan">
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Tag tone={model.onSite ? "info" : "neutral"}>
                {model.onSite ? "Widoczny" : "Ukryty"}
              </Tag>
              <Muted>
                {model.onSite
                  ? "w zakładce Gabinety"
                  : "pokażesz go w Ustawieniach, gdy profil jest gotowy"}
              </Muted>
            </span>
          </DetailProp>
        </DetailProps>
      </DetailSection>
    </>
  );
}

/** Beside the overview: the week in numbers, today, who uses the room. */
export function RoomWeekAside({ row, label }: { row: RoomRow; label: string }) {
  return (
    <>
      <DetailSection note={label} title="Ten tydzień">
        <Figures
          className="border-b-0"
          items={weekFigures(row.occupancy)}
          stacked
        />
      </DetailSection>
      {row.today ? (
        <DetailSection title="Dziś">
          <div className="px-3.5 py-3">
            <RoomTodayPane room={row} today={row.today} />
          </div>
        </DetailSection>
      ) : null}
      <DetailSection title="Kto korzysta">
        <div className="px-3.5 py-2">
          <RoomUsersPane
            availableHours={row.occupancy.availableHours}
            users={row.users}
          />
        </div>
      </DetailSection>
    </>
  );
}

/** Grafik: the room's week as the calendar draws it, week by week. */
export function RoomSchedule({
  model,
  schedule,
  week,
  thisWeek,
  hideClosed,
}: {
  model: AdminRoomModel;
  schedule: {
    range: MinuteRange;
    now: CalendarNow | null;
    columns: CalendarColumn[];
  };
  week: string;
  thisWeek: string;
  /** Hide the days the room is closed (on by default). */
  hideClosed: boolean;
}) {
  const label = `Tydzień: ${model.room.name}`;
  const view = hideClosed ? openDaysOnly(schedule) : schedule;
  const empty = "W tym tygodniu gabinet nie ma dyżurów ani wizyt.";
  return (
    <ScheduleCanvas className="flex min-h-0 flex-1 flex-col">
      <ScheduleToolbar
        nav={scheduleWeekNav(
          (tydzien) =>
            roomHref(model.room.id, {
              zakladka: "grafik",
              tydzien,
              zamkniete: hideClosed,
            }),
          { week, thisWeek },
        )}
        search={false}
        switches={["zamkniete", "wyszarz", "wizyty", "dostepnosc"]}
        views={[]}
      />
      <ScheduleFrame
        desktop={
          <DaySchedule
            ariaLabel={label}
            empty={empty}
            mode="specialists"
            view={view}
            visitHref={visitHref}
          />
        }
        mobile={
          <ScheduleAgenda
            ariaLabel={label}
            columns={view.columns}
            empty={empty}
            visitHref={visitHref}
          />
        }
      />
    </ScheduleCanvas>
  );
}
