# Rezerwacje online: plan budowy

Etap R. Realizuje Fazę 4 [roadmapy strony publicznej](./public-site-roadmap.md)
(F4-01 to ten dokument; F4-02–F4-04 rozpisane niżej) i domyka rdzeń:
**usługi → dostępność specjalistów → umawianie wizyt**. Referencje wizualne:
[`docs/design/references/booking/`](../design/references/booking/).

## Decyzje (2026-09-28)

| Temat         | Decyzja                                                                                                                                                                                                                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Płatność      | Online od pierwszej wersji: **Stripe** (karta, Apple/Google Pay, BLIK, Przelewy24 jako metody Stripe). Jedna integracja zamiast dwóch.                                                                                                                                                                                                                  |
| Konto klienta | Nie jest potrzebne. Rezerwacja jako gość; w e-mailu podpisany link do przełożenia i anulowania. Konta („Moje rezerwacje”) później, na tych samych tabelach.                                                                                                                                                                                             |
| E-mail        | **Resend** (React Email), domena kolorsensu.pl zweryfikowana w DNS.                                                                                                                                                                                                                                                                                     |
| Potwierdzenie | Od razu po opłaceniu: wolny termin z grafiku jest pewnym terminem.                                                                                                                                                                                                                                                                                      |
| Stan kreatora | W adresie URL, przez **nuqs** (`createLoader` / `createSerializer` na serwerze, `useQueryStates` tylko w wyspach klienckich).                                                                                                                                                                                                                           |
| Gabinet       | Okno dostępności stacjonarnej ma **konkretny gabinet** (jak w referencji AI Studio); klient dostaje gabinet z okna. Baza nie pozwala dwóm specjalistom zająć gabinetu w tym samym czasie.                                                                                                                                                               |
| Siatka godzin | Wizyty startują co `slot_step_minutes` (ustawienie centrum, domyślnie **60**: 9:00, 10:00…). Wizyta musi zmieścić się w oknie, a przerwa oddziela ją od innych wizyt. Przerwa między wizytami to `default_visit_buffer_minutes`; przy siatce 60 min i wizytach 50 min musi wynosić **10 min** (dziś w bazie jest 15, co zostawiałoby co drugą godzinę). |
| Poza zakresem | Pakiety wizyt, warsztaty, vouchery, konta klientów, faktury. Wracają po działającym rdzeniu (referencje „pakiety” i „warsztat” zostają na później).                                                                                                                                                                                                     |

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
  tylko wolne sloty. Wybór terminu **blokuje go na 10 minut** („Twój termin
  jest tymczasowo zarezerwowany”).
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

Wizyty i płatności (RD2):

- `appointments`: numer (`KS-20261005-7843`), usługa, oferta, specjalista,
  forma, **gabinet z okna dostępności**, `during
tstzrange`, migawka ceny i czasu trwania, status (`held`,
  `awaiting_payment`, `confirmed`, `cancelled`, `expired`), `hold_expires_at`,
  dane klienta, zgody z czasem akceptacji, hash tokenu zarządzania.
  - `EXCLUDE USING gist (specialist_id WITH =, during_with_buffer WITH &&)`
    dla aktywnych statusów: podwójna rezerwacja jest niemożliwa na poziomie
    bazy, nawet przy wyścigu dwóch klientów.
  - To samo dla sali (`room_id`).
- `payments`: wizyta, `stripe_payment_intent_id` / `checkout_session_id`,
  kwota, waluta, status, zwroty; `stripe_events` dla idempotencji webhooka.

### Dostępność specjalistów (RD1, R1, R2)

Specjalista określa, kiedy i gdzie przyjmuje; z tego (minus nieobecności i
zajęte terminy) powstają wolne terminy w kreatorze. Wzorce: referencja AI
Studio (`SpecialistAvailabilityDrawer`, widok reguł) i tabele godzin sal.

**Model (RD1):**

- `specialist_availability_rules` — okno cykliczne: dzień tygodnia (1–7),
  `starts_at`–`ends_at` (czas lokalny centrum), forma `in_person` |
  `online` | `hybrid` (gabinet + online), `room_id` (wymagany poza
  `online`), co ile tygodni (1 albo 2, z tygodniem startowym), okres
  `valid_from`–`valid_until` (opcjonalnie), notatka wewnętrzna.
- `specialist_availability_windows` — okno jednorazowe (data + godziny, forma,
  gabinet, notatka): „tylko w tym tygodniu”, dodatkowe godziny.
- `specialist_time_off` — nieobecność jako przedział `tstzrange` (od–do,
  cały dzień albo godziny), powód wewnętrzny. Wygrywa z oknami.
- Ograniczenia w bazie: `starts_at < ends_at`, siatka 15 min, okna jednego
  specjalisty się nie nakładają, **gabinet nie jest zajęty przez innego
  specjalistę** w tym samym czasie (sprawdzane w funkcjach zapisu dla reguł i
  okien, bo reguły cykliczne nie dają się wyrazić jednym `EXCLUDE`), gabinet
  musi być aktywny.
- Uprawnienia: specjalista czyta i zmienia tylko swoje (przez RPC z
  walidacją), admin czyta wszystko i może edytować w imieniu specjalisty,
  anon nic. Strona publiczna dostaje tylko wolne terminy.
