# Rezerwacje i płatności: macierz scenariuszy

Każdy scenariusz rezerwacji i płatności, od oczywistych po rzadkie, z
tym, czym jest sprawdzony. Cel: przed włączeniem rezerwacji na
produkcji (R10 w [booking-plan.md](./booking-plan.md)) każdy wiersz ma
status ✅ albo świadome „—” z uzasadnieniem.

## Jak czytać

Kolumny warstw:

- **Jedn.**: testy jednostkowe Vitest (`apps/web`, `packages/*`).
- **DB**: testy bazy, dziś `supabase/tests/booking_domain.sql`
  (sekcje A–AB, asercje w blokach `DO`, wszystko cofane). Docelowo
  pgTAP i `supabase test db` w CI (zadanie T1).
- **E2E**: Playwright na prawdziwych stronach z kartami testowymi Stripe.
  Dziś brak specyfikacji rezerwacji (zadanie T2).
- **Ręcznie**: sprawdzone ręcznie na DEV / sandboxie Stripe, z datą.

Oznaczenia: ✅ jest, 🟡 częściowo, ❌ brak, — nie dotyczy.

**Status** wiersza: ✅ wystarczająco pokryte, 🟡 pokryte częściowo,
❌ luka (do zrobienia), ⚠️ luka w działaniu (nie tylko w testach).

Wpis „DB: X” wskazuje sekcję w `booking_domain.sql`.

## Zadania przekrojowe

| ID  | Zadanie                                                                                                                                                                                                                   | Status        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| T1  | Testy bazy jako pgTAP (`supabase/tests/*.test.sql`), `supabase test db` w CI na każdym PR; dzielenie `booking_domain.sql` na pliki per obszar                                                                             | `NOT STARTED` |
| T2  | Playwright: rezerwacja end-to-end na DEV z kartami testowymi (sukces, 3DS, odmowa), BLIK i P24 testowe, link z e-maila, panel admina; dane `@example.invalid`, sprzątanie po teście                                       | `NOT STARTED` |
| T3  | Testy webhooka na prawdziwym endpoincie: `stripe trigger` / `stripe events resend`, zły podpis, powtórka, zdarzenia w złej kolejności                                                                                     | `NOT STARTED` |
| T4  | Testy obciążeniowe wyścigów: równoległe holdy tego samego terminu (np. `pgbench` / skrypt z N klientami)                                                                                                                  | `NOT STARTED` |
| T5  | Konfiguracja Stripe live: klucz z ograniczonymi uprawnieniami (restricted key: Checkout Sessions, Refunds, Charges read), Radar z regułami, 3DS, powiadomienia o sporach, osobny endpoint webhooka live, rotacja `whsec_` | `NOT STARTED` |
| T6  | Przegląd bezpieczeństwa (`/security-review`) całej ścieżki płatności przed produkcją                                                                                                                                      | `NOT STARTED` |
| T7  | Monitoring: alert przy błędach webhooka (500), nieudanych zwrotach, braku przebiegów `pg_cron`, odrzuconych e-mailach                                                                                                     | `NOT STARTED` |

## A. Wolne terminy

