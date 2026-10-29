# Miro: kopia ramek „Klient: umawia wizytę”

Mapa rezerwacji i jej dziesięć kolumn (1–9 i 4a), stan na 29.10.2026 (plik SVG to dokładny odczyt tablicy z tego dnia, z identyfikatorami wszystkich elementów). Każda kolumna ma ramkę zarządzającą i ramki „elementy”, jak sekcja strony publicznej. Karteczki są numerowane w obrębie kolumny, przez wszystkie jej ramki, a mapa ma kopię każdej z tym samym numerem. Wszystkie karteczki MVP są różowe: 27.10 sprawdzamy je od nowa, kartka po kartce. Plik `svg/klient-rezerwacja.svg`.

Mapa: ramka `3458764687137671334` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764687137671334)

| Kolumna                          | MVP | Nowe 27.10 | Po MVP | Ustalone | Pytania |
| -------------------------------- | --: | ---------: | -----: | -------: | ------: |
| 1. Wybiera usługę i termin       |  28 |         12 |      2 |        2 |       0 |
| 2. Blokuje termin                |   8 |          4 |      0 |        1 |       0 |
| 3. Podaje dane i zgody           |  16 |          9 |      0 |        4 |       0 |
| 4. Płaci od razu                 |  20 |          5 |      1 |        3 |       0 |
| 4a. Kupon zniżkowy               |  12 |          0 |      1 |        6 |       0 |
| 5. Płaci później                 |  13 |          1 |      0 |        1 |       0 |
| 6. Potwierdzenie i strona wizyty |  10 |          7 |      1 |        0 |       0 |
| 7. Przekłada wizytę              |   6 |          3 |      0 |        2 |       0 |
| 8. Odwołuje wizytę               |   8 |          2 |      0 |        3 |       0 |
| 9. Próby obejścia i oszustwa     |  24 |          9 |      0 |        0 |       0 |
| Razem                            | 145 |         52 |      5 |       22 |       0 |

## Klient · 1. Wybiera usługę i termin

Ramka `3458764688511550411` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688511550411)

Historyjka: Jako klient chcę szybko znaleźć usługę, specjalistę i wolny termin, który mi pasuje.

### Usługa, forma i specjalista

Ramka `3458764688511550412`

