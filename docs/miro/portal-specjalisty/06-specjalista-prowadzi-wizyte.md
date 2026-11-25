# Mapa ścieżki „Specjalista: prowadzi wizytę”

Od dyżuru do zamkniętej wizyty, z perspektywy specjalisty. Format jak „Klient: umawia wizytę”.

Opis mapy: Specjalista ma wolne terminy, dostaje rezerwację, przygotowuje się, prowadzi i zamyka wizytę; radzi sobie ze zmianami klienta i swoją nieobecnością.

| Kolumna                           | MVP | Po MVP | Ustalone | Pytania |
| --------------------------------- | --: | -----: | -------: | ------: |
| 1. Ma wolne terminy na stronie    |   4 |      0 |        1 |       0 |
| 2. Dostaje rezerwację             |   5 |      0 |        0 |       0 |
| 3. Przygotowuje się               |   4 |      1 |        1 |       0 |
| 4. Klient przekłada albo odwołuje |   3 |      0 |        0 |       0 |
| 5. Zamyka wizytę                  |   4 |      0 |        0 |       0 |
| 6. Jest nieobecny                 |   3 |      0 |        0 |       1 |
| 7. Próby obejścia                 |   6 |      0 |        0 |       0 |

## Wizyta specjalisty · 1. Ma wolne terminy na stronie

Historyjka: Jako specjalista chcę, żeby klienci widzieli dokładnie te terminy, w których mogę przyjąć.

|  Nr | Kartka                                 | Kolor   | Zakładając / Gdy / Wtedy                                                        | Czym sprawdzone                |
| --: | -------------------------------------- | ------- | ------------------------------------------------------------------------------- | ------------------------------ |
|   1 | Terminy z dyżurów                      | zielony | dyżur pn–pt 9–17 / klient otwiera kreator / terminy co godzinę 9–16             | booking (wolne terminy), avail |
|   2 | Przerwa po wizycie                     | zielony | wizyta 10:00–10:50 i 10 min / klient szuka kolejnego / najwcześniej po przerwie | centre A                       |
|   3 | Stacjonarnie i online z jednego dyżuru | zielony | dyżur z formą obie / klient wybiera online / ten sam termin                     | booking (Klient · 1)           |
|   4 | Warsztat zabiera godziny dyżuru        | zielony | warsztat w czwartek 17–19 / klient szuka wizyty / tych godzin nie ma            | ramka warsztatów               |

Ustalone (niebieskie): Terminy liczy baza z dyżurów, nieobecności, zamknięć i innych wizyt.

## Wizyta specjalisty · 2. Dostaje rezerwację

|  Nr | Kartka                                    | Kolor   | Zakładając / Gdy / Wtedy                                                                                 | Czym sprawdzone                |
| --: | ----------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- | ------------------------------ |
|   1 | Powiadomienie o nowej wizycie             | zielony | klient rezerwuje / specjalista dostaje powiadomienie, bez kwot                                           | booking AC                     |
|   2 | Wizyta w „Moje rezerwacje” i w kalendarzu | zielony | klient zapłacił / wizyta jest u specjalisty                                                              | e2e rezerwacji w obu portalach |
|   3 | Zapis klienta do siebie                   | zielony | klient dzwoni do specjalistki / zapisuje go do siebie / wizyta czeka na płatność; za kogoś innego odmowa | booking X                      |
|   4 | Ponowne wysłanie linku do płatności       | zielony | klient zgubił mail / specjalista wysyła link do swojej wizyty                                            | booking Z                      |
|   5 | Nie widzi rezerwacji w trakcie blokady    | zielony | klient blokuje termin w kreatorze / specjalista nie widzi jeszcze wizyty                                 | booking T                      |

## Wizyta specjalisty · 3. Przygotowuje się

|  Nr | Kartka                                              | Kolor   | Zakładając / Gdy / Wtedy                                                                  | Czym sprawdzone      |
| --: | --------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------- | -------------------- |
|   1 | Ankieta przed wizytą                                | zielony | klient wypełnił ankietę / specjalista otwiera wizytę / widzi odpowiedzi                   | jedn. `visit-intake` |
|   2 | Historia wizyt klienta i moje notatki               | żółty   | druga wizyta klientki / specjalista otwiera jej kartę / widzi poprzednie wizyty i notatki | bez testu bazy       |
|   3 | Wizyta online: przypomnienie, że trzeba wysłać link | różowy  | wizyta online jutro / specjalistka dostaje przypomnienie o linku                          | nie zrobione         |
|   4 | Dzień wizyt na dashboardzie                         | żółty   | → Specjalista · 1, kartka 1                                                               | #30                  |