| ID  | Scenariusz                                                                           | Oczekiwane                                      | Jedn. | DB     | E2E | Ręcznie  | Status |
| --- | ------------------------------------------------------------------------------------ | ----------------------------------------------- | ----- | ------ | --- | -------- | ------ |
| A1  | Terminy z grafiku tygodniowego, stacjonarnie i online                                | Tylko okna z grafiku, długość usługi            | ✅    | ✅ A   | ❌  | ✅ 10-01 | ✅     |
| A2  | Okno hybrydowe: ten sam termin stacjonarnie i online                                 | Widoczny w obu formach                          | —     | ✅ A   | ❌  |          | ✅     |
| A3  | Filtr lokalizacji                                                                    | Tylko gabinety tej lokalizacji                  | ✅    | ✅ B   | ❌  |          | ✅     |
| A4  | Zakres dłuższy niż 14 dni w jednym zapytaniu                                         | Odmowa                                          | —     | ✅ B   | —   |          | ✅     |
| A5  | Nieobecność specjalisty                                                              | Terminy w nieobecności znikają                  | —     | ✅ I   | ❌  |          | ✅     |
| A6  | Gabinet zamknięty cały dzień / na godzinę                                            | Stacjonarne znikają, online zostają             | —     | ✅ J   | ❌  |          | ✅     |
| A7  | Usługa wyłączona, specjalista nieaktywny, nie przyjmuje nowych, rezerwacje wyłączone | Brak terminów i brak oferty                     | ✅    | ✅ K N | ❌  |          | ✅     |
| A8  | Za blisko (minimalne wyprzedzenie) / za daleko (horyzont)                            | Brak terminów poza oknem                        | ✅    | ✅ L   | ❌  |          | ✅     |
| A9  | Bufor po wizycie                                                                     | Następny termin dopiero po buforze              | —     | ✅ C X | —   |          | ✅     |
| A10 | Zmiana czasu (marzec, październik)                                                   | Godziny lokalne poprawne po obu stronach zmiany | 🟡    | ❌     | ❌  |          | 🟡     |
| A11 | Termin w przeszłości w adresie (`?termin=`)                                          | Pominięty, wybór od nowa                        | ✅    | —      | ❌  |          | ✅     |
| A12 | Dziwne wartości w adresie kreatora (nieistniejąca data, obcy slug, wstrzyknięcie)    | Ignorowane, kreator działa dalej                | ✅    | —      | ❌  |          | ✅     |

## B. Blokada terminu (hold)

| ID  | Scenariusz                                                            | Oczekiwane                                   | Jedn. | DB     | E2E | Ręcznie  | Status |
| --- | --------------------------------------------------------------------- | -------------------------------------------- | ----- | ------ | --- | -------- | ------ |
| B1  | Hold na 10 min, token tylko jako hash                                 | Termin zajęty dla innych, numer `RRMM-NNN`   | —     | ✅ C D | ❌  | ✅ 10-01 | ✅     |
| B2  | Dwie osoby, ten sam termin, ta sama chwila                            | Jedna dostaje, druga „termin zajęty”         | —     | ✅ E F | ❌  |          | 🟡 T4  |
| B3  | Kolizja specjalisty lub gabinetu wstawiona bez funkcji (bezpośrednio) | Wykluczenie w bazie odrzuca                  | —     | ✅ F   | —   |          | ✅     |
| B4  | Hold wygasa                                                           | Termin wraca, stary hold `expired`           | —     | ✅ G   | ❌  |          | ✅     |
| B5  | Zwolnienie holdu (wstecz w kreatorze), dwukrotne                      | Termin wraca, drugie zwolnienie nic nie robi | —     | ✅ H   | ❌  |          | ✅     |
| B6  | Bot: brak / zły token Turnstile                                       | Odmowa, brak holdu                           | ✅    | —      | ❌  |          | 🟡     |
| B7  | Jeden odwiedzający blokuje wiele terminów                             | Limit 5 holdów na odwiedzającego (hash IP)   | ✅    | ✅ O   | ❌  |          | ✅     |
| B8  | Produkcja bez kluczy Turnstile                                        | Kreator odmawia (fail closed)                | ✅    | —      | —   | ✅ 10-01 | ✅     |
| B9  | Anonim woła RPC holdu bezpośrednio (z kluczem publicznym)             | Brak uprawnień                               | —     | ✅ B   | —   |          | ✅     |

## C. Dane klienta i zgody