- Zmiana grafiku nie odwołuje umówionych wizyt; podgląd tygodnia pokazuje
  wizyty poza grafikiem jako konflikt do rozwiązania.

**Domena (R1, `packages/scheduling`, TDD):**

- `expandAvailability(rules, windows, timeOff, zakres, strefa)` → okna jako
  instanty z formą i gabinetem (DST: tydzień zmiany czasu w testach).
- `freeSlots(okna, zajęte, { duration, buffer, step, leadTime, horizon, now,
mode })` → początki wizyt na siatce `step`, gdzie wizyta + przerwa mieści
  się w oknie i nie koliduje z wizytą (z jej przerwą).
- `groupByDay` / `weekOf` dla kroku „Termin” i podglądu tygodnia.
- To samo sprawdzenie „czy termin mieści się w grafiku” jest w SQL
  (`private.slot_is_available`) i blokuje hold; wspólne przypadki testowe
  w Vitest i w `supabase/tests/availability_domain.sql`.

**Portal specjalisty (R2, `/dostepnosc`):**

- **Grafik tygodniowy**: dni tygodnia z oknami (godziny, gabinet albo online,
  cykliczność); dodawanie i edycja w `Sheet` (formularz RHF + Zod: dzień,
  od–do co 15 min, forma, gabinet z listy aktywnych, co tydzień / co 2
  tygodnie, obowiązuje od–do, notatka); usuwanie przez `AlertDialog`;
  „Skopiuj dzień” do innych dni.
- **Nieobecności i dodatkowe okna**: lista nadchodzących z dodawaniem
  (urlop od–do, zablokowane godziny, dodatkowe okno jednego dnia).
- **Podgląd tygodnia**: renderowana na serwerze siatka tygodnia z wyliczonej
  dostępności (ta sama funkcja co w kreatorze), z nawigacją `?tydzien=`
  (nuqs), konfliktami gabinetów i wizytami poza grafikiem.
- Kalendarz z przeciąganiem (K3) później, na tych samych danych.
- Admin (R9 / K5): podgląd grafików wszystkich i obłożenia gabinetów.

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
- Anti-abuse: Cloudflare Turnstile przy danych, limit holdów na IP/e-mail w
  oknie czasu, honeypot. Zod na każdej granicy (Server Action, RPC params).
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

| ID  | Zadanie                                                                                                  | Roadmapa | Status        | Commit / PR | Uwagi                                       |
| --- | -------------------------------------------------------------------------------------------------------- | -------- | ------------- | ----------- | ------------------------------------------- |
| R0  | Plan (ten dokument), nuqs w `apps/web`, kontrakty parametrów kreatora                                    | F4-01    | `DONE`        | 84acd31     |                                             |
| RD1 | Schemat dostępności: reguły, okna jednorazowe, nieobecności, konflikty gabinetów, RPC zapisu, testy SQL  | F4-02    | `DONE`        |             |                                             |
| RD2 | Schemat wizyt i płatności: wykluczenia, RPC wolnych terminów i holdu, `slot_is_available`, testy SQL     | F4-02    | `NOT STARTED` |             |                                             |
| R1  | Domena slotów w `packages/scheduling` (DST, reguły, wyjątki, zajętość, bufor, lead time, horyzont) z TDD | F4-02    | `IN PROGRESS` |             | Okna i wolne terminy gotowe; zajętość z RD2 |
| R2  | Portal specjalisty `/dostepnosc`: grafik tygodniowy, nieobecności, okna jednorazowe, podgląd tygodnia    | F4-02    | `DONE`        |             | Pełny kalendarz: etap K                     |
| R3  | UI `@repo/ui/booking`: stepper, podsumowanie, karty wyboru, siatka tygodnia, lista dnia, legenda         | F4-03    | `NOT STARTED` |             | Stories + testy a11y                        |
| R4  | `/umow-wizyte`: kroki Usługa → Forma → Specjalista → Termin z nuqs, SSR                                  | F4-03    | `NOT STARTED` |             |                                             |
| R5  | Hold terminu, krok „Dane” (Turnstile, limity), zgody                                                     | F4-03    | `NOT STARTED` |             | Klucze Turnstile                            |
| R6  | Płatność Stripe: Payment Element, webhook, „Oczekujemy na potwierdzenie”, wygasanie                      | F4-03    | `NOT STARTED` |             | Klucze testowe Stripe                       |
| R7  | Potwierdzenie i e-maile (Resend): potwierdzenie z linkiem i plikiem `.ics`                               | F4-04    | `NOT STARTED` |             | Klucz Resend, DNS domeny                    |
| R8  | Zarządzanie z linku: szczegóły, przełożenie, anulowanie ze zwrotem                                       | F4-04    | `NOT STARTED` |             |                                             |
| R9  | Portale: lista wizyt specjalisty i admina, anulowanie przez centrum                                      | F4-04    | `NOT STARTED` |             | Widoki kalendarza: etap K (K5)              |
| R10 | Przypomnienia e-mail 24 h przed wizytą, włączenie `booking_enabled` na produkcji                         | F4-04    | `NOT STARTED` |             |                                             |

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
