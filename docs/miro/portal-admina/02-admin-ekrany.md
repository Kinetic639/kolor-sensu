# Mapa ekranów „Admin: prowadzi centrum”

Wzór: „Klient: odkrywa stronę”. Kolumny idą za menu portalu admina. Każda kolumna to ramka zarządzająca „Admin · N. Ekran” z numerowanymi sekcjami ekranu, „Po MVP”, „Ustalone” i „Pytania”; obok ramka „Admin · N · Ekran: elementy” z „Zakładając / Gdy / Wtedy” i „Czym sprawdzone”. Kolory ze sprawdzenia kodu 23.11.

Zasada podziału: ekran opisuje, co admin widzi i jak się po nim porusza. Działania z zasadami i pieniędzmi (zapis, płatność, przesunięcie, zwrot, zamknięcie, faktury) są w ścieżce „Admin: obsługuje wizytę”, a wprowadzanie specjalisty w ścieżce „nowy specjalista w centrum”. Na ekranie zostaje kartka „→ ścieżka …” w kolorze tamtej kolumny, tak jak przycisk „Umów” na stronie prowadzi do ścieżki rezerwacji.

Opis mapy: Admin prowadzi centrum: rezerwacje, klientów, zespół, gabinety, ofertę, treści strony i ustawienia.

| Kolumna                |       Sekcje MVP | Po MVP | Ustalone | Pytania | Uwagi                                                     |
| ---------------------- | ---------------: | -----: | -------: | ------: | --------------------------------------------------------- |
| 1. Dashboard           |                7 |      1 |        0 |       0 |                                                           |
| 2. Rezerwacje          |               11 |      0 |        1 |       0 |                                                           |
| 3. Klienci             |                8 |      0 |        0 |       1 |                                                           |
| 4. Kalendarz           |                6 |      1 |        0 |       0 |                                                           |
| 5. Specjaliści         |                5 |      0 |        0 |       0 | akcje w ścieżce „nowy specjalista”                        |
| 6. Gabinety            |                6 |      0 |        0 |       0 |                                                           |
| 7. Oferta              |                6 |      2 |        1 |       0 |                                                           |
| 8. Kody rabatowe       |                4 |        |          |         | istniejąca ramka „Admin · Kupony zniżkowe: elementy”      |
| 9. CMS                 |                5 |      0 |        1 |       0 | sekcje stron zostają w ramkach „Strona · …”               |
| 10. Warsztaty          |               18 |        |          |         | istniejąca ramka „Admin · Warsztaty: elementy”            |
| 11. Artykuły i E-booki | 1 (+2 odnośniki) |        |          |         | linki do ramek „Strona · 4/5 … w CMS”                     |
| 12. Ogłoszenia         |                3 |      0 |        0 |       0 |                                                           |
| 13. E-maile            |                2 |      0 |        0 |       0 |                                                           |
| 14. Newsletter         |               17 |        |          |         | istniejąca kolumna (dziś „1. Newsletter”, przenumerowana) |
| 15. Ustawienia         |               12 |      0 |        0 |       1 |                                                           |
| 16. Na każdym ekranie  |                9 |      0 |        0 |       0 |                                                           |

## Admin · 1. Dashboard

Historyjka: Jako admin chcę rano w jednym miejscu zobaczyć, co dziś się dzieje i co czeka na mnie.

