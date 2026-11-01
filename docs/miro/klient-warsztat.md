# Miro: kopia ramek „Klient: zapisuje się na warsztat”

Mapa zapisu na warsztat i jej jedenaście kolumn (1–10 i 4a), stan na 27.10.2026; kartki przeniesione z „Strona · 7. Warsztaty” i „W tle · Warsztaty”; przy każdej przeniesionej kartce „było:” mówi, skąd przyszła oraz dopisane po przeglądzie według listy rezerwacji. Każda kolumna ma ramkę zarządzającą i ramki „elementy”, jak sekcja strony publicznej. Karteczki są numerowane w obrębie kolumny, przez wszystkie jej ramki, a mapa ma kopię każdej z tym samym numerem. Wszystkie karteczki MVP są różowe: 27.10 sprawdzamy je od nowa, kartka po kartce. Kolumny 1–3 sprawdzone 01.11 (PR #334): zielone poza kartką 3.7 (szara: warsztatów dla dzieci nie planujemy, decyzja 01.11); 3.9 zielona po wdrożeniu migracji na DEV 01.11. Kolumny 4, 4a i 5 sprawdzone 01.11 (PR #337): zielone poza kartką 5.5 (różowa: zmyślone adresy zajmują miejsca, #269). Plik `svg/klient-warsztat.svg`.

Mapa: ramka `3458764688539437963` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688539437963)

| Kolumna                          | MVP | Nowe 27.10 | Po MVP | Ustalone | Pytania |
| -------------------------------- | --: | ---------: | -----: | -------: | ------: |
| 1. Wybiera warsztat              |   7 |          5 |      1 |        2 |       0 |
| 2. Trzyma miejsce                |   5 |          3 |      0 |        0 |       0 |
| 3. Podaje dane i zgody           |   9 |          4 |      1 |        0 |       1 |
| 4. Płaci od razu                 |   9 |          5 |      1 |        3 |       0 |
| 4a. Kupon zniżkowy               |   4 |          3 |      0 |        1 |       0 |
| 5. Płaci później                 |   5 |          2 |      0 |        1 |       0 |
| 6. Potwierdzenie i strona zapisu |  12 |          7 |      3 |        0 |       0 |
| 7. Lista rezerwowa               |   4 |          1 |      0 |        1 |       0 |
| 8. Rezygnuje albo przekazuje     |   7 |          4 |      0 |        1 |       0 |
| 9. Centrum odwołuje lub zmienia  |   6 |          3 |      0 |        1 |       0 |
| 10. Próby obejścia i oszustwa    |   7 |          6 |      0 |        0 |       0 |
| Razem                            |  75 |         43 |      6 |       10 |       1 |

## Warsztat · 1. Wybiera warsztat i zaczyna zapis

Ramka `3458764688539437964` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688539437964)

Historyjka: Jako klient chcę wybrać warsztat, zobaczyć, czy są miejsca, i zacząć zapis bez szukania.

### Wejście do zapisu

Ramka `3458764688539437965`

