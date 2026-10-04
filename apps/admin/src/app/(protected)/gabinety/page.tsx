import { roomsWeekSummary } from "@/features/rooms/list-items";
import { NewRoomButton } from "@/features/rooms/new-room-button";
import { loadRoomsRoster } from "@/features/rooms/roster-loader";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import { RosterBar, SortMenu } from "@repo/ui/resource-roster";
import {
  loadRoomListParams,
  RoomRoster,
  RoomSearch,
  roomSegments,
  roomSortOptions,
  roomWeekNav,
  shownRooms,
} from "@repo/ui/rooms";

// Gabinety: the centre's rooms as a roster, edge to edge. A row each with
// the week as a strip (open when, how booked), what is happening there
// now and today on a line of hours; a click opens it in place on tabs
// (today, who uses it, the hours and the exceptions). A few rooms, so all
// are read at once and searched, filtered and sorted here; the address
// holds it all, the rows open included.

const PATH = "/gabinety";

export default async function RoomsPage({
  searchParams,
}: PageProps<"/gabinety">) {
  const params = loadRoomListParams(await searchParams);
  const { rows, locations, week, thisWeek } = await loadRoomsRoster(
    params.tydzien,
  );

  return (
    <FullBleed>
      <PageTitle>Gabinety</PageTitle>
      <RosterBar
        action={
          locations.length ? <NewRoomButton locations={locations} /> : null
        }
        label="Które gabinety"
        search={<RoomSearch />}
        segments={roomSegments(PATH, params, rows)}
        sort={<SortMenu options={roomSortOptions(PATH, params)} />}
      />
      <RoomRoster
        empty={
          rows.length
            ? "Żaden gabinet nie pasuje do wyszukiwania. Zmień je albo wybierz „Wszystkie”."
            : locations.length
              ? "Nie ma jeszcze gabinetów. Dodaj pierwszy i przypisz go do lokalizacji."
              : "Gabinety należą do lokalizacji centrum. Dodaj lokalizację w Ustawieniach, aby zacząć."
        }
        rows={shownRooms(rows, params)}
        summary={roomsWeekSummary(rows)}
        week={roomWeekNav(PATH, params, { week, thisWeek })}
      />
    </FullBleed>
  );
}