|  Nr | Karteczka                                                                         | Zakładając / Gdy / Wtedy                                                                                                                                                                 | Wcześniej                                                                                                            |
| --: | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
|   1 | Rezerwacja online wyłączona przez centrum: komunikat i kontakt                    | admin wyłączył rezerwacje online w ustawieniach / klient otwiera „Umów wizytę” / widzi komunikat i dane kontaktowe centrum zamiast kreatora                                              | nowa kartka                                                                                                          |
|   2 | „Umów” ze strony usługi lub specjalisty otwiera kreator z tym wyborem             | klient jest na stronie usługi albo profilu specjalisty / klika „Umów wizytę” / kreator otwiera się z wybraną usługą albo specjalistą                                                     | nowa kartka                                                                                                          |
|   3 | Cena i czas wizyty widoczne przy wyborze                                          | usługa 50 min za 150 zł / klient wybiera usługę i specjalistę / widzi cenę i czas trwania, zanim wybierze termin                                                                         | nowa kartka                                                                                                          |
|   4 | Ta sama usługa u różnych specjalistów: cena wybranej osoby                        | dwie specjalistki prowadzą usługę w różnych cenach / klient wybiera jedną z nich / kreator, podsumowanie i płatność pokazują jej cenę                                                    | nowa kartka                                                                                                          |
|   5 | Tylko formy, które specjalista prowadzi                                           | specjalista prowadzi usługę tylko online / klient go wybiera / kreator nie proponuje wizyty stacjonarnej                                                                                 | nowa kartka                                                                                                          |
|   6 | Usługa wyłączona albo specjalista nieaktywny: jego terminów nie ma                | admin wyłącza usługę / klient otwiera kreator / usługi i jej terminów nie ma                                                                                                             | Test bazy danych i test jednostkowy (CI)                                                                             |
|   7 | Filtr lokalizacji                                                                 | dwie lokalizacje centrum / klient wybiera jedną / widzi tylko terminy w jej gabinetach                                                                                                   | Test bazy danych i test jednostkowy (CI)                                                                             |
|   8 | Ankieta przed wizytą (gdy usługa jej wymaga)                                      | usługa wymaga ankiety / klient ją wybiera / najpierw ankieta, potem reszta kreatora                                                                                                      | Testy jednostkowe; test end-to-end (PR #262)                                                                         |
|   9 | Ankieta: przy nastroju 0 numery pomocy zamiast rezerwacji                         | klient w ankiecie zaznacza nastrój 0 / chce przejść dalej / widzi numery pomocy (112, 116 123), każdy dzwoni po kliknięciu; rezerwacja nie idzie dalej                                   | nowa kartka                                                                                                          |
|  10 | Rezerwacja pamięta moje wybory                                                    | klient wybrał usługę, specjalistę i termin / wychodzi na stronę główną i wraca / wybory są na miejscu                                                                                    | Pamięta usługę, specjalistę, formę, miejsce i tydzień przez dobę, nigdy godzinę ani danych (#164); testy jednostkowe |
|  11 | Nagłówek: „Dokończ rezerwację” prowadzi tam, gdzie klient przerwał                | klient zaczął rezerwację i wyszedł na inną stronę / patrzy na nagłówek strony / widzi „Dokończ rezerwację”, który prowadzi do kroku, na którym przerwał                                  | Historyjka z ramki „Krok 1 · Sesja rezerwacji”                                                                       |
|  12 | Zmiana specjalisty nie kasuje usługi, formy i gabinetu                            | klient wybrał usługę, formę i gabinet / zmienia specjalistę / pozostałe wybory zostają                                                                                                   | Historyjka z ramki „Krok 1 · Sesja rezerwacji”                                                                       |
|  13 | Nowy specjalista nie pasuje do formy: klient widzi, co wybrać ponownie i dlaczego | klient wybrał wizytę stacjonarną / zmienia specjalistę na takiego, który przyjmuje tylko online / komunikat, co trzeba wybrać ponownie i dlaczego                                        | Historyjka z ramki „Krok 1 · Sesja rezerwacji”                                                                       |
|  14 | Powrót po wygaśnięciu blokady: wybory są, termin od nowa                          | klient wybrał termin i wyszedł na dłużej niż 10 minut / wraca do rezerwacji / usługa, specjalista i forma są wybrane, termin wybiera jeszcze raz                                         | Historyjka z ramki „Krok 1 · Sesja rezerwacji”                                                                       |
|  15 | „Zacznij od nowa” czyści wybory i od razu zwalnia termin                          | klient ma rozpoczętą rezerwację z zablokowanym terminem / klika „Zacznij od nowa” / wybory znikają, a termin od razu wraca do wolnych                                                    | Historyjka z ramki „Krok 1 · Sesja rezerwacji”                                                                       |
|  16 | Kreator na telefonie, z klawiatury i z czytnikiem ekranu                          | klient ma telefon, używa tylko klawiatury albo czytnika ekranu / przechodzi wszystkie kroki kreatora / każdy krok ma jeden nagłówek, da się go przejść i nie ma błędów dostępności (axe) | nowa kartka                                                                                                          |

### Wolne terminy

Ramka `3458764688511550413`

|  Nr | Karteczka                                                | Zakładając / Gdy / Wtedy                                                                                                                                              | Wcześniej                                                      |
| --: | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
|  17 | Terminy z grafiku specjalisty                            | dyżur pn–pt 9–17, usługa 50 min / klient wybiera tę specjalistkę / terminy co godzinę 9:00–16:00                                                                      | Test bazy danych i test jednostkowy (CI); ręcznie na DEV 01.10 |
|  18 | Ten sam termin stacjonarnie i online                     | dyżur „stacjonarnie i online” / klient wybiera formę / ten sam termin widać w obu formach                                                                             | Test bazy danych (CI)                                          |
|  19 | Usługa 90 minut: terminy uwzględniają jej długość        | dyżur 9–12, usługa 90 min / klient przegląda dzień / nie ma terminu, który kończy się po 12:00                                                                        | nowa kartka                                                    |
|  20 | Po wizycie jest przerwa: następny termin dopiero po niej | wizyta 10:00–10:50 i 10 min przerwy / klient szuka terminu tego dnia / następny najwcześniej o 11:00                                                                  | Test bazy danych (CI)                                          |
|  21 | Nieobecność ukrywa terminy                               | specjalistka ma urlop w piątek / klient przegląda piątek / brak terminów tej specjalistki                                                                             | Test bazy danych (CI)                                          |
|  22 | Zamknięty gabinet ukrywa terminy                         | gabinet zamknięty w środę / klient przegląda środę / brak terminów stacjonarnych, online zostają                                                                      | Test bazy danych (CI)                                          |
|  23 | Centrum zamknięte w święto: tego dnia nie ma terminów    | admin oznaczył dzień zamknięcia centrum / klient przegląda ten dzień / nie ma żadnych terminów                                                                        | nowa kartka                                                    |
|  24 | Wyprzedzenie i horyzont                                  | minimum 2 h wyprzedzenia, horyzont ustawiony przez admina (domyślnie 60 dni) / klient szuka za godzinę albo dalej niż horyzont / takich terminów nie ma               | Test bazy danych i test jednostkowy (CI)                       |
|  25 | Zmiana czasu w marcu i październiku                      | dyżur 9–17 w tygodniu zmiany czasu / klient przegląda ten tydzień / godziny dalej 9–17 czasu polskiego                                                                | Test bazy danych (PR #262)                                     |
|  26 | Brak wolnych terminów: najbliższy wolny albo kontakt     | w wybranym tygodniu nie ma wolnych terminów / klient patrzy na kalendarz / widzi najbliższy wolny termin, a gdy nie ma żadnego w horyzoncie, kontakt z centrum (#246) | nowa kartka                                                    |
|  27 | Godziny zawsze w czasie polskim                          | klient jest za granicą, w innej strefie czasowej / przegląda terminy / godziny są czasu polskiego i strona to mówi                                                    | nowa kartka                                                    |
|  28 | Termin zniknął, zanim klient go kliknął                  | klient długo patrzy na listę, ktoś inny zajął termin / klient go klika / komunikat „termin już zajęty” i odświeżona lista, bez błędu                                  | nowa kartka                                                    |

### Po MVP (szare)

- 29. Lista oczekujących na terminy
- 30. Wizyty cykliczne

### Ustalone (niebieskie)

- Rozpoczętą rezerwację pamiętamy przez dobę (#164)
- Bez ostrzeżenia przy wyjściu z kreatora: blokada mija po 10 min, a „Dokończ rezerwację” prowadzi z powrotem (27.10)

## Klient · 2. Blokuje termin

Ramka `3458764688511550414` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688511550414)

Historyjka: Jako klient chcę, żeby wybrany termin czekał na mnie, aż podam dane i zapłacę.

### Blokada terminu

Ramka `3458764688511550415`

|  Nr | Karteczka                                            | Zakładając / Gdy / Wtedy                                                                                                                             | Wcześniej                                               |
| --: | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
|   1 | Blokada terminu na 10 min                            | wolny termin w piątek 10:00 / klient go wybiera / termin znika dla innych na 10 min, rezerwacja dostaje numer                                        | Test bazy danych (CI); ręcznie na DEV 01.10             |
|   2 | Klient widzi, do której godziny termin jest trzymany | termin zablokowany / klient jest na kroku danych albo płatności / widzi godzinę, do której termin czeka, i co zrobić przed nią                       | nowa kartka                                             |
|   3 | Dwie osoby, ten sam termin                           | dwie osoby na tym samym terminie / klikają w tej samej chwili / jedna dostaje termin, druga „termin zajęty”                                          | Test bazy sprawdza regułę; brak testu prawdziwego tłoku |
|   4 | Blokada wygasa, termin wraca                         | klient wybrał termin i nic nie robi / mija 10 minut / termin wraca do wolnych                                                                        | Test bazy danych (CI)                                   |
|   5 | Wstecz w kreatorze zwalnia termin                    | termin zablokowany / klient klika „Wstecz” (także dwa razy) / termin od razu wolny, drugi raz nic się nie dzieje                                     | Test bazy danych (CI)                                   |
|   6 | „Zmień termin” w trakcie zwalnia poprzedni           | klient ma zablokowany termin i jest na kroku danych / klika „Zmień termin” i wybiera inny / poprzedni termin wraca do wolnych, nowy jest zablokowany | nowa kartka                                             |
|   7 | Kreator w dwóch kartach tej samej przeglądarki       | klient otworzył kreator w dwóch kartach / w każdej wybiera inny termin / obowiązuje jedna rezerwacja i klient wie którą; nic się nie psuje           | nowa kartka                                             |
|   8 | Przeglądarka blokuje ciasteczka                      | przeglądarka nie zapisuje ciasteczek / klient wybiera termin / komunikat, że rezerwacja potrzebuje niezbędnych ciasteczek, i kontakt                 | nowa kartka                                             |

### Ustalone (niebieskie)

- Turnstile nie odpowiada: komunikat „spróbuj za chwilę” i telefon do centrum; bez ochrony rezerwacja nie przechodzi (27.10)

## Klient · 3. Podaje dane i zgody

Ramka `3458764688511550416` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688511550416)

Historyjka: Jako klient chcę podać tylko potrzebne dane i wiedzieć, na co się zgadzam.

### Dane i zgody

Ramka `3458764688511550417`

|  Nr | Karteczka                                                                     | Zakładając / Gdy / Wtedy                                                                                                                                                          | Wcześniej                                                                               |
| --: | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
|   1 | Dane i obie zgody zapisane                                                    | poprawne dane i obie zgody / klient przechodzi dalej / dane i czas zgód zapisane                                                                                                  | Test bazy danych i test jednostkowy (CI); ręcznie 01.10                                 |
|   2 | Bez zgody nie przejdzie                                                       | brak zgody na regulamin / klient klika „Dalej” / odmowa z komunikatem przy polu                                                                                                   | Test bazy danych i test jednostkowy (CI)                                                |
|   3 | Zły e-mail lub telefon                                                        | e-mail bez @ / klient klika „Dalej” / komunikat, wpisane pola zostają                                                                                                             | Test bazy danych i test jednostkowy (CI)                                                |
|   4 | #24 · Zgody nie świecą błędem na starcie                                      | klient otwiera krok danych / jeszcze nic nie zrobił / zgody nie są oznaczone jako błąd                                                                                            | Naprawione (#24); test formularza danych (PR #258)                                      |
|   5 | #25 · Komunikat na kroku danych pasuje do kroku                               | klient jest na kroku danych / patrzy na podsumowanie / „Podaj swoje dane i potwierdź wizytę przed tym czasem”, bez mylącego „Przejdź dalej”                                       | Naprawione; test komponentu (CI); #25 zamknięte                                         |
|   6 | Długie pola, emoji                                                            | imię ze 101 znaków albo z emoji / klient wysyła dane / limit długości z komunikatem; emoji i polskie litery zapisane tak, jak wpisane                                             | Limity: imię i nazwisko po 100, e-mail 320, uwagi 1000 znaków; test kontraktu (PR #258) |
|   7 | Dane wysłane po wygaśnięciu blokady: prośba o nowy termin                     | blokada wygasła / klient wysyła dane / prośba o wybór terminu od nowa                                                                                                             | Test bazy danych (CI)                                                                   |
|   8 | Powrót do zmiany terminu zachowuje dane, zgody od nowa                        | klient podał dane i wraca zmienić termin / wybiera nowy termin / imię, e-mail i telefon zostają, zgody trzeba zaznaczyć znowu                                                     | nowa kartka                                                                             |
|   9 | Newsletter przy rezerwacji: dobrowolny, niezaznaczony                         | newsletter jest włączony / klient podaje dane / pole zapisu jest osobne, niezaznaczone i nie blokuje rezerwacji                                                                   | nowa kartka                                                                             |
|  10 | Uwagi: ostrzeżenie przed danymi o zdrowiu                                     | klient wpisuje uwagi / patrzy na pole / widzi, żeby nie podawać tu informacji o zdrowiu                                                                                           | nowa kartka                                                                             |
|  11 | Ten sam e-mail: wizyta w kartotece tego samego klienta                        | klient był już u nas z tym samym e-mailem / rezerwuje kolejną wizytę / wizyta trafia do jego kartoteki, a nie do nowej                                                            | nowa kartka                                                                             |
|  12 | Odpowiedzi z ankiety widzą tylko specjalista i centrum                        | klient wypełnił ankietę (dane o zdrowiu) / ktoś inny próbuje je zobaczyć / widzą je tylko jego specjalista i admin centrum                                                        | nowa kartka                                                                             |
|  13 | Dane z porzuconej rezerwacji są usuwane po czasie                             | klient podał dane, ale nie dokończył rezerwacji / mija ustalony czas / jego dane są usuwane z bazy                                                                                | nowa kartka                                                                             |
|  14 | Regulamin mówi to samo co system: płatność później, odwołanie, zwroty, kupony | admin ustawił okno odwołań, czas na płatność i zasady kuponów / klient czyta regulamin przed rezerwacją / regulamin podaje te same zasady co kreator, maile i system              | nowa kartka                                                                             |
|  15 | Wizyta w ciągu 14 dni: zgoda na wykonanie przed upływem terminu odstąpienia   | wizyta wypada w ciągu 14 dni od rezerwacji / klient podaje dane / musi zaznaczyć, że chce wizyty przed upływem 14 dni i wie, że po niej nie odstąpi od umowy; czas zgody zapisany | nowa kartka                                                                             |
|  16 | Usługa dla dziecka: rezerwuje rodzic lub opiekun (pole obowiązkowe)           | admin oznaczył usługę jako dla dziecka lub młodzieży / klient podaje dane / musi zaznaczyć „Rezerwuję jako rodzic lub opiekun prawny”; czas zgody zapisany                        | nowa kartka                                                                             |

### Ustalone (niebieskie)

- Dane z niedokończonej rezerwacji usuwamy po 30 dniach (27.10)
- Usługa dla dziecka: rezerwuje rodzic albo opiekun prawny i to on jest klientem (#267, 27.10)
- Osoba niepełnoletnia nie rezerwuje sama: rezerwacji dokonuje osoba pełnoletnia (#267, 27.10)
- Wizyta w ciągu 14 dni: klient zaznacza zgodę na wcześniejsze wykonanie usługi; treść sprawdzi prawnik (#265, 27.10)

## Klient · 4. Płaci od razu

Ramka `3458764688511550418` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688511550418)

Historyjka: Jako klient chcę zapłacić wygodnie i bezpiecznie i od razu mieć potwierdzoną wizytę.

### Płatność udana

Ramka `3458764688511550419`

|  Nr | Karteczka                                                      | Zakładając / Gdy / Wtedy                                                                                                                                                                                                                   | Wcześniej                                                                                          |
| --: | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
|   1 | BLIK: sukces                                                   | rezerwacja za 150 zł / klient płaci BLIK-iem / „Wizyta potwierdzona”, wizyta widoczna u admina i specjalisty                                                                                                                               | Test end-to-end na STAGING po każdym wydaniu; test bazy (CI)                                       |
|   2 | Karta: sukces                                                  | rezerwacja za 150 zł / klient płaci kartą / wizyta potwierdzona, mail z plikiem kalendarza                                                                                                                                                 | Test end-to-end na DEV i STAGING 26.10 (PR #258)                                                   |
|   3 | Karta z 3D Secure                                              | karta wymagająca potwierdzenia w banku / klient potwierdza / wizyta potwierdzona                                                                                                                                                           | Test end-to-end na DEV i STAGING 26.10 (PR #258)                                                   |
|   4 | Przelewy24: sukces                                             | rezerwacja za 150 zł / klient wybiera Przelewy24, bank i potwierdza w banku / wizyta potwierdzona                                                                                                                                          | nowa kartka                                                                                        |
|   5 | #27 · Tylko karta, BLIK, Przelewy24                            | klient otwiera płatność / wybiera metodę / do wyboru tylko karta, BLIK i Przelewy24                                                                                                                                                        | Test jednostkowy (CI)                                                                              |
|   6 | Strona potwierdzenia z numerem rezerwacji i plikiem kalendarza | płatność się udała / klient wraca ze Stripe / widzi „Wizyta potwierdzona”, numer rezerwacji, szczegóły i „Dodaj do kalendarza”                                                                                                             | nowa kartka                                                                                        |
|   7 | Potwierdzenie płatności dla klienta                            | klient zapłacił / sprawdza pocztę / ma potwierdzenie zapłaty (kwota, data, numer rezerwacji), dopóki nie ma faktur                                                                                                                         | nowa kartka                                                                                        |
|   8 | Cena z chwili rezerwacji, nawet gdy admin ją zmieni            | klient jest w kreatorze / admin w tym czasie zmienia cenę usługi / klient płaci cenę, którą widział przy rezerwacji                                                                                                                        | nowa kartka                                                                                        |
|   9 | Cena usługi: bezpłatna (0 zł) albo co najmniej 2 zł (#256)     | admin ustawia cenę usługi / wpisuje 0 zł albo kwotę od 0,01 do 1,99 zł / 0 zł to bezpłatna wizyta: klient podaje dane i zgody, wizyta jest potwierdzona bez płatności, mail jak po opłaconej; 0,01–1,99 zł formularz odrzuca z komunikatem | Nie zrobione (#256; decyzja 27.10: 0 zł bezpłatnie albo co najmniej 2 zł, tak samo dla warsztatów) |
|  10 | Płatność zawsze w złotówkach                                   | płatność w innej walucie / dochodzi do bazy / baza jej nie przyjmuje, pieniądze wracają                                                                                                                                                    | Płatność w innej walucie jest zwracana, wizyta nie potwierdzona (PR #162); bez testu               |
|  11 | Powrót przed potwierdzeniem Stripe                             | klient wrócił z płatności / potwierdzenie ze Stripe jeszcze nie dotarło / strona sama sprawdza i pokazuje wynik                                                                                                                            | Częściowy test jednostkowy; ręcznie 01.10                                                          |

### Płatność nieudana lub przerwana

Ramka `3458764688511550420`

|  Nr | Karteczka                                                   | Zakładając / Gdy / Wtedy                                                                                                                                | Wcześniej                                                 |
| --: | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
|  12 | Karta odrzucona, ponowna próba                              | bank odrzuca kartę / klient płaci / komunikat, termin dalej zablokowany, można spróbować inaczej                                                        | Test end-to-end na DEV i STAGING 26.10 (PR #258)          |
|  13 | Bank odrzuca BLIK lub P24                                   | płatność BLIK w toku / bank ją odrzuca / rezerwacja wygasa, termin wolny                                                                                | Testy jednostkowe i bazy z atrapą Stripe                  |
|  14 | Klient porzuca płatność                                     | klient zamyka kartę w trakcie płatności / sesja płatności wygasa / termin wraca do wolnych                                                              | Testy jednostkowe i bazy z atrapą Stripe                  |
|  15 | Formularz Stripe się nie wczytał                            | Stripe nie odpowiada / klient otwiera krok płatności / komunikat i telefon do centrum zamiast pustego formularza                                        | nowa kartka                                               |
|  16 | Podwójne kliknięcie „Zapłać” nie pobiera pieniędzy dwa razy | klient klika „Zapłać” dwa razy / oba kliknięcia dochodzą / jedna płatność                                                                               | Test formularza płatności (PR #262)                       |
|  17 | Termin zajęty w trakcie: zwrot                              | blokada wygasła w trakcie płatności i ktoś zajął termin / płatność dochodzi / pełny zwrot i mail z wyjaśnieniem                                         | Testy bazy i płatności; płatność rozliczana raz (PR #162) |
|  18 | Wizyta ze zwróconymi pieniędzmi nie wraca                   | termin był zajęty, płatność zwrócona / termin się zwalnia, klient odświeża stronę / wizyta zostaje odwołana, bez potwierdzenia i maila                  | Test bazy (PR #162)                                       |
|  19 | Płatność za wizytę już anulowaną: pełny zwrot               | rezerwacja anulowana, bo minął termin płatności / płatność dochodzi później / pełny zwrot, wizyta nie wraca                                             | Testy jednostkowe i bazy z atrapą Stripe                  |
|  20 | Dwie opłacone płatności: druga wraca sama                   | dla wizyty są dwie otwarte płatności (dwie karty, kreator i link) / klient opłaca obie / wizyta potwierdzona raz, druga płatność zwrócona automatycznie | Test bazy (PR #162)                                       |

### Po MVP (szare)

- 21. Pakiety i vouchery

### Ustalone (niebieskie)

- Cena: 0 zł znaczy bezpłatnie, płatna co najmniej 2 zł; usługi i warsztaty tak samo (#256, 27.10)
- Przelewy24: klient sam wpisuje imię i nazwisko; do Stripe go nie wysyłamy (#257, 27.10)
- Klient zamyka kartę w trakcie BLIK-a: wynik przychodzi ze Stripe, a po 2 h system sam pyta Stripe

## Klient · 4a. Kupon zniżkowy

Ramka `3458764688511550421` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688511550421)

Historyjka: Jako klient chcę wpisać kod rabatowy i zapłacić mniej.

### Kupony zniżkowe

Ramka `3458764688511550422`

|  Nr | Karteczka                                       | Zakładając / Gdy / Wtedy                                                                                                                                                                                | Wcześniej                                                                                              |
| --: | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
|   1 | Klient: kupon publiczny                         | admin utworzył kupon „JESIEN20” (−20%, ważny do końca miesiąca) / klient wpisuje go na kroku danych / widzi cenę przed i po zniżce i płaci mniej                                                        | Procent albo kwota, daty, wyłączenie, limit użyć; testy bazy i widoku; test end-to-end (PR #262)       |
|   2 | Klient: zły, wygasły albo wykorzystany kupon    | kupon nie istnieje, wygasł albo skończył się limit / klient go wpisuje / jasny komunikat, cena bez zmian, rezerwacja idzie dalej                                                                        | Komunikaty po polsku; testy bazy i widoku (CI)                                                         |
|   3 | Klient: kupon przy płatności później            | klient zarezerwował z kuponem i płaci z linku w mailu / otwiera link / kwota po zniżce; kupon nie przepada przy przełożeniu wizyty                                                                      | Płatność z linku bierze cenę po zniżce; test end-to-end (PR #262)                                      |
|   4 | Cena po zniżce zawsze co najmniej 2 zł          | wizyta 50 zł, kupon −49 zł / klient wpisuje kupon / zniżka przycięta tak, żeby zostały 2 zł; cena 2 zł i niższa nie bierze kuponu                                                                       | Decyzja 23.10 (#179): kupon przycinany; test bazy (CI)                                                 |
|   5 | Admin: tworzy kupon                             | admin jest w portalu / tworzy kupon: kod, procent albo kwota, ważność, limit użyć, na co działa / kupon działa od razu, lista pokazuje jego stan                                                        | Kod, procent albo kwota, ważność, wyłączenie i limit w portalu; wybór usług i kody osobiste na później |
|   6 | Admin: historia i wyłączenie                    | kupon był używany / admin otwiera kupon / widzi, kto, kiedy i przy jakiej wizycie go użył; może go wyłączyć                                                                                             | Lista kodów z liczbą użyć i wyłączanie; pełnej historii brak                                           |
|   7 | W tle: kwotę po zniżce liczy serwer             | ktoś zmienia cenę albo zniżkę w przeglądarce / wysyła płatność / kwota zawsze z bazy: cena minus kupon                                                                                                  | Liczy baza (test bazy); sesja na starą kwotę zwracana (PR #162)                                        |
|   8 | W tle: limit użyć przy dwóch osobach naraz      | kupon ma jedno użycie / dwie osoby płacą w tej samej chwili / zniżkę dostaje jedna osoba                                                                                                                | Kod blokowany przy sprawdzaniu (test bazy); brak testu prawdziwego tłoku                               |
|   9 | W tle: kodu nie da się zgadnąć                  | ktoś zgaduje kody / wysyła wiele prób / liczba prób ograniczona, potem odmowa                                                                                                                           | Po 10 błędnych kodach w godzinę kody nie są sprawdzane (test bazy)                                     |
|  10 | W tle: zwrot przy wizycie z kuponem             | wizyta opłacona z kuponem / klient ją odwołuje w oknie odwołań / zwrot kwoty faktycznie zapłaconej, nie ceny z cennika                                                                                  | Zwrot od faktycznie zapłaconej kwoty (test bazy odwołań); brak testu z kuponem                         |
|  11 | Admin: ustawienie „kupony wracają po odwołaniu” | w ustawieniach kuponów admin włączył albo wyłączył „kupony wracają po odwołaniu” (domyślnie wyłączone) / wizyta z kuponem zostaje odwołana / kupon wraca do użycia albo przepada, zgodnie z ustawieniem | Nie zrobione                                                                                           |
|  12 | Admin: centrum odwołuje wizytę z kuponem        | wizyta była opłacona z kuponem, a centrum musi ją odwołać / admin odwołuje ją w portalu / widzi komunikat o kuponie, może go oddać i przedłużyć ważność; klient dostaje to w mailu                      | Nie zrobione                                                                                           |

### Po MVP (szare)

- 13. Klient: kupon osobisty

### Ustalone (niebieskie)

- Nie ma kuponów na 100%: zniżka zawsze mniejsza niż cena
- Kupon domyślnie bezzwrotny; admin może to zmienić jednym ustawieniem dla wszystkich kuponów
- Jeden kupon na wizytę, kupony się nie łączą
- Kupony przed MVP, zarządzane w portalu admina
- Kupony publiczne i osobiste (e-mail, telefon)
- Gdy odwołuje centrum: komunikat o kuponie, admin może go oddać i przedłużyć ważność

## Klient · 5. Płaci później

Ramka `3458764688511550423` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688511550423)

Historyjka: Jako klient chcę zarezerwować teraz, a zapłacić później z linku w mailu.

### Rezerwacja i płatność z linku

Ramka `3458764688511550424`

|  Nr | Karteczka                                                 | Zakładając / Gdy / Wtedy                                                                                                                                                     | Wcześniej                                                                            |
| --: | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
|   1 | Rezerwacja „zapłacę później”                              | wizyta za 5 dni / klient wybiera „Zarezerwuj, zapłacę później” / płaci do 48 h przed wizytą albo w 24 h od rezerwacji (co wcześniej), mail z linkiem                         | Testy jednostkowe i bazy; test end-to-end (PR #262)                                  |
|   2 | Potwierdzenie rezerwacji z maila w 30 minut               | klient wybrał „zapłacę później” / nie kliknie „Potwierdzam rezerwację” w mailu w ciągu 30 min / termin wraca do wolnych bez maila; potwierdzona rezerwacja czeka na płatność | nowa kartka                                                                          |
|   3 | Bliżej niż 48 h: tylko teraz                              | wizyta za 30 godzin / klient podaje dane / widzi tylko „Zapłać teraz”                                                                                                        | Test bazy danych i test jednostkowy (CI)                                             |
|   4 | Opłata z linku w e-mailu                                  | mail z linkiem do płatności / klient płaci BLIK-iem / wizyta potwierdzona, mail z potwierdzeniem                                                                             | Testy jednostkowe i bazy; test end-to-end (PR #262)                                  |
|   5 | Przypomnienia 24 h i 6 h                                  | nieopłacona rezerwacja / zostaje 24 h, potem 6 h do terminu płatności / po jednym mailu, nie dla świeżych rezerwacji                                                         | Test bazy danych i test jednostkowy (CI)                                             |
|   6 | Brak płatności anuluje                                    | brak płatności / mija termin płatności / rezerwacja anulowana, termin wolny, mail o anulowaniu                                                                               | Test bazy danych i test jednostkowy (CI); ręcznie 01.10                              |
|   7 | Płaci w chwili terminu                                    | klient właśnie płaci / w tej chwili mija termin płatności / rezerwacja nie jest anulowana w trakcie płatności                                                                | Test bazy danych (CI)                                                                |
|   8 | Zadania cykliczne nie działają                            | zadanie anulujące nie uruchomiło się / mija termin płatności / anulowanie i tak zachodzi w bazie, maile czekają; admin dostaje alert                                         | Test jednostkowy i częściowy test bazy; termin i tak się zwalnia; brak alertu (#180) |
|   9 | Link do płatności wygasł: klient otwiera nowy z maila     | sesja płatności z linku wygasła / klient otwiera link jeszcze raz / rezerwacja czeka, płatność działa                                                                        | Test bazy danych (CI)                                                                |
|  10 | Link do płatności opłaconej wizyty mówi, że już zapłacono | wizyta opłacona / klient otwiera stary link / komunikat „już zapłacono”                                                                                                      | Test bazy danych (CI)                                                                |
|  11 | Przeterminowana rezerwacja nie blokuje terminu            | minął termin płatności / zadanie jeszcze nie przeszło / termin i tak jest wolny dla innych                                                                                   | Test bazy danych (CI)                                                                |
|  12 | „Zapłacę później” zamyka rozpoczętą płatność              | klient otworzył płatność i wrócił / wybiera „Zapłacę później” / stara płatność w Stripe jest wygaszona i nie da się jej opłacić                                              | Zrobione (PR #162), bez testu                                                        |
|  13 | Zaległa rezerwacja z płatnością w toku jest anulowana     | termin zapłaty minął, sesja płatności wygasła / zdarzenie o wygaśnięciu zaginęło / rezerwacja anulowana, klient dostaje maila                                                | Test bazy (CI)                                                                       |

### Ustalone (niebieskie)

- Bez SMS przy ostatnim wezwaniu do zapłaty; SMS-y po MVP (27.10)

## Klient · 6. Dostaje potwierdzenie i stronę wizyty

Ramka `3458764688511550425` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688511550425)

Historyjka: Jako klient chcę mieć potwierdzenie i jedno miejsce, w którym widzę swoją wizytę.

### Potwierdzenie, maile i strona wizyty

Ramka `3458764688511550426`

|  Nr | Karteczka                                             | Zakładając / Gdy / Wtedy                                                                                                                                            | Wcześniej                                                             |
| --: | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
|   1 | Potwierdzenie z plikiem kalendarza                    | wizyta potwierdzona / wychodzi mail / mail z plikiem kalendarza (dobra godzina i strefa)                                                                            | Test jednostkowy (CI)                                                 |
|   2 | Online: link przyśle specjalistka                     | wizyta online / klient dostaje potwierdzenie / tekst „Link do spotkania prześle Ci specjalistka przed wizytą”                                                       | Tekst w kreatorze, podsumowaniu i mailu (PR #188); test treści maila  |
|   3 | Strona wizyty z linku w mailu                         | klient ma mail o wizycie / otwiera link / widzi szczegóły, plik kalendarza i to, co może jeszcze zmienić                                                            | nowa kartka                                                           |
|   4 | Starszy mail: link nieaktualny zamiast 404 (#259)     | klient dostał już nowszy mail o wizycie / otwiera link ze starszego / komunikat „Ten link jest już nieaktualny” i kontakt; po płatności z linku „Płatność przyjęta” | nowa kartka                                                           |
|   5 | Przypomnienie o wizycie dzień wcześniej               | wizyta jutro / nadchodzi czas przypomnienia (ustawienie centrum) / klient dostaje jeden mail z przypomnieniem i linkiem                                             | nowa kartka                                                           |
|   6 | Pomoc w kryzysie w stopce każdego maila (#247)        | klient dostaje dowolny mail o wizycie / patrzy na stopkę / 112 i link do strony „Pomoc w kryzysie”                                                                  | nowa kartka                                                           |
|   7 | Klient nie dostał maila: centrum wysyła link ponownie | klient dzwoni, że nie ma maila / admin klika „Wyślij link ponownie” / klient dostaje mail z aktualnym linkiem                                                       | nowa kartka                                                           |
|   8 | Mail nie dotarł (zły adres): admin to widzi           | klient podał adres z literówką / mail się odbija / admin widzi przy wizycie, że mail nie dotarł                                                                     | nowa kartka                                                           |
|   9 | Wizyta już się odbyła: link nic nie zmieni            | termin wizyty minął / klient otwiera link z maila / widzi, że wizyta się odbyła; nie da się jej przełożyć ani odwołać                                               | nowa kartka                                                           |
|  10 | Faktura do płatności (inFakt)                         | klient chce fakturę / płaci / faktura wystawiona automatycznie                                                                                                      | Nie zrobione; przed startem, gdy będzie NIP do konta testowego inFakt |

### Po MVP (szare)

- 11. Przypomnienia SMS

## Klient · 7. Przekłada wizytę

Ramka `3458764688511550427` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688511550427)

Historyjka: Jako klient chcę sam przełożyć wizytę na inny wolny termin.

### Przełożenie

Ramka `3458764688511550428`

|  Nr | Karteczka                                                    | Zakładając / Gdy / Wtedy                                                                                                                            | Wcześniej                                           |
| --: | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
|   1 | Przełożenie w oknie                                          | wizyta za 4 dni, nigdy nieprzekładana / klient wybiera nowy termin z linku w mailu / nowy termin, mail z nowym plikiem kalendarza                   | Testy jednostkowe i bazy; test end-to-end (PR #262) |
|   2 | Poza oknem lub ponad limit                                   | wizyta za 20 h albo już raz przełożona / klient próbuje przełożyć / komunikat, żeby skontaktować się z centrum                                      | Test bazy danych i test jednostkowy (CI)            |
|   3 | Przełożenie na zajęty termin: „termin niedostępny”           | ktoś zajął wybrany termin w międzyczasie / klient zatwierdza zmianę / „termin niedostępny”, wybór od nowa                                           | Test bazy danych (CI)                               |
|   4 | Centrum przekłada wizytę: mail z nowym terminem              | admin przekłada wizytę w portalu / zapisuje nowy termin / klient dostaje mail z nowym terminem, nowym plikiem kalendarza i aktualnym linkiem        | nowa kartka                                         |
|   5 | Specjalistka choruje: centrum przekłada albo odwołuje wizyty | specjalistka zgłasza nieobecność po rezerwacjach / admin przekłada albo odwołuje jej wizyty / każdy klient dostaje mail; przy odwołaniu pełny zwrot | nowa kartka                                         |
|   6 | Termin od centrum nie pasuje: odwołanie z pełnym zwrotem     | centrum przełożyło opłaconą wizytę / nowy termin nie pasuje klientowi / klient może ją odwołać z pełnym zwrotem, także poza oknem                   | nowa kartka                                         |

### Ustalone (niebieskie)

- Przełożenie nie zmienia ceny: zostaje cena z chwili rezerwacji (27.10)
- Przełożenie nieopłaconej rezerwacji: termin płatności liczony od nowej daty, tą samą zasadą (27.10)

## Klient · 8. Odwołuje wizytę

Ramka `3458764688511550429` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688511550429)

Historyjka: Jako klient chcę odwołać wizytę z linku w mailu i dostać zwrot, jeśli mi się należy.

### Odwołanie i zwrot

Ramka `3458764688511550430`

|  Nr | Karteczka                                                         | Zakładając / Gdy / Wtedy                                                                                            | Wcześniej                                                           |
| --: | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
|   1 | Odwołanie z pełnym zwrotem                                        | opłacona wizyta za 4 dni / klient ją odwołuje / pełny zwrot przez Stripe, mail                                      | Test bazy danych i test jednostkowy (CI); test end-to-end (PR #262) |
|   2 | Odwołanie po oknie: bez zwrotu                                    | opłacona wizyta za 20 godzin / klient ją odwołuje / bez zwrotu, mail mówi dlaczego                                  | Test bazy (CI)                                                      |
|   3 | Odwołanie nieopłaconej                                            | nieopłacona rezerwacja / klient ją odwołuje / termin wolny, nic do zwrotu                                           | Test bazy danych i test jednostkowy (CI)                            |
|   4 | Stripe odrzuca zwrot                                              | Stripe odrzuca zwrot / klient odwołuje wizytę / wizyta odwołana, zwrot „do rozliczenia” u admina                    | Testy jednostkowe i bazy; brak testu end-to-end                     |
|   5 | Odwołana wizyta: link z maila mówi, że nic już nie da się zmienić | wizyta już odwołana / klient otwiera link jeszcze raz / komunikat, że nie da się jej zmienić                        | Test bazy danych (CI)                                               |
|   6 | Podwójne kliknięcie „Odwołaj”: jeden zwrot                        | klient klika „Odwołaj” dwa razy / oba kliknięcia dochodzą / jeden zwrot                                             | Test bazy danych i test jednostkowy (CI)                            |
|   7 | Centrum odwołuje wizytę: mail i pełny zwrot                       | centrum musi odwołać opłaconą wizytę / admin odwołuje ją w portalu / klient dostaje mail i pełny zwrot przez Stripe | nowa kartka                                                         |
|   8 | Mail o odwołaniu podaje kwotę i czas zwrotu                       | opłacona wizyta odwołana w oknie / klient dostaje mail / kwota zwrotu i kiedy pieniądze wrócą                       | nowa kartka                                                         |

### Ustalone (niebieskie)

- Zmiana okna odwołań nie dotyczy wcześniejszych rezerwacji: obowiązują zasady z chwili rezerwacji (27.10)
- Klient nie przyszedł: pieniądze przepadają jak przy odwołaniu po oknie, bez maila; zasada w regulaminie i w mailu (#268, 27.10)
- Odwołanie po oknie z ważnego powodu: kontakt z centrum, admin może dać pełny albo częściowy zwrot (27.10)

## Klient · 9. Próby obejścia i oszustwa

Ramka `3458764688511550445` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688511550445)

Historyjka: Jako centrum chcę, żeby nikt nie zablokował grafiku, nie zapłacił mniej i nie dostał cudzej wizyty ani zwrotu.

### Grafik i blokady

Ramka `3458764688511550446`

|  Nr | Karteczka                                                              | Zakładając / Gdy / Wtedy                                                                                                                             | Wcześniej                                                       |
| --: | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
|   1 | Strona nie pobiera terminów na więcej niż 14 dni naraz                 | ktoś prosi bazę o terminy na 3 miesiące jednym zapytaniem / zapytanie dochodzi / baza odmawia                                                        | Test bazy danych (CI)                                           |
|   2 | Dziwne parametry w adresie                                             | ktoś wpisze bzdury w adres kreatora / otwiera stronę / kreator je pomija i działa dalej                                                              | Test jednostkowy (CI)                                           |
|   3 | Termin z przeszłości w adresie strony nie da się wybrać                | link z wczorajszym terminem / klient go otwiera / termin pominięty, wybór od nowa                                                                    | Test jednostkowy (CI)                                           |
|   4 | Ochrona przed botami (Turnstile)                                       | bot bez potwierdzenia Turnstile / próbuje zablokować termin / odmowa                                                                                 | Test jednostkowy; działa na STAGING; brak testu odmowy dla bota |
|   5 | Na produkcji bez kluczy ochrony przed botami rezerwacja się nie włączy | produkcja bez kluczy Turnstile / klient otwiera kreator / rezerwacja online wyłączona zamiast działać bez ochrony                                    | Test jednostkowy (CI); ręcznie 01.10                            |
|   6 | Najwyżej 5 blokad na osobę                                             | jedna osoba zablokowała 5 terminów w 15 min / próbuje szósty / odmowa                                                                                | Test bazy danych i test jednostkowy (CI)                        |
|   7 | Ktoś omija stronę i blokuje termin prosto w bazie: odmowa              | ktoś woła bazę z kluczem publicznym / próbuje zablokować termin / brak uprawnień                                                                     | Test bazy danych (CI)                                           |
|   8 | Dwie wizyty w tym samym gabinecie o tej samej porze nie powstaną       | ktoś wpisuje wizytę prosto do bazy / gabinet jest już zajęty / baza odrzuca                                                                          | Test bazy danych (CI)                                           |
|   9 | Cudzy e-mail, żeby zablokować termin                                   | ktoś rezerwuje „zapłacę później” na cudzy adres / nikt nie potwierdzi rezerwacji z maila / po 30 minutach termin wraca do wolnych                    | nowa kartka                                                     |
|  10 | Najwyżej 2 nieopłacone rezerwacje na osobę                             | osoba (e-mail, telefon albo przeglądarka) ma 2 nieopłacone rezerwacje / rezerwuje trzecią / może tylko zapłacić od razu; admin dostaje powiadomienie | nowa kartka                                                     |
|  11 | Wiele „zapłacę później” z różnych adresów: admin to widzi              | ktoś rezerwuje i porzuca wiele terminów z różnych adresów / powtarza to / admin widzi te rezerwacje i może zareagować                                | nowa kartka                                                     |

### Dane, płatności i linki

Ramka `3458764688511550447`

|  Nr | Karteczka                                                           | Zakładając / Gdy / Wtedy                                                                                                                                 | Wcześniej                                     |
| --: | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
|  12 | Bot wypełnia ukryte pole: rezerwacja odrzucona                      | bot wypełnia ukryte pole formularza / wysyła dane / odmowa po cichu                                                                                      | Test jednostkowy (CI)                         |
|  13 | Rezerwacja nie zapisze się bez zgód, nawet z pominięciem formularza | ktoś omija formularz / zapisuje rezerwację bez zgód / baza odrzuca                                                                                       | Test bazy danych (CI)                         |
|  14 | HTML w polach bezpieczny                                            | klient wpisuje w imię albo uwagi znaczniki HTML lub skrypt / dane trafiają do maili i portali / widać je jako zwykły tekst, nic się nie wykonuje         | Tylko test jednostkowy maila, brak testu bazy |
|  15 | Kwota zawsze z bazy                                                 | ktoś zmienia kwotę w przeglądarce / wysyła płatność / Stripe dostaje cenę z bazy, inna kwota odrzucona                                                   | Test bazy danych i test jednostkowy (CI)      |
|  16 | Do Stripe nie trafia imię, telefon ani notatka klienta              | klient płaci / tworzy się płatność w Stripe / Stripe zna tylko e-mail i numer rezerwacji                                                                 | Test jednostkowy (CI)                         |
|  17 | Wizytę zmienia się tylko linkiem z maila, nie z kreatora            | ktoś ma tylko link z kreatora / próbuje zmienić wizytę / odmowa                                                                                          | Test bazy danych (CI)                         |
|  18 | Linku do wizyty nie da się zgadnąć                                  | ktoś próbuje zgadnąć adres strony wizyty / wpisuje losowe linki / nie trafia na żadną wizytę; link przestaje działać po nowszym mailu                    | nowa kartka                                   |
|  19 | Podmiana numeru płatności w adresie nie pokazuje cudzej wizyty      | ktoś zmienia numer sesji płatności w adresie strony potwierdzenia / otwiera stronę / nie widzi cudzej wizyty ani jej danych                              | nowa kartka                                   |
|  20 | Ponowne otwarcie strony powrotu ze Stripe nic nie zmienia           | wizyta odwołana po oknie, bez zwrotu / klient otwiera starą stronę powrotu z płatności / nic się nie zwraca ani nie potwierdza drugi raz                 | nowa kartka                                   |
|  21 | Częściowy zwrot centrum zostaje częściowy                           | centrum odwołało wizytę i oddało 50% / klient otwiera starą stronę potwierdzenia / nie ma drugiego zwrotu                                                | Płatność rozliczona raz (PR #162, test bazy)  |
|  22 | Rezerwacja na cudze dane, żeby komuś zaszkodzić                     | ktoś rezerwuje wizytę na cudze imię i e-mail / ta osoba dostaje mail / może jednym kliknięciem odwołać rezerwację; bez płatności nic jej nie kosztuje    | nowa kartka                                   |
|  23 | Fałszywe powiadomienie „zapłacono” jest odrzucane                   | ktoś wysyła do strony powiadomienie udające Stripe / dochodzi ono bez ważnego podpisu Stripe / jest odrzucone, wizyta zostaje nieopłacona                | nowa kartka                                   |
|  24 | Spór o płatność kartą (chargeback): admin to widzi                  | klient zapłacił kartą i zgłasza w banku, że nie płacił / Stripe zgłasza spór / admin dostaje powiadomienie i widzi przy wizycie, że płatność jest sporna | nowa kartka                                   |
