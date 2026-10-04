import { AvailabilityCalendar } from "@/features/availability/availability-calendar";
import {
  AddRuleButton,
  AddTimeOffButton,
  DeleteTimeOffButton,
  RuleCardActions,
  WeekTemplateButton,
} from "@/features/availability/availability-controls";
import { AvailabilityEditorProvider } from "@/features/availability/editor";
import { loadAvailability } from "@/features/availability/loaders";
import {
  availabilityHref,
  loadAvailabilityParams,
  type AvailabilityParams,
} from "@/features/availability/search-params";
import type { AvailabilityViewModel } from "@/features/availability/types";
import type { SpecialistAvailabilityRule } from "@repo/contracts";
import { WEEKDAY_SHORT } from "@repo/scheduling";
import {
  AvailabilityRuleCard,
  StatDots,
  TimeOffItem,
} from "@repo/ui/availability";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { LinkTabs } from "@repo/ui/link-tabs";
import { EmptyState, PageTitle, StatTile } from "@repo/ui/portal-content";
import {
  Building2,
  Calendar,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Filter,
  MousePointer2,
  RotateCw,
  Sparkles,
  Video,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

function Pill({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--primary)_25%,transparent)] bg-[var(--primary-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)]">
      {icon}
      {children}
    </span>
  );
}

/**
 * Which room's occupancy is shown over the calendar: who else has it and
 * when it is closed, so a free room is easy to find.
 */
function RoomFocusBar({
  model,
  params,
}: {
  model: AvailabilityViewModel;
  params: AvailabilityParams;
}) {
  const focus = model.calendar.roomFocus;
  const roomHref = (gabinet: string) =>
    availabilityHref({ ...params, gabinet }) as Route;
  return (
    <Card className="grid gap-2.5 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)]">
          <DoorOpen aria-hidden="true" className="size-3.5" />
          Zajętość gabinetu:
        </span>
        <LinkTabs
          ariaLabel="Pokaż zajętość gabinetu"
          items={[
            ...model.rooms.map((room) => ({
              key: room.id,
              label: room.name,
              href: roomHref(room.id),
              active: focus?.id === room.id,
              icon: (
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: room.accent }}
                />
              ),
            })),
            {
              key: "brak",
              label: "Ukryj",
              href: roomHref("brak"),
              active: !focus,
            },
          ]}
          linkAs={Link}
          variant="chips"
        />
      </div>
      {focus ? (
        <>
          <p className="text-xs text-[var(--text-muted)]">
            <strong className="font-semibold text-[var(--text)]">
              {focus.name}
            </strong>
            {" · "}
            {focus.hoursLabel
              ? `Otwarty: ${focus.hoursLabel}`
              : "Bez ustalonych godzin otwarcia"}
            {" · "}
            {focus.busyLabel
              ? `W tym tygodniu: ${focus.busyLabel}. Skontaktuj się z osobą, która ma gabinet, jeśli chcesz zamienić godziny.`
              : "W tym tygodniu nikt inny go nie zajmuje."}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Zaznaczanie na siatce omija zajęte i zamknięte godziny tego
            gabinetu. Dyżur online albo w innym gabinecie w tym czasie dodasz po
            wybraniu innego gabinetu lub „Ukryj”, albo przyciskiem „+” przy
            dniu.
          </p>
        </>
      ) : null}
    </Card>
  );
}

