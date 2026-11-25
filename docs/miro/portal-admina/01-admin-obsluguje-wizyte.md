# Mapa ścieżki „Admin: obsługuje wizytę”

Wzór: „Klient: umawia wizytę”. Każda kolumna to ramka kroku „Wizyta · N. …” z historyjką, pod nią ramki „elementy” pogrupowane tematem, potem „Po MVP”, „Ustalone” i „Pytania”. Mapa ma kopię każdej kartki w tym samym kolorze. Kolory i „Czym sprawdzone” pochodzą ze sprawdzenia kodu z 23.11 (`develop` a419277); skróty testów jak w [`../portale-skroty-testow.md`](../portale-skroty-testow.md).

Opis mapy: Admin prowadzi wizytę klienta od zapisu przez telefon do rozliczenia: płatność, przesunięcie, odwołanie, zwrot, zamknięcie, spory i faktury.

| Kolumna                            | MVP | Po MVP | Ustalone | Pytania |
| ---------------------------------- | --: | -----: | -------: | ------: |
| 1. Zapisuje wizytę za klienta      |  10 |      1 |        2 |       1 |
| 2. Pilnuje płatności               |   6 |      1 |        2 |       0 |
| 3. Przesuwa wizytę                 |   5 |      0 |        1 |       0 |
| 4. Odwołuje i zwraca pieniądze     |   8 |      0 |        2 |       1 |
| 5. Zamyka wizytę                   |   6 |      0 |        0 |       0 |
| 6. Rozlicza zaległe zwroty i spory |   5 |      0 |        0 |       1 |
| 7. Faktury                         |   4 |      0 |        0 |       1 |
| 8. Próby obejścia                  |   8 |      0 |        0 |       0 |
| Razem                              |  52 |      2 |        7 |       4 |

## Wizyta · 1. Zapisuje wizytę za klienta

Historyjka: Jako admin chcę zapisać wizytę za klienta, który dzwoni, tak żeby dostał link do płatności i nie trafił na zajęty termin.

### Zapis

|  Nr | Kartka                                        | Kolor   | Zakładając / Gdy / Wtedy                                                                                                                               | Czym sprawdzone                    |
| --: | --------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
|   1 | Nowa wizyta z Kalendarza albo „+ Nowa wizyta” | zielony | admin ma klienta przy telefonie / wybiera usługę, specjalistę, formę, gabinet, termin i dane / wizyta czeka na płatność, klient dostaje mail z linkiem | booking X, jedn. `centre-bookings` |
|   2 | Ten sam e-mail to ta sama karta klienta       | zielony | klient już był w centrum / admin wpisuje jego e-mail / wizyta trafia na jego kartę, bez duplikatu                                                      | booking AE                         |
|   3 | E-mail jest wymagany                          | zielony | klient podaje tylko telefon / admin zapisuje / odmowa: link do płatności idzie mailem                                                                  | booking X                          |
|   4 | Zgody klient daje przy płatności              | zielony | wizyta zapisana przez centrum / klient otwiera link / najpierw zgody, potem płatność; bez zgód baza nie potwierdzi                                     | booking X                          |
|   5 | Wizyta online z dopiskiem o linku             | zielony | forma online / admin zapisuje / mail mówi, że link do spotkania prześle specjalistka                                                                   | jedn. treści potwierdzenia         |
|   6 | Cena 0 zł albo co najmniej 2 zł               | różowy  | usługa za 1 zł / admin zapisuje / odmowa; wizyta za 0 zł potwierdzona bez płatności                                                                    | #256 otwarte                       |

### Kiedy zapis jest odrzucony

