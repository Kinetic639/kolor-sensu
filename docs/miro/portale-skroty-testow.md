# Kolory kartek po sprawdzeniu w kodzie (23.11.2026)

Kolory i pole „Czym sprawdzone” w kartkach tablic portalu admina i portalu specjalisty (zobacz `portal-admina/` i `portal-specjalisty/`). Kod: `develop` a419277.

Zasada (jak w legendzie i w ramce Newslettera):

- **zielony**: zrobione, a zasada z kartki jest sprawdzana testem w CI (test bazy `supabase/tests`, test jednostkowy) albo end-to-end;
- **żółty**: zrobione, ale bez testu albo test sprawdza tylko część (np. dane tak, ekran nie);
- **różowy**: nie zrobione, otwarte zgłoszenie albo nikt tego nie sprawdzał;
- szary po MVP, pomarańczowy pytanie, niebieski ustalone (bez zmian).

Skróty testów: `booking` = `supabase/tests/booking_domain.sql` (litera to sekcja testu), `access` = `access_domain.sql`, `centre` = `centre_domain.sql`, `avail` = `availability_domain.sql`, `services` = `services_domain.sql`, `specialist` = `specialist_domain.sql`; „jedn.” = test jednostkowy; „e2e” = `tests/e2e`.

Kartki, których treść zmieniłem po sprawdzeniu, mają dopisek _(zmienione)_.

## Admin

### 2. Dashboard i powiadomienia

|  Nr | Kartka                                     | Kolor   | Czym sprawdzone                                                               |
| --: | ------------------------------------------ | ------- | ----------------------------------------------------------------------------- |
|   1 | Liczby dnia i tygodnia                     | żółty   | Dane z tabel wizyt i rozliczeń (testy bazy); liczby na dashboardzie bez testu |
|   2 | Oś godzin dnia, przewijanie dni strzałkami | żółty   | Jedn. osi dnia (`day-dashboard`); strzałki bez testu                          |
|   3 | Do zrobienia: zwroty, płatności, profile   | zielony | booking AD (co centrum ma rozliczyć, raz), access G (profil do akceptacji)    |
|   4 | Zaległe zamknięcia wizyt                   | żółty   | Funkcja zaległych zamknięć bez testu bazy                                     |
|   5 | Powiadomienia na żywo                      | żółty   | booking AC (kto dostaje); odświeżanie na żywo bez testu; #60                  |
|   6 | Dzwonek: przeczytane i nieprzeczytane      | zielony | booking AC (każdy czyta swoje, otwarcie oznacza przeczytane)                  |
|   7 | Pusty dzień                                | żółty   | Tylko historia w Storybooku                                                   |
|   8 | Powiadomienie o wiadomości z formularza    | różowy  | Nie ma takiego powiadomienia; #245 otwarte                                    |

### 3. Rezerwacje: przegląda

|  Nr | Kartka                                                        | Kolor   | Czym sprawdzone                                                                |
| --: | ------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------ |
|   1 | Szukanie po numerze, kliencie, e-mailu, telefonie             | zielony | booking U (szukanie, dosłowny tekst), e2e rezerwacji widocznej w obu portalach |
|   2 | Filtry: status, płatność, specjalista, usługa, miejsce, okres | zielony | booking U i V                                                                  |
|   3 | Widoki: dziś, tydzień, minione, archiwum, do zamknięcia       | żółty   | Jedn. parametrów; reguła archiwum sprawdzona tylko ręcznie                     |
|   4 | Sortowanie, strony, stan w adresie                            | zielony | booking U (sortuje, dzieli na strony), jedn. `params`                          |
|   5 | Moje kolumny: wybór, kolejność, szerokość                     | zielony | Jedn. `columns`                                                                |
|   6 | Panel wizyty z każdego miejsca                                | żółty   | Bez testu (plan testów 2.7)                                                    |
|   7 | Panel: historia zmian i wysłane maile                         | zielony | booking W (historia z autorem, tylko baza ją pisze), V (maile, tylko admin)    |
|   8 | Status zamknięcia w panelu jak w tabeli                       | żółty   | Panel bierze status z tego samego wiersza co tabela; do obejrzenia na DEV      |
|   9 | Ankieta przed wizytą w panelu                                 | zielony | Jedn. `visit-intake`                                                           |
|  10 | Nazwisko prowadzi do karty klienta                            | żółty   | Sprawdzone ręcznie, bez testu                                                  |