function CalendarView({
  model,
  params,
  today,
  rules,
}: {
  model: AvailabilityViewModel;
  params: AvailabilityParams;
  today: string;
  rules: SpecialistAvailabilityRule[];
}) {
  const { calendar } = model;
  const weekHref = (week: string) =>
    availabilityHref({ ...params, tydzien: week }) as Route;

  return (
    <>
      <Card className="grid gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Pill icon={<Sparkles aria-hidden="true" className="size-3.5" />}>
                Interaktywny kalendarz dostępności
              </Pill>
              <span className="text-xs font-medium text-[var(--text-muted)]">
                {calendar.title}
              </span>
            </div>
            <h2 className="text-base font-bold text-[var(--text)] sm:text-lg">
              Przeciągaj po siatce godzin, aby natychmiast określać okna przyjęć
            </h2>
            <p className="max-w-3xl text-xs text-[var(--text-muted)]">
              Kliknij i przeciągnij w dół w kolumnie wybranego dnia, aby
              utworzyć blok dyżuru. Kliknij istniejący blok, aby go edytować lub
              usunąć. Z klawiatury: przycisk „+” przy dniu.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AddRuleButton
              validFrom={calendar.week < today ? today : calendar.week}
            />
            <WeekTemplateButton
              roomId={model.rooms[0]?.id ?? null}
              validFrom={calendar.week < today ? today : calendar.week}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
          <StatDots
            items={[
              {
                label: "Łączna dostępność",
                value: calendar.stats.available,
                tone: "primary",
              },
              {
                label: "Zarezerwowane wizyty",
                value: calendar.stats.booked,
                tone: "info",
              },
              {
                label: "Wolny czas dla pacjentów",
                value: calendar.stats.free,
                tone: "warning",
              },
            ]}
          />
          <nav aria-label="Tydzień" className="flex items-center gap-1.5">
            <Button asChild size="icon" variant="secondary">
              <Link
                aria-label="Poprzedni tydzień"
                href={weekHref(calendar.previousWeek)}
                scroll={false}
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={weekHref(today)} scroll={false}>
                Dziś
              </Link>
            </Button>
            <Button asChild size="icon" variant="secondary">
              <Link
                aria-label="Następny tydzień"
                href={weekHref(calendar.nextWeek)}
                scroll={false}
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </Card>

      {model.rooms.length ? (
        <RoomFocusBar model={model} params={params} />
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2.5 text-xs text-[var(--text-muted)]">
          <p className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded border border-[color-mix(in_srgb,var(--primary)_25%,transparent)] bg-[var(--primary-soft)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--primary)]">
              <MousePointer2 aria-hidden="true" className="size-3" />
              Tryb przeciągania aktywny
            </span>
            Naciśnij lewy przycisk myszy i przeciągnij w dół, aby wyznaczyć
            godziny.
          </p>
          <ul
            aria-label="Legenda"
            className="flex flex-wrap items-center gap-3 text-[0.6875rem] text-[var(--text)]"
          >
            {model.rooms.map((room) => (
              <li className="flex items-center gap-1" key={room.id}>
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: room.accent }}
                />
                {room.name}
              </li>
            ))}
            <li className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-[var(--info)]"
              />
              Online
            </li>
            {calendar.roomFocus ? (
              <>
                <li className="flex items-center gap-1">
                  <span
                    aria-hidden="true"
                    className="size-3 rounded-sm border border-dashed border-[var(--border-strong)] bg-[repeating-linear-gradient(135deg,var(--surface-muted)_0_3px,transparent_3px_6px)]"
                  />
                  Zajęte przez innych
                </li>
                <li className="flex items-center gap-1">
                  <span
                    aria-hidden="true"
                    className="size-3 rounded-sm bg-[repeating-linear-gradient(135deg,var(--surface-muted)_0_3px,transparent_3px_6px)]"
                  />
                  Gabinet zamknięty
                </li>
              </>
            ) : null}
          </ul>
        </div>
        <AvailabilityCalendar
          days={calendar.days}
          range={calendar.range}
          roomAccent={calendar.roomFocus?.accent}
          roomId={calendar.roomFocus?.id}
          rules={rules}
        />
      </Card>
    </>
  );
}