|  Nr | Kartka                                   | Kolor   | Zakładając / Gdy / Wtedy                                                                                | Czym sprawdzone                                 |
| --: | ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
|   1 | Liczby dnia i tygodnia                   | żółty   | dziś 5 wizyt, 2 nieopłacone / admin otwiera dashboard / liczby zgadzają się z Rezerwacjami              | dane z testów bazy; liczby na ekranie bez testu |
|   2 | Oś godzin dnia, przewijanie dni          | żółty   | wizyty dziś i jutro / admin przechodzi strzałką na jutro / oś pokazuje jutro, liczby zostają dzisiejsze | jedn. osi dnia; strzałki bez testu              |
|   3 | Do zrobienia: zwroty, płatności, profile | zielony | jest zaległy zwrot i profil do akceptacji / dashboard / oba w „Do zrobienia” z linkiem                  | booking AD, access G                            |
|   4 | Zaległe zamknięcia                       | żółty   | → Wizyta · 5                                                                                            | brak testu bazy                                 |
|   5 | Pusty dzień                              | żółty   | dziś brak wizyt / dashboard / spokojny komunikat zamiast pustej osi                                     | tylko Storybook                                 |
|   6 | Wiadomość z formularza w „Do zrobienia”  | różowy  | klient wysłał formularz / admin otwiera dashboard / widzi nową wiadomość z linkiem                      | nie zrobione; #245                              |
|   7 | Odświeża się sam                         | żółty   | klient rezerwuje / admin ma otwarty dashboard / dane odświeżają się bez przeładowania                   | bez testu                                       |

Po MVP (szare): 8. Raporty przychodów

## Admin · 2. Rezerwacje

Historyjka: Jako admin chcę szybko znaleźć każdą wizytę i zobaczyć jej pełną historię.

Ekrany: tabela rezerwacji i panel wizyty z boku (zakładki Szczegóły, Historia, Klient).

|  Nr | Kartka                                                               | Kolor   | Zakładając / Gdy / Wtedy                                                                                     | Czym sprawdzone                                      |
| --: | -------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
|   1 | Wyszukiwarka: numer, klient, e-mail, telefon                         | zielony | wizyta 2610-001 / admin wpisuje numer albo telefon / widzi tę wizytę; „_” nie działa jak symbol wieloznaczny | booking U i AE                                       |
|   2 | Filtry: status, płatność, specjalista, usługa, miejsce, okres        | zielony | wizyty opłacone i nie / admin wybiera „nieopłacone” / tylko pasujące                                         | booking U i V                                        |
|   3 | Widoki: nadchodzące, dziś, tydzień, minione, archiwum, do zamknięcia | żółty   | wizyta odbyła się 8 dni temu / admin otwiera „Archiwum” / wizyta tam jest; z zaległym zwrotem nigdy          | jedn. parametrów; reguła archiwum sprawdzona ręcznie |
|   4 | Sortowanie, strony, stan w adresie                                   | zielony | admin sortuje po dacie, strona 2 / odświeża / widzi to samo                                                  | booking U, jedn. `params`                            |
|   5 | Moje kolumny: wybór, kolejność, szerokość                            | zielony | admin chowa kolumnę / wraca jutro / układ zostaje                                                            | jedn. `columns`                                      |
|   6 | Menu wiersza: przesuń, odwołaj, zwróć, zamknij, wyślij link          | żółty   | → Wizyta · 2–5                                                                                               | akcje sprawdzone w ścieżce; menu bez testu           |
|   7 | Panel: szczegóły i status jak w tabeli                               | żółty   | wizyta zamknięta / admin otwiera panel / status ten sam co w tabeli                                          | do obejrzenia na DEV                                 |
|   8 | Panel: historia zmian i wysłane maile                                | zielony | wizyta przełożona i opłacona / zakładka „Historia” / każda zmiana i mail z datą i autorem                    | booking W i V                                        |
|   9 | Panel: zakładka Klient                                               | żółty   | admin otwiera zakładkę / dane klienta i link do karty                                                        | bez testu                                            |
|  10 | Panel: ankieta przed wizytą                                          | zielony | klient wypełnił ankietę / admin otwiera panel / widzi odpowiedzi                                             | jedn. `visit-intake`                                 |
|  11 | Panel otwiera się z każdego miejsca                                  | żółty   | wizyta w Kalendarzu, karcie klienta, dashboardzie, powiadomieniu / klik / ten sam panel                      | bez testu                                            |

Ustalone (niebieskie): Stan tabeli (filtry, otwarty panel) trzymany w adresie, układ kolumn w ciasteczkach.

## Admin · 3. Klienci

Historyjka: Jako admin chcę mieć porządek w danych klientów i spełniać prośby RODO.

Ekrany: lista klientów i karta klienta.