| ID  | Scenariusz                                       | Oczekiwane                                | Jedn. | DB   | E2E | Ręcznie  | Status |
| --- | ------------------------------------------------ | ----------------------------------------- | ----- | ---- | --- | -------- | ------ |
| C1  | Poprawne dane i obie zgody                       | Zapisane, czas zgód zapisany              | ✅    | ✅ P | ❌  | ✅ 10-01 | ✅     |
| C2  | Brak zgody (regulamin / prywatność)              | Odmowa `consent_required`                 | ✅    | ✅ P | ❌  |          | ✅     |
| C3  | Zły e-mail, brak telefonu                        | Odmowa `invalid_details`, pola zachowane  | ✅    | ✅ P | ❌  |          | ✅     |
| C4  | Ukryte pole (honeypot) wypełnione                | Odmowa po cichu                           | ✅    | —    | ❌  |          | ✅     |
| C5  | Dane po wygaśnięciu holdu                        | Odmowa `hold_expired`                     | —     | ✅ P | ❌  |          | ✅     |
| C6  | HTML / skrypt w imieniu lub notatce              | Zapisany jako tekst, w e-mailu escapowany | ✅    | ❌   | ❌  |          | 🟡     |
| C7  | Bardzo długie pola, znaki spoza BMP (emoji), RTL | Limit długości, poprawny zapis            | ❌    | ❌   | ❌  |          | ❌     |
| C8  | Rezerwacja online nie może stracić zgód          | Warunek w bazie odrzuca                   | —     | ✅ X | —   |          | ✅     |

## D. Płatność od razu (Stripe Checkout, Payment Element)

| ID  | Scenariusz                                                        | Oczekiwane                                                        | Jedn. | DB   | E2E | Ręcznie  | Status |
| --- | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----- | ---- | --- | -------- | ------ |
| D1  | Karta 4242, sukces                                                | Wizyta `confirmed`, e-mail z `.ics`                               | ✅    | ✅ Q | ❌  | ✅ 10-01 | 🟡 T2  |
| D2  | Karta z 3DS (4000 0025 0000 3155)                                 | Po uwierzytelnieniu potwierdzona                                  | —     | —    | ❌  |          | ❌     |
| D3  | Karta odrzucona (4000 0000 0000 9995 i in.)                       | Komunikat, termin nadal zablokowany do końca sesji, ponowna próba | —     | —    | ❌  |          | ❌     |
| D4  | BLIK (asynchronicznie): sukces                                    | „Czekamy na potwierdzenie”, potem `confirmed`                     | ✅    | ✅ Q | ❌  | ✅ 10-01 | 🟡     |
| D5  | BLIK / P24: odmowa banku (`async_payment_failed`)                 | Wizyta `expired`, termin wolny                                    | ✅    | ✅ Q | ❌  |          | 🟡     |
| D6  | Sesja wygasa (klient zamknął kartę)                               | Termin wolny                                                      | ✅    | ✅ Q | ❌  |          | 🟡     |
| D7  | Kwota liczona z bazy, nie z przeglądarki                          | Sesja z ceną wizyty; inna kwota odrzucona `amount_mismatch`       | ✅    | ✅ Q | —   |          | ✅     |
| D8  | Podwójne kliknięcie „Zapłać”                                      | Jedna sesja (klucz idempotencji na minutę)                        | 🟡    | —    | ❌  |          | 🟡     |
| D9  | Płatność przyszła, ale termin w międzyczasie zajęty (`slot_lost`) | Automatyczny zwrot całości, klient poinformowany                  | ✅    | ✅ Q | ❌  |          | 🟡     |
| D10 | Płatność za wizytę już odwołaną z braku płatności                 | `slot_lost`, wizyta nie wraca, zwrot                              | ✅    | ✅ Y | ❌  |          | 🟡     |
| D11 | Do Stripe nie trafia imię, telefon, notatka                       | Tylko e-mail i numer rezerwacji                                   | ✅    | —    | —   |          | ✅     |
| D12 | Waluta inna niż PLN w sesji                                       | Odrzucona przez bazę                                              | —     | ❌   | —   |          | ❌     |
| D13 | Wizyta za 0 zł                                                    | Bez Stripe, od razu potwierdzona                                  | 🟡    | ❌   | ❌  |          | ❌     |
| D14 | Klient wraca z płatności (`?sesja=`) zanim przyszedł webhook      | Strona sprawdza sesję w Stripe i pokazuje stan                    | 🟡    | —    | ❌  | ✅ 10-01 | 🟡     |