|  Nr | Karteczka                                                               | Zakładając / Gdy / Wtedy                                                                                                                                               | Wcześniej                                                                                               | Kolor   | Czym sprawdzone (01.11)                                                                                                                 |
| --: | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | „Zapisz się” otwiera zapis tego warsztatu                               | klient jest na stronie warsztatu / klika „Zapisz się” / widzi formularz z tytułem, datą, ceną i liczbą wolnych miejsc                                                  | nowa kartka                                                                                             | zielony | Formularz zapisu z tytułem, datą, ceną i wolnymi miejscami: testy widoku warsztatu; end-to-end zapisu z płatnością BLIK                 |
|   2 | Za późno na zapis                                                       | admin ustawił koniec zapisów (domyślnie 24 h przed) / klient próbuje zapisać się później / odmowa „Zapisy zamknięte”, bez płatności                                    | Test bazy końca zapisów i test stanu „zamknięte” (było: Strona · 7, Zapis 10)                           | zielony | Koniec zapisów (domyślnie 24 h przed): test bazy (K) i test stanu „zamknięte”                                                           |
|   3 | Zapis do warsztatu odwołanego, minionego albo wycofanego jest odrzucony | warsztat odwołany, po terminie albo nieopublikowany / ktoś wysyła zapis z pominięciem strony / baza odmawia                                                            | nowa kartka                                                                                             | zielony | Szkic: „nie ma”, odwołany i miniony: „zapisy zamknięte”, także z pominięciem strony: test bazy (S, PR #334)                             |
|   4 | Wolne miejsca sprawdzane w chwili zapisu                                | strona pokazuje 1 wolne miejsce, a ktoś je właśnie zajął / klient klika „Zapisz się” / widzi „Brak miejsc” i listę rezerwową, bez błędu                                | nowa kartka                                                                                             | zielony | Komplet w chwili zapisu: odmowa „full”, strona mówi o liście rezerwowej: test bazy (H) i mapa komunikatów                               |
|   5 | Zapis na telefonie, z klawiatury i z czytnikiem ekranu                  | klient ma telefon, używa tylko klawiatury albo czytnika ekranu / przechodzi cały zapis / każdy krok ma jeden nagłówek, da się go przejść, bez błędów dostępności (axe) | nowa kartka                                                                                             | zielony | Krok danych i strona zapisu na telefonie: jeden nagłówek, bez przewijania w bok, bez błędów axe: end-to-end (PR #334, przeszedł na DEV) |
|   6 | Godzina warsztatu zawsze w czasie polskim                               | klient jest za granicą / czyta stronę, maila i plik kalendarza / godzina czasu polskiego; plik kalendarza ma strefę                                                    | nowa kartka                                                                                             | zielony | Godziny w czasie centrum: test widoku warsztatu; plik kalendarza w UTC (z oznaczeniem strefy)                                           |
|   7 | Strony warsztatów w tabeli „Każda strona”                               | Warsztaty i strona warsztatu są gotowe / sprawdzamy tabelę „Każda strona” / oba wiersze zielone: Google, obrazek, H1, klawiatura, 200 %, telefon, szybkość, linki, e2e | Tabela uzupełniona, STAGING sprawdzony (#206); szybkość celowo niższa przez GSAP (#205) (było: W tle 8) | zielony | Tabela „Każda strona” uzupełniona, STAGING sprawdzony (#206); szybkość celowo niższa przez GSAP (#205)                                  |

### Po MVP (szare)

- 8. Powiadomienia o nowych warsztatach

### Ustalone (niebieskie)

- Jednorazowe; cykl po MVP
- Koniec zapisów ustawia admin (domyślnie 24 h przed)

## Warsztat · 2. Trzyma miejsce

Ramka `3458764688539437966` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688539437966)

Historyjka: Jako klient chcę mieć pewność, że miejsce czeka na mnie, kiedy kończę zapis.

### Trzymane miejsce

Ramka `3458764688539437967`

|  Nr | Karteczka                                             | Zakładając / Gdy / Wtedy                                                                                                                         | Wcześniej                                                                                                   | Kolor   | Czym sprawdzone (01.11)                                                               |
| --: | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
|   1 | Ostatnie miejsce: dostaje je jedna osoba              | zostało jedno miejsce / dwie osoby zaczynają zapis w tej samej chwili / miejsce dostaje tylko jedna; druga widzi „Brak miejsc” i listę rezerwową | Test bazy: przy komplecie trzecie miejsce odrzucone; wiersz warsztatu blokowany (było: Strona · 7, Zapis 2) | zielony | Ostatnie miejsce dostaje jedna osoba, trzecie przy komplecie odrzucone: test bazy (H) |
|   2 | Klient widzi, do której godziny miejsce jest trzymane | klient zaczął zapis / patrzy na formularz / widzi, do której godziny miejsce na niego czeka                                                      | nowa kartka                                                                                                 | zielony | Przy trzymanym miejscu „Dokończ zapis do [godzina]”: end-to-end (PR #334)             |
|   3 | Porzucona płatność: miejsce wraca do puli             | klient nie zapłacił w czasie trzymania / czas mija / miejsce wraca do puli; klient może zacząć od nowa                                           | Test bazy: miejsce wraca do puli po czasie trzymania (było: Strona · 7, Zapis 7)                            | zielony | Czas trzymania minął: miejsce wraca do puli: test bazy (P)                            |
|   4 | Wstecz albo „Anuluj” zwalnia miejsce od razu          | klient trzyma miejsce / wraca albo klika „Anuluj” / miejsce od razu wraca do puli                                                                | nowa kartka                                                                                                 | zielony | „Zmień zdanie” zwalnia miejsce od razu: test bazy (S, PR #334)                        |
|   5 | Najwyżej 5 trzymanych miejsc w 15 minut               | jedna przeglądarka trzyma 5 miejsc w 15 minut / próbuje szóste / odmowa                                                                          | nowa kartka                                                                                                 | zielony | Szóste trzymanie w 15 minut odrzucone, inna osoba może: test bazy (S, PR #334)        |

## Warsztat · 3. Podaje dane i zgody

Ramka `3458764688539437968` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688539437968)

Historyjka: Jako klient chcę podać tylko potrzebne dane i wiedzieć, na co się zgadzam.

### Dane i zgody

Ramka `3458764688539437969`

|  Nr | Karteczka                                                       | Zakładając / Gdy / Wtedy                                                                                                                                                         | Wcześniej                                                                                                               | Kolor   | Czym sprawdzone (01.11)                                                                                      |
| --: | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
|   1 | Formularz zapisu                                                | klient klika „Zapisz się” / podaje imię i nazwisko, e-mail, telefon, uwagi i zgody (regulamin warsztatów, prywatność) / dane zapisują się po sprawdzeniu, z ochroną przed botami | Test bazy (dane, zgody, prywatność wymagana; gość nie omija serwera); end-to-end zapisu (było: Strona · 7, Zapis 1)     | zielony | Dane, zgody, prywatność wymagana, gość nie omija serwera: test bazy (G); end-to-end zapisu                   |
|   2 | Drugi zapis tej samej osoby                                     | klient jest już zapisany / zapisuje się drugi raz tym samym e-mailem / widzi, że jest już zapisany, i że link do zapisu ma w mailu                                               | Test bazy: drugi zapis tym samym e-mailem odrzucony; komunikat odsyła do linku z e-maila (było: Strona · 7, Zapis 9)    | zielony | Drugi zapis tym samym e-mailem odrzucony, komunikat odsyła do linku z maila: test bazy (G)                   |
|   3 | Regulamin warsztatów: zgoda przy zapisie                        | centrum ma regulamin warsztatów / klient się zapisuje / akceptuje go przy zapisie; data zgody zapisana; treść w CMS                                                              | Zgoda z datą (test bazy); rozdział „5. Warsztaty” w Regulaminie z CMS (end-to-end dokumentów) (było: W tle 3)           | zielony | Zgoda z datą: test bazy; rozdział „5. Warsztaty” w Regulaminie z CMS (end-to-end dokumentów)                 |
|   4 | Bez prawa odstąpienia (usługa w określonym dniu)                | klient kupuje udział w warsztacie w określonym dniu / chce odstąpić od umowy w ciągu 14 dni / regulamin mówi, że to usługa w określonym dniu; zwroty według okna zwrotu          | Punkt 5.8 Regulaminu (art. 38 ust. 1 pkt 12); pytanie do prawnika (#182) (było: W tle 4)                                | zielony | Punkt 5.8 Regulaminu (art. 38 ust. 1 pkt 12); sprawdzenie u prawnika: pytanie obok (#182)                    |
|   5 | Dane uczestników usuwane po czasie                              | warsztat się odbył / mija okres przechowywania / dane uczestników są usuwane albo anonimizowane; usunięcie na żądanie                                                            | Test bazy (12 miesięcy, zwrot w toku czeka, usunięcie na prośbę przez admina); sprawdzone na DEV (#207) (było: W tle 5) | zielony | 12 miesięcy, zwrot w toku czeka, usunięcie na prośbę przez admina: test bazy (A–C); sprawdzone na DEV (#207) |
|   6 | Uwagi: ostrzeżenie przed danymi o zdrowiu                       | klient wpisuje uwagi / patrzy na pole / widzi, żeby nie podawać tu informacji o zdrowiu                                                                                          | nowa kartka                                                                                                             | zielony | „Nie podawaj tu informacji o zdrowiu” przy uwagach: test formularza (PR #334)                                |
|   7 | Warsztat dla dziecka lub młodzieży: zapisuje rodzic lub opiekun | admin oznaczył warsztat jako dla dziecka lub młodzieży / klient podaje dane / musi zaznaczyć „Zapisuję jako rodzic lub opiekun prawny”; czas zgody zapisany                      | nowa kartka                                                                                                             | szary   | Nie planujemy warsztatów dla dzieci i młodzieży (decyzja 01.11)                                              |
|   8 | Newsletter przy zapisie: dobrowolny, niezaznaczony              | newsletter jest włączony / klient podaje dane / pole zapisu do newslettera jest osobne, niezaznaczone i nie blokuje zapisu                                                       | nowa kartka                                                                                                             | zielony | Osobne, niezaznaczone pole newslettera, zapis od niego nie zależy: test formularza (PR #334)                 |
|   9 | Dane z niedokończonego zapisu usuwane po 30 dniach              | klient podał dane, ale nie dokończył zapisu / mija 30 dni / jego dane są usuwane, tak jak przy wizytach                                                                          | nowa kartka                                                                                                             | zielony | Porzucony zapis traci dane po 30 dniach: test bazy (D, PR #334); migracja na DEV 01.11                       |

### Po MVP (szare)

- 10. Kilka miejsc w jednym zapisie

### Pytania do decyzji (pomarańczowe)

- Warsztaty bez prawa odstąpienia (usługa w określonym dniu): sprawdzić z prawnikiem razem z #265

## Warsztat · 4. Płaci od razu

Ramka `3458764688539437970` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688539437970)

Historyjka: Jako klient chcę zapłacić za warsztat od razu, wygodnie i bezpiecznie.

### Płatność

Ramka `3458764688539437971`

|  Nr | Karteczka                                       | Zakładając / Gdy / Wtedy                                                                                                          | Wcześniej                                                                                                                  | Kolor   | Czym sprawdzone (01.11)                                                                                               |
| --: | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
|   1 | Płatność od razu: BLIK, karta albo Przelewy24   | miejsce jest trzymane / klient płaci kartą, BLIK-iem albo przez Przelewy24 / zapis potwierdzony; kwota zawsze z bazy              | Testy bazy (kwota z bazy), testy płatności; end-to-end BLIK (było: Strona · 7, Zapis 3)                                    | zielony | Kwota zawsze z bazy, karta, BLIK i Przelewy24: testy bazy (B) i płatności; end-to-end BLIK                            |
|   2 | Bezpłatny warsztat                              | warsztat kosztuje 0 zł / klient wysyła formularz / zapis potwierdzony bez płatności                                               | Test bazy: warsztat za 0 zł potwierdzony bez płatności; kod nie robi warsztatu darmowym (#186) (było: Strona · 7, Zapis 5) | zielony | Warsztat za 0 zł potwierdzony bez płatności; kod nie robi warsztatu darmowym (#186): test bazy (C)                    |
|   3 | Cena warsztatu: 0 zł albo co najmniej 2 zł      | admin wpisuje cenę 1 zł / zapisuje warsztat / formularz odrzuca cenę z komunikatem; 0 zł zostaje bezpłatnym warsztatem            | nowa kartka                                                                                                                | zielony | Cena 1,50 zł odrzucona przez bazę (L, PR #337) i formularz admina (test kontraktu, #256)                              |
|   4 | Cena z chwili zapisu, nawet gdy admin ją zmieni | uczestnik zapisał się za 200 zł / admin zmienia cenę na 250 zł / uczestnik płaci 200 zł, a zwrot liczy się od tego, co zapłacił   | nowa kartka                                                                                                                | zielony | Admin podnosi cenę: uczestnik płaci cenę z zapisu, inna kwota odrzucona: test bazy (L, PR #337)                       |
|   5 | Stripe w tle: zapis potwierdzony raz            | płatność za warsztat / Stripe przysyła zdarzenie, także drugi raz / zapis potwierdzony raz; zwroty i spory jak przy wizytach      | Test bazy (raz, przy powtórzeniu), testy płatności i zwrotów; end-to-end BLIK (było: W tle 1)                              | zielony | Potwierdzony raz, także przy powtórzonym zdarzeniu; zwroty i spory: testy bazy (B, J) i płatności; end-to-end BLIK    |
|   6 | Spóźniona płatność: pełny zwrot                 | miejsce przepadło, a płatność dotarła później / Stripe potwierdza płatność / pełny zwrot automatycznie i e-mail z wyjaśnieniem    | Zwrot automatyczny i e-mail z wyjaśnieniem (#196): testy płatności, treści i bazy (było: Strona · 7, Zapis 8)              | zielony | Zwrot automatyczny i e-mail z wyjaśnieniem (#196): testy bazy (D, F), płatności i treści                              |
|   7 | Karta odrzucona: można spróbować jeszcze raz    | bank odrzuca kartę / klient płaci / komunikat o odmowie; miejsce dalej trzymane do końca czasu; można zapłacić inną metodą        | nowa kartka                                                                                                                | zielony | Odrzucona płatność nie zwalnia trzymanego miejsca; można zapłacić ponownie: test rozliczenia sesji (porażki)          |
|   8 | Podwójne kliknięcie „Zapłać”: jedna płatność    | klient klika „Zapłać” dwa razy / oba kliknięcia dochodzą / pieniądze pobrane raz                                                  | nowa kartka                                                                                                                | zielony | Drugie kliknięcie używa tej samej otwartej sesji Stripe; nowa z kluczem na miejsce i cenę: test jednostkowy (PR #337) |
|   9 | Powrót przed potwierdzeniem Stripe              | klient wrócił z płatności / potwierdzenie ze Stripe jeszcze nie dotarło / strona sama to sprawdza i pokazuje potwierdzenie zapisu | nowa kartka                                                                                                                | zielony | Strona powrotu sama rozlicza płatność; gdy bank jeszcze pracuje, czeka i się odświeża: test strony (PR #337)          |

### Po MVP (szare)

- 10. Płatność w ratach za cykl

### Ustalone (niebieskie)

- Faktury w MVP dla wizyt i warsztatów, przez inFakt, gdy będzie NIP (27.10)
- Płatność online przez Stripe jak za wizyty
- Cena: 0 zł znaczy bezpłatnie, płatna co najmniej 2 zł; usługi i warsztaty tak samo (#256, 27.10)

## Warsztat · 4a. Kupon zniżkowy

Ramka `3458764688539437972` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688539437972)

Historyjka: Jako klient chcę użyć kodu rabatowego albo vouchera przy zapisie na warsztat.

### Kod rabatowy

Ramka `3458764688539437973`

|  Nr | Karteczka                                   | Zakładając / Gdy / Wtedy                                                                                                                                                                                             | Wcześniej                                                                                                                             | Kolor   | Czym sprawdzone (01.11)                                                                                                     |
| --: | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
|   1 | Kod rabatowy na warsztat                    | centrum ma kod z zakresem „warsztaty” albo „ten warsztat”, albo klient ma voucher / klient wpisuje go przy zapisie / płaci kwotę po rabacie; kod tylko na konsultacje odrzucony z wyjaśnieniem; rabat widać u admina | Testy bazy: zakresy kodów, kod na konsultacje odrzucony, kod przed danymi (#190); co najmniej 2 zł (#186) (było: Strona · 7, Zapis 4) | zielony | Zakresy kodów, kod na konsultacje odrzucony, kod przed danymi (#190), co najmniej 2 zł (#186): testy bazy (A)               |
|   2 | Zły, wygasły albo wykorzystany kod          | kod nie istnieje, wygasł albo wyczerpał limit / klient go wpisuje / komunikat, dlaczego nie działa; cena bez zmian                                                                                                   | nowa kartka                                                                                                                           | zielony | Nieznany, wygasły i jeszcze nieważny kod mówi dlaczego, cena bez zmian: test bazy (L, PR #337); limit użyć: test bazy kodów |
|   3 | Kod przy „Zapłacę później”                  | klient wpisał kod i wybiera „Zapłacę później” / płaci z linku w mailu / płaci kwotę po rabacie                                                                                                                       | nowa kartka                                                                                                                           | zielony | Kod zostaje przy „Zapłacę później”, płatność z linku za kwotę po rabacie: test bazy (L, PR #337)                            |
|   4 | Rezygnacja z kodem: zwrot tego, co zapłacił | uczestnik zapłacił z kodem i rezygnuje w oknie zwrotu / dostaje zwrot / zwrot to kwota zapłacona; kod wraca według ustawienia centrum                                                                                | nowa kartka                                                                                                                           | zielony | Rezygnacja w oknie: zwrot kwoty zapłaconej z kodem: test bazy (L, PR #337)                                                  |

### Ustalone (niebieskie)

- Vouchery tak; kod rabatowy ma zakres: wszystko, konsultacje, warsztaty, jeden warsztat

## Warsztat · 5. Płaci później

Ramka `3458764688539437974` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688539437974)

Historyjka: Jako klient chcę zarezerwować miejsce i zapłacić później, gdy do warsztatu jest jeszcze czas.

### Zapłacę później

Ramka `3458764688539437975`

|  Nr | Karteczka                                                      | Zakładając / Gdy / Wtedy                                                                                                                                                                                                                      | Wcześniej                                                                                                        | Kolor   | Czym sprawdzone (01.11)                                                                                  |
| --: | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
|   1 | „Zapłacę później” do 7 dni przed warsztatem                    | do warsztatu ponad 7 dni / klient wybiera „Zapłacę później” / zapis czeka na wpłatę do 7 dni przed; w ostatnim tygodniu tylko płatność od razu                                                                                                | Testy bazy („Zapłacę później” nie w ostatnim tygodniu); end-to-end „zapłacę później” (było: Strona · 7, Zapis 3) | zielony | „Zapłacę później” nie w ostatnim tygodniu: test bazy (N); end-to-end „zapłacę później”                   |
|   2 | Przypomnienie o wpłacie                                        | klient wybrał „Zapłacę później” / zbliża się termin wpłaty / kilka dni przed terminem e-mail z linkiem do zapłaty                                                                                                                             | Test bazy (przypomnienie o wpłacie 3 dni przed, raz), test zadania w tle (było: Strona · 7, Uczestnik 4)         | zielony | Przypomnienie 3 dni przed terminem, raz: test bazy i test zadania w tle                                  |
|   3 | Brak wpłaty: miejsce wolne                                     | klient nie zapłacił do terminu / termin mija / zapis wygasa, miejsce wraca do puli albo do listy rezerwowej; mail                                                                                                                             | Test bazy (było: Strona · 7, Uczestnik 4)                                                                        | zielony | Po terminie zapis anulowany, miejsce wraca do puli albo listy: test bazy (P)                             |
|   4 | Opłata z linku w e-mailu                                       | klient ma maila z linkiem do zapłaty / płaci / zapis potwierdzony, mail z potwierdzeniem                                                                                                                                                      | nowa kartka                                                                                                      | zielony | Zarezerwowany zapis opłacony z linku jest potwierdzony: test bazy (L, PR #337); strona płatności z linku |
|   5 | Zmyślone adresy zajmują miejsca („Zapłacę później”, bezpłatny) | ktoś zapisuje się wiele razy różnymi adresami, z „Zapłacę później” albo na bezpłatny warsztat / nikt nie potwierdza zapisów z maila / miejsce wraca do puli bez potwierdzenia z maila; najwyżej 2 nieopłacone zapisy na osobę; admin to widzi | nowa kartka                                                                                                      | różowy  | Nie zrobione: bez potwierdzenia z maila i bez limitu nieopłaconych zapisów; osobne issue #269            |

### Ustalone (niebieskie)

- Zapłacę później: do 7 dni przed, inaczej miejsce wolne; w ostatnim tygodniu płatność od razu

## Warsztat · 6. Dostaje potwierdzenie i stronę zapisu

Ramka `3458764688539437976` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688539437976)

Historyjka: Jako klient chcę mieć potwierdzenie i jedno miejsce, w którym widzę swój zapis.

### Potwierdzenie, maile i strona zapisu

Ramka `3458764688539437977`

|  Nr | Karteczka                                                           | Zakładając / Gdy / Wtedy                                                                                                                                             | Wcześniej                                                                                                            |
| --: | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
|   1 | Potwierdzenie z plikiem kalendarza                                  | zapis jest potwierdzony / klient kończy zapis / widzi potwierdzenie z numerem i dostaje e-mail z plikiem kalendarza i linkiem do swojego zapisu                      | Testy treści e-maila (plik kalendarza, link do zapisu), e-mail raz, end-to-end (było: Strona · 7, Zapis 6)           |
|   2 | Strona mojego zapisu                                                | klient ma link z e-maila / otwiera go / widzi warsztat, termin, status płatności, „Dodaj do kalendarza” i „Zrezygnuj”                                                | Status, płatność, rezygnacja i „Dodaj do kalendarza” (#198): test widoku, end-to-end (było: Strona · 7, Uczestnik 1) |
|   3 | E-maile, każdy raz                                                  | zmienia się coś w zapisie / system wysyła e-mail / potwierdzenie, przypomnienie, rezygnacja, odwołanie, zmiana terminu, lista rezerwowa, wiadomość admina; każdy raz | Test bazy (każdy e-mail raz) i testy treści e-maili (było: W tle 2)                                                  |
|   4 | Przypomnienie dzień przed; przy online z linkiem                    | warsztat jest jutro / nadchodzi czas przypomnienia / uczestnik dostaje maila; przy warsztacie online z linkiem do spotkania                                          | Testy treści (link online dzień przed), test zadania w tle (było: Strona · 7, Uczestnik 4)                           |
|   5 | Link do spotkania online tylko dla zapisanych                       | warsztat jest online / ktoś niezapisany otwiera stronę warsztatu / linku nie ma; widzą go tylko potwierdzeni uczestnicy w mailu i na stronie zapisu                  | nowa kartka                                                                                                          |
|   6 | Starszy mail: link dalej prowadzi do zapisu                         | klient dostał kilka maili o zapisie / otwiera link ze starszego / widzi aktualny stan swojego zapisu                                                                 | nowa kartka                                                                                                          |
|   7 | Pomoc w kryzysie w stopce maili                                     | uczestnik dostaje dowolny mail o warsztacie / patrzy na stopkę / 112 i link do strony „Pomoc w kryzysie”                                                             | nowa kartka                                                                                                          |
|   8 | Uczestnik nie dostał maila: centrum wysyła link ponownie            | uczestnik dzwoni, że nie ma maila / admin klika „Wyślij link ponownie” / uczestnik dostaje mail z aktualnym linkiem do zapisu                                        | nowa kartka                                                                                                          |
|   9 | Mail nie dotarł (zły adres): admin to widzi                         | uczestnik podał adres z literówką / mail się odbija / admin widzi przy zapisie, że mail nie dotarł                                                                   | nowa kartka                                                                                                          |
|  10 | Warsztat online bez linku: admin dostaje alarm przed przypomnieniem | warsztat online jest jutro, a admin nie wkleił linku / zbliża się przypomnienie dla uczestników / admin dostaje alarm; przypomnienie bez linku nie wychodzi          | nowa kartka                                                                                                          |
|  11 | Faktura do płatności (inFakt)                                       | uczestnik chce fakturę / płaci za warsztat / faktura wystawiona automatycznie, jak przy wizytach                                                                     | nowa kartka                                                                                                          |
|  12 | Testy end-to-end zapisu, płatności i rezygnacji                     | warsztat z ceną jest na DEV / test zapisuje się z BLIK, rezygnuje, wchodzi z listy rezerwowej / testy przechodzą na DEV i STAGING                                    | Przechodzą na DEV i STAGING (BLIK, „zapłacę później”, rezygnacja, plik kalendarza) (było: W tle 7)                   |

### Po MVP (szare)

- 13. Certyfikat uczestnictwa
- 14. Materiały po warsztacie
- 15. Ankieta po warsztacie

## Warsztat · 7. Lista rezerwowa

Ramka `3458764688539437978` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688539437978)

Historyjka: Jako klient chcę zapisać się na listę rezerwową i dostać miejsce, gdy się zwolni.

### Lista rezerwowa

Ramka `3458764688539437979`

|  Nr | Karteczka                                            | Zakładając / Gdy / Wtedy                                                                                                     | Wcześniej                                                                                        |
| --: | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
|   1 | Zapis na listę rezerwową przy komplecie              | nie ma wolnych miejsc / klient zapisuje się na listę rezerwową / dostaje potwierdzenie i swoje miejsce w kolejce             | Strona warsztatu pokazuje „Zapisz się na listę rezerwową” (Strona · 7, Strona warsztatu 8)       |
|   2 | Zwolnione miejsce: pierwsza osoba ma 24 h na zapłatę | zwolniło się miejsce przy komplecie / system bierze pierwszą osobę z listy / dostaje e-mail z linkiem do zapłaty ważnym 24 h | Testy bazy: pierwsza osoba ma 24 h; test treści e-maila z ofertą (było: Strona · 7, Uczestnik 5) |
|   3 | Nie zapłaciła w 24 h: miejsce dla następnej          | pierwsza osoba z listy nie zapłaciła w 24 h / czas mija / oferta wygasa, miejsce dostaje następna osoba                      | Testy bazy (było: Strona · 7, Uczestnik 5)                                                       |
|   4 | Rezygnacja z listy rezerwowej                        | klient jest na liście rezerwowej / rezygnuje z linku w mailu / znika z listy, nikt mu nie proponuje miejsca                  | nowa kartka                                                                                      |

### Ustalone (niebieskie)

- Lista rezerwowa od razu: pierwsza osoba ma 24 h na zapłatę

## Warsztat · 8. Rezygnuje albo przekazuje miejsce

Ramka `3458764688539437980` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688539437980)

Historyjka: Jako uczestnik chcę zrezygnować albo oddać miejsce komuś innemu i wiedzieć, ile mi zwrócą.

### Rezygnacja i zwrot

Ramka `3458764688539437981`

|  Nr | Karteczka                                              | Zakładając / Gdy / Wtedy                                                                                                                                                                | Wcześniej                                                                                                  |
| --: | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
|   1 | Rezygnacja ze zwrotem (ponad 7 dni przed)              | do warsztatu zostało więcej niż 7 dni / uczestnik rezygnuje / pełny zwrot przez Stripe (albo anulowanie, jeśli nie zapłacił), miejsce wolne, e-mail                                     | Test bazy (pełny zwrot do 7 dni przed), test widoku; end-to-end rezygnacji (było: Strona · 7, Uczestnik 2) |
|   2 | Rezygnacja po oknie: zwrot, gdy miejsce przejmie lista | do warsztatu zostało mniej niż 7 dni / uczestnik rezygnuje / bez zwrotu, chyba że miejsce przejmie ktoś z listy rezerwowej                                                              | Testy bazy: późna rezygnacja bez zwrotu, zwrot gdy miejsce przejmie lista (było: Strona · 7, Uczestnik 3)  |
|   3 | Przekazanie miejsca innej osobie                       | uczestnik nie może przyjść / przekazuje miejsce innej osobie / dane uczestnika się zmieniają, bez zwrotu; nowa osoba dostaje maila                                                      | Test bazy: przekazanie miejsca (było: Strona · 7, Uczestnik 3)                                             |
|   4 | Nowa osoba po przekazaniu akceptuje regulamin i zgody  | uczestnik przekazał miejsce innej osobie / ta osoba dostaje maila / przed warsztatem akceptuje regulamin warsztatów i zgodę na dane; bez tego miejsce zostaje przy pierwszym uczestniku | nowa kartka                                                                                                |
|   5 | Stripe odrzuca zwrot: kwota czeka i system ponawia     | uczestnik rezygnuje ze zwrotem / Stripe odrzuca zwrot / rezygnacja zapisana, kwota zostaje do zwrotu, zadanie w tle próbuje ponownie, admin to widzi                                    | nowa kartka                                                                                                |
|   6 | Podwójne kliknięcie „Zrezygnuj”: jeden zwrot           | uczestnik klika „Zrezygnuj” dwa razy / oba kliknięcia dochodzą / jedna rezygnacja i jeden zwrot                                                                                         | nowa kartka                                                                                                |
|   7 | Mail o rezygnacji podaje kwotę i czas zwrotu           | uczestnik zrezygnował w oknie zwrotu / dostaje maila / kwota zwrotu i kiedy pieniądze wrócą                                                                                             | nowa kartka                                                                                                |

### Ustalone (niebieskie)

- Pełny zwrot do 7 dni przed; później tylko gdy miejsce przejmie rezerwa; miejsce można przekazać

## Warsztat · 9. Centrum odwołuje albo zmienia termin

Ramka `3458764688539437982` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688539437982)

Historyjka: Jako uczestnik chcę od razu wiedzieć, gdy warsztat się zmienia, i dostać pieniądze, gdy się nie odbędzie.

### Zmiany po stronie centrum

Ramka `3458764688539438012`

|  Nr | Karteczka                                                          | Zakładając / Gdy / Wtedy                                                                                                                                                    | Wcześniej                                                                                                                    |
| --: | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
|   1 | Centrum odwołuje: mail i pełny zwrot                               | admin odwołuje warsztat / zapisani czekają / każdy dostaje e-mail i pełny zwrot automatycznie                                                                               | Test odwołania: zwrot każdemu, kto zapłacił, e-mail do wszystkich; test bazy (było: Strona · 7, Uczestnik 6)                 |
|   2 | Centrum zmienia termin: można zostać albo zrezygnować ze zwrotem   | admin przenosi warsztat / zapisani dostają e-mail / mogą zostać albo zrezygnować z pełnym zwrotem, niezależnie od okna                                                      | Test bazy: nowy termin, pełny zwrot w każdej chwili, e-mail; plik kalendarza jako zmiana (było: Strona · 7, Uczestnik 7)     |
|   3 | Lista rezerwowa też dostaje maila o odwołaniu albo zmianie terminu | na warsztat czekają osoby z listy rezerwowej / centrum odwołuje albo przenosi warsztat / one też dostają maila; przy zmianie terminu zostają na liście albo z niej wypadają | nowa kartka                                                                                                                  |
|   4 | Za mało chętnych: admin decyduje                                   | warsztat ma minimum osób / minimum się nie uzbiera / kilka dni przed terminem wpłat admin dostaje przypomnienie i decyduje; system sam nie odwołuje                         | Testy bazy: minimum potwierdza warsztat, przypomnienie raz; dashboard admina prosi o decyzję (było: Strona · 7, Uczestnik 8) |
|   5 | Zmiana prowadzącego: mail do uczestników                           | prowadząca nie może poprowadzić warsztatu / admin zmienia prowadzącego / uczestnicy dostają maila; mogą zrezygnować z pełnym zwrotem                                        | nowa kartka                                                                                                                  |
|   6 | Odwołanie warsztatu z kodem: co z kodem                            | uczestnik zapłacił z kodem rabatowym / centrum odwołuje warsztat / pełny zwrot zapłaconej kwoty; kod wraca, a admin może przedłużyć jego ważność                            | nowa kartka                                                                                                                  |

### Ustalone (niebieskie)

- Minimum w warsztacie; potwierdzony po minimum albo przez admina; nigdy sam nie odwołuje

## Warsztat · 10. Próby obejścia i oszustwa

Ramka `3458764688539438013` · [w Miro](https://miro.com/app/board/uXjVEaKfAoo=/?moveToWidget=3458764688539438013)

Historyjka: Jako centrum chcę, żeby nikt nie zajął miejsc bez płacenia, nie zapłacił mniej i nie dostał cudzego zapisu ani zwrotu.

### Zapis, płatność i linki

Ramka `3458764688539438014`

|  Nr | Karteczka                                              | Zakładając / Gdy / Wtedy                                                                                                                                      | Wcześniej                                                                                 |
| --: | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
|   1 | Cena, miejsca i terminy liczone w bazie                | ktoś zmienia formularz albo adres / wysyła zapis / cena, miejsca i terminy sprawdzane w bazie; obcy nie widzą cudzych zapisów                                 | Test bazy: cena, miejsca, terminy liczone w bazie; obcy nie widzą zapisów (było: W tle 6) |
|   2 | Ochrona przed botami przy zapisie                      | bot wysyła formularz zapisu / bez potwierdzenia Turnstile albo z wypełnionym ukrytym polem / odmowa                                                           | nowa kartka                                                                               |
|   3 | Linku do zapisu nie da się zgadnąć                     | ktoś próbuje zgadnąć adres strony zapisu / wpisuje losowe linki / nie trafia na żaden zapis                                                                   | nowa kartka                                                                               |
|   4 | Fałszywe powiadomienie „zapłacono” jest odrzucane      | ktoś wysyła do strony powiadomienie udające Stripe / dochodzi ono bez ważnego podpisu / jest odrzucone, zapis zostaje nieopłacony                             | nowa kartka                                                                               |
|   5 | Spór o płatność kartą (chargeback): admin to widzi     | uczestnik zgłasza w banku, że nie płacił / Stripe zgłasza spór / admin dostaje powiadomienie i widzi przy zapisie, że płatność jest sporna                    | nowa kartka                                                                               |
|   6 | Zapis na cudze dane: ta osoba może zrezygnować z maila | ktoś zapisuje na warsztat cudzy adres / ta osoba dostaje maila / może jednym kliknięciem zrezygnować; bez płatności nic jej nie kosztuje                      | nowa kartka                                                                               |
|   7 | HTML w polach bezpieczny                               | ktoś wpisuje w imię albo uwagi znaczniki HTML / dane trafiają do maili, portali i eksportu CSV / widać je jako zwykły tekst; eksport CSV nie uruchamia formuł | nowa kartka                                                                               |
