# Rezerwacje online: plan budowy

Etap R. Realizuje Fazę 4 [roadmapy strony publicznej](./public-site-roadmap.md)
(F4-01 to ten dokument; F4-02–F4-04 rozpisane niżej) i domyka rdzeń:
**usługi → dostępność specjalistów → umawianie wizyt**. Referencje wizualne:
[`docs/design/references/booking/`](../design/references/booking/).

## Decyzje (2026-09-28)

| Temat         | Decyzja                                                                                                                                                                                                                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Płatność      | Online od pierwszej wersji: **Stripe** (karta, Apple/Google Pay, BLIK, Przelewy24 jako metody Stripe). Jedna integracja zamiast dwóch.                                                                                                                                                                                                                                |
| Konto klienta | Nie jest potrzebne. Rezerwacja jako gość; w e-mailu podpisany link do przełożenia i anulowania. Konta („Moje rezerwacje”) później, na tych samych tabelach.                                                                                                                                                                                                           |
| E-mail        | **Resend** (React Email), domena kolorsensu.pl zweryfikowana w DNS.                                                                                                                                                                                                                                                                                                   |
| Potwierdzenie | Od razu po opłaceniu: wolny termin z grafiku jest pewnym terminem.                                                                                                                                                                                                                                                                                                    |
| Stan kreatora | W adresie URL, przez **nuqs** (`createLoader` / `createSerializer` na serwerze, `useQueryStates` tylko w wyspach klienckich).                                                                                                                                                                                                                                         |
| Gabinet       | Okno dostępności stacjonarnej ma **konkretny gabinet** (jak w referencji AI Studio); klient dostaje gabinet z okna. Baza nie pozwala dwóm specjalistom zająć gabinetu w tym samym czasie.                                                                                                                                                                             |
| Siatka godzin | Wizyty startują co `slot_step_minutes` (ustawienie centrum, domyślnie **60**: 9:00, 10:00…). Wizyta musi zmieścić się w oknie, a przerwa oddziela ją od innych wizyt. Przerwa między wizytami to `default_visit_buffer_minutes`; przy siatce 60 min i wizytach 50 min musi wynosić **10 min** (ustawione w RD2; wcześniej było 15, co zostawiałoby co drugą godzinę). |
| Poza zakresem | Pakiety wizyt, warsztaty, vouchery, konta klientów, faktury. Wracają po działającym rdzeniu (referencje „pakiety” i „warsztat” zostają na później).                                                                                                                                                                                                                   |

## Przepływ

```text
Usługa → Forma → Specjalista → Termin → Dane → Płatność → Potwierdzenie
```

- Wejście z profilu specjalisty (`?specjalista=`) zawęża usługi do jego
  oferty; wejście ze strony usługi (`?usluga=`) zaczyna od formy.
- Forma: stacjonarnie (w lokalizacji; wybór lokalizacji tylko, gdy jest ich
  więcej niż jedna) albo online. Pokazujemy tylko formy, które oferuje
  przynajmniej jeden specjalista danej usługi.
- Specjalista: tylko ci, którzy mają aktywną ofertę na tę usługę, formę i
  przyjmują nowe osoby; cena z ich oferty.
- Termin: tydzień (desktop: siatka dni × godziny, mobile: dni + lista godzin),
  tylko wolne sloty. Kliknięcie godziny tylko zaznacza ją w adresie; dopiero
  „Przejdź dalej” (formularz POST) **blokuje termin na 10 minut** („Twój termin
  jest tymczasowo zarezerwowany”). Otwarcie linku nigdy niczego nie blokuje
  (prefetch, boty).
- Dane: imię i nazwisko, e-mail, telefon, uwagi (opcjonalnie), akceptacja
  regulaminu i polityki prywatności.
- Płatność: Stripe; po powrocie strona „Oczekujemy na potwierdzenie
  płatności”, dopóki webhook nie potwierdzi.
- Potwierdzenie: szczegóły, „Co dalej?”, e-mail z linkiem do zarządzania.
- Zarządzanie (link z e-maila): szczegóły wizyty, przełożenie (ten sam
  specjalista i usługa, cena bez zmian), anulowanie (zwrot w oknie
  `cancellation_window_hours`, po nim zgodnie z regulaminem).