## E. Płać później (rezerwacja)

| ID  | Scenariusz                                        | Oczekiwane                                                   | Jedn. | DB     | E2E | Ręcznie  | Status |
| --- | ------------------------------------------------- | ------------------------------------------------------------ | ----- | ------ | --- | -------- | ------ |
| E1  | Rezerwacja ponad 48 h przed                       | `awaiting_payment`, termin płatności = start − 48 h, e-mail  | ✅    | ✅ Y   | ❌  | ✅ 10-01 | 🟡 T2  |
| E2  | Rezerwacja bliżej niż 48 h                        | Tylko „zapłać teraz” (`pay_now_required`)                    | ✅    | ✅ Y   | ❌  |          | ✅     |
| E3  | Opłacenie z linku w e-mailu                       | Zgody, sesja, `confirmed`, potwierdzenie                     | ✅    | ✅ X   | ❌  | ✅ 10-01 | 🟡     |
| E4  | Przypomnienie 24 h i 6 h przed terminem płatności | Po jednym e-mailu, nie dla świeżych rezerwacji               | ✅    | ✅ Y   | —   |          | ✅     |
| E5  | Brak płatności w terminie                         | `pg_cron` anuluje (`system`), e-mail, termin wolny           | ✅    | ✅ Y   | —   | ✅ 10-01 | ✅     |
| E6  | Klient właśnie płaci, gdy mija termin             | Nie anulować w trakcie płatności                             | —     | ✅ Y   | —   |          | ✅     |
| E7  | Sesja płatności z linku wygasa                    | Rezerwacja zostaje do terminu płatności                      | —     | ✅ X   | ❌  |          | ✅     |
| E8  | Link do płatności dla wizyty już opłaconej        | `not_payable`                                                | —     | ✅ X Z | ❌  |          | ✅     |
| E9  | Rezerwacja przeterminowana nie blokuje terminu    | Termin wolny nawet przed przebiegiem crona                   | —     | ✅ Y   | —   |          | ✅     |
| E10 | Cron nie działa (Vault pusty, strona niedostępna) | Anulowanie i tak w bazie; e-maile czekają, nic się nie psuje | ✅    | 🟡     | —   | ✅ 10-01 | 🟡 T7  |

## F. Centrum rezerwuje za klienta

| ID  | Scenariusz                                             | Oczekiwane                                | Jedn. | DB   | E2E | Ręcznie  | Status |
| --- | ------------------------------------------------------ | ----------------------------------------- | ----- | ---- | --- | -------- | ------ |
| F1  | Admin rezerwuje dowolnego specjalistę                  | `awaiting_payment`, e-mail z linkiem      | ✅    | ✅ X | ❌  | ✅ 10-01 | 🟡     |
| F2  | Specjalista rezerwuje siebie / próbuje za kogoś innego | Siebie tak, innych `forbidden`            | —     | ✅ X | ❌  |          | ✅     |
| F3  | Kolizja, gabinet zamknięty, nieobecność, przeszłość    | Odmowa z powodem                          | ✅    | ✅ X | ❌  |          | ✅     |
| F4  | Za mało czasu na zapłatę                               | Link na 2 h albo `too_soon`               | ✅    | ✅ X | ❌  |          | ✅     |
| F5  | Ponowne wysłanie linku: od razu / po chwili / opłacona | `recently_sent` / wysłany / `not_payable` | ✅    | ✅ Z | ❌  | ✅ 10-01 | ✅     |
| F6  | Rezerwacja centrum nie może być potwierdzona bez zgód  | Warunek w bazie odrzuca                   | —     | ✅ X | —   |          | ✅     |

## G. Klient zmienia lub odwołuje (link z e-maila)

