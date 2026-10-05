# Portal admina: co przetestować przed produkcją

Lista wszystkiego, co musi zostać sprawdzone w portalu admina (i w częściach
strony, z których admin korzysta: płatności, zwroty, maile, zadania
cykliczne), zanim portal trafi na produkcję. Każdy punkt ma warstwę testu,
priorytet i status.

## Postęp

Stan na 06.10.2026. Aktualizowany po każdym etapie.

**Całość: 10 z 117 punktów zrobionych (9%), 56 częściowo, 51 do zrobienia.
Blokujące start (P0): 4 z 70 zrobione. Lista „Przed startem”: 0 z 11.**

| Sekcja                                                                                |  Punkty |     ✅ |     🟨 |     ⬜ | P0 zrobione |
| ------------------------------------------------------------------------------------- | ------: | -----: | -----: | -----: | ----------: |
| [0. Infrastruktura testów](#0-infrastruktura-testów)                                  |       6 |      0 |      0 |      6 |       0 / 4 |
| [1. Logowanie, sesja i uprawnienia](#1-logowanie-sesja-i-uprawnienia-p0)              |      11 |      0 |      5 |      6 |      0 / 10 |
| [2. Rezerwacje: tabela i panel](#2-rezerwacje-tabela-i-panel-wizyty-p0)               |      10 |      1 |      6 |      3 |       0 / 6 |
| [3. Wizyty centrum i zmiany](#3-wizyty-zapisywane-przez-centrum-i-zmiany-p0)          |       9 |      0 |      2 |      7 |       0 / 9 |
| [4. Płatności i Stripe](#4-płatności-i-stripe-p0)                                     |      11 |      0 |      5 |      6 |      0 / 11 |
| [5. Maile i przypomnienia](#5-maile-resend-i-przypomnienia-p0)                        |       8 |      2 |      5 |      1 |       1 / 6 |
| [6. Dashboard i powiadomienia](#6-dashboard-i-powiadomienia-p1)                       |       4 |      1 |      3 |      0 |           — |
| [7. Kalendarz](#7-kalendarz-p1)                                                       |       4 |      1 |      3 |      0 |           — |
| [8. Klienci](#8-klienci-p0)                                                           |       6 |      0 |      5 |      1 |       0 / 5 |
| [9. Specjaliści](#9-specjaliści-p0)                                                   |       7 |      2 |      4 |      1 |       1 / 3 |
| [10. Gabinety i oferta](#10-gabinety-i-oferta-p1)                                     |       4 |      0 |      3 |      1 |       0 / 1 |
| [11. Ustawienia](#11-ustawienia-p0)                                                   |       6 |      0 |      6 |      0 |       0 / 4 |
| [12. Strona i CMS](#12-strona-i-cms-p1)                                               |       3 |      1 |      2 |      0 |           — |
| [13. Zamykanie wizyt](#13-zamykanie-wizyt-p1)                                         |       3 |      0 |      3 |      0 |       0 / 1 |
| [14. Komponenty i Storybook](#14-komponenty-i-storybook-p1)                           |       5 |      0 |      1 |      4 |       0 / 1 |
| [15. Bezpieczeństwo](#15-bezpieczeństwo-p0)                                           |       6 |      0 |      3 |      3 |       0 / 5 |
| [16. Wydajność](#16-wydajność-p1)                                                     |       4 |      0 |      0 |      4 |           — |
| [17. Testy bazy do aktualizacji](#17-baza-testy-domen-do-aktualizacji-i-dopisania-p0) |       3 |      2 |      0 |      1 |       2 / 3 |
| [18. Do dodania przed startem](#18-funkcje-do-dodania-przed-startem-mvp)              |       7 |      0 |      0 |      7 |       0 / 1 |
| **Razem**                                                                             | **117** | **10** | **56** | **51** |  **4 / 70** |

Kolejność pracy: 0 → 17 i 1 (baza i uprawnienia) → 4 i 3 (pieniądze) → 18.1 →
2, 5, 8, 11, 9 (pozostałe P0) → 15 → 14 → 18 (inFakt) → reszta P1 → „Przed
startem”.

Decyzje biznesowe na MVP (06.10.2026): płatności tylko online (głównie BLIK);
jedyną specjalistką na start jest Anna, założycielka (bez rozliczeń ze
specjalistami); link do spotkania online Anna wysyła sama; faktury przez
inFakt (z KSeF).

## Jak czytać

**Warstwy testów**

| Skrót | Warstwa      | Gdzie i czym                                                                                                                         |
| ----- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **B** | baza danych  | pliki `supabase/tests/*.sql` na DEV, każdy w transakcji wycofywanej na końcu (`supabase db query --linked -f`)                       |
| **J** | jednostkowe  | Vitest w pakiecie (logika, walidacje, mapowanie)                                                                                     |
| **I** | integracyjne | Vitest: akcje serwera, trasy API, Stripe i Resend z atrapami lub w trybie testowym                                                   |
| **K** | komponenty   | Vitest + Testing Library oraz Storybook (interakcje, dostępność, render po stronie serwera)                                          |
| **E** | end-to-end   | Playwright na lokalnych serwerach z bazą DEV i trybem testowym Stripe; dane tylko z adresami `@example.invalid`, sprzątane po teście |
| **R** | ręcznie      | sprawdzenie w przeglądarce przed startem (rzeczy trudne do automatyzacji)                                                            |

**Priorytety**

- **P0**: blokuje start. Pieniądze, uprawnienia, dane osobowe, rezerwacje.
- **P1**: przed startem, ale nie blokuje, gdy jest obejście.
- **P2**: tuż po starcie.

**Status:** ⬜ do zrobienia · 🟨 częściowo · ✅ zrobione

## Stan wyjściowy (audyt 06.10.2026)

| Obszar                                       | Pokrycie linii / gałęzi      | Uwagi                                                               |
| -------------------------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| `packages/scheduling`                        | 98% / 86%                    | prawie gotowe                                                       |
| `packages/ui`                                | 89% / 78%                    | brakuje gałęzi                                                      |
| `packages/contracts`                         | 82% / 86%                    |                                                                     |
| `packages/supabase`                          | 69% / 57%                    | wiele funkcji bez testów                                            |
| `apps/web` (płatności, maile, trasy centrum) | 36% / 36%                    | słabo                                                               |
| `apps/admin` (pliki `.ts`)                   | 21% / 36%                    | akcje i loadery bez testów                                          |
| `apps/admin` (pliki `.tsx`, 69)              | 0%                           | Vitest w adminie nie obsługuje JSX                                  |
| Storybook                                    | 287 z 290 stories przechodzi | 3 stories powiadomień padają; komponenty z `apps/admin` bez stories |
| E2E                                          | 6 scenariuszy                | brak scenariuszy rezerwacji, płatności, zwrotów, ustawień, klientów |
| Testy bazy                                   | 8 z 11 plików przechodzi     | 3 nieaktualne; brak testów nowych domen                             |

Znalezione i naprawione przy audycie: wyzwalacze siatki godzin nie miały
uprawnień do `private.on_grid`, więc zapis godzin, blokad i wyjątków
gabinetu przez admina kończył się błędem (migracja
`20261006010000_grid_triggers_definer`).

## Kryteria wyjścia (kiedy portal jest gotowy)

1. Wszystkie punkty **P0** mają status ✅.
2. Testy bazy przechodzą w całości na DEV, a migracje wgrywają się od zera do
   pustego projektu produkcyjnego.
3. Pokrycie: ścieżka pieniędzy (`apps/web` booking, Stripe, zwroty) i akcje
   admina **≥ 90% linii i gałęzi**; pozostałe pakiety ≥ 80%, z progami
   wymuszanymi przy `test`.
4. Wszystkie stories przechodzą (interakcje i dostępność).
5. Supabase advisors bez ostrzeżeń bezpieczeństwa poza świadomie przyjętymi
   (funkcje `SECURITY DEFINER` sprawdzające rolę, udokumentowane testem B0).
6. Lista „Przed startem” (na końcu) odhaczona.

---

## 0. Infrastruktura testów

| #   | Co                                                                                                           | Warstwa | Prio | Status |
| --- | ------------------------------------------------------------------------------------------------------------ | ------- | ---- | ------ |
| 0.1 | Vitest w `apps/admin` obsługuje JSX (jsdom, `*.test.tsx`)                                                    | —       | P0   | ⬜     |
| 0.2 | Skrypt uruchamiający wszystkie `supabase/tests/*.sql` na DEV z czytelnym wynikiem (ok/FAIL na plik)          | —       | P0   | ⬜     |
| 0.3 | Progi pokrycia w konfiguracji Vitest każdego pakietu                                                         | —       | P1   | ⬜     |
| 0.4 | Playwright: logowanie jako admin i specjalista testowy, sprzątanie danych `@example.invalid` po każdym pliku | —       | P0   | ⬜     |
| 0.5 | Stripe CLI `stripe listen` przekierowujące webhooki na lokalny `apps/web` w czasie e2e                       | —       | P0   | ⬜     |
| 0.6 | CI (GitHub Actions): testy J, I, K przy każdym pushu; B i E ręcznie lub nocą                                 | —       | P2   | ⬜     |

## 1. Logowanie, sesja i uprawnienia (P0)

| #    | Scenariusz                                                                                                                                                                                          | Warstwa | Prio | Status                           |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---- | -------------------------------- |
| 1.1  | Logowanie poprawnym hasłem przenosi na dashboard; błędne pokazuje komunikat                                                                                                                         | E       | P0   | 🟨 (`auth.spec.ts`)              |
| 1.2  | Konto bez roli admina trafia na `/access-denied`; specjalista nie wejdzie do admina                                                                                                                 | E, B    | P0   | 🟨                               |
| 1.3  | Niezalogowany na dowolnej stronie `(protected)` trafia na logowanie                                                                                                                                 | E       | P0   | ⬜                               |
| 1.4  | Reset hasła: mail, link `auth/callback`, ustawienie nowego hasła                                                                                                                                    | E, R    | P0   | ⬜                               |
| 1.5  | Link zaproszenia `auth/confirm`: poprawny loguje i prowadzi do ustawienia hasła; zły, wygasły lub użyty drugi raz wraca do logowania z komunikatem                                                  | I, E    | P0   | ⬜                               |
| 1.6  | Wylogowanie czyści sesję                                                                                                                                                                            | E       | P1   | ⬜                               |
| 1.7  | **Macierz uprawnień bazy:** każda funkcja `SECURITY DEFINER` wywołana jako anonim, specjalista i admin; anonim i specjalista dostają odmowę albo tylko swoje lub publiczne dane (test stały w repo) | B       | P0   | 🟨 (audyt ręczny: brak wycieków) |
| 1.8  | Izolacja specjalistów: cudza wizyta, historia, zamknięcie, link do płatności, nieobecność, dostępność, oferta: odmowa                                                                               | B       | P0   | 🟨 (audyt ręczny: OK)            |
| 1.9  | Każda akcja serwera admina wywołuje `requirePortalRole` (odmowa bez sesji i bez roli)                                                                                                               | I       | P0   | ⬜                               |
| 1.10 | Trasy `api/centrum/*` w `apps/web`: bez tokenu 401, token nie-admina 403, zły UUID 404, złe body 400                                                                                                | I       | P0   | ⬜                               |
| 1.11 | Trasy `api/cron/*`: bez sekretu 401, z sekretem działają                                                                                                                                            | I       | P0   | 🟨                               |

## 2. Rezerwacje: tabela i panel wizyty (P0)

| #    | Scenariusz                                                                                                                                                  | Warstwa | Prio | Status                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---- | -------------------------------------- |
| 2.1  | Wyszukiwanie po numerze, kliencie, e-mailu, telefonie, usłudze, specjaliście                                                                                | B, E    | P0   | 🟨                                     |
| 2.2  | Filtry: status, płatność (opłacone, nieopłacone, do zwrotu, zwrócone), specjalista, usługa, miejsce, okres, utworzono, zmiana                               | J, B    | P0   | 🟨                                     |
| 2.3  | Widoki okresu: nadchodzące, dziś, jutro, tydzień, miesiąc, minione, wszystkie, **archiwum**, **do zamknięcia**                                              | J, B    | P0   | 🟨                                     |
| 2.4  | Reguła archiwum: odbyta po 7 dniach; odwołana po terminie i po 7 dniach od odwołania; nigdy z zaległym zwrotem, nigdy nadchodząca lub czekająca na płatność | B       | P0   | 🟨 (sprawdzone ręcznie)                |
| 2.5  | Sortowanie po każdej kolumnie, stronicowanie 10/20/50, stan w adresie po odświeżeniu                                                                        | J, E    | P1   | 🟨                                     |
| 2.6  | Kolumny: wybór, kolejność i szerokości zapamiętane w ciasteczkach                                                                                           | K       | P2   | 🟨                                     |
| 2.7  | Panel wizyty otwiera się z każdej listy (Rezerwacje, Kalendarz, karta klienta, dashboard, powiadomienie)                                                    | E       | P0   | ⬜ (błąd `get_visit` naprawiony 05.10) |
| 2.8  | Panel: szczegóły, historia zdarzeń, zakładka Klient, maile wysłane, test przed konsultacją (gdy jest)                                                       | K, E    | P0   | ⬜                                     |
| 2.9  | Nazwisko klienta w tabeli prowadzi do jego karty                                                                                                            | E       | P1   | ✅ (ręcznie)                           |
| 2.10 | Status zamknięcia w panelu zgodny z tabelą (dziś panel pokazuje „Potwierdzona”)                                                                             | J, K    | P1   | ⬜ (do naprawy)                        |

## 3. Wizyty zapisywane przez centrum i zmiany (P0)

| #   | Scenariusz                                                                                                                                                                                                                          | Warstwa | Prio | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---- | ------ |
| 3.1 | „Nowa wizyta”: wybór oferty, formy, gabinetu, terminu, danych klienta; wizyta czeka na płatność, klient dostaje mail z linkiem                                                                                                      | I, E    | P0   | ⬜     |
| 3.2 | Odmowy przy zapisie: specjalista zajęty (z czasem po wizycie), gabinet zajęty, gabinet zamknięty, **centrum zamknięte**, nieobecność specjalisty, poza siatką, w przeszłości, za mało czasu na płatność, **specjalista nieaktywny** | B, I    | P0   | 🟨     |
| 3.3 | Ponowne wysłanie linku do płatności (blokada przy zbyt częstym wysyłaniu)                                                                                                                                                           | I, E    | P0   | ⬜     |
| 3.4 | Przełożenie przez centrum: nowy termin, miejsce, powód; mail do klienta z plikiem kalendarza; odmowy jak w 3.2 i „nic się nie zmienia”                                                                                              | B, I, E | P0   | ⬜     |
| 3.5 | Odwołanie przez centrum: pełny zwrot, częściowy, bez zwrotu; mail z właściwą wersją treści                                                                                                                                          | I, E    | P0   | ⬜     |
| 3.6 | Odwołanie nieopłaconej rezerwacji (bez zwrotu)                                                                                                                                                                                      | I, E    | P0   | ⬜     |
| 3.7 | Zwrot później (rozliczenie zaległego zwrotu, przycisk „Rozlicz”)                                                                                                                                                                    | I, E    | P0   | ⬜     |
| 3.8 | Zwrot nigdy wyższy niż cena ani niż to, co zostało z płatności (blokada w bazie)                                                                                                                                                    | B       | P0   | 🟨     |
| 3.9 | Podwójne kliknięcie zwrotu daje jeden zwrot („recently_settled”)                                                                                                                                                                    | B, I    | P0   | ⬜     |

## 4. Płatności i Stripe (P0)

Macierz na trybie testowym Stripe, z webhookami przez `stripe listen`.

| #    | Scenariusz                                                                                                                                                                        | Warstwa | Prio | Status      |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---- | ----------- |
| 4.1  | Rezerwacja klienta z płatnością od razu: potwierdzenie po webhooku `checkout.session.completed`, mail z potwierdzeniem i plikiem kalendarza                                       | I, E    | P0   | 🟨 (atrapy) |
| 4.2  | „Zapłać później”: rezerwacja czeka; płatność z linku potwierdza wizytę                                                                                                            | I, E    | P0   | 🟨          |
| 4.3  | Płatności asynchroniczne (BLIK, P24): `async_payment_succeeded` potwierdza, `async_payment_failed` nie                                                                            | I       | P0   | ⬜          |
| 4.4  | Nieopłacona do terminu: zadanie anuluje rezerwację, termin wraca do grafiku, mail o anulowaniu                                                                                    | B, I    | P0   | 🟨          |
| 4.5  | Webhook z błędnym podpisem: odrzucony                                                                                                                                             | I       | P0   | 🟨          |
| 4.6  | Ten sam webhook dwa razy: przetworzony raz (`stripe_events`)                                                                                                                      | B, I    | P0   | ⬜          |
| 4.7  | Webhook po anulowaniu rezerwacji (płatność za późno): pieniądze do zwrotu, nic się nie psuje                                                                                      | B, I    | P0   | ⬜          |
| 4.8  | Zwrot przez Stripe udany, nieudany i „już zwrócony” (zwrot zrobiony w panelu Stripe; przypadek z 1356) z poprawnym zapisem w bazie                                                | I       | P0   | 🟨          |
| 4.9  | Webhook `charge.refunded` zgodny ze stanem w bazie (bez podwójnego zwrotu)                                                                                                        | I       | P0   | ⬜          |
| 4.10 | Kwota w Stripe zawsze równa cenie wizyty w bazie                                                                                                                                  | B, I    | P0   | ⬜          |
| 4.11 | **BLIK** (główna metoda): włączony dla PLN w Stripe; potwierdzenie w aplikacji banku, odrzucenie, przekroczony czas na potwierdzenie; poprawny stan rezerwacji w każdym przypadku | I, E, R | P0   | ⬜          |

## 5. Maile (Resend) i przypomnienia (P0)

| #   | Scenariusz                                                                                                                            | Warstwa | Prio | Status                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---- | ----------------------- |
| 5.1 | Każdy mail z katalogu (14 wariantów) buduje się poprawnie: temat, treść, wersja tekstowa, załącznik kalendarza, dane firmy w stopce   | J       | P0   | ✅                      |
| 5.2 | Każdy mail wychodzi raz (rezerwacja w bazie przed wysyłką, klucz idempotencji Resend), a nieudana wysyłka oddaje rezerwację           | B, I    | P0   | 🟨                      |
| 5.3 | Przypomnienie o wizycie: wychodzi w ustawionym czasie, nie wychodzi gdy wyłączone, nie dla wizyt zarezerwowanych później niż ten czas | B       | P0   | 🟨 (sprawdzone ręcznie) |
| 5.4 | Przypomnienie o płatności i ostatnie wezwanie: jak wyżej                                                                              | B       | P0   | 🟨 (sprawdzone ręcznie) |
| 5.5 | Zaproszenie admina i specjalisty: mail, link, ponowne zaproszenie istniejącego konta                                                  | I       | P0   | 🟨                      |
| 5.6 | Poranny mail o wizytach do zamknięcia: raz dziennie na specjalistę                                                                    | I       | P1   | 🟨                      |
| 5.7 | Podgląd maili w CMS → E-maile zgodny z wysyłanymi (ten sam kod)                                                                       | J, E    | P1   | ✅                      |
| 5.8 | Wysyłka na prawdziwą skrzynkę po weryfikacji domeny (próbka każdego typu)                                                             | R       | P0   | ⬜                      |

## 6. Dashboard i powiadomienia (P1)

| #   | Scenariusz                                                                                                                                     | Warstwa | Prio | Status                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---- | --------------------- |
| 6.1 | Liczby dnia, oś dnia w gabinetach, plan dnia, tydzień: zgodne z danymi                                                                         | J, K    | P1   | 🟨                    |
| 6.2 | „Do zrobienia”: zwroty do rozliczenia, płatności z bliskim terminem, profile do weryfikacji, wizyty do zamknięcia; każdy link prowadzi do celu | J, E    | P1   | 🟨                    |
| 6.3 | Powiadomienia: lista, nieprzeczytane, oznacz przeczytane i nieprzeczytane, wszystkie przeczytane, odświeżanie na żywo (realtime)               | B, K, E | P1   | 🟨 (3 stories padają) |
| 6.4 | Każdy rodzaj powiadomienia (rezerwacja, płatność, odwołanie, przełożenie, zwrot, profil, wizyta do zamknięcia) ma tytuł, ikonę i link          | J       | P1   | ✅                    |

## 7. Kalendarz (P1)

| #   | Scenariusz                                                                                           | Warstwa | Prio | Status |
| --- | ---------------------------------------------------------------------------------------------------- | ------- | ---- | ------ |
| 7.1 | Dzień i tydzień, perspektywa specjaliści i gabinety, filtr lokalizacji, wyszukiwanie                 | J, E    | P1   | 🟨     |
| 7.2 | Dostępność, wizyty z czasem po wizycie, nieobecności, zamknięte gabinety, **dni zamknięcia centrum** | J       | P1   | ✅     |
| 7.3 | Nowa wizyta i przełożenie z siatki kalendarza (wartości domyślne)                                    | J, E    | P1   | 🟨     |
| 7.4 | Widok mobilny (agenda)                                                                               | K       | P2   | 🟨     |

## 8. Klienci (P0)

| #   | Scenariusz                                                                                                                                               | Warstwa | Prio | Status                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---- | ----------------------- |
| 8.1 | Lista: wyszukiwanie, filtry, sortowanie, stronicowanie                                                                                                   | B, E    | P1   | 🟨                      |
| 8.2 | Edycja danych: nadchodzące wizyty przejmują nowe dane; adres zajęty przez innego klienta jest odrzucany                                                  | B, I, E | P0   | 🟨                      |
| 8.3 | Łączenie duplikatów: podpowiedzi (imię, telefon), przeniesienie wizyt, notatki razem, druga karta znika                                                  | B, I, E | P0   | 🟨 (sprawdzone ręcznie) |
| 8.4 | **RODO: usunięcie danych na żądanie** (dane klienta, wizyt, powiadomień, testu, notatek zamknięcia); odmowa przy wizycie przed sobą lub zaległym zwrocie | B, E    | P0   | 🟨 (sprawdzone ręcznie) |
| 8.5 | **RODO: retencja nocna** (dane po N latach, testy po M miesiącach), podgląd w ustawieniach                                                               | B       | P0   | 🟨                      |
| 8.6 | Notatka centrum widoczna tylko dla admina (nigdy dla specjalisty ani klienta)                                                                            | B       | P0   | ⬜                      |

## 9. Specjaliści (P0)

| #   | Scenariusz                                                                                        | Warstwa | Prio | Status                  |
| --- | ------------------------------------------------------------------------------------------------- | ------- | ---- | ----------------------- |
| 9.1 | Zaproszenie specjalisty: konto, rola, profil startowy **nieaktywny i niewidoczny**                | B, I, E | P0   | 🟨                      |
| 9.2 | Cztery kombinacje Aktywny / Widoczny: strona, rezerwacja online, rezerwacja przez centrum, portal | B       | P0   | ✅ (sprawdzone ręcznie) |
| 9.3 | „Widoczny” zablokowany do zatwierdzenia profilu                                                   | K       | P1   | ⬜                      |
| 9.4 | Weryfikacja profilu: zatwierdź, odeślij z powodem; powiadomienia w obie strony; porównanie zmian  | B, K, E | P0   | 🟨                      |
| 9.5 | Oferty specjalisty: włącz i wyłącz ofertę, cena widoczna na stronie                               | B, E    | P1   | 🟨                      |
| 9.6 | Adres strony (slug) z przekierowaniem starego, kolor specjalisty                                  | B, I    | P1   | 🟨                      |
| 9.7 | Grafik i przegląd tygodnia                                                                        | J       | P2   | ✅                      |

## 10. Gabinety i oferta (P1)

| #    | Scenariusz                                                                                       | Warstwa | Prio | Status |
| ---- | ------------------------------------------------------------------------------------------------ | ------- | ---- | ------ |
| 10.1 | Gabinet: dane, profil na stronie, zdjęcia (dodaj, usuń, kolejność, główne)                       | B, E    | P1   | 🟨     |
| 10.2 | Godziny otwarcia, blokady i wyjątki na siatce (**po naprawie uprawnień**)                        | B, E    | P0   | 🟨     |
| 10.3 | Usługa: czas wizyty i czas po wizycie, widoczność, rezerwacja online, katalog i kolejność w menu | B, I, E | P1   | 🟨     |
| 10.4 | Treść usługi na stronie                                                                          | E       | P2   | ⬜     |

## 11. Ustawienia (P0)

| #    | Scenariusz                                                                                                                                     | Warstwa | Prio | Status |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---- | ------ |
| 11.1 | Centrum: profil na stronie i dane firmy (NIP i REGON z sumą kontrolną), stopka strony i maili                                                  | J, I, E | P1   | 🟨     |
| 11.2 | Lokalizacje: dodaj i edytuj                                                                                                                    | I, E    | P2   | 🟨     |
| 11.3 | Rezerwacje online: każda wartość zapisuje się i działa w rezerwacji (siatka, wyprzedzenie, horyzont, blokada, zmiany, płatność, przypomnienia) | J, B    | P0   | 🟨     |
| 11.4 | Dni zamknięcia: dodaj, edytuj, usuń, święta jednym kliknięciem, ostrzeżenie o wizytach; brak terminów i odmowa zapisu w te dni                 | J, B, E | P0   | 🟨     |
| 11.5 | Dostęp: lista, nadaj i odbierz admina (nie sobie, nie ostatniemu), zaproś                                                                      | B, I, E | P0   | 🟨     |
| 11.6 | Dane osobowe: okresy retencji, podgląd                                                                                                         | J, B    | P0   | 🟨     |

## 12. Strona i CMS (P1)

| #    | Scenariusz                                                                           | Warstwa | Prio | Status                  |
| ---- | ------------------------------------------------------------------------------------ | ------- | ---- | ----------------------- |
| 12.1 | CMS strony głównej i strony Gabinety: szkic, podgląd, publikacja, odświeżenie strony | B, I, E | P1   | 🟨                      |
| 12.2 | Ogłoszenia: dodaj, edytuj, usuń; belka na stronie tylko w wybrane dni                | J, B, E | P1   | 🟨 (sprawdzone ręcznie) |
| 12.3 | E-maile: lista i podgląd każdego wariantu                                            | E       | P2   | ✅ (ręcznie)            |

## 13. Zamykanie wizyt (P1)

| #    | Scenariusz                                                                                           | Warstwa | Prio | Status                  |
| ---- | ---------------------------------------------------------------------------------------------------- | ------- | ---- | ----------------------- |
| 13.1 | Zamknięcie przez specjalistę wizyty i przez admina każdej; tylko opłacona, która się zaczęła; edycja | B, K, E | P1   | 🟨 (sprawdzone ręcznie) |
| 13.2 | Tagi tylko z listy, notatka do 300 znaków, widoczne tylko dla specjalisty wizyty i admina            | B       | P0   | 🟨                      |
| 13.3 | Powiadomienie po wizycie (raz), poranny mail, zaległości na dashboardach                             | B, I    | P1   | 🟨                      |

## 14. Komponenty i Storybook (P1)

| #    | Co                                                                                                                                                                 | Warstwa | Prio | Status |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ---- | ------ |
| 14.1 | Naprawa 3 padających stories powiadomień                                                                                                                           | K       | P0   | ⬜     |
| 14.2 | Stories dla komponentów `apps/admin` (formularze ustawień, ogłoszenia, dostęp, dni zamknięcia, RODO, łączenie klientów, zamykanie wizyt, przełączniki specjalisty) | K       | P1   | ⬜     |
| 14.3 | Testy interakcji i dostępności (a11y: `error`) w każdej story                                                                                                      | K       | P1   | 🟨     |
| 14.4 | Render po stronie serwera komponentów serwerowych (bez błędów, z danymi w HTML)                                                                                    | K       | P1   | ⬜     |
| 14.5 | Regresja wizualna (Chromatic) dla kluczowych ekranów                                                                                                               | K       | P2   | ⬜     |

## 15. Bezpieczeństwo (P0)

| #    | Co                                                                                                                           | Warstwa | Prio | Status |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- | ------- | ---- | ------ |
| 15.1 | Supabase: ochrona przed wyciekniętymi hasłami włączona                                                                       | R       | P0   | ⬜     |
| 15.2 | RLS na każdej tabeli z danymi (advisors: 5 tabel bez polityk to tabele dostępne tylko przez funkcje; potwierdzić testem 1.7) | B       | P0   | 🟨     |
| 15.3 | Nagłówki bezpieczeństwa i CSP w `apps/admin` i `apps/web`                                                                    | I, R    | P1   | ⬜     |
| 15.4 | Limity: test przed konsultacją (5 na 15 min), blokady terminów, Turnstile, zbyt częste linki do płatności                    | B, I    | P0   | 🟨     |
| 15.5 | Sekrety tylko po stronie serwera (żaden klucz sekretny w paczce przeglądarki)                                                | I       | P0   | ⬜     |
| 15.6 | Walidacja wejścia każdej akcji i trasy (Zod) z testem złych danych                                                           | I       | P0   | 🟨     |

## 16. Wydajność (P1)

| #    | Co                                                                                        | Warstwa | Prio | Status |
| ---- | ----------------------------------------------------------------------------------------- | ------- | ---- | ------ |
| 16.1 | Czas odpowiedzi stron admina na DEV (dashboard, rezerwacje, kalendarz, klient) w budżecie | R       | P1   | ⬜     |
| 16.2 | Plan zapytania `search_bookings` przy tysiącach wizyt (indeksy)                           | B       | P1   | ⬜     |
| 16.3 | Usunięcie zduplikowanego indeksu na wizytach, indeksy dla 3 kluczy obcych                 | B       | P2   | ⬜     |
| 16.4 | Lighthouse dla stron admina (dostępność ≥ 95, brak dużych przesunięć układu)              | R       | P2   | ⬜     |

## 17. Baza: testy domen do aktualizacji i dopisania (P0)

| #    | Plik                                                                                                                                                                                           | Status |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 17.1 | `booking_domain.sql`, `services_domain.sql`: usunięta kolumna `accepting_new_clients`                                                                                                          | ✅     |
| 17.2 | `specialist_domain.sql`: nowy specjalista domyślnie nieaktywny i niewidoczny                                                                                                                   | ✅     |
| 17.3 | Nowe pliki: zamknięcia centrum, przypomnienia, dostęp i role, RODO (usuwanie i retencja), łączenie klientów, archiwum, zamykanie wizyt, ogłoszenia, dane firmy, limit testu, macierz uprawnień | ⬜     |

## 18. Funkcje do dodania przed startem (MVP)

To nie są testy, tylko brakujące funkcje, które wyszły z przeglądu (każda z
własnymi testami).

| #    | Co                                                                                                                                               | Warstwa | Prio | Status |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ---- | ------ |
| 18.1 | Wizyta online: potwierdzenie, przypomnienie i strona wizyty mówią „Link do spotkania prześle Ci specjalistka przed wizytą” (dziś tylko „Online”) | J, E    | P0   | ⬜     |
| 18.2 | inFakt: dane do faktury przy rezerwacji („Chcę fakturę”: osoba lub firma, NIP, adres), walidacja NIP                                             | J, K, E | P1   | ⬜     |
| 18.3 | inFakt: faktura wystawiana automatycznie po potwierdzonej płatności, dokładnie raz (odporna na powtórzone webhooki), numer i link przy wizycie   | I, B    | P1   | ⬜     |
| 18.4 | inFakt: dokument przy zwrocie (faktura korygująca lub inny, według ustaleń z księgową)                                                           | I       | P1   | ⬜     |
| 18.5 | inFakt i KSeF: wysyłka do KSeF po stronie inFakt, status widoczny w panelu                                                                       | I, R    | P1   | ⬜     |
| 18.6 | Panel: status faktury przy wizycie, ponowienie nieudanej, lista „błędy fakturowania” w „Do zrobienia”                                            | K, E    | P1   | ⬜     |
| 18.7 | Klucz API inFakt tylko po stronie serwera; testy na koncie lub w trybie testowym inFakt                                                          | I       | P1   | ⬜     |

Do ustalenia z księgową przed 18.2–18.5: faktura do każdej płatności czy na
życzenie; stawka i podstawa zwolnienia z VAT; dokument przy zwrocie.

## 19. Po MVP (poza zakresem startu)

- Przypomnienia SMS (wkrótce po starcie).
- Wizyty cykliczne (do ustalenia z Anną).
- Kalendarz specjalisty w Google lub Apple (iCal).
- Lista oczekujących na zwolnione terminy.
- Pakiety i vouchery.

## Przed startem (bez testów, do odhaczenia)

- [ ] Ustalenia z księgową: faktury (każda płatność czy na życzenie), VAT, dokument przy zwrocie, kasa fiskalna przy płatnościach online.
- [ ] Klucz API inFakt w zmiennych środowiskowych produkcji.

- [ ] Migracje wgrane do pustego projektu produkcyjnego `wkvcdjvyoqllzzodbgau` bez błędów.
- [ ] Sekrety vault w produkcji: `site_url`, `cron_secret`; zadania cykliczne aktywne.
- [ ] Auth produkcji: adresy przekierowań portali, nadawca maili, ochrona haseł.
- [ ] Pierwsze konto administratora w produkcji.
- [ ] Zmienne środowiskowe produkcji: Supabase, `ADMIN_URL`, `SPECIALIST_URL`, `NEXT_PUBLIC_WEB_URL`, `CRON_SECRET`, Resend, Stripe live, Turnstile.
- [ ] Stripe live: klucze, webhook produkcji z właściwymi zdarzeniami, testowa płatność i zwrot na małą kwotę.
- [ ] Resend: zweryfikowana domena, próbka każdego maila na prawdziwą skrzynkę.
- [ ] Kopie zapasowe: codzienny zrzut bazy (plan darmowy nie ma automatycznych).
- [ ] Dane centrum w produkcji: firma, lokalizacja, gabinety, usługi, specjaliści, dni zamknięcia.