### Parametry URL (nuqs)

| Parametr      | Wartość                                                    | Uwagi                                          |
| ------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| `usluga`      | slug usługi                                                |                                                |
| `forma`       | `stacjonarnie` \| `online`                                 |                                                |
| `lokalizacja` | slug lokalizacji                                           | Pomijany, gdy lokalizacja jest jedna           |
| `specjalista` | slug specjalisty                                           | Zgodny z linkiem z profilu (F1-11)             |
| `tydzien`     | data poniedziałku (`2026-10-05`)                           | Nawigacja po tygodniach w kroku „Termin”       |
| `termin`      | początek wizyty, czas lokalny centrum (`2026-10-07T10:00`) | Walidowany na serwerze względem wolnych slotów |

Krok wynika z parametrów (pierwszy brakujący), a nie z osobnego `krok`, więc
nie da się wejść na krok bez wcześniejszych wyborów. „Zmień” to link, który
usuwa dany parametr i wszystkie zależne od niego. Wybory są zwykłymi linkami
generowanymi przez `createSerializer`, więc kreator działa bez JavaScriptu.
Dane osobowe, hold i płatność **nigdy** nie trafiają do URL: po wyborze
terminu dalsze kroki idą po identyfikatorze holdu w ciasteczku `httpOnly`.

## Architektura

### Warstwy

1. **Baza (Supabase)**: dostępność specjalistów, wizyty, płatności,
   ograniczenia wykluczające nakładanie się terminów, RPC.
2. **Domena (`packages/scheduling`)**: czysty TS, TDD: strefa czasu i DST,
   rozwijanie reguł tygodniowych, odejmowanie zajętości i buforów, siatka
   slotów, `lead time` i horyzont, grupowanie w tydzień.
3. **Dane (`packages/supabase`)**: funkcje `booking.ts` / `availability.ts`
   (mapowanie, walidacja Zod z `@repo/contracts/booking`).
4. **UI (`@repo/ui/booking/*`)**: komponenty prezentacyjne renderowane na
   serwerze, stories + testy a11y.
5. **Aplikacja (`apps/web/src/features/booking`)**: loader parametrów nuqs,
   view-modele kroków, Server Actions (hold, dane, płatność, anulowanie),
   route handler webhooka Stripe.

### Model danych (etap RD)