| ID  | Scenariusz                                | Oczekiwane                                    | Jedn. | DB   | E2E | Ręcznie  | Status |
| --- | ----------------------------------------- | --------------------------------------------- | ----- | ---- | --- | -------- | ------ |
| G1  | Przełożenie w oknie, w limicie            | Nowy termin, e-mail, `.ics` z nową sekwencją  | ✅    | ✅ S | ❌  |          | 🟡     |
| G2  | Przełożenie poza oknem / ponad limit      | `not_reschedulable`                           | ✅    | ✅ S | ❌  |          | ✅     |
| G3  | Przełożenie na zajęty termin              | `slot_unavailable`                            | —     | ✅ S | ❌  |          | ✅     |
| G4  | Odwołanie przed oknem                     | Pełny zwrot przez Stripe, e-mail              | ✅    | ✅ S | ❌  | ✅ 10-01 | ✅     |
| G5  | Odwołanie po oknie                        | Bez zwrotu, e-mail mówi dlaczego              | ✅    | ✅ S | ❌  | ✅ 10-01 | ✅     |
| G6  | Odwołanie nieopłaconej rezerwacji         | Bez zwrotu, termin wolny                      | ✅    | ✅ Y | ❌  |          | ✅     |
| G7  | Dwukrotne odwołanie / zmiana po odwołaniu | `not_cancellable` / `not_reschedulable`       | —     | ✅ S | ❌  |          | ✅     |
| G8  | Token holdu zamiast tokenu z e-maila      | `not_found`                                   | —     | ✅ S | —   |          | ✅     |
| G9  | Stripe odrzuca zwrot przy odwołaniu       | Odwołanie zostaje, kwota „do zwrotu” widoczna | ✅    | —    | —   |          | ⚠️ U1  |
| G10 | Podwójne kliknięcie „Odwołaj”             | Jeden zwrot (klucz `cancel:<ref>`)            | ✅    | ✅ S | ❌  |          | ✅     |

## H. Centrum po swojemu (admin)

| ID  | Scenariusz                                               | Oczekiwane                                                    | Jedn. | DB       | E2E | Ręcznie  | Status |
| --- | -------------------------------------------------------- | ------------------------------------------------------------- | ----- | -------- | --- | -------- | ------ |
| H1  | Odwołanie w dowolnej chwili z wybraną kwotą i powodem    | Zwrot tej kwoty, „Zatrzymano” i powód w e-mailu               | ✅    | ✅ AA    | ❌  | ✅ 10-01 | ✅     |
| H2  | Kwota większa niż wpłacona / ujemna / nie-liczba         | Odmowa w formularzu i w bazie                                 | ✅    | ✅ AA    | ❌  |          | ✅     |
| H3  | Zwrot później, kilka razy (150 + 50 zł)                  | Dwa zwroty w Stripe, suma w bazie, e-mail o każdym            | ✅    | ✅ AA AB | ❌  | ✅ 10-01 | ✅     |
| H4  | Zwrot ponad to, co zostało                               | `refund_too_high`                                             | ✅    | ✅ AA    | ❌  |          | ✅     |
| H5  | Przesunięcie: termin, gabinet, forma, bez okien klienta  | Nowy termin, e-mail z nowym linkiem, termin płatności od nowa | ✅    | ✅ AA    | ❌  | ✅ 10-01 | ✅     |
| H6  | Przesunięcie bez zmiany / na zajęty / w przeszłość       | `nothing_changed` / `specialist_busy` / `in_the_past`         | ✅    | ✅ AA    | ❌  | ✅ 10-01 | ✅     |
| H7  | Specjalista próbuje zwrotu lub przesunięcia jako centrum | Brak uprawnień                                                | —     | ✅ AA    | ❌  |          | ✅     |
| H8  | Dwa okna admina zwracają jednocześnie                    | Suma nie przekracza wpłaty (blokada wiersza)                  | —     | 🟡       | ❌  |          | 🟡 T4  |

## I. Webhook Stripe

