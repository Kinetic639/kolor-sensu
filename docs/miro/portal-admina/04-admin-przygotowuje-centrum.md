# Mapa ścieżki „Admin: przygotowuje centrum do startu”

Pierwsze uruchomienie centrum na pustej bazie (produkcja albo STAGING klienta): co admin ustawia, w jakiej kolejności i czego system pilnuje, zanim pierwszy klient zarezerwuje. Kartki z ekranów (Ustawienia, Gabinety, Oferta) są tu tylko jako odnośniki „→”, a w tej mapie są kartki o kolejności i o tym, czego brakuje.

Opis mapy: Od pustego portalu do pierwszej rezerwacji na stronie.

| Kolumna                            | MVP | Po MVP | Pytania |
| ---------------------------------- | --: | -----: | ------: |
| 1. Pierwsze konto admina           |   3 |      0 |       0 |
| 2. Dane firmy i centrum            |   3 |      0 |       0 |
| 3. Lokalizacja, gabinety i godziny |   4 |      0 |       0 |
| 4. Usługi i zasady rezerwacji      |   4 |      0 |       0 |
| 5. Zespół                          |   2 |      0 |       0 |
| 6. Treści strony                   |   3 |      0 |       0 |
| 7. Sprawdzenie przed startem       |   6 |      0 |       1 |

## Start · 1. Pierwsze konto admina

Historyjka: Jako właściciel chcę mieć pierwsze konto admina i bezpiecznie dodać kolejnych.

|  Nr | Kartka                              | Kolor   | Zakładając / Gdy / Wtedy                                                        | Czym sprawdzone                     |
| --: | ----------------------------------- | ------- | ------------------------------------------------------------------------------- | ----------------------------------- |
|   1 | Pierwsze konto admina w nowej bazie | różowy  | pusta baza produkcyjna / zakładamy pierwsze konto / ma dostęp do portalu admina | lista „Przed startem”, nie zrobione |
|   2 | Kolejni admini z zaproszenia        | zielony | → Admin · 15, kartka 9                                                          | access B i D                        |
|   3 | Ostatni admin zostaje               | żółty   | → Admin · 15, kartka 10                                                         | bez testu                           |

## Start · 2. Dane firmy i centrum

|  Nr | Kartka                                      | Kolor   | Zakładając / Gdy / Wtedy                                                  | Czym sprawdzone |
| --: | ------------------------------------------- | ------- | ------------------------------------------------------------------------- | --------------- |
|   1 | Dane firmy: nazwa, NIP, adres               | zielony | admin wpisuje dane / stopka strony i maili je ma                          | centre E        |
|   2 | Bez danych firmy strona mówi, czego brakuje | żółty   | puste dane / strona i maile / nie pokazują pustych pól                    | bez testu       |
|   3 | E-mail centrum do wiadomości z formularza   | różowy  | w ustawieniach nie ma e-maila / klient wysyła formularz / wiadomość ginie | #245 otwarte    |

## Start · 3. Lokalizacja, gabinety i godziny

|  Nr | Kartka                            | Kolor   | Zakładając / Gdy / Wtedy                                                                     | Czym sprawdzone |
| --: | --------------------------------- | ------- | -------------------------------------------------------------------------------------------- | --------------- |
|   1 | Lokalizacja                       | zielony | → Admin · 15, kartka 2                                                                       |                 |
|   2 | Gabinet bez godzin jest zamknięty | zielony | admin dodał gabinet bez godzin / specjalista ustawia w nim dyżur / odmowa: gabinet zamknięty | avail U (#20)   |
|   3 | Godziny i wyjątki                 | zielony | → Admin · 6, kartki 2 i 3                                                                    |                 |
|   4 | Dni zamknięcia i święta na rok    | zielony | admin dodaje święta jednym kliknięciem / brak terminów w te dni                              | centre B i C    |

## Start · 4. Usługi i zasady rezerwacji

|  Nr | Kartka                                               | Kolor   | Zakładając / Gdy / Wtedy                                                  | Czym sprawdzone |
| --: | ---------------------------------------------------- | ------- | ------------------------------------------------------------------------- | --------------- |
|   1 | Katalog usług                                        | zielony | → Admin · 7                                                               |                 |
|   2 | Zasady: okno odwołań, wyprzedzenie, siatka, przerwy  | zielony | → Admin · 15, kartka 3                                                    |                 |
|   3 | Rezerwacje wyłączone, dopóki centrum nie jest gotowe | zielony | admin trzyma rezerwacje wyłączone / klient widzi kontakt zamiast kreatora | booking K       |
|   4 | Regulamin i polityka prywatności                     | zielony | → „Strona · 6. Na każdej stronie i strony prawne”                         |                 |

## Start · 5. Zespół

|  Nr | Kartka                            | Kolor   | Zakładając / Gdy / Wtedy                                                                | Czym sprawdzone |
| --: | --------------------------------- | ------- | --------------------------------------------------------------------------------------- | --------------- |
|   1 | Pierwszy specjalista              | zielony | → ścieżka „nowy specjalista w centrum”                                                  |                 |
|   2 | Admin, który sam przyjmuje (Anna) | zielony | Anna jest adminem i specjalistką / przechodzi ścieżkę jako specjalista / ma oba portale | e2e `auth`      |

## Start · 6. Treści strony

|  Nr | Kartka                                              | Kolor   | Zakładając / Gdy / Wtedy                                  | Czym sprawdzone   |
| --: | --------------------------------------------------- | ------- | --------------------------------------------------------- | ----------------- |
|   1 | Teksty stron w CMS                                  | zielony | → Admin · 9                                               |                   |
|   2 | Sekcje opcjonalne wyłączone, dopóki nie mają treści | zielony | pusta sekcja / strona jej nie pokazuje                    | testy bazy sekcji |
|   3 | Zdjęcia gabinetów i specjalistów                    | zielony | → Admin · 6, kartka 6; ścieżka „nowy specjalista”, krok 3 |                   |

## Start · 7. Sprawdzenie przed startem

Historyjka: Jako właściciel chcę przed startem przejść jedną listę i wiedzieć, że wszystko jest ustawione.

|  Nr | Kartka                                                         | Kolor  | Zakładając / Gdy / Wtedy                                                  | Czym sprawdzone       |
| --: | -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- | --------------------- |
|   1 | Stripe na prawdziwych kluczach, płatność i zwrot na małą kwotę | różowy | produkcja / płacimy 2 zł i zwracamy / oba widoczne przy wizycie           | lista „Przed startem” |
|   2 | Resend: domena i próbka każdego maila                          | różowy | produkcja / wysyłamy każdy mail na prawdziwą skrzynkę                     | lista „Przed startem” |
|   3 | Zadania nocne działają                                         | różowy | produkcja / noc / przypomnienia, anulowanie nieopłaconych, retencja       | lista „Przed startem” |
|   4 | Kopia zapasowa bazy codziennie                                 | różowy | produkcja / codzienny zrzut                                               | lista „Przed startem” |
|   5 | Pierwsza rezerwacja próbna od A do Z                           | różowy | wszystko ustawione / rezerwujemy, płacimy, odwołujemy / każdy krok działa | lista „Przed startem” |
|   6 | Ustalenia z księgową                                           | różowy | faktury, VAT, kasa fiskalna / decyzje zapisane                            | lista „Przed startem” |

Pytania (pomarańczowe): Czy portal ma mieć „listę startową” (co jeszcze nie jest ustawione), czy wystarczy ta mapa?