|  Nr | Kartka                             | Kolor   | Zakładając / Gdy / Wtedy                                                                                 | Czym sprawdzone                                      |
| --: | ---------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
|   1 | Lista i wyszukiwanie               | zielony | admin wpisuje nazwisko albo telefon / widzi klienta i liczbę wizyt                                       | booking AE                                           |
|   2 | Karta: dane i wszystkie wizyty     | zielony | admin otwiera kartę / dane, wizyty, płatności                                                            | booking AE                                           |
|   3 | Edycja danych                      | zielony | klient zmienił e-mail / admin poprawia / nadchodzące wizyty mają nowy e-mail                             | booking AE                                           |
|   4 | Notatka centrum tylko dla admina   | zielony | admin pisze notatkę / specjalista otwiera klienta / nie widzi jej                                        | booking AE                                           |
|   5 | Łączenie duplikatów                | żółty   | ten sam klient na dwóch kartach / admin łączy / jedna karta ze wszystkimi wizytami i notatkami           | jedn. z atrapą; brak testu bazy                      |
|   6 | Usunięcie danych na żądanie (RODO) | żółty   | klient prosi o usunięcie / admin usuwa / dane znikają, także z newslettera; odmowa przy zaległym zwrocie | test bazy newslettera; odmowa przy zwrocie bez testu |
|   7 | Retencja nocna                     | żółty   | dane starsze niż okres z Ustawień / noc / usunięte                                                       | test tylko dla porzuconych rezerwacji i warsztatów   |
|   8 | Skrzynka: wiadomości z formularza  | różowy  | klient wysłał formularz / admin otwiera skrzynkę / treść, dane, „obsłużone”                              | nie ma skrzynki; #245                                |

Pytania (pomarańczowe): Skrzynka wiadomości: osobny ekran w menu czy zakładka w Klientach?

## Admin · 4. Kalendarz

Historyjka: Jako admin chcę widzieć cały tydzień centrum: kto, gdzie i kiedy.

|  Nr | Kartka                                | Kolor  | Zakładając / Gdy / Wtedy                                                         | Czym sprawdzone                         |
| --: | ------------------------------------- | ------ | -------------------------------------------------------------------------------- | --------------------------------------- |
|   1 | Dzień i tydzień                       | żółty  | wizyty w tym tygodniu / admin przełącza widok / widzi je w kolorach specjalistów | jedn. `calendar-view`; brak e2e         |
|   2 | Po specjalistach i po gabinetach      | żółty  | admin wybiera „gabinety” / kolumny gabinetów                                     | jedn.; brak e2e                         |
|   3 | Dyżury, nieobecności i dni zamknięcia | żółty  | urlop specjalisty, święto / tydzień / widać je na siatce                         | avail V (dane); widok bez testu         |
|   4 | Warsztaty w kalendarzu                | żółty  | warsztat w czwartek / tydzień / widać go z liczbą zapisanych                     | bez testu w kalendarzu admina           |
|   5 | Nowa wizyta z wolnego pola            | żółty  | → Wizyta · 1                                                                     | zapis sprawdzony; klik w pole bez testu |
|   6 | Na telefonie mieści się w ekranie     | różowy | telefon 390 px / bez przewijania w bok                                           | #93 otwarte                             |

Po MVP (szare): 7. Kalendarz Google lub Apple

## Admin · 5. Specjaliści

Historyjka: Jako admin chcę widzieć cały zespół i stan każdego specjalisty w jednym miejscu.

Ekrany: lista specjalistów i karta specjalisty. Zaproszenie, akceptacja, oferty, widoczność → ścieżka „nowy specjalista w centrum”.