| ID  | Scenariusz                                             | Oczekiwane                                                | Jedn. | DB   | E2E | Ręcznie | Status |
| --- | ------------------------------------------------------ | --------------------------------------------------------- | ----- | ---- | --- | ------- | ------ |
| I1  | Brak / zły podpis, podpis z innego sekretu             | 400, nic się nie dzieje                                   | ❌    | —    | ❌  |         | ❌ T3  |
| I2  | To samo zdarzenie dwa razy (Stripe ponawia)            | Obsłużone raz (`claimStripeEvent`)                        | 🟡    | 🟡   | ❌  |         | 🟡 T3  |
| I3  | Błąd w obsłudze                                        | 500, zdarzenie oddane, Stripe ponowi                      | ❌    | —    | ❌  |         | ❌ T3  |
| I4  | Zdarzenia w złej kolejności (`expired` po `completed`) | Stan końcowy poprawny                                     | 🟡    | ✅ Q | ❌  |         | 🟡     |
| I5  | Nieznany typ zdarzenia                                 | 200, pominięte                                            | ✅    | —    | —   |         | ✅     |
| I6  | `charge.refunded` z panelu Stripe (zwrot ręczny)       | Kwota zwrotu zapisana przy wizycie                        | ✅    | ✅ Q | ❌  |         | 🟡     |
| I7  | Sesja z nieznanym numerem rezerwacji / spoza systemu   | `unknown_session`, nic się nie zmienia                    | —     | ✅ Q | —   |         | ✅     |
| I8  | Spór o płatność (`charge.dispute.created`)             | Admin widzi i dostaje powiadomienie                       | ❌    | ❌   | ❌  |         | ⚠️ U2  |
| I9  | Zdarzenie z trybu testowego na produkcji (i odwrotnie) | Odrzucone (inny sekret), dodatkowo sprawdzenie `livemode` | ❌    | —    | —   |         | ❌     |

## J. Bezpieczeństwo, dostęp, wycieki

| ID  | Scenariusz                                                            | Oczekiwane                                 | Jedn. | DB            | E2E | Ręcznie  | Status |
| --- | --------------------------------------------------------------------- | ------------------------------------------ | ----- | ------------- | --- | -------- | ------ |
| J1  | Anonim czyta wizyty, płatności, e-maile                               | Brak dostępu                               | —     | ✅ B M T      | —   |          | ✅     |
| J2  | Specjalista widzi tylko swoje wizyty, bez kwot i hashy tokenów        | Tak                                        | —     | ✅ M T V W AB | —   |          | ✅     |
| J3  | Specjalista zmienia wizytę bezpośrednio w tabeli                      | Brak uprawnień                             | —     | ✅ M          | —   |          | ✅     |
| J4  | Admin dopisuje historię ręcznie                                       | Brak uprawnień                             | —     | ✅ W          | —   |          | ✅     |
| J5  | Odgadnięcie tokenu z linku                                            | Tokeny 32 bajty losowe, w bazie tylko hash | —     | ✅ C R        | —   |          | ✅     |
| J6  | Stary link po wysłaniu nowego                                         | Zgodnie z decyzją: działa najnowszy        | —     | ✅ R          | ❌  |          | ✅     |
| J7  | Sekrety (`STRIPE_SECRET_KEY`, `SUPABASE_SECRET_KEY`) w kodzie klienta | Brak w bundlu przeglądarki                 | ❌    | —             | ❌  |          | ❌ T6  |
| J8  | Portal wywołuje API strony bez sesji admina / z sesją specjalisty     | 401 / 403; baza sprawdza rolę              | 🟡    | ✅ AA         | ❌  |          | 🟡     |
| J9  | Endpoint crona bez sekretu / ze złym                                  | 401                                        | ✅    | —             | —   | ✅ 10-01 | ✅     |
| J10 | Wyszukiwarka wizyt: `%`, `_`, wstrzyknięcie w sortowaniu              | Dosłowne szukanie, odmowa nieznanego sortu | —     | ✅ U          | —   |          | ✅     |
| J11 | Logi serwera nie zawierają danych klienta ani tokenów                 | Tylko numer rezerwacji                     | ❌    | —             | —   |          | ❌ T6  |

## K. E-maile

