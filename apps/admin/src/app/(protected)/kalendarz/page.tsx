import { CancelVisitButton } from "@/features/visits/cancel-visit";
import { loadAdminCalendar } from "@/features/calendar/loaders";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/avatar";
import {
  CalendarLegend,
  CalendarToolbar,
  calendarHref,
  calendarNav,
  calendarPanelCloseHref,
  calendarPanelTabs,
  calendarPerspectiveTabs,
  calendarViewTabs,
  calendarVisitHref,
  loadCalendarParams,
  ResourceCalendar,
} from "@repo/ui/calendar-view";
import { PageTitle } from "@repo/ui/portal-content";
import { resourceColors } from "@repo/ui/resource-colors";
import { VisitPanel } from "@repo/ui/visit-table";

// Kalendarz (stage K5): the centre's day, a column per specialist or room,
// or the week of one of them; the address holds the state, including the
// visit open in the side panel (?wizyta=…), where the centre may cancel it.
// The bookings table is /rezerwacje.

const PATH = "/kalendarz";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

export default async function CalendarPage({
  searchParams,
}: PageProps<"/kalendarz">) {
  const params = loadCalendarParams(await searchParams);
  const { today, view, resources, focusId, avatars, open } =
    await loadAdminCalendar(params);
  const context = { today, defaultView: "dzien" as const };
  const week = (params.widok ?? "dzien") === "tydzien";
  const byRoom = params.perspektywa === "gabinety";

  const icons = week
    ? undefined
    : Object.fromEntries(
        resources.map((resource) => {
          const colors = resourceColors(resource.color, resource.id);
          return [
            resource.id,
            byRoom ? (
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: colors.accent }}
              />
            ) : (
              <Avatar
                aria-hidden="true"
                className="size-6"
                style={{ boxShadow: `0 0 0 2px ${colors.accent}` }}
              >
                {avatars[resource.id] ? (
                  <AvatarImage alt="" src={avatars[resource.id]!} />
                ) : null}
                <AvatarFallback
                  className="text-[0.625rem]"
                  style={{ backgroundColor: colors.tint, color: colors.accent }}
                >
                  {initials(resource.name)}
                </AvatarFallback>
              </Avatar>
            ),
          ];
        }),
      );

  return (
    <div className="space-y-3">
      <PageTitle>Kalendarz</PageTitle>
      <CalendarToolbar
        nav={calendarNav(PATH, params, context)}
        perspectives={calendarPerspectiveTabs(PATH, params)}
        resources={
          week
            ? resources.map((resource) => ({
                key: resource.id,
                label: resource.name,
                color: resource.color,
                href: calendarHref(PATH, params, {
                  zasob: resource.id,
                  wizyta: null,
                  karta: "szczegoly",
                }),
                active: resource.id === focusId,
              }))
            : undefined
        }
        views={calendarViewTabs(PATH, params, context.defaultView)}
      />
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <ResourceCalendar
            ariaLabel={week ? "Kalendarz tygodnia" : "Kalendarz dnia"}
            empty={
              byRoom
                ? "Brak aktywnych gabinetów."
                : "Brak aktywnych specjalistów."
            }
            icons={icons}
            openVisitId={params.wizyta}
            view={view}
            visitHref={(id) => calendarVisitHref(PATH, params, id)}
          />
          <CalendarLegend />
        </div>
        {open ? (
          <VisitPanel
            closeHref={calendarPanelCloseHref(PATH, params)}
            events={open.events}
            row={open.row}
            tab={params.karta}
            tabs={calendarPanelTabs(PATH, params)}
            toolbar={
              open.row.cancellable ? (
                <CancelVisitButton
                  visit={{
                    id: open.row.id,
                    reference: open.row.reference,
                    label: `${open.row.clientName}, ${open.row.weekday}, ${open.row.dateLabel}, ${open.row.time}`,
                    paid: open.row.paid,
                  }}
                />
              ) : null
            }
          />
        ) : null}
      </div>
    </div>
  );
}