function RulesView({
  model,
  params,
}: {
  model: AvailabilityViewModel;
  params: AvailabilityParams;
}) {
  const { rules } = model;
  const filterHref = (changes: Partial<AvailabilityParams>) =>
    availabilityHref({ ...params, ...changes }) as Route;

  return (
    <>
      <Card className="grid gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Pill icon={<RotateCw aria-hidden="true" className="size-3.5" />}>
                Zarządzanie regułami i powtarzalnością
              </Pill>
              <span className="text-xs font-medium text-[var(--text-muted)]">
                {rules.total} aktywnych bloków dostępności
              </span>
            </div>
            <h2 className="text-base font-bold text-[var(--text)] sm:text-lg">
              Definiowanie reguł dostępności w blokach
            </h2>
            <p className="max-w-3xl text-xs text-[var(--text-muted)]">
              Powtarzalne reguły dyżurów, przypisanie gabinetów i formy pracy.
              Każda zmiana od razu pojawia się w widoku kalendarza i w wolnych
              terminach rezerwacji.
            </p>
          </div>
          <AddRuleButton label="Dodaj nową regułę" />
        </div>
        <div className="grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-3">
          <StatTile
            detail={`Rozłożone na ${rules.total} zdefiniowanych bloków`}
            label="Łączny wymiar dyżurów"
            tone="mint"
            value={`${rules.metrics.weekly} / tydz.`}
          />
          <StatTile
            detail="Obłożenie dyżurów w bieżącym tygodniu"
            label="Zarezerwowane przez pacjentów"
            value={rules.metrics.booked}
          />
          <StatTile
            detail="Dostępne sloty na rejestrację nowych wizyt"
            label="Wolne okna"
            tone="blue"
            value={rules.metrics.free}
          />
        </div>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)]">
            <Filter aria-hidden="true" className="size-3.5" />
            Filtruj dni:
          </span>
          <LinkTabs
            ariaLabel="Filtruj dni"
            items={[
              {
                key: "all",
                label: "Wszystkie",
                href: filterHref({ dzien: null }),
                active: params.dzien === null,
                badge: rules.total,
              },
              ...WEEKDAY_SHORT.map((label, index) => ({
                key: String(index + 1),
                label,
                href: filterHref({ dzien: index + 1 }),
                active: params.dzien === index + 1,
                badge: rules.dayCounts[index + 1],
              })),
            ]}
            linkAs={Link}
            variant="chips"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Forma:
          </span>
          <LinkTabs
            ariaLabel="Filtruj formę"
            items={[
              {
                key: "all",
                label: "Wszystkie",
                href: filterHref({ forma: null }),
                active: params.forma === null,
              },
              {
                key: "stacjonarnie",
                label: "Stacjonarnie",
                href: filterHref({ forma: "stacjonarnie" }),
                active: params.forma === "stacjonarnie",
                icon: <Building2 aria-hidden="true" className="size-3.5" />,
              },
              {
                key: "online",
                label: "Online",
                href: filterHref({ forma: "online" }),
                active: params.forma === "online",
                icon: <Video aria-hidden="true" className="size-3.5" />,
              },
            ]}
            linkAs={Link}
            variant="chips"
          />
        </div>
      </Card>

      {rules.items.length ? (
        <div className="grid gap-3">
          {rules.items.map((item) => (
            <AvailabilityRuleCard
              accent={item.accent}
              actions={
                <RuleCardActions
                  canCopyToWorkdays={item.canCopyToWorkdays}
                  label={`${item.title} ${item.timeLabel}`}
                  rule={item.rule}
                />
              }
              durationLabel={item.durationLabel}
              key={item.id}
              mode={item.mode}
              note={item.note}
              occupancy={item.occupancy}
              placeLabel={item.placeLabel}
              recurrenceLabel={item.recurrenceLabel}
              subtitle={item.subtitle ?? undefined}
              timeLabel={item.timeLabel}
              title={item.title}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          action={<AddRuleButton label="Utwórz nowy blok" />}
          description={
            rules.total
              ? "Żadna reguła nie pasuje do wybranych filtrów. Zmień filtr dni lub formy."
              : "Dodaj pierwszą regułę albo zaznacz godziny w widoku kalendarza."
          }
          title="Brak zdefiniowanych bloków dla tych filtrów"
        />
      )}

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--text)]">
              Nieobecności
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Urlop, szkolenie albo zablokowane godziny. W tym czasie nie można
              się umówić.
            </p>
          </div>
          <AddTimeOffButton />
        </div>
        {model.timeOff.length ? (
          <ul className="mt-3">
            {model.timeOff.map((off) => (
              <TimeOffItem
                actions={<DeleteTimeOffButton id={off.id} label={off.label} />}
                key={off.id}
                label={off.label}
                reason={off.reason}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Brak zaplanowanych nieobecności.
          </p>
        )}
      </Card>
    </>
  );
}

export default async function AvailabilityPage({
  searchParams,
}: PageProps<"/dostepnosc">) {
  const params = await loadAvailabilityParams(searchParams);
  const data = await loadAvailability(params);

  if (!data) {
    return (
      <div className="space-y-5">
        <PageTitle>Dostępność</PageTitle>
        <EmptyState
          title="Brak profilu specjalisty"
          description="Twoje konto nie jest jeszcze powiązane z profilem specjalisty. Skontaktuj się z administratorem centrum."
        />
      </div>
    );
  }

  const { model } = data;
  const calendarView = params.widok === "kalendarz";

  return (
    <AvailabilityEditorProvider
      occupancy={model.calendar.othersOccupancy}
      rooms={model.rooms}
      specialistName={data.specialistName}
      stepMinutes={data.stepMinutes}
      today={data.today}
    >
      <div className="space-y-4">
        <PageTitle>Dostępność</PageTitle>
        <Card className="flex flex-wrap items-center justify-between gap-3 p-2.5">
          <LinkTabs
            ariaLabel="Widok dostępności"
            items={[
              {
                key: "kalendarz",
                label: "Widok kalendarza",
                href: availabilityHref({ ...params, widok: "kalendarz" }),
                active: calendarView,
                icon: (
                  <Calendar
                    aria-hidden="true"
                    className="size-4 text-[var(--primary)]"
                  />
                ),
                badge: "Podstawowy",
              },
              {
                key: "reguly",
                label: "Reguły i bloki",
                href: availabilityHref({ ...params, widok: "reguly" }),
                active: !calendarView,
                icon: (
                  <CalendarCheck
                    aria-hidden="true"
                    className="size-4 text-[var(--primary)]"
                  />
                ),
                badge: `${model.rules.total} reguł`,
              },
            ]}
            linkAs={Link}
          />
          <p className="hidden pr-2 text-xs text-[var(--text-muted)] md:block">
            {calendarView
              ? "Zaznaczaj i twórz dostępność, przeciągając kursorem po siatce"
              : "Konfiguracja powtarzalnych reguł grafiku i szablonów tygodniowych"}
          </p>
        </Card>

        {calendarView ? (
          <CalendarView
            model={model}
            params={params}
            rules={data.rules}
            today={data.today}
          />
        ) : (
          <RulesView model={model} params={params} />
        )}
      </div>
    </AvailabilityEditorProvider>
  );
}