|  Nr | Kartka                                                            | Kolor   | Zakładając / Gdy / Wtedy                                                      | Czym sprawdzone         |
| --: | ----------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------- | ----------------------- |
|   7 | Tylko w godzinach gabinetu (#33)                                  | zielony | gabinet 8–18 / wizyta 17:30–18:20 / „gabinet jest wtedy zamknięty”            | booking X               |
|   8 | Specjalista albo gabinet zajęty, z czasem po wizycie              | zielony | wizyta 10:00–10:50 i 10 min przerwy / admin zapisuje 10:55 / odmowa z powodem | booking X, centre A     |
|   9 | Nieobecność, dzień zamknięcia, specjalista nieaktywny, przeszłość | zielony | specjalista na urlopie albo święto / admin zapisuje / odmowa z powodem        | booking X i K, centre C |
|  10 | Za mało czasu na płatność                                         | zielony | wizyta za 3 h / admin zapisuje / link ważny krócej albo odmowa                | booking X               |

### Po MVP (szare)

- 11. Wizyty cykliczne (co tydzień ta sama pora)

### Ustalone (niebieskie)

- Płatność tylko online; na miejscu nic się nie płaci (06.10)
- Centrum może zapisać poza dyżurami, jeśli specjalista i gabinet są wolni (booking X)

### Pytania (pomarańczowe)

- Klient bez e-maila: płatność na miejscu?

## Wizyta · 2. Pilnuje płatności

Historyjka: Jako admin chcę widzieć, kto jeszcze nie zapłacił, i pomóc mu zapłacić, zanim rezerwacja przepadnie.

### Płatność i link

|  Nr | Kartka                                                     | Kolor   | Zakładając / Gdy / Wtedy                                                                                           | Czym sprawdzone                        |
| --: | ---------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
|   1 | Termin zapłaty przy wizycie                                | zielony | rezerwacja „zapłacę później” / admin otwiera wizytę / widzi, do kiedy klient musi zapłacić                         | booking Z (portale)                    |
|   2 | Ponowne wysłanie linku                                     | zielony | klient zgubił mail / admin klika „Wyślij ponownie” / mail idzie; drugi raz przed upływem 5 min: „wysłano niedawno” | booking Z, jedn. `resend-payment-link` |
|   3 | Link także do potwierdzonej wizyty                         | zielony | klient prosi o mail z potwierdzeniem / admin wysyła link / klient dostaje stronę wizyty                            | booking AO                             |
|   4 | Odbity e-mail widoczny w historii                          | zielony | adres klienta odbija / admin otwiera historię / widzi, że mail nie dotarł                                          | booking AO                             |
|   5 | Brak płatności anuluje rezerwację                          | zielony | termin zapłaty minął / zadanie nocne / rezerwacja anulowana, termin wraca, mail do klienta                         | booking Y                              |
|   6 | Za dużo nieopłaconych z jednego źródła: admin dostaje znać | zielony | ktoś robi trzecią nieopłaconą rezerwację / system / musi płacić od razu, admin dostaje jedno powiadomienie         | booking Z (audyt 22.10)                |

### Po MVP (szare)

- 7. Przypomnienia SMS

### Ustalone (niebieskie)

- Najwyżej dwie nieopłacone rezerwacje na osobę (audyt 22.10)
- Rezerwacja „zapłacę później” do potwierdzenia z maila w 30 min, zapłata do doby (audyt 22.10)

## Wizyta · 3. Przesuwa wizytę

Historyjka: Jako admin chcę przenieść wizytę na inny termin, gabinet albo formę, kiedy klient albo specjalista o to prosi.

### Przesunięcie

|  Nr | Kartka                                                                | Kolor   | Zakładając / Gdy / Wtedy                                                                                           | Czym sprawdzone |
| --: | --------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------ | --------------- |
|   1 | Nowy termin, gabinet albo forma z powodem                             | zielony | wizyta za 10 h / admin przenosi na inny dzień i gabinet / nowy termin, powód w historii, mail z plikiem kalendarza | booking AA      |
|   2 | Centrum przesuwa także w oknie, w którym klient już nie może          | zielony | wizyta za 5 h / admin przesuwa / działa; klient sam by nie mógł                                                    | booking AA i S  |
|   3 | Bez zmiany, zajęty termin, przeszłość, po zamknięciu gabinetu: odmowa | zielony | admin wybiera ten sam termin albo zajęty / komunikat z powodem                                                     | booking AA      |
|   4 | Klientowi nie pasuje termin od centrum: pełny zwrot                   | zielony | centrum przesunęło opłaconą wizytę / klient odwołuje z linku / dostaje całość, nawet w oknie                       | booking AP      |
|   5 | Wizyta z kuponem zostaje z kuponem                                    | zielony | wizyta opłacona z kuponem / admin ją przesuwa / cena i kupon bez zmian                                             | booking AM      |

### Ustalone (niebieskie)

- Przesunięcie przez centrum nie liczy się do limitu przesunięć klienta

## Wizyta · 4. Odwołuje i zwraca pieniądze

Historyjka: Jako admin chcę odwołać wizytę i sam zdecydować, ile pieniędzy wraca, bez ryzyka, że zwrot pójdzie dwa razy.

### Odwołanie

|  Nr | Kartka                                  | Kolor   | Zakładając / Gdy / Wtedy                                                                            | Czym sprawdzone                             |
| --: | --------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------- |
|   1 | Odwołanie z wybraną kwotą zwrotu        | zielony | wizyta za 150 zł / admin odwołuje z powodem i zwrotem 100 zł / zwrot 100 zł, mail z kwotą i powodem | booking AA, jedn. `visits`                  |
|   2 | Odwołanie nieopłaconej rezerwacji       | zielony | wizyta czeka na płatność / admin odwołuje / bez zwrotu, termin wraca, mail                          | booking T                                   |
|   3 | Domyślnie zwrot całości                 | zielony | admin odwołuje opłaconą wizytę / nie zmienia kwoty / wraca całość                                   | booking AA                                  |
|   4 | Wizyta z kuponem odwołana przez centrum | różowy  | wizyta opłacona z kuponem / admin odwołuje / widzi komunikat o kuponie, może go oddać               | link do „Admin · Kupony zniżkowe”, kartka 4 |
|   5 | Klient nie przyszedł na opłaconą wizytę | różowy  | wizyta minęła bez klienta / admin oznacza nieobecność / zasada z regulaminu i mail do klienta       | #268 otwarte                                |

### Zwrot

|  Nr | Kartka                                          | Kolor   | Zakładając / Gdy / Wtedy                                                                      | Czym sprawdzone   |
| --: | ----------------------------------------------- | ------- | --------------------------------------------------------------------------------------------- | ----------------- |
|   6 | Zwrot nigdy ponad to, co zostało z wpłaty       | zielony | wpłata 150 zł / admin wpisuje 200 zł, kwotę ujemną albo tekst / odmowa w formularzu i w bazie | booking AA, jedn. |
|   7 | Częściowy zwrot zostaje częściowy               | zielony | admin zwrócił 50 ze 150 zł / klient otwiera stary link potwierdzenia / nic więcej nie wraca   | booking AQ        |
|   8 | Zwrot zrobiony w panelu Stripe trafia do wizyty | zielony | ktoś zwraca w panelu Stripe / Stripe przysyła zdarzenie / kwota zwrotu przy wizycie           | booking Q i S     |

### Ustalone (niebieskie)

- Centrum odwołuje zawsze, także po oknie odwołań klienta
- Zwroty zapisują się tylko w górę (audyt 22.10)

### Pytania (pomarańczowe)

- Nieobecność klienta: zwrot czy nie, i co mówi regulamin? (#268)

## Wizyta · 5. Zamyka wizytę

Historyjka: Jako admin chcę zamknąć każdą odbytą wizytę, żeby wiedzieć, co się wydarzyło, i mieć porządek w archiwum.

### Zamknięcie

|  Nr | Kartka                                       | Kolor | Zakładając / Gdy / Wtedy                                                                | Czym sprawdzone                           |
| --: | -------------------------------------------- | ----- | --------------------------------------------------------------------------------------- | ----------------------------------------- |
|   1 | Zamknięcie z wynikiem, tagami i notatką      | żółty | wizyta się odbyła / admin zamyka: „odbyła się”, tagi, krótka notatka / wizyta zamknięta | jedn. `visit-closing`; brak testu bazy    |
|   2 | Wynik „klient nie przyszedł”                 | żółty | klient nie przyszedł / admin wybiera ten wynik / tabela i panel to pokazują             | jedn.; brak testu bazy                    |
|   3 | Zamknięcie z tabeli, kalendarza i dashboardu | żółty | admin zamyka z dowolnego miejsca / wszędzie ten sam stan                                | bez testu                                 |
|   4 | Przyszłej wizyty nie da się zamknąć          | żółty | wizyta jutro / admin próbuje zamknąć / odmowa                                           | kod „not_closable”; brak testu bazy       |
|   5 | Zaległe zamknięcia na dashboardzie           | żółty | wczoraj niezamknięta / admin otwiera dashboard / widzi ją w „Do zrobienia”              | brak testu bazy                           |
|   6 | Poranny mail o zaległych                     | żółty | wczoraj niezamknięta / rano / specjalista dostaje jeden mail z listą                    | jedn. treści maila; wybór wizyt bez testu |

## Wizyta · 6. Rozlicza zaległe zwroty i spory

Historyjka: Jako admin chcę widzieć wszystkie pieniądze, które jeszcze trzeba oddać albo wyjaśnić, i rozliczyć je dokładnie raz.

### Zaległe rozliczenia

|  Nr | Kartka                            | Kolor   | Zakładając / Gdy / Wtedy                                                                                                                  | Czym sprawdzone                                    |
| --: | --------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
|   1 | Zwrot później, w częściach        | zielony | 100 ze 150 zł oddane / admin klika „Rozlicz” i oddaje 50 / razem 150 zł, mail przy każdym zwrocie                                         | booking AA i AB                                    |
|   2 | Płatność za wizytę, której nie ma | zielony | klient zapłacił po anulowaniu z braku płatności / lista „Do rozliczenia” / admin oddaje całość raz                                        | booking AD                                         |
|   3 | Rozliczone raz                    | zielony | admin klika „Rozlicz” dwa razy / jeden zwrot                                                                                              | booking AD                                         |
|   4 | Dwa okna zwracają naraz           | żółty   | dwa okna admina / oba klikają „Zwróć” / suma nie przekracza wpłaty                                                                        | booking AD; brak testu dwóch równoczesnych zwrotów |
|   5 | Spór o płatność (chargeback)      | zielony | klient zgłasza spór w banku / Stripe przysyła zdarzenie / spór w historii wizyty, admini dostają powiadomienie przy otwarciu i zamknięciu | booking AA i AB (audyt)                            |

### Pytania (pomarańczowe)

- Spór o płatność: kto i co odpowiada w Stripe?

## Wizyta · 7. Faktury

Historyjka: Jako admin chcę, żeby faktura do każdej płatności i korekta przy zwrocie powstawały same, bez przepisywania.

### inFakt

|  Nr | Kartka                              | Kolor  | Zakładając / Gdy / Wtedy                                                                              | Czym sprawdzone          |
| --: | ----------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- | ------------------------ |
|   1 | Dane do faktury przy rezerwacji     | różowy | klient zaznacza „Chcę fakturę” / podaje NIP i adres / NIP sprawdzony, dane przy wizycie               | nie zrobione (plan 18.2) |
|   2 | Faktura po płatności, dokładnie raz | różowy | płatność potwierdzona / Stripe przysyła zdarzenie dwa razy / jedna faktura, numer i link przy wizycie | nie zrobione (18.3)      |
|   3 | Dokument przy zwrocie               | różowy | admin zwraca pieniądze / dokument korygujący według ustaleń z księgową                                | nie zrobione (18.4)      |
|   4 | Nieudana faktura w „Do zrobienia”   | różowy | inFakt odmawia / admin widzi błąd i ponawia                                                           | nie zrobione (18.6)      |

### Pytania (pomarańczowe)

- Faktura do każdej płatności czy na życzenie; VAT; dokument przy zwrocie (do ustalenia z księgową)

## Wizyta · 8. Próby obejścia

Historyjka: Jako właściciel centrum chcę, żeby nikt poza adminem nie zmienił wizyty ani nie ruszył pieniędzy.

|  Nr | Kartka                                                  | Kolor   | Zakładając / Gdy / Wtedy                                                  | Czym sprawdzone              |
| --: | ------------------------------------------------------- | ------- | ------------------------------------------------------------------------- | ---------------------------- |
|   1 | Specjalista nie zwróci pieniędzy                        | zielony | specjalista wysyła żądanie zwrotu / odmowa                                | booking AA                   |
|   2 | Specjalista nie przesunie ani nie odwoła jak centrum    | zielony | specjalista próbuje / odmowa                                              | booking T i AA               |
|   3 | Gość bez logowania nic nie zmieni                       | zielony | ktoś wywołuje funkcje centrum bez sesji / odmowa                          | booking S i T                |
|   4 | Nikt nie dopisze historii ręcznie                       | zielony | admin próbuje zapisać historię wizyty / odmowa, historię pisze tylko baza | booking W                    |
|   5 | Specjalista nie widzi kwot                              | zielony | specjalista otwiera swoją wizytę / bez kwot i płatności                   | booking M i W                |
|   6 | Każda akcja serwera sprawdza rolę admina                | żółty   | wywołanie akcji bez roli / odmowa                                         | bez testu (plan testów 1.9)  |
|   7 | Trasy centrum na stronie: 401, 403, 404, 400            | żółty   | wywołanie bez tokenu, z tokenem specjalisty, ze złym id / właściwa odmowa | bez testu (plan testów 1.10) |
|   8 | Stripe wysyła to samo zdarzenie dwa razy: liczy się raz | zielony | to samo zdarzenie dwa razy / jeden zapis                                  | booking Q (audyt 22.10)      |