Dostępność specjalistów (RD1) — szczegóły w sekcji
[Dostępność specjalistów](#dostępność-specjalistów-rd1-r1-r2):

- `specialist_availability_rules`: okna cykliczne.
- `specialist_availability_windows`: okna jednorazowe („tylko tego dnia”).
- `specialist_time_off`: nieobecności (urlop, zablokowane popołudnie).

Wizyty i płatności (RD2, migracja `20260929065425_appointments_and_payments`,
test `supabase/tests/booking_domain.sql`):

- `appointments`: numer (`KS-20261005-7843`), usługa, oferta, specjalista,
  okno dostępności, forma (`visit_mode`: `in_person` / `online`),
  **gabinet z okna** (tylko stacjonarnie), `during tstzrange` i `blocks`
  (`during` plus przerwa, z triggera), migawka ceny, czasu i przerwy,
  status (`held`, `awaiting_payment`, `confirmed`, `cancelled`,
  `expired`), `hold_expires_at`, dane klienta, zgody z czasem akceptacji,
  SHA-256 tokenu dostępu.
  - `EXCLUDE USING gist (specialist_id WITH =, blocks WITH &&)` dla
    statusów `held`, `awaiting_payment`, `confirmed`: podwójna rezerwacja
    jest niemożliwa na poziomie bazy, nawet przy wyścigu dwóch klientów.
    To samo dla gabinetu (`room_id`).
  - RLS: specjalista czyta swoje wizyty, admin wszystkie; hash tokenu nie
    jest czytelny dla nikogo poza `service_role`; zmiany tylko przez RPC.
- `payments`: wizyta, `checkout_session_id`, `payment_intent_id`, kwota,
  waluta, status, kwota zwrotu; czyta tylko admin. `stripe_events`:
  idempotencja webhooka, tylko `service_role`.
- `center_settings`: `slot_step_minutes` (60) i `hold_minutes` (10);
  przerwa `default_visit_buffer_minutes` zmieniona z 15 na 10.

Wolne terminy liczy **baza** (`private.free_slots`), jedna funkcja dla
listy i dla holdu, więc nie mogą się rozjechać: siatka od północy lokalnej,
wizyta mieści się w oknie formy (okno hybrydowe obsługuje obie),
wyprzedzenie i horyzont, nieobecności, zamknięcia gabinetu (cały dzień i
przedziały), żywe wizyty specjalisty i gabinetu z przerwą. `@repo/scheduling`
tylko odczytuje wynik w strefie centrum i grupuje po dniach (`toFreeSlots`,
`groupSlotsByDay`).

| RPC                    | Kto                            | Co robi                                                                                                                                           |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_bookable_offers` | publiczne (anon)               | Co da się teraz zarezerwować (usługi, specjaliści, ceny, formy) wg tych samych reguł co wolne terminy (migracja `20260929073743_booking_catalog`) |
| `booking_window`       | publiczne (anon)               | Strefa czasowa centrum, horyzont i czas blokady                                                                                                   |
| `list_free_slots`      | publiczne (anon)               | Początki i końce wolnych wizyt usługi u specjalisty, w formie (i lokalizacji), do 14 dni                                                          |
| `hold_slot`            | serwer strony (`service_role`) | Sprawdza termin ponownie, blokuje go na `hold_minutes`, zwraca numer i token (jedyny raz poza bazą)                                               |
| `release_hold`         | serwer strony                  | Zwalnia hold (klient zmienił termin albo zrezygnował)                                                                                             |
| `get_booking`          | serwer strony                  | Wizyta po tokenie: usługa, specjalista, gabinet, lokalizacja, cena, status                                                                        |

Holdy wygasają **leniwie**, bez harmonogramu: przeterminowany hold nie
blokuje wolnych terminów, a każdy nowy hold oznacza przeterminowane jako
`expired`. Holdowanie idzie przez serwer strony z kluczem
`SUPABASE_SECRET_KEY` (limity na IP i Turnstile w R5), nie z przeglądarki.

Do zrobienia przy kolejnych etapach: zmiana lub usunięcie okna dostępności
z przyszłymi wizytami (R9), ponowne sprawdzenie godzin otwarcia gabinetu
przy liczeniu terminów (dziś pilnuje ich zapis okna).

### Dostępność specjalistów (RD1, R1, R2)

Specjalista określa, kiedy i gdzie przyjmuje; z tego (minus nieobecności i
zajęte terminy) powstają wolne terminy w kreatorze. Wygląd według referencji
AI Studio (kalendarz z przeciąganiem, „Reguły i bloki”, szuflada edycji).

#### Reguły powtarzania

Tak jak w dużych kalendarzach (Google Calendar, Outlook, Apple Calendar) i
w standardzie iCalendar (RFC 5545: RRULE, EXDATE, UNTIL):

- **Tworzenie**: domyślnie dostępność **jednorazowa** (jeden dzień). Jako
  **reguła**: dni tygodnia (kilka naraz, np. pn–pt albo wt + czw), **co N
  tygodni** (1–4), koniec **nigdy / w dniu / po N razach** (N zapisywane jako
  data ostatniego wystąpienia plus liczba do wyświetlenia), z podsumowaniem
  po polsku („Co 2 tygodnie we wtorki i czwartki, do 30 czerwca 2030”).
- **Zmiana lub usunięcie terminu z reguły** (klik w kalendarzu): pytanie o
  zakres, domyślnie najbezpieczniejszy:
  - **Tylko ten termin** — wyjątek (EXDATE); przy zmianie w jego miejsce
    powstaje dostępność jednorazowa.
  - **Ten i następne terminy** — reguła kończy się dzień wcześniej (UNTIL), a
    przy zmianie od tej daty zaczyna się nowa reguła; od pierwszego terminu
    zmienia się (albo znika) cała reguła.
  - **Wszystkie terminy** — zmiana reguły (z zachowaniem jej początku).
- **Zakładka „Reguły i bloki”** edytuje i usuwa całe reguły.
- Wzór z Cal.com: tygodniowe godziny plus jednorazowe wyjątki na daty.

**Model (RD1, `20260928044750`, `20260928062634`):**

- `specialist_availability_rules`: `recurrence` (`once` | `weekly`),
  `weekdays` (zbiór 1–7), `interval_weeks` (1–4), `valid_from`–`valid_until`,
  `occurrence_count`, `starts_at`–`ends_at` (czas lokalny centrum), forma
  `in_person` | `online` | `hybrid` i `room_id` (wymagany poza online),
  notatka. Jednorazowa = `valid_from = valid_until`.
- `specialist_availability_exceptions`: pominięte terminy reguły (EXDATE).
- `specialist_time_off`: nieobecności (`tstzrange`), wygrywają z regułami.
- Zapis wyłącznie przez funkcje (`save_availability_rule`,
  `edit_availability_occurrence`, `delete_availability_occurrence`,
  `delete_availability_rule`, `add_time_off`, `delete_time_off`): kto czyim
  grafikiem zarządza, siatka 15 min, aktywny gabinet, **brak nakładania się
  terminów jednego specjalisty i brak dwóch specjalistów w jednym gabinecie**
  — terminy porównywane dzień po dniu w okresie ważności obu reguł (do 3 lat
  naprzód), z pominięciem wyjątków; blokady doradcze na specjalistę i
  gabinet przeciw wyścigom.
- RLS: specjalista czyta swoje, admin wszystkie, anon nic. Strona publiczna
  dostanie tylko wolne terminy (RD2). Zmiany grafiku nie odwołują wizyt.

**Domena (R1, `packages/scheduling`, TDD):** `occursOn` (to samo co SQL
`availability_pattern_on` + wyjątki), `expandAvailability` (DST),
`nthOccurrenceDate`, `describeRecurrence`, `toFreeSlots` i `groupSlotsByDay`
(odczyt wolnych terminów z bazy), funkcje siatki
kalendarza (`pointerToMinutes`, `dragRange`, `visibleRange`).

**Portal specjalisty (R2, `/dostepnosc?widok=kalendarz|reguly`):** kalendarz
tygodnia z przeciąganiem (szybkie okno: jednorazowo albo reguła), klik w
termin z pytaniem o zakres, „+” przy dniu dla klawiatury, nieobecności w
kalendarzu; lista reguł z filtrami dni i formy, „Na cały tydzień”
(reguła na pn–pt), „Skopiuj na kolejny dzień”, szablon Pn–Pt jako jedna
reguła. Admin (R9 / K5): podgląd grafików wszystkich i obłożenia gabinetów.

**Gabinety w portalu admina (RG1, `/gabinety/[id]?zakladka=…`):**

- Zakładki jak w referencji: **Grafik** (tydzień gabinetu: dyżury
  specjalistów w ich kolorach, godziny zamknięcia zakreskowane, dyżury poza
  godzinami oznaczone; podsumowanie: obłożenie, zarezerwowane i wolne
  godziny, specjaliści tygodnia, najbliższe dyżury), **Godziny otwarcia**
  (tydzień z przedziałami, np. przerwą, kopiowanie dnia; wyjątki na daty:
  zamknięty cały dzień, zablokowane godziny, dodatkowo otwarty),
  **Profil publiczny** (zdjęcia i opis), **Ustawienia** (dane gabinetu).
  Przełącznik gabinetu w nagłówku zostaje na tej samej zakładce.
- **Godziny otwarcia ograniczają dostępność** (`20260928065956`): gdy
  gabinet ma godziny, okno specjalisty w nim musi się mieścić w przedziale
  otwarcia każdego swojego dnia tygodnia (`room_closed`, „Gabinet jest
  wtedy zamknięty”). Gabinet bez godzin nie ma ograniczeń. Zmiana godzin
  nie usuwa zapisanych okien — grafik pokazuje je jako „Poza godzinami
  otwarcia”. Wyjątki na daty liczą się w grafiku i (RD2) w wolnych
  terminach.
- Dopóki nie ma wizyt (RD2), gabinet „rezerwują” okna dostępności
  specjalistów; obłożenie = ich godziny w godzinach otwarcia.

**Zajętość gabinetów u specjalisty (`20260928074604`,
`/dostepnosc?gabinet=…`):**

- Kalendarz dostępności pokazuje wybrany gabinet (domyślnie pierwszy,
  „Ukryj” = `gabinet=brak`): godziny innych specjalistów w nim („Zajęte:
  imię i nazwisko, godziny”) oraz godziny zamknięcia. Specjalista widzi, kto
  ma gabinet, i może się umówić na zamianę.
- `list_room_occupancy(od, do)` (SECURITY DEFINER, specjaliści i admin,
  najwyżej 62 dni): tylko gabinet, data, godziny i imię — bez notatek.
- W formularzach gabinet zajęty w wybranych godzinach (w pokazanym
  tygodniu) jest wyłączony z opisem „Zajęty: kto, kiedy”; szybkie okno
  proponuje pierwszy wolny gabinet albo żaden, gdy wszystkie są zajęte.
- Gwarancją jest baza: odmowa `room_taken` podaje w DETAIL (JSON), kto i
  kiedy ma gabinet — pierwszą kolidującą datę, także w przyszłych
  tygodniach reguły.
- Bez realtime (na razie zbędny, a RLS i tak ukrywa cudze reguły przed
  `postgres_changes`): kalendarz odświeża się sam po odmowie z powodu
  nieaktualnych danych (`room_taken`, `overlap`, `not_found`,
  `room_unavailable`) i po powrocie do karty po co najmniej 30 s
  (`@repo/app-runtime/refresh-on-return`; także grafik gabinetu u admina).

### Bezpieczeństwo

- **RLS wymuszone, anon bez dostępu do tabel.** Strona publiczna dostaje
  tylko: wolne sloty (RPC zwracające czasy rozpoczęcia, bez danych innych
  wizyt) i swoją wizytę po tokenie (hash w bazie, porównanie w RPC).
- Hold i potwierdzenie przez RPC `SECURITY DEFINER` z pustym `search_path`,
  które **ponownie sprawdzają** dostępność, `lead time`, horyzont, ofertę i
  formę; klient nie może wymusić terminu spoza grafiku ani ceny.
- Cena liczona w bazie z oferty; Stripe dostaje kwotę z serwera, nie z
  formularza. Wizytę potwierdza wyłącznie webhook Stripe z weryfikacją
  podpisu (sekret tylko na serwerze), idempotentnie.
- Nieopłacone holdy wygasają (`pg_cron` co minutę + sprawdzenie
  `hold_expires_at` w ograniczeniu i w RPC).
- Anti-abuse (R5): Cloudflare Turnstile przed blokadą terminu (w DEV testowe
  klucze Cloudflare, na produkcji bez kluczy rezerwacja nie ruszy), limit
  5 blokad w 15 minut na odwiedzającego (HMAC adresu IP z sekretem serwera,
  w `private.booking_holds`, trzymane godzinę), jedna blokada na
  odwiedzającego (nowa zwalnia poprzednią), pole-pułapka w formularzu
  danych. Zod na każdej granicy (Server Action, RPC params); dane klienta
  zapisuje tylko `save_booking_details` do żywej blokady, z obiema zgodami
  i czasem ich akceptacji.
- Dane klienta to dane o zdrowiu w rozumieniu RODO (sam fakt terapii): tylko
  niezbędne pola, uwagi opcjonalne i ograniczone, brak danych osobowych w
  URL, logach i metadanych Stripe (tylko numer wizyty), retencja opisana w
  polityce prywatności.
- Token zarządzania: 32 bajty losowe, w bazie tylko SHA-256, ważny do końca
  wizyty; link nie zdradza danych.

### Wydajność

- Kroki 1–3 renderowane na serwerze z danych publicznych (cache, `revalidateTag`
  po zmianach w portalach); krok „Termin” dynamiczny, jedno RPC na tydzień.
- Wybory to linki (prefetch Next), bez klienckiego stanu; JS tylko w wyspach:
  nawigacja tygodnia bez przeładowania (nuqs `shallow: false` +
  `startTransition`), Stripe Payment Element, polling statusu płatności.
- Stripe.js ładowany tylko na kroku płatności.

### Płatność: integracja Stripe (R6)

Plan wygenerowany przez `stripe_implementation_planner` (Stripe MCP,
sandbox `acct_1UKVaXH3N9djOlDe`, 2026-09-28): ścieżka **Elements z Checkout
Sessions API** („własny wieloetapowy przepływ”). Płatność jest krokiem
naszego kreatora, obok naszego podsumowania rezerwacji, bez przekierowania
na stronę Stripe.

- **Serwer (Server Action):** `stripe.checkout.sessions.create` z
  `ui_mode: "elements"`, `mode: "payment"`, jedną pozycją `price_data`
  (PLN, kwota z migawki ceny w bazie), `customer_email` z kroku „Dane”
  (Stripe go wymaga), `metadata: { appointment_reference }` i opisem
  `payment_intent_data.statement_descriptor_suffix` z numerem wizyty.
  Metody płatności dynamiczne z panelu (karta, Apple Pay, Google Pay, BLIK,
  Przelewy24 są włączone w sandboxie), bez `payment_method_types`.
  Idempotency key: identyfikator holdu.
- **Klient (wyspa):** `CheckoutElementsProvider` z
  `@stripe/react-stripe-js/checkout`, `PaymentElement`, potwierdzenie przez
  `checkout.confirm()`; wygląd z tokenów przez Appearance API. Stripe.js
  ładowany z js.stripe.com (wymóg PCI), tylko na tym kroku.
- **Czas:** sesja Checkout żyje co najmniej 30 minut, a hold terminu jest
  krótszy. Przy przejściu do płatności hold jest przedłużany do
  `expires_at` sesji (30 min); gdy hold wygasa wcześniej (np. porzucony
  krok „Dane”), serwer wywołuje `checkout.sessions.expire`.
- **Webhook (`/api/stripe/webhook`, route handler, surowe body + weryfikacja
  podpisu `STRIPE_WEBHOOK_SECRET`):**
  - `checkout.session.completed`: `payment_status = paid` → wizyta
    `confirmed`; `unpaid` (metoda z opóźnionym potwierdzeniem) →
    `awaiting_payment`;
  - `checkout.session.async_payment_succeeded` → `confirmed`;
  - `checkout.session.async_payment_failed` i `checkout.session.expired` →
    zwolnienie terminu;
  - jedna idempotentna funkcja `fulfill(sessionId)` (odczyt sesji z API,
    zapis w `stripe_events`), wołana też ze strony powrotu, bo webhook może
    przyjść później niż klient.
- **Zwroty:** `refunds.create({ payment_intent })` przy anulowaniu w oknie
  `cancellation_window_hours`; zdarzenie `charge.refunded` aktualizuje
  `payments`. Okno zwrotu: BLIK do 13 miesięcy, P24 do 180 dni.
- **Testy w sandboxie:** karta `4242 4242 4242 4242` (sukces),
  `4000 0025 0000 3155` (3-D Secure), `4000 0000 0000 9995` (odmowa); BLIK:
  dowolny kod 6-cyfrowy, awarie przez wzorce e-maila (np.
  `customer_declined@…`, `customer_timeout@…`); P24: „Fail test payment” na
  stronie przekierowania. Webhooki lokalnie (Stripe CLI zalogowane do
  sandboxa, sekret w `STRIPE_WEBHOOK_SECRET`):

  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook \
    --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,charge.refunded
  ```

  Konto działa na wersji API `2026-08-26.dahlia`; SDK `stripe` przypinamy
  do tej wersji.

- **Przed produkcją:** HTTPS, rejestracja domeny w _Payment method domains_
  (Apple Pay, sandbox i live), endpoint webhooka w panelu, klucze live w
  zmiennych środowiska hostingu.

## Postęp

Statusy: `NOT STARTED`, `IN PROGRESS`, `DONE`, `SKIPPED` (z uzasadnieniem).
Każdy commit realizujący zadanie aktualizuje status i wpisuje hash commitu.

| ID  | Zadanie                                                                                                                              | Roadmapa | Status        | Commit / PR | Uwagi                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------- | ----------- | ------------------------------------------- |
| R0  | Plan (ten dokument), nuqs w `apps/web`, kontrakty parametrów kreatora                                                                | F4-01    | `DONE`        | 8df6b69     |                                             |
| RD1 | Schemat dostępności: reguły, okna jednorazowe, nieobecności, konflikty gabinetów, RPC zapisu, testy SQL                              | F4-02    | `DONE`        | f980622     |                                             |
| RD2 | Schemat wizyt i płatności: wykluczenia, RPC wolnych terminów i holdu, `slot_is_available`, testy SQL                                 | F4-02    | `DONE`        | 904769d     | Wolne terminy w SQL; holdy wygasają leniwie |
| R1  | Domena slotów w `packages/scheduling` (DST, reguły, wyjątki, zajętość, bufor, lead time, horyzont) z TDD                             | F4-02    | `DONE`        | 904769d     | Liczy baza (RD2); TS czyta i grupuje        |
| RG1 | Admin `/gabinety/[id]`: zakładki, grafik gabinetu, godziny otwarcia z wyjątkami, limit dostępności; zajętość gabinetów u specjalisty | F4-02    | `DONE`        | f166482     | Sprawdzone na koncie admina                 |
| R2  | Portal specjalisty `/dostepnosc`: grafik tygodniowy, nieobecności, okna jednorazowe, podgląd tygodnia                                | F4-02    | `DONE`        | f980622     | Pełny kalendarz: etap K                     |
| R3  | UI `@repo/ui/booking`: stepper, podsumowanie, karty wyboru, siatka tygodnia, lista dnia, legenda                                     | F4-03    | `DONE`        | f124e86     | Tylko wolne terminy, bez „Zajęte”           |
| R4  | `/umow-wizyte`: kroki Usługa → Forma → Specjalista → Termin z nuqs, SSR                                                              | F4-03    | `DONE`        | 3756d84     | Katalog z bazy; hold przy „Przejdź dalej”   |
| R5  | Hold terminu, krok „Dane” (Turnstile, limity), zgody                                                                                 | F4-03    | `DONE`        | 582f74f     | Klucze testowe Turnstile w DEV              |
| R6  | Płatność Stripe: Payment Element, webhook, „Oczekujemy na potwierdzenie”, wygasanie                                                  | F4-03    | `NOT STARTED` |             | Klucze testowe Stripe                       |
| R7  | Potwierdzenie i e-maile (Resend): potwierdzenie z linkiem i plikiem `.ics`                                                           | F4-04    | `NOT STARTED` |             | Klucz Resend, DNS domeny                    |
| R8  | Zarządzanie z linku: szczegóły, przełożenie, anulowanie ze zwrotem                                                                   | F4-04    | `NOT STARTED` |             |                                             |
| R9  | Portale: lista wizyt specjalisty i admina, anulowanie przez centrum                                                                  | F4-04    | `NOT STARTED` |             | Widoki kalendarza: etap K (K5)              |
| R10 | Przypomnienia e-mail 24 h przed wizytą, włączenie `booking_enabled` na produkcji                                                     | F4-04    | `NOT STARTED` |             |                                             |

### Potrzebne od centrum przed R5–R7

- ~~Klucze testowe Stripe~~: sandbox podłączony (klucze w
  `apps/web/.env.local`, Stripe MCP). Przed startem: konto live
  zweryfikowane, BLIK i P24 włączone w panelu live.
- Stripe CLI (do lokalnego odbioru webhooków).
- Klucz Resend i dostęp do DNS kolorsensu.pl (SPF, DKIM).
- Klucze Cloudflare Turnstile.
- Regulamin: zasady odwołania i zwrotów (spójnie z F1-13).

## Cykl pracy

1. Test (domena, RPC w transakcji wycofywanej na końcu, komponent), potem
   implementacja.
2. Story ze stanami z referencji; `test-run` Storybooka z a11y musi przejść.
3. Weryfikacja na żywo (desktop i 390 px) po każdym kroku kreatora.
