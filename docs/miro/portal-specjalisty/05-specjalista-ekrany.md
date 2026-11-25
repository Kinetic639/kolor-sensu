# Mapa ekranów „Specjalista: pracuje w portalu” (nowa sekcja)

Wzór jak „Admin: prowadzi centrum”: kolumny idą za menu portalu specjalisty, w każdej ramka zarządzająca „Specjalista · N. Ekran” z numerowanymi sekcjami i ramka „elementy”. Działania z zasadami są w ścieżkach: wprowadzenie (profil, usługi) w „nowy specjalista w centrum”, praca z wizytą w „Specjalista: prowadzi wizytę”.

Opis mapy: Specjalista widzi swój dzień, ustawia dyżury, prowadzi swoje wizyty i klientów, swój profil i ofertę. Wszędzie tylko swoje dane i bez kwot.

| Kolumna                 |      Sekcje MVP | Po MVP | Pytania | Uwagi                                                |
| ----------------------- | --------------: | -----: | ------: | ---------------------------------------------------- |
| 1. Dashboard            |               4 |      0 |       0 |                                                      |
| 2. Mój kalendarz        |               5 |      1 |       0 |                                                      |
| 3. Dostępność           |               9 |      0 |       1 |                                                      |
| 4. Moje rezerwacje      |               6 |      0 |       0 |                                                      |
| 5. Moi klienci          |               4 |      0 |       0 |                                                      |
| 6. Moje warsztaty       |               5 |        |         | istniejąca ramka „Specjalista · Warsztaty: elementy” |
| 7. Moje usługi i stawki | 1 (+1 odnośnik) |      0 |       0 | reszta w ścieżce „nowy specjalista”, krok 5          |
| 8. Mój profil           | 1 (+1 odnośnik) |      0 |       0 | reszta w ścieżce „nowy specjalista”, kroki 3–4       |
| 9. Ustawienia           |               2 |      0 |       1 |                                                      |
| 10. Na każdym ekranie   |               7 |      0 |       0 |                                                      |

## Specjalista · 1. Dashboard

Historyjka: Jako specjalista chcę od razu zobaczyć swój dzień i to, co wymaga mojej uwagi.

|  Nr | Kartka                                           | Kolor  | Zakładając / Gdy / Wtedy                                                          | Czym sprawdzone                                     |
| --: | ------------------------------------------------ | ------ | --------------------------------------------------------------------------------- | --------------------------------------------------- |
|   1 | Dzisiejszy grafik                                | żółty  | 2 wizyty dziś / dashboard / prawdziwe wizyty, bez tekstów zastępczych             | test widoku; #30 do sprawdzenia na DEV i zamknięcia |
|   2 | Wymaga uwagi: profil, oferta, zaległe zamknięcia | żółty  | brak zdjęcia i wczorajsza niezamknięta wizyta / dashboard / obie rzeczy z linkami | bez testu                                           |
|   3 | Dostępność w tym tygodniu                        | różowy | 2 wizyty w tygodniu / dashboard / godziny dyżurów i zajęte                        | ta sama liczba co #52, dziś 0                       |
|   4 | Pusty dzień                                      | żółty  | brak wizyt / „Brak wizyt na dziś”                                                 | tylko Storybook                                     |

## Specjalista · 2. Mój kalendarz

|  Nr | Kartka                                     | Kolor   | Zakładając / Gdy / Wtedy                       | Czym sprawdzone            |
| --: | ------------------------------------------ | ------- | ---------------------------------------------- | -------------------------- |
|   1 | Moje wizyty, dyżury i warsztaty w tygodniu | żółty   | specjalista otwiera kalendarz / tylko swoje    | jedn. kalendarza; brak e2e |
|   2 | Kto ma który gabinet                       | zielony | gabinet zajęty przez innego / widzi, kto go ma | avail V                    |
|   3 | Zapis klienta do siebie                    | zielony | → „Specjalista: prowadzi wizytę”, krok 2       | booking X                  |
|   4 | Panel wizyty z kalendarza                  | żółty   | klik w wizytę / panel bez płatności            | bez testu                  |
|   5 | Na telefonie mieści się w ekranie          | różowy  | telefon 390 px / bez przewijania w bok         | nikt nie sprawdzał         |