### 4. Rezerwacje: zapisuje wizytę za klienta

|  Nr | Kartka                                                             | Kolor        | Czym sprawdzone                              |
| --: | ------------------------------------------------------------------ | ------------ | -------------------------------------------- |
|   1 | Nowa wizyta i link do płatności                                    | zielony      | booking X, jedn. `centre-bookings`           |
|   2 | Tylko w godzinach gabinetu (#33)                                   | zielony      | booking X (#33)                              |
|   3 | Specjalista albo gabinet zajęty, z czasem po wizycie               | zielony      | booking X, centre A                          |
|   4 | Nieobecność specjalisty, centrum zamknięte, specjalista nieaktywny | zielony      | booking X, K; centre C                       |
|   5 | Za mało czasu na płatność                                          | zielony      | booking X (link krótszy albo odmowa)         |
|   6 | Ponowne wysłanie linku                                             | zielony      | booking Z (nie częściej niż co 5 min), jedn. |
|   7 | Klient bez e-maila                                                 | zielony      | booking X (e-mail wymagany)                  |
|   8 | Zgody klienta przy wizycie centrum                                 | zielony      | booking X (zgody przy płatności)             |
|   9 | Ten sam e-mail to ta sama karta klienta _(zmienione)_              | zielony      | booking AE (jeden klient na adres)           |
|  10 | Wizyta online z dopiskiem o linku                                  | zielony      | Jedn. treści potwierdzenia                   |
|  11 | Cena 0 zł albo co najmniej 2 zł                                    | różowy       | #256 otwarte                                 |
|   ? | Klient bez e-maila: płatność na miejscu?                           | pomarańczowy |                                              |

### 5. Rezerwacje: zmienia i rozlicza

|  Nr | Kartka                                                      | Kolor        | Czym sprawdzone                                                                     |
| --: | ----------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
|   1 | Odwołanie z wybraną kwotą zwrotu                            | zielony      | booking AA, jedn. `visits`                                                          |
|   2 | Odwołanie nieopłaconej rezerwacji                           | zielony      | booking T (odwołanie centrum, mail)                                                 |
|   3 | Zwrot później, w częściach                                  | zielony      | booking AA, AB (mail przy każdym zwrocie)                                           |
|   4 | Zwrot ponad wpłatę, ujemny, nie-liczba: odmowa              | zielony      | booking AA, jedn.                                                                   |
|   5 | Częściowy zwrot centrum zostaje częściowy                   | zielony      | booking AQ                                                                          |
|   6 | Dwa okna zwracają naraz                                     | żółty        | booking AD (rozliczone raz); brak testu dwóch równoczesnych zwrotów                 |
|   7 | Zwrot zrobiony w panelu Stripe                              | zielony      | booking Q i S (zwrot zapisany ze zdarzenia Stripe, tylko w górę)                    |
|   8 | Przesunięcie wizyty                                         | zielony      | booking AA (inna godzina, gabinet, forma, nowy link)                                |
|   9 | Przesunięcie: bez zmiany, zajęty termin, przeszłość: odmowa | zielony      | booking AA                                                                          |
|  10 | Klient nie przyszedł na opłaconą wizytę                     | różowy       | Zamknięcie ma wynik „nie przyszedł”, ale zasady w regulaminie i mailach brak (#268) |
|  11 | Wizyta z kuponem odwołana przez centrum                     | różowy       | Link do kartki 4 w „Admin · Kupony zniżkowe” (różowa)                               |
|  12 | Spór o płatność (chargeback)                                | zielony      | booking AA i AB z audytu (spór w historii, powiadomienie adminów)                   |
|  13 | Faktury i korekty (inFakt)                                  | różowy       | Nie zrobione                                                                        |
|   ? | Spór o płatność: kto i jak reaguje?                         | pomarańczowy | System już powiadamia adminów; zostaje pytanie, co robią dalej                      |
|   ? | Faktura korygująca przy zwrocie?                            | pomarańczowy |                                                                                     |

### 6. Zamyka wizyty

|  Nr | Kartka                                             | Kolor | Czym sprawdzone                                     |
| --: | -------------------------------------------------- | ----- | --------------------------------------------------- |
|   1 | Zamknięcie wizyty i tagi                           | żółty | Jedn. `visit-closing` i formularza; brak testu bazy |
|   2 | Odbyła się albo klient nie przyszedł _(zmienione)_ | żółty | Dwa wyniki w kodzie; brak testu bazy                |
|   3 | Zamknięcie z kalendarza, tabeli i dashboardu       | żółty | Bez testu                                           |
|   4 | Wizyty przyszłej nie da się zamknąć                | żółty | Kod zwraca „not_closable”; brak testu bazy          |
|   5 | Poranny mail o zaległych                           | żółty | Jedn. treści maila; wybór zaległych wizyt bez testu |

### 7. Klienci

|  Nr | Kartka                                 | Kolor   | Czym sprawdzone                                                                     |
| --: | -------------------------------------- | ------- | ----------------------------------------------------------------------------------- |
|   1 | Lista i wyszukiwanie klientów          | zielony | booking AE                                                                          |
|   2 | Karta klienta: dane i wszystkie wizyty | zielony | booking AE (karta i jej wizyty)                                                     |
|   3 | Edycja danych klienta                  | zielony | booking AE (nadchodzące wizyty dostają nowe dane)                                   |
|   4 | Łączenie duplikatów                    | żółty   | Jedn. z atrapą bazy; brak testu bazy                                                |
|   5 | RODO: usunięcie na żądanie             | żółty   | Test bazy newslettera (adres znika); odmowa przy zaległym zwrocie bez testu         |
|   6 | RODO: retencja nocna                   | żółty   | Test retencji dla porzuconych rezerwacji i warsztatów; dla klientów po okresie brak |
|   7 | Notatka centrum tylko dla admina       | zielony | booking AE (specjalista nie czyta klientów)                                         |
|   8 | Skrzynka: wiadomości z formularza      | różowy  | Nie ma skrzynki w portalu; #245                                                     |

### 8. Kalendarz

|  Nr | Kartka                                         | Kolor  | Czym sprawdzone                                           |
| --: | ---------------------------------------------- | ------ | --------------------------------------------------------- |
|   1 | Dzień i tydzień, po specjalistach i gabinetach | żółty  | Jedn. `calendar-view`; brak e2e                           |
|   2 | Dyżury, nieobecności i zamknięcia widoczne     | żółty  | avail V (dane); widok bez testu                           |
|   3 | Nowa wizyta z kalendarza                       | żółty  | Zapis sprawdzony (booking X); kliknięcie w pole bez testu |
|   4 | Warsztaty w kalendarzu                         | żółty  | Bez testu w kalendarzu admina                             |
|   5 | Na telefonie mieści się w ekranie              | różowy | #93 otwarte                                               |

### 9. Specjaliści

|  Nr | Kartka                                                        | Kolor        | Czym sprawdzone                            |
| --: | ------------------------------------------------------------- | ------------ | ------------------------------------------ |
|   1 | Zaproszenie mailem                                            | zielony      | access A i E                               |
|   2 | Akceptacja albo odesłanie profilu z powodem                   | zielony      | specialist, access G                       |
|   3 | Podgląd profilu przed akceptacją                              | żółty        | Bez testu                                  |
|   4 | Adres z imienia i nazwiska (#26), zmiana adresu przekierowuje | zielony      | specialist W                               |
|   5 | Widoczny na stronie i aktywny                                 | zielony      | access F, services S                       |
|   6 | Kolor specjalisty w kalendarzu                                | zielony      | `colors_domain.sql`, jedn.                 |
|   7 | Akceptacja ofert specjalisty                                  | zielony      | services U                                 |
|   8 | Dezaktywacja z przyszłymi wizytami: ostrzeżenie               | żółty        | Ostrzeżenie z liczbą wizyt jest; bez testu |
|   ? | Blokować „Widoczny” do akceptacji?                            | pomarańczowy |                                            |
|   ? | Dezaktywacja przy przyszłych wizytach: co z nimi?             | pomarańczowy |                                            |

### 10. Gabinety

|  Nr | Kartka                                   | Kolor   | Czym sprawdzone                                                 |
| --: | ---------------------------------------- | ------- | --------------------------------------------------------------- |
|   1 | Nowy gabinet i dane                      | zielony | `rooms_domain.sql` A                                            |
|   2 | Godziny otwarcia                         | zielony | avail U, booking X (#33)                                        |
|   3 | Wyjątki (święto, remont)                 | zielony | booking J, centre B i C                                         |
|   4 | Zdjęcia: kolejność, główne, podpisy      | zielony | `room_images_domain.sql`, `room_image_captions.sql`             |
|   5 | Wyjątek na dzień z wizytami: ostrzeżenie | różowy  | Przy gabinecie brak (jest tylko przy dniach zamknięcia centrum) |

### 11. Oferta

|  Nr | Kartka                                        | Kolor   | Czym sprawdzone                             |
| --: | --------------------------------------------- | ------- | ------------------------------------------- |
|   1 | Nowa usługa: nazwa, adres z nazwy (#43), opis | zielony | services A/B, jedn.                         |
|   2 | Czas, widoczność, rezerwacja online           | zielony | services R, booking K, e2e `admin-services` |
|   3 | Kolejność usług i katalogi                    | żółty   | Jedn. z atrapą; brak testu bazy             |
|   4 | Oferty specjalistów przy usłudze              | zielony | services U                                  |
|   5 | Cena zmienia się po rezerwacji, przed zapłatą | zielony | booking AN (klient płaci starą cenę)        |
|   6 | Usługi dla firm: „Zadzwoń / napisz”           | zielony | Link do „Strona · 3”, kartka 5 (zielona)    |
|   7 | Pakiety: admin układa pakiet                  | szary   | Po MVP                                      |
|   8 | Pakiety: kto kupił i ile zostało              | szary   | Po MVP                                      |

### 14. Treści

|  Nr | Kartka                                 | Kolor   | Czym sprawdzone                                                                   |
| --: | -------------------------------------- | ------- | --------------------------------------------------------------------------------- |
|   1 | Szkic, podgląd i publikacja strony     | zielony | e2e edytora CMS, `site_content_drafts.sql`                                        |
|   2 | Włączanie i wyłączanie sekcji          | zielony | Testy bazy sekcji (`home_new_sections.sql` i inne)                                |
|   3 | Artykuł: edytor, kategorie, publikacja | —       | Link do „Strona · 4. Edukacja”                                                    |
|   4 | E-book: plik, okładka, publikacja      | —       | Link do „Strona · 4. Edukacja”                                                    |
|   5 | Ogłoszenie z datą od–do                | zielony | centre D (strona czyta tylko dzisiejsze)                                          |
|   6 | Podgląd każdego maila                  | zielony | Jedn. (bez zmian)                                                                 |
|   7 | Tylko admin zmienia treści             | żółty   | Testy CMS mają specjalistę, ale nie potwierdziłem odmowy zapisu dla każdej sekcji |

### 15. Ustawienia

|  Nr | Kartka                                                | Kolor        | Czym sprawdzone                                   |
| --: | ----------------------------------------------------- | ------------ | ------------------------------------------------- |
|   1 | Zasady rezerwacji online                              | zielony      | booking S (okno centrum, limit przesunięć)        |
|   2 | Rezerwacje online wyłączone                           | zielony      | booking K                                         |
|   3 | Dni zamknięcia i święta                               | zielony      | centre B i C, `visits_on_days` z listą wizyt      |
|   4 | Lokalizacje                                           | zielony      | `center_settings_domain.sql`, e2e API lokalizacji |
|   5 | Dane firmy w stopce i mailach                         | zielony      | centre E                                          |
|   6 | Dostęp: admini, zaproszenie, odebranie roli           | zielony      | access B i D                                      |
|   7 | Okres przechowywania danych                           | żółty        | Ustawienie i podgląd bez testu                    |
|   8 | Ostatni admin nie odbierze sobie roli                 | żółty        | Blokada w bazie jest; bez testu                   |
|   ? | Zmiana zasad odwołań po rezerwacji: które obowiązują? | pomarańczowy |                                                   |

## Specjalista

### 1. Konto i logowanie

|  Nr | Kartka                                                                | Kolor   | Czym sprawdzone                                                        |
| --: | --------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------- |
|   1 | Zaproszenie i ustawienie hasła                                        | zielony | access A, e2e logowania specjalisty                                    |
|   2 | Zły, wygasły albo użyty link zaproszenia                              | żółty   | Bez testu                                                              |
|   3 | Reset hasła                                                           | żółty   | Ekrany są; bez testu                                                   |
|   4 | Bez roli: brak dostępu                                                | zielony | e2e (specjalista nie otworzy admina, admin-specjalista ma oba portale) |
|   5 | Nieaktywny specjalista ma portal, żeby uzupełnić profil _(zmienione)_ | zielony | access A                                                               |

### 2. Dashboard

|  Nr | Kartka                            | Kolor   | Czym sprawdzone                                                               |
| --: | --------------------------------- | ------- | ----------------------------------------------------------------------------- |
|   1 | Dzisiejsze wizyty i tydzień       | żółty   | W kodzie prawdziwe dane i test widoku; #30 do sprawdzenia na DEV i zamknięcia |
|   2 | Czego brakuje w profilu i ofercie | żółty   | „Wymaga uwagi” jest; bez testu                                                |
|   3 | Zaległe zamknięcia                | żółty   | Bez testu bazy                                                                |
|   4 | Powiadomienia o rezerwacjach      | zielony | booking AC (specjalista bez kwot)                                             |

### 3. Mój kalendarz

|  Nr | Kartka                              | Kolor   | Czym sprawdzone            |
| --: | ----------------------------------- | ------- | -------------------------- |
|   1 | Moje wizyty i dyżury w tygodniu     | żółty   | Jedn. kalendarza; brak e2e |
|   2 | Zapis klienta do siebie             | zielony | booking X                  |
|   3 | Ponowne wysłanie linku do płatności | zielony | booking Z (tylko swoje)    |
|   4 | Na telefonie mieści się w ekranie   | różowy  | Nikt nie sprawdzał         |

### 4. Dostępność

|  Nr | Kartka                                                  | Kolor        | Czym sprawdzone                             |
| --: | ------------------------------------------------------- | ------------ | ------------------------------------------- |
|   1 | Szablon tygodnia pn–pt 9–17                             | zielony      | avail A–G                                   |
|   2 | Dyżur tylko w godzinach gabinetu                        | zielony      | avail U                                     |
|   3 | Wymiar tygodnia z reguł (#31)                           | zielony      | Jedn.                                       |
|   4 | Reguły co N tygodni i jednorazowe                       | żółty        | Częściowo avail; bez pełnego testu          |
|   5 | Kopiuj na kolejny dzień, ustaw na dni robocze           | zielony      | Jedn. `rule-copies`                         |
|   6 | Zmiana albo usunięcie jednego wystąpienia               | zielony      | avail M–R                                   |
|   7 | Nieobecności                                            | zielony      | booking X (odmowa przy nieobecności), avail |
|   8 | „Zarezerwowane” pokazuje prawdziwe wizyty               | różowy       | W kodzie nadal 0 (#52)                      |
|   9 | Nieobecność na dzień z wizytą: ostrzeżenie              | różowy       | Nie zrobione                                |
|   ? | Nieobecność na istniejącą wizytę: ostrzec czy blokować? | pomarańczowy |                                             |

### 5. Moje rezerwacje

|  Nr | Kartka                                             | Kolor   | Czym sprawdzone                                       |
| --: | -------------------------------------------------- | ------- | ----------------------------------------------------- |
|   1 | Tylko swoje, bez kwot                              | zielony | booking M i T, e2e rezerwacji w obu portalach         |
|   2 | Wyszukiwanie, filtry, widoki                       | żółty   | Ta sama tabela co admin; bez testu widoku specjalisty |
|   3 | Panel wizyty bez płatności                         | zielony | booking W (swoje wizyty bez pieniędzy)                |
|   4 | Zamknięcie wizyty i notatka                        | żółty   | Jedn.; brak testu bazy                                |
|   5 | Poranny mail o zaległych                           | żółty   | Jedn. treści maila                                    |
|   6 | Nie zwróci pieniędzy ani nie przesunie jak centrum | zielony | booking AA i T                                        |
|   7 | Wizyta online: przypomnienie o wysłaniu linku      | różowy  | Nie zrobione                                          |

### 6. Moi klienci

|  Nr | Kartka                               | Kolor   | Czym sprawdzone                      |
| --: | ------------------------------------ | ------- | ------------------------------------ |
|   1 | Lista i karta klienta z historią     | żółty   | Jedn. widoku; funkcja bazy bez testu |
|   2 | Tylko klienci, z którymi miał wizyty | żółty   | Bez testu bazy                       |
|   3 | Notatki tylko dla mnie i admina      | żółty   | Bez testu bazy                       |
|   4 | Notatka centrum niewidoczna          | zielony | booking AE                           |

### 8. Moje usługi i stawki

|  Nr | Kartka                            | Kolor   | Czym sprawdzone                                                   |
| --: | --------------------------------- | ------- | ----------------------------------------------------------------- |
|   1 | Usługa z katalogu z ceną          | zielony | services C–Q                                                      |
|   2 | Lista odświeża się po dodaniu     | żółty   | W kodzie odświeżanie jest; #28 do sprawdzenia na DEV i zamknięcia |
|   3 | Forma: stacjonarnie i online      | żółty   | Częściowe testy                                                   |
|   4 | Własny czas trwania               | żółty   | Pole jest; bez testu                                              |
|   5 | Cena 0 zł albo co najmniej 2 zł   | różowy  | #256                                                              |
|   6 | Oferta czeka na akceptację admina | zielony | services U i T                                                    |

### 9. Mój profil

|  Nr | Kartka                                             | Kolor   | Czym sprawdzone    |
| --: | -------------------------------------------------- | ------- | ------------------ |
|   1 | Szkic profilu zapisuje się                         | zielony | specialist, access |
|   2 | Profil wysłany do akceptacji                       | zielony | access G           |
|   3 | Odesłany z powodem                                 | zielony | specialist, access |
|   4 | Zdjęcie i kadr                                     | żółty   | Jedn. komponentów  |
|   5 | Komunikat o specjalizacji znika                    | różowy  | #29 otwarte        |
|   6 | Opublikowany profil zostaje, póki nowy szkic czeka | żółty   | Bez osobnego testu |

### 10. Ustawienia

|  Nr | Kartka                                | Kolor        | Czym sprawdzone |
| --: | ------------------------------------- | ------------ | --------------- |
|   1 | Zmiana hasła                          | różowy       | Ekran zastępczy |
|   2 | Które maile dostaję                   | różowy       | Ekran zastępczy |
|   ? | Co ma być w Ustawieniach specjalisty? | pomarańczowy |                 |

## Portale · W tle

|  Nr | Kartka                                                | Kolor   | Czym sprawdzone                                                 |
| --: | ----------------------------------------------------- | ------- | --------------------------------------------------------------- |
|   1 | Niezalogowany trafia na logowanie                     | zielony | e2e (oba portale)                                               |
|   2 | Wylogowanie czyści sesję (#44)                        | zielony | e2e                                                             |
|   3 | Specjalista nie wejdzie do admina                     | zielony | e2e                                                             |
|   4 | Każda akcja admina sprawdza rolę                      | żółty   | Bez testu (plan testów 1.9)                                     |
|   5 | Macierz uprawnień bazy                                | żółty   | Osobne testy domen; brak jednej macierzy                        |
|   6 | Specjalista nie zmieni wizyty z pominięciem aplikacji | zielony | booking T i AA                                                  |
|   7 | Każdy ekran na telefonie 390 px                       | żółty   | e2e tylko logowanie i Oferta                                    |
|   8 | Klawiatura i czytnik ekranu                           | różowy  | Brak testów w portalach                                         |
|   9 | Storybook powiadomień przechodzi (#60)                | różowy  | #60 otwarte                                                     |
|  10 | Testy e2e admina i specjalisty na DEV                 | żółty   | Logowanie, rezerwacja w obu portalach, Oferta, CMS; reszta brak |
|  11 | Po wydaniu: testy tylko do odczytu na STAGING         | żółty   | Od PR #363; nie objęły jeszcze całych portali                   |

## Podsumowanie kolorów (kartki MVP)

| Część            | Zielone | Żółte | Różowe |
| ---------------- | ------: | ----: | -----: |
| Admin 2–15       |      56 |    28 |      8 |
| Specjalista 1–10 |      21 |    18 |      8 |
| Portale · W tle  |       4 |     5 |      2 |
| Razem            |      81 |    51 |     18 |

Różowe, czyli do zrobienia: skrzynka i powiadomienie o wiadomościach z formularza (#245), cena 0 zł albo co najmniej 2 zł (#256), nieobecność klienta (#268), inFakt, kupon przy odwołaniu przez centrum, kalendarz na telefonie (#93 i u specjalisty), ostrzeżenie przy wyjątku gabinetu, #52, ostrzeżenie przy nieobecności specjalisty, przypomnienie o linku online, #29, ustawienia specjalisty (2), dostępność z klawiatury, #60.

Do zamknięcia po obejrzeniu na DEV (w kodzie wyglądają na poprawione): #28 i #30.
