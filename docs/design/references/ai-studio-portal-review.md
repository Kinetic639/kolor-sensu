# Aplikacja referencyjna z Google AI Studio: przegląd kodu

Przegląd prototypu portali admina i specjalisty wygenerowanego w Google AI
Studio (Next.js, lokalnie w `reference/kolor-sensu-portal`, poza repo).

**Werdykt: tylko referencja wizualna i UX. Kodu nie przenosimy.** To dobry
klikalny prototyp (makieta w kodzie), a nie baza produkcyjna. Przeniesienie
kosztowałoby więcej niż napisanie od nowa, bo trzeba by wymienić model danych,
stan, dostępność, kolory i daty, czyli praktycznie wszystko poza markupem
wizualnym. Komponenty budujemy od zera: SSR first, TDD first, w oparciu o
Storybook. Plan budowy jest w
[scheduling-ui-plan.md](../../product/scheduling-ui-plan.md).

## 1. Co jest w środku (fakty)

- **Rozmiar i stos:**
  - ~15 tys. linii;
  - Next 15, React 19, Tailwind 4 bez tokenów (`globals.css` to tylko
    `@import "tailwindcss"`);
  - `motion`, `@google/genai`, `firebase-tools`;
  - `eslint.ignoreDuringBuilds: true`.
- **Brak SSR:**
  - `app/page.tsx` renderuje jeden kliencki `PortalContainer`;
  - brak routingu: przełączanie ekranów przez `activeTab === '…'` w jednym
    komponencie (`AdminPortal.tsx`, linie 375–1726);
  - brak URL-i, deep linków i przycisku „wstecz”.
- **„God components”:**

  | Plik                                 | Linie | `useState` |
  | ------------------------------------ | ----: | ---------: |
  | `AdminPortal.tsx`                    |  1681 |         32 |
  | `ScheduleDemo.tsx`                   |  1278 |        ~30 |
  | `SpecialistPortal.tsx`               |   998 |         24 |
  | `SpecialistAvailabilityCalendarView` |   861 |          — |

  `AdminPortal.tsx` ma też 81 kolorów hex i 111 klas arbitralnych. Logika
  filtrowania jest zduplikowana między nagłówkami a treścią.

- **Połowa kodu jest martwa:**
  - cały `components/scheduling/*` (~7 tys. linii: `ScheduleDemo`,
    `ResourceColumn`, `TimeAxis`, `WeekComparison*`, `Mobile*`, modale) nie jest
    używany przez aplikację;
  - importuje go tylko test.
  - Portale mają własne, równoległe implementacje tych samych widoków.
- **Dane i model czasu:**
  - dane to mocki importowane wprost w komponentach, stan jest trzymany w
    `useState` w `PortalContainer` i przekazywany propsami w dół;
  - czas to stringi `"HH:MM"` plus `"YYYY-MM-DD"`, bez strefy czasowej;
  - `RoomId` to zahardkodowana unia `'room-1'…'room-5'|'online'`, a kolory sal
    są zahardkodowane w `lib/theme.ts`;
  - legenda w kalendarzu dostępności ma kolory niezgodne z `ROOM_THEMES`.
- **Zahardkodowane daty i „fałszywe” liczby:**
  - daty: „26 lutego – 3 marca 2024”, `{subLabel} lutego 2024`, domyślne
    `'2024-02-27'` w drawerze;
  - „teraz” to stałe „13:37”;
  - statystyki mają fallbacki `|| 32`, `|| 72`, `|| 12`.
- **Logika, która tylko udaje działanie:**
  - wybór „Co tydzień / Tylko ten tydzień” jest zapisywany, ale nigdzie
    nieużywany;
  - id powstają z `Date.now()`;
  - do potwierdzeń służy `confirm()`, a toasty to `setTimeout`.
- **Dostępność praktycznie zerowa:**
  - 0 × `onKeyDown`, 0 × `tabIndex` we wszystkich plikach portali;
  - bloki dostępności to klikalne `div`-y;
  - akcje na bloku są widoczne tylko na hover, więc klawiatura do nich nie
    dotrze;
  - taby to `<span>` z `cursor-pointer`;
  - modal szybkiego tworzenia to ręczny `role="dialog"`: bez focus trap, bez
    Escape, bez etykiety tytułu;
  - drawer ma poprawne `aria-modal` i `aria-labelledby`, ale też bez focus trap;
  - drag-to-create działa tylko myszą/dotykiem i nie ma alternatywy z
    klawiatury.
- **Responsywność:** widok mobilny i desktopowy renderują się jednocześnie, a
  jeden jest ukrywany CSS-em, czyli podwójny DOM i podwójne handlery.
- **Testy:**
  - jeden plik (`__tests__/calendar-interactions.test.tsx`, 7 testów);
  - testuje martwy kod i szczegóły implementacji (`stopPropagation`,
    `container.firstChild`, mock `getBoundingClientRect`);
  - nie ma testów zachowania, które widzi użytkownik, ani testów a11y;
  - brak Storybooka.

## 2. Co jest naprawdę dobre (bierzemy jako wzorzec)

- **Wygląd:**
  - oś czasu z liniami godzin;
  - bloki z akcentowym lewym borderem w kolorze sali;
  - podgląd przeciągania;
  - pastelowe tła dostępności pod wizytami;
  - legendy, paski zajętości, zwijane kolumny, boczne panele podsumowań;
  - toolbar z przełącznikiem widoku.
- **Katalog widoków, czyli architektura informacji:**
  - admin, dzień: kolumny specjalistów lub sal (przełącznik perspektywy);
  - admin, tydzień dla wybranego zasobu (specjalista / sala);
  - admin: porównanie tygodni;
  - mobile: lista dnia i przewijany harmonogram;
  - specjalista: kalendarz dostępności (tydzień), widok reguł (lista
    tygodniowa, duplikowanie dnia i tygodnia), drawer edycji okna dostępności
    (sala / online, cykliczność, notatka).
- **Pomysły UX:**
  - tryb „+ Nowa wizyta” z banerem;
  - przyciąganie do 15 min i minimalny blok 30 min;
  - dynamiczny zakres godzin (±30 min wokół danych);
  - wskaźniki obłożenia i overbookingu;
  - linia „teraz”;
  - rozróżnienie: dostępność / wizyta / blokada.
- **Koncepcje czystych funkcji** z `lib/scheduler-utils.ts` (`timeToMinutes`,
  `minutesToTime`, `calculateDynamicTimeRange`, `calculateOccupancy`), do
  napisania od nowa z testami. `calculatePosition` ma niejednoznaczny parametr
  (godziny czy minuty), więc nie kopiujemy.
- **Layout portali** (sidebar, nagłówek, breadcrumb, karty statystyk, tabele)
  jako wzorzec wizualny dla ekranów z
  [portals-content-plan.md](../../product/portals-content-plan.md).

## 3. Jak z niej korzystamy

- Referencję traktujemy jak PNG-i w `docs/design/references`, tylko że
  „klikalne”. Kod aplikacji nie trafia do repo (`reference/` jest w
  `.gitignore`). Do repo trafiają tylko zrzuty ekranów (zadanie K0).
- Architektura, warstwy i kolejność budowy są w
  [scheduling-ui-plan.md](../../product/scheduling-ui-plan.md).