Po MVP (szare): 6. Kalendarz Google lub Apple

## Specjalista · 3. Dostępność

Historyjka: Jako specjalista chcę ustawić swoje dyżury, żeby klienci mogli rezerwować wolne terminy.

|  Nr | Kartka                                        | Kolor   | Zakładając / Gdy / Wtedy                                             | Czym sprawdzone     |
| --: | --------------------------------------------- | ------- | -------------------------------------------------------------------- | ------------------- |
|   1 | Szablon tygodnia pn–pt 9–17                   | zielony | gabinet 8–18 / specjalista stosuje szablon / terminy co godzinę 9–16 | avail A–G           |
|   2 | Dyżur tylko w godzinach gabinetu              | zielony | gabinet do 18 / dyżur do 20 / odmowa                                 | avail U             |
|   3 | Reguły co N tygodni i jednorazowe             | żółty   | dyżur co 2 tygodnie / terminy co drugi tydzień                       | częściowo avail     |
|   4 | Kopiuj na kolejny dzień, ustaw na dni robocze | zielony | kopiuje regułę / reguła w kolejnym dniu                              | jedn. `rule-copies` |
|   5 | Zmiana albo usunięcie jednego wystąpienia     | zielony | zmienia jeden piątek / reszta bez zmian                              | avail M–R           |
|   6 | Nieobecności                                  | zielony | urlop / brak terminów w te dni                                       | avail, booking X    |
|   7 | Wymiar tygodnia z reguł (#31)                 | zielony | pn–pt 9–17 / 40 godz. / tydz.                                        | jedn.               |
|   8 | „Zarezerwowane” pokazuje prawdziwe wizyty     | różowy  | 2 wizyty w tygodniu / licznik je pokazuje                            | #52 otwarte         |
|   9 | Nieobecność na dzień z wizytą: ostrzeżenie    | różowy  | wizyta w piątek / specjalista dodaje urlop / ostrzeżenie z listą     | nie zrobione        |

Pytania (pomarańczowe): Nieobecność na dzień z wizytą: ostrzec czy blokować?

## Specjalista · 4. Moje rezerwacje

|  Nr | Kartka                                            | Kolor   | Zakładając / Gdy / Wtedy                                           | Czym sprawdzone                               |
| --: | ------------------------------------------------- | ------- | ------------------------------------------------------------------ | --------------------------------------------- |
|   1 | Tabela: tylko moje, bez kwot                      | zielony | klient zarezerwował / specjalista widzi wizytę; cudzych i kwot nie | booking M i T, e2e rezerwacji w obu portalach |
|   2 | Wyszukiwarka, filtry, widoki                      | żółty   | jak u admina, bez filtra płatności                                 | ta sama tabela; widok specjalisty bez testu   |
|   3 | Panel: szczegóły, historia, klient, bez płatności | zielony | specjalista otwiera wizytę / historia bez kwot                     | booking W                                     |
|   4 | Panel: ankieta przed wizytą                       | zielony | klient wypełnił ankietę / specjalista ją widzi                     | jedn. `visit-intake`                          |
|   5 | Widok „do zamknięcia”                             | żółty   | wczoraj niezamknięta / widok „do zamknięcia” / jest tam            | bez testu bazy                                |
|   6 | Zamknięcie wizyty                                 | żółty   | → „Specjalista: prowadzi wizytę”, krok 5                           |                                               |

## Specjalista · 5. Moi klienci

|  Nr | Kartka                               | Kolor   | Zakładając / Gdy / Wtedy                                     | Czym sprawdzone                      |
| --: | ------------------------------------ | ------- | ------------------------------------------------------------ | ------------------------------------ |
|   1 | Lista i karta klienta z historią     | żółty   | specjalista miał wizyty z klientką / widzi ją i swoje wizyty | jedn. widoku; funkcja bazy bez testu |
|   2 | Tylko klienci, z którymi miał wizyty | żółty   | otwiera cudzego klienta / odmowa                             | bez testu bazy                       |
|   3 | Moje notatki z wizyt                 | żółty   | pisał notatki przy zamknięciu / widzi je na karcie           | bez testu bazy                       |
|   4 | Notatka centrum niewidoczna          | zielony | admin pisze notatkę centrum / specjalista jej nie widzi      | booking AE                           |

## Specjalista · 6. Moje warsztaty

Kolumna z kartkami 1–5 z istniejącej ramki „Specjalista · Warsztaty: elementy” (zielone, bez zmian).

## Specjalista · 7. Moje usługi i stawki

|  Nr | Kartka                                 | Kolor | Zakładając / Gdy / Wtedy                           | Czym sprawdzone  |
| --: | -------------------------------------- | ----- | -------------------------------------------------- | ---------------- |
|   1 | Lista moich usług ze stanem akceptacji | żółty | 2 usługi, jedna czeka / lista pokazuje stan każdej | bez testu widoku |
|   2 | Dodawanie i zmiana usługi              | —     | → „nowy specjalista w centrum”, krok 5             |                  |

## Specjalista · 8. Mój profil

|  Nr | Kartka                                             | Kolor | Zakładając / Gdy / Wtedy                                          | Czym sprawdzone                      |
| --: | -------------------------------------------------- | ----- | ----------------------------------------------------------------- | ------------------------------------ |
|   1 | Stan profilu: szkic, czeka, opublikowany, odesłany | żółty | profil odesłany / specjalista otwiera profil / widzi stan i powód | stany z testów bazy; widok bez testu |
|   2 | Edycja i wysłanie                                  | —     | → „nowy specjalista w centrum”, kroki 3–4                         |                                      |

## Specjalista · 9. Ustawienia

|  Nr | Kartka              | Kolor  | Zakładając / Gdy / Wtedy                            | Czym sprawdzone |
| --: | ------------------- | ------ | --------------------------------------------------- | --------------- |
|   1 | Zmiana hasła        | różowy | specjalista zmienia hasło / stare przestaje działać | ekran zastępczy |
|   2 | Które maile dostaję | różowy | wyłącza poranny mail / nie dostaje go               | ekran zastępczy |

Pytania (pomarańczowe): Co ma być w Ustawieniach specjalisty? Dziś to pusty ekran.

## Specjalista · 10. Na każdym ekranie

|  Nr | Kartka                                            | Kolor   | Zakładając / Gdy / Wtedy                                       | Czym sprawdzone     |
| --: | ------------------------------------------------- | ------- | -------------------------------------------------------------- | ------------------- |
|   1 | Logowanie i wylogowanie                           | zielony | specjalista loguje się i wylogowuje                            | e2e `auth`          |
|   2 | Niezalogowany trafia na logowanie                 | zielony | ktoś otwiera adres portalu / logowanie                         | e2e                 |
|   3 | Reset hasła                                       | żółty   | zapomniał hasła / mail, nowe hasło                             | bez testu           |
|   4 | Do admina nie wejdzie                             | zielony | specjalista otwiera portal admina / brak dostępu               | e2e                 |
|   5 | Dzwonek: powiadomienia o moich wizytach, bez kwot | zielony | klient rezerwuje / specjalista widzi powiadomienie             | booking AC          |
|   6 | Menu na telefonie                                 | żółty   | telefon 390 px / dolny pasek                                   | e2e tylko logowanie |
|   7 | Klawiatura i czytnik ekranu                       | różowy  | specjalista używa tylko klawiatury / każdy ekran do obsłużenia | brak testów         |