|  Nr | Kartka                                                 | Kolor   | Zakładając / Gdy / Wtedy                                        | Czym sprawdzone                       |
| --: | ------------------------------------------------------ | ------- | --------------------------------------------------------------- | ------------------------------------- |
|   1 | Lista: kto aktywny, widoczny, z profilem do akceptacji | żółty   | admin otwiera Specjaliści / widzi stan każdego                  | bez testu widoku; stany z testów bazy |
|   2 | Karta: profil, oferty, dostęp                          | żółty   | admin otwiera specjalistę / widzi profil, oferty i przełączniki | bez testu                             |
|   3 | Podgląd profilu tak jak na stronie                     | żółty   | szkic czeka / admin otwiera podgląd / wygląda jak na stronie    | bez testu                             |
|   4 | Adres strony profilu i przekierowanie                  | zielony | admin zmienia adres / stary przekierowuje                       | specialist W                          |
|   5 | Kolor w kalendarzu                                     | zielony | admin zmienia kolor / kalendarz w nowym kolorze                 | `colors_domain.sql`                   |
|   6 | Zaproszenie, akceptacja, oferty, widoczność            | —       | → ścieżka „nowy specjalista w centrum”                          |                                       |

## Admin · 6. Gabinety

Historyjka: Jako admin chcę opisać gabinety i ich godziny, żeby terminy na stronie były prawdziwe.

Ekrany: lista i karta gabinetu (Przegląd, Grafik, Godziny, strona).

|  Nr | Kartka                                   | Kolor   | Zakładając / Gdy / Wtedy                                                | Czym sprawdzone                                          |
| --: | ---------------------------------------- | ------- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
|   1 | Nowy gabinet i dane                      | zielony | admin dodaje gabinet / jest w kalendarzu i kreatorze                    | `rooms_domain.sql`                                       |
|   2 | Godziny otwarcia                         | zielony | gabinet 8–18 / dyżury i wizyty tylko w tych godzinach                   | avail U, booking X                                       |
|   3 | Wyjątki: święto, remont                  | zielony | admin zamyka gabinet na dzień / brak terminów stacjonarnych             | booking J, centre B i C                                  |
|   4 | Wyjątek na dzień z wizytami: ostrzeżenie | różowy  | są 2 wizyty / admin zamyka gabinet / widzi listę wizyt do przeniesienia | nie zrobione (jest tylko przy dniach zamknięcia centrum) |
|   5 | Grafik gabinetu: kto kiedy               | żółty   | admin otwiera „Grafik” / widzi dyżury i wizyty w gabinecie              | avail V (dane); widok bez testu                          |
|   6 | Zdjęcia, kolejność, główne, podpisy      | zielony | admin zmienia kolejność / tak samo na stronie Gabinety                  | `room_images_domain.sql`, `room_image_captions.sql`      |

## Admin · 7. Oferta

Historyjka: Jako admin chcę prowadzić katalog usług, z którego specjaliści wybierają, co robią.

