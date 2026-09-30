# Kalendarz i dostępność: plan budowy UI

Etap K. Kalendarze portali admina i specjalisty, budowane od zera według
referencji wizualnej z Google AI Studio (przegląd:
[ai-studio-portal-review.md](../design/references/ai-studio-portal-review.md)).
Zaczynamy po etapie [portals-content-plan.md](./portals-content-plan.md) i
wiążemy go z Fazą 4 [roadmapy strony publicznej](./public-site-roadmap.md).

## Postęp

Statusy: `NOT STARTED`, `IN PROGRESS`, `DONE`, `SKIPPED` (z uzasadnieniem).
Każdy commit realizujący zadanie aktualizuje jego status i wpisuje hash commitu
(albo numer PR).

| ID  | Zadanie                                                                                           | Status        | Commit / PR | Uwagi                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------- | ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| K0  | Zrzuty referencji (każdy widok, desktop i 390 px) do `docs/design/references/scheduling/`         | `NOT STARTED` |             |                                                                                                                   |
| KD  | Schemat DB dostępności, reguł i wizyt (migracje + `packages/supabase`)                            | `NOT STARTED` |             | Wymagane przed K3                                                                                                 |
| K1  | Domena w `packages/scheduling` (czas, siatka, layout kolumny, zajętość, reguły cykliczne) z TDD   | `NOT STARTED` |             |                                                                                                                   |
| K2  | Prymitywy UI: `TimeAxis`, `HourGrid`, `EventBlock`, `NowIndicator`, `Legend` (stories i testy)    | `NOT STARTED` |             |                                                                                                                   |
| K3  | Specjalista: kalendarz dostępności (tydzień) z drag-to-create, alternatywą z klawiatury i `Sheet` | `NOT STARTED` |             |                                                                                                                   |
| K4  | Specjalista: widok reguł dostępności i duplikowanie dnia / tygodnia                               | `NOT STARTED` |             |                                                                                                                   |
| K5  | Admin: widok dnia (specjaliści / sale), potem tydzień zasobu, na końcu porównanie tygodni         | `IN PROGRESS` |             | Dzień i tydzień zasobu + tydzień specjalisty (`/kalendarz`, `@repo/ui/calendar-view`); porównanie tygodni później |
| K6  | Mobile: agenda i harmonogram                                                                      | `NOT STARTED` |             |                                                                                                                   |

## Warstwy

1. **Domena: `packages/scheduling`.** Czysty TS, TDD, Vitest. Dziś jest tam
   tylko `date.ts` z `DEFAULT_TIME_ZONE = "Europe/Warsaw"`. Dochodzą:
   - model czasu:
     - instanty (ISO, `timestamptz` w DB) plus strefa centrum;
     - pomocniki `zonedDay`, `weekOf`, `minutesSinceDayStart`, zgodne z DST
       (testy na dni zmiany czasu);
   - `snapToGrid(minutes, step=15)`, `clampDuration(min=30)`;
   - `visibleRange(events, {padding: 30, min, max})`;
   - `layoutDayColumn(events)`: pozycja i wysokość w minutach, rozkład
     nakładających się zdarzeń na „tory”, bez pikseli;
   - `occupancy(availability, appointments)`, wykrywanie overbookingu i kolizji;
   - rozwijanie reguł cyklicznych (co tydzień / jednorazowo) do wystąpień w
     tygodniu.
2. **Prezentacja: `@repo/ui`, `packages/ui/src/calendar/*`.**
   - Zasady:
     - komponenty bezstanowe, renderowalne na serwerze (bez `"use client"`,
       jeśli nie potrzebują interakcji);
     - dane przychodzą z view-modelu;
     - kolory z tokenów (`tokens.css`), a kolor sali z danych / tokenu
       akcentu, nie z mapy id → hex;
     - każdy komponent ma stories (stany: pusty, gęsty, nakładanie, mobile,
       dark) i test Vitest + RTL po rolach i nazwach.
   - Komponenty:
     - `CalendarToolbar`: nawigacja datą, przełącznik widoku jako `Tabs`,
       perspektywa;
     - `TimeAxis`, `HourGrid`, `NowIndicator`;
     - `EventBlock`: warianty `appointment` / `availability` / `blocked`, jako
       `<button>` albo link z pełną etykietą dostępną („Jan Kowalski, 9:00–10:00,
       Gabinet 1”), akcje w menu (`DropdownMenu`) dostępnym z klawiatury;
     - `ResourceColumn`, `DayResourceGrid` (kolumny specjalistów / sal),
       `WeekGrid`;
     - `CalendarLegend`, `OccupancyBar`, `SummaryPanel`;
     - `AgendaList` (mobile, lista `<ol>`); mobile i desktop wybierane przez
       layout, bez podwójnego DOM-u tam, gdzie się da.
3. **Wyspy klienckie, tylko tam, gdzie konieczne:**
   - `useDragToCreate`: pointer events plus `snapToGrid` z domeny;
   - alternatywa z klawiatury: przycisk „Dodaj dostępność” lub fokus na slocie
     z Enter, który otwiera ten sam formularz;
   - formularze w istniejących `Dialog` / `Sheet` (focus trap, Escape, tytuł);
   - `AlertDialog` zamiast `confirm()`, `toaster.tsx` zamiast `setTimeout`.
4. **Aplikacje: `apps/admin`, `apps/specialist`.**
   - Routing w URL, np. `/kalendarz?widok=tydzien&data=2026-09-28&zasob=…`;
   - Server Component ładuje dane przez `features/<domena>/loaders.ts` i
     przekazuje view-model do komponentów UI;
   - mutacje przez Server Actions z Zod (wzorzec z
     `apps/admin/src/features/services`).

## Cykl pracy nad każdym komponentem

1. Test domeny (czerwony), potem implementacja.
2. Story ze stanami z referencji (zrzut z K0 w opisie story).
3. Test komponentu (role, nazwy, klawiatura), potem implementacja.
4. `test-storybook` z a11y `error` musi przejść.
5. Wizualne porównanie z referencją w Chromatic.

## Po każdym etapie

Aktualizacja tabeli postępu w tym pliku i statusów w
[screen-map.md](../design/screen-map.md) (sekcje ADMIN i SPECIALIST).