Po MVP (szare): 5. Link do spotkania online z systemu

Ustalone (niebieskie): Link do spotkania online Anna wysyła sama (06.10).

## Wizyta specjalisty · 4. Klient przekłada albo odwołuje

|  Nr | Kartka                               | Kolor   | Zakładając / Gdy / Wtedy                                              | Czym sprawdzone                |
| --: | ------------------------------------ | ------- | --------------------------------------------------------------------- | ------------------------------ |
|   1 | Powiadomienie o zmianie              | zielony | klient przekłada z linku / specjalista dostaje powiadomienie          | booking AC (z historii wizyty) |
|   2 | Termin wraca do wolnych po odwołaniu | zielony | klient odwołuje / termin znów wolny na stronie                        | booking S                      |
|   3 | Nowy termin w kalendarzu             | zielony | klient przeniósł wizytę / kalendarz pokazuje nowy termin, stary wolny | booking S                      |

## Wizyta specjalisty · 5. Zamyka wizytę

|  Nr | Kartka                                  | Kolor | Zakładając / Gdy / Wtedy                                      | Czym sprawdzone               |
| --: | --------------------------------------- | ----- | ------------------------------------------------------------- | ----------------------------- |
|   1 | Zamknięcie z wynikiem, tagami i notatką | żółty | wizyta się odbyła / zamyka / notatka tylko dla niego i admina | jedn.; brak testu bazy        |
|   2 | Tylko swoje wizyty                      | żółty | próbuje zamknąć cudzą / odmowa                                | kod sprawdza; brak testu bazy |
|   3 | Poranny mail o zaległych                | żółty | wczoraj niezamknięta / rano jeden mail z listą                | jedn. treści maila            |
|   4 | Zaległe na dashboardzie                 | żółty | → Specjalista · 1, kartka 2                                   |                               |

## Wizyta specjalisty · 6. Jest nieobecny

|  Nr | Kartka                               | Kolor   | Zakładając / Gdy / Wtedy                                   | Czym sprawdzone  |
| --: | ------------------------------------ | ------- | ---------------------------------------------------------- | ---------------- |
|   1 | Urlop ukrywa terminy                 | zielony | urlop w piątek / klient szuka / brak terminów              | booking X, avail |
|   2 | Urlop na dzień z wizytą: ostrzeżenie | różowy  | wizyta w piątek / dodaje urlop / ostrzeżenie z listą wizyt | nie zrobione     |
|   3 | Admin przenosi wizyty                | zielony | → „Admin: obsługuje wizytę”, krok 3                        | booking AA       |

Pytania (pomarańczowe): Urlop na dzień z wizytą: ostrzec czy blokować? Kto mówi klientowi?

## Wizyta specjalisty · 7. Próby obejścia

|  Nr | Kartka                                            | Kolor   | Zakładając / Gdy / Wtedy                 | Czym sprawdzone |
| --: | ------------------------------------------------- | ------- | ---------------------------------------- | --------------- |
|   1 | Nie widzi cudzych wizyt                           | zielony | pyta o wizyty innego specjalisty / pusto | booking M i T   |
|   2 | Nie widzi kwot ani płatności                      | zielony | otwiera swoją wizytę / bez kwot          | booking M i W   |
|   3 | Nie zwróci, nie przesunie, nie odwoła jak centrum | zielony | wysyła żądanie / odmowa                  | booking T i AA  |
|   4 | Nie zapisze wizyty za innego specjalistę          | zielony | zapisuje klienta do kolegi / odmowa      | booking X       |
|   5 | Nie zmieni cudzych dyżurów                        | zielony | zmienia regułę innego / odmowa           | avail H–L       |
|   6 | Nie czyta listy klientów centrum                  | zielony | pyta o wszystkich klientów / odmowa      | booking AE      |