|  Nr | Kartka                                       | Kolor   | Zakładając / Gdy / Wtedy                                             | Czym sprawdzone                             |
| --: | -------------------------------------------- | ------- | -------------------------------------------------------------------- | ------------------------------------------- |
|   1 | Nowa usługa, adres z nazwy (#43)             | zielony | „Terapia par” / adres /oferta/terapia-par, zajęty odrzucony          | services A/B, jedn.                         |
|   2 | Czas, widoczność, rezerwacja online          | zielony | admin zmienia czas na 60 min / terminy co 60 min                     | services R, booking K, e2e `admin-services` |
|   3 | Katalogi i kolejność                         | żółty   | admin przesuwa usługę / ta sama kolejność na Ofercie i w Cenniku     | jedn. z atrapą                              |
|   4 | Oferty specjalistów przy usłudze             | zielony | usługa ma 2 specjalistów / ich ceny i formy                          | services U                                  |
|   5 | Zmiana ceny nie dotyka zrobionych rezerwacji | zielony | klient zarezerwował za 150 / admin zmienia na 180 / klient płaci 150 | booking AN                                  |
|   6 | Usługi dla firm: „Zadzwoń / napisz”          | zielony | → „Strona · 3”, kartka 5                                             | strona publiczna                            |

Po MVP (szare): 7. Pakiety: admin układa pakiet; 8. Pakiety: kto kupił i ile zostało

Ustalone (niebieskie): Cenę wizyty ustala specjalista w swojej ofercie, admin akceptuje (16.10)

## Admin · 8. Kody rabatowe

Kolumna z kartkami 1–4 z istniejącej ramki „Admin · Kupony zniżkowe: elementy” (różowe, bez zmian).

## Admin · 9. CMS

Historyjka: Jako admin chcę zmieniać treści strony bez programisty i widzieć je przed publikacją.

|  Nr | Kartka                              | Kolor   | Zakładając / Gdy / Wtedy                                                   | Czym sprawdzone                                          |
| --: | ----------------------------------- | ------- | -------------------------------------------------------------------------- | -------------------------------------------------------- |
|   1 | Zakładki stron i ustawienia wspólne | zielony | admin wybiera stronę / widzi jej sekcje                                    | e2e edytora CMS                                          |
|   2 | Szkic, podgląd, publikacja          | zielony | admin zmienia tekst / podgląd pokazuje zmianę / po publikacji strona ją ma | e2e edytora CMS, `site_content_drafts.sql`               |
|   3 | Sekcje opcjonalne: włącz i wyłącz   | zielony | admin wyłącza sekcję / znika ze strony po publikacji                       | testy bazy sekcji                                        |
|   4 | Tylko teksty, bez HTML              | zielony | admin wkleja HTML / strona pokazuje zwykły tekst                           | testy bazy i widoku sekcji                               |
|   5 | Tylko admin zapisuje                | żółty   | specjalista próbuje zapisać / odmowa                                       | testy CMS mają specjalistę; odmowa nie dla każdej sekcji |

Ustalone (niebieskie): Sekcje i nagłówki edytowalne w CMS, sama treść, bez HTML (16.10). Szczegóły sekcji każdej strony są w ramkach „Strona · …: elementy”.

## Admin · 10. Warsztaty

Kolumna z kartkami z istniejącej ramki „Admin · Warsztaty: elementy” (bez zmian).

## Admin · 11. Artykuły i E-booki

|  Nr | Kartka                                         | Kolor       | Uwagi                                                      |
| --: | ---------------------------------------------- | ----------- | ---------------------------------------------------------- |
|   1 | Artykuły: lista, edytor, kategorie, publikacja | jak w ramce | → „Strona · 4 · Tworzenie i publikacja artykułu: elementy” |
|   2 | E-booki: plik, okładka, publikacja             | jak w ramce | → „Strona · 5 · E-booki w CMS: elementy”                   |
|   3 | Specjalista nie publikuje treści               | żółty       | bez osobnego testu                                         |

## Admin · 12. Ogłoszenia

|  Nr | Kartka                  | Kolor   | Zakładając / Gdy / Wtedy                                                 | Czym sprawdzone        |
| --: | ----------------------- | ------- | ------------------------------------------------------------------------ | ---------------------- |
|   1 | Ogłoszenie z datą od–do | zielony | ogłoszenie na jutro / klient wchodzi jutro / widzi belkę; po dacie znika | centre D               |
|   2 | Lista i usunięcie       | żółty   | admin usuwa ogłoszenie / belka znika                                     | jedn.; widok bez testu |
|   3 | Jedno ogłoszenie naraz  | zielony | dwa ogłoszenia na ten sam dzień / strona pokazuje jedno                  | centre D               |

## Admin · 13. E-maile

|  Nr | Kartka                    | Kolor   | Zakładając / Gdy / Wtedy                              | Czym sprawdzone |
| --: | ------------------------- | ------- | ----------------------------------------------------- | --------------- |
|   1 | Podgląd każdego maila     | zielony | admin wybiera rodzaj maila / podgląd taki jak wysłany | jedn.           |
|   2 | Dane firmy w stopce maili | zielony | → Admin · 15, kartka 5                                | centre E        |

## Admin · 14. Newsletter

Istniejąca kolumna „Admin · 1. Newsletter” z 17 kartkami, przenumerowana na 14 (tytuł ramki, nagłówek w mapie i dopiski „(1. Newsletter)” przy 17 kartkach).

## Admin · 15. Ustawienia

Historyjka: Jako admin chcę ustawić zasady centrum raz, a system ma ich pilnować wszędzie.

Zakładki: Centrum, Lokalizacje, Rezerwacje online, Dni zamknięcia, Dostęp, Dane osobowe.

|  Nr | Kartka                                                              | Kolor   | Zakładając / Gdy / Wtedy                                                 | Czym sprawdzone                                   |
| --: | ------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------ | ------------------------------------------------- |
|   1 | Centrum: nazwa, opis, kontakt                                       | żółty   | admin zmienia telefon / strona i maile mają nowy                         | bez testu widoku                                  |
|   2 | Lokalizacje                                                         | zielony | druga lokalizacja / filtr w kreatorze                                    | `center_settings_domain.sql`, e2e API lokalizacji |
|   3 | Rezerwacje online: okno odwołań, przesunięcia, wyprzedzenie, siatka | zielony | okno odwołań 24 h / klient odwołuje / obowiązuje nowe okno               | booking S, centre G                               |
|   4 | Rezerwacje online wyłączone                                         | zielony | admin wyłącza / kreator pokazuje kontakt                                 | booking K                                         |
|   5 | Dane firmy w stopce i mailach                                       | zielony | NIP i adres / stopka strony i maili                                      | centre E                                          |
|   6 | Przypomnienia: kiedy idą                                            | zielony | admin ustawia 24 h / przypomnienie idzie dzień przed                     | centre F                                          |
|   7 | Dni zamknięcia i święta                                             | zielony | Boże Narodzenie / brak terminów                                          | centre B i C                                      |
|   8 | Dzień zamknięcia z wizytami: lista                                  | zielony | są wizyty / admin dodaje dzień zamknięcia / widzi listę do przeniesienia | `visits_on_days`, jedn.                           |
|   9 | Dostęp: admini, zaproszenie, odebranie roli                         | zielony | admin odbiera rolę / osoba traci dostęp                                  | access B i D                                      |
|  10 | Ostatni admin nie odbierze sobie roli                               | żółty   | jedyny admin / odbiera rolę / odmowa                                     | blokada w bazie; bez testu                        |
|  11 | Dane osobowe: okres przechowywania                                  | żółty   | admin ustawia 3 lata / retencja z tym okresem, podgląd ile zniknie       | bez testu                                         |
|  12 | Tylko admin zmienia ustawienia                                      | zielony | specjalista próbuje / odmowa                                             | centre B, `center_settings_domain.sql`            |

Pytania (pomarańczowe): Zmiana zasad odwołań po rezerwacji: które obowiązują?

## Admin · 16. Na każdym ekranie

|  Nr | Kartka                                      | Kolor   | Zakładając / Gdy / Wtedy                                          | Czym sprawdzone                                  |
| --: | ------------------------------------------- | ------- | ----------------------------------------------------------------- | ------------------------------------------------ |
|   1 | Logowanie i błędne hasło                    | zielony | admin wpisuje hasło / poprawne: dashboard, błędne: komunikat      | e2e `auth`                                       |
|   2 | Niezalogowany trafia na logowanie           | zielony | ktoś otwiera adres portalu / logowanie                            | e2e                                              |
|   3 | Reset hasła                                 | żółty   | admin zapomniał hasła / mail, nowe hasło                          | ekrany są; bez testu                             |
|   4 | Bez roli admina: brak dostępu               | zielony | specjalista otwiera admina / strona braku dostępu                 | e2e                                              |
|   5 | Wylogowanie (#44)                           | zielony | admin klika „Wyloguj” / wraca do logowania                        | e2e                                              |
|   6 | Menu i dolny pasek na telefonie             | żółty   | telefon 390 px / menu w dolnym pasku                              | e2e logowania i Oferty; reszta ekranów bez testu |
|   7 | Dzwonek: powiadomienia na żywo, przeczytane | zielony | klient rezerwuje / admin widzi powiadomienie, oznacza przeczytane | booking AC                                       |
|   8 | Klawiatura i czytnik ekranu                 | różowy  | admin używa tylko klawiatury / każdy ekran do obsłużenia          | brak testów                                      |
|   9 | Storybook powiadomień przechodzi (#60)      | różowy  | testy Storybooka / 3 historie nie przechodzą                      | #60 otwarte                                      |