| ID  | Scenariusz                                               | Oczekiwane                                            | Jedn. | DB   | E2E | Ręcznie  | Status |
| --- | -------------------------------------------------------- | ----------------------------------------------------- | ----- | ---- | --- | -------- | ------ |
| K1  | Każdy e-mail wychodzi dokładnie raz (claim)              | Drugi claim pusty                                     | ✅    | ✅ R | —   | ✅ 10-01 | ✅     |
| K2  | Resend nie działa                                        | Claim oddany, ponowienie przez cron                   | ✅    | ✅ R | —   | ✅ 10-01 | ✅     |
| K3  | Wizyta bez e-maila (rezerwacja telefoniczna)             | Nic nie wychodzi, panel mówi „powiadom telefonicznie” | ✅    | 🟡   | ❌  |          | 🟡     |
| K4  | Plik `.ics`: strefa, zawijanie, aktualizacja, anulowanie | Zgodny z RFC 5545                                     | ✅    | —    | —   |          | ✅     |
| K5  | Treść: brak danych o zdrowiu, escapowanie                | Tak                                                   | ✅    | —    | —   |          | ✅     |
| K6  | Domena nadawcy niezweryfikowana                          | Błąd widoczny w logach / monitoringu                  | —     | —    | —   | ✅ 10-01 | 🟡 T7  |

## L. Czas i kalendarz

| ID  | Scenariusz                                              | Oczekiwane                                 | Jedn. | DB   | E2E | Ręcznie | Status |
| --- | ------------------------------------------------------- | ------------------------------------------ | ----- | ---- | --- | ------- | ------ |
| L1  | Wizyta w noc zmiany czasu                               | Poprawna godzina w e-mailu, `.ics`, panelu | 🟡    | ❌   | ❌  |         | 🟡     |
| L2  | Rezerwacja tuż przed północą / przełom miesiąca (numer) | Numer z właściwego miesiąca                | —     | 🟡 C | —   |         | 🟡     |
| L3  | Przeglądarka klienta w innej strefie                    | Godziny zawsze w czasie centrum            | ✅    | —    | ❌  |         | 🟡     |

## M. Zmiany w ofercie po rezerwacji

| ID  | Scenariusz                                                  | Oczekiwane                                               | Jedn. | DB  | E2E | Ręcznie | Status |
| --- | ----------------------------------------------------------- | -------------------------------------------------------- | ----- | --- | --- | ------- | ------ |
| M1  | Zmiana ceny po rezerwacji, przed zapłatą                    | Klient płaci cenę z chwili rezerwacji                    | —     | ❌  | ❌  |         | ❌     |
| M2  | Specjalista dezaktywowany z przyszłymi wizytami             | Wizyty zostają, admin widzi ostrzeżenie                  | —     | ❌  | ❌  |         | ⚠️ U3  |
| M3  | Gabinet zamknięty / nieobecność dodana na istniejącą wizytę | Ostrzeżenie o kolizji z wizytą                           | —     | ❌  | ❌  |         | ⚠️ U3  |
| M4  | Zmiana okna odwołań po rezerwacji                           | Decyzja: obowiązuje okno z chwili rezerwacji czy bieżące | —     | ❌  | —   |         | ❌     |

## Luki w działaniu (do decyzji i zrobienia)

| ID  | Luka                                                                         | Propozycja                                                                       |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| U1  | Nieudany zwrot (Stripe odmówił) widać tylko w toaście i w kwocie „do zwrotu” | Lista „do rozliczenia” na dashboardzie admina z przyciskiem ponowienia           |
| U2  | Spory o płatność (chargeback) nieobsługiwane                                 | Webhook `charge.dispute.*`, oznaczenie wizyty, powiadomienie admina              |
| U3  | Zmiany w grafiku i ofercie nie ostrzegają o istniejących wizytach            | Sprawdzenie kolizji przy zapisie nieobecności, zamknięcia gabinetu, dezaktywacji |
| U4  | Regulamin rezerwacji i płatności                                             | Wymagany przed produkcją (X-04 w roadmapie)                                      |
