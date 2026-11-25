# Mapa ścieżki „Admin i specjalista: nowy specjalista w centrum”

Wspólna dla obu portali. Kroki idą na zmianę: w nazwie kroku jest, kto działa (Admin albo Specjalista), a w mapie kartki admina i specjalisty mają ten sam kolor stanu, różni je tylko etykieta kroku. Format jak „Klient: umawia wizytę”.

Opis mapy: Od zaproszenia do chwili, gdy klient może umówić się do nowego specjalisty na stronie, i z powrotem, gdy specjalista odchodzi.

| Kolumna                         | Kto         |                                   MVP | Ustalone | Pytania |
| ------------------------------- | ----------- | ------------------------------------: | -------: | ------: |
| 1. Zaprasza                     | Admin       |                                     4 |        0 |       0 |
| 2. Ustawia hasło i wchodzi      | Specjalista |                                     5 |        0 |       0 |
| 3. Pisze profil                 | Specjalista |                                     5 |        0 |       0 |
| 4. Akceptuje albo odsyła profil | Admin       |                                     4 |        1 |       1 |
| 5. Wybiera usługi i ceny        | Specjalista |                                     6 |        1 |       0 |
| 6. Akceptuje oferty             | Admin       |                                     3 |        0 |       0 |
| 7. Ustawia dyżury               | Specjalista | → ekran „Specjalista · 3. Dostępność” |          |         |
| 8. Włącza na stronie            | Admin       |                                     4 |        1 |       1 |
| 9. Specjalista odchodzi         | Admin       |                                     3 |        0 |       1 |
| 10. Próby obejścia              |             |                                     5 |        0 |       0 |

## Zespół · 1. Admin zaprasza

Historyjka: Jako admin chcę zaprosić nową osobę mailem, żeby sama założyła konto.

|  Nr | Kartka                                             | Kolor   | Zakładając / Gdy / Wtedy                                                                                                       | Czym sprawdzone      |
| --: | -------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
|   1 | Zaproszenie mailem                                 | zielony | admin wpisuje imię, nazwisko i e-mail / klika „Zaproś” / osoba dostaje mail z linkiem                                          | access A             |
|   2 | Adres, który już ma konto                          | zielony | osoba jest już adminem / admin ją zaprasza / konto dostaje rolę specjalisty, bez drugiego konta (wielkość liter bez znaczenia) | access E             |
|   3 | Nowy specjalista startuje nieaktywny i niewidoczny | zielony | zaproszenie wysłane / klient przegląda stronę / nowej osoby nie ma                                                             | access A, specialist |
|   4 | Ponowne zaproszenie, gdy link wygasł               | żółty   | link sprzed tygodnia / admin zaprasza jeszcze raz / nowy link działa                                                           | bez testu            |

## Zespół · 2. Specjalista ustawia hasło i wchodzi

Historyjka: Jako specjalista chcę z zaproszenia ustawić hasło i od razu wejść do swojego portalu.

|  Nr | Kartka                                            | Kolor   | Zakładając / Gdy / Wtedy                                                                       | Czym sprawdzone                     |
| --: | ------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- | ----------------------------------- |
|   1 | Hasło z linku zaproszenia                         | zielony | specjalista klika link / ustawia hasło / jest w swoim portalu                                  | access A, e2e logowania specjalisty |
|   2 | Zły, wygasły albo użyty link                      | żółty   | link użyty drugi raz / klika / logowanie z komunikatem                                         | bez testu (plan testów 1.5)         |
|   3 | Nieaktywny ma portal, żeby się przygotować        | zielony | admin jeszcze nie włączył konta / specjalista się loguje / może pisać profil i ustawiać ofertę | access A                            |
|   4 | Dashboard mówi, czego brakuje                     | żółty   | brak profilu, usług i dyżurów / dashboard / lista kroków z linkami                             | bez testu                           |
|   5 | Admin, który jest też specjalistą, ma oba portale | zielony | Anna jest adminem i specjalistką / loguje się / wchodzi do obu                                 | e2e `auth`                          |

## Zespół · 3. Specjalista pisze profil

Historyjka: Jako specjalista chcę opisać siebie tak, jak klienci zobaczą mnie na stronie.

|  Nr | Kartka                                     | Kolor   | Zakładając / Gdy / Wtedy                                                       | Czym sprawdzone    |
| --: | ------------------------------------------ | ------- | ------------------------------------------------------------------------------ | ------------------ |
|   1 | Szkic zapisuje się                         | zielony | specjalista pisze opis / zapisuje / jutro szkic jest                           | specialist, access |
|   2 | Zdjęcie i kadr                             | żółty   | dodaje zdjęcie, kadruje / zdjęcie w kadrze na stronie                          | jedn. komponentów  |
|   3 | Specjalizacje, podejście, języki, forma    | żółty   | wypełnia pola / podgląd pokazuje je jak na stronie                             | jedn. widoku       |
|   4 | Komunikat o specjalizacji znika po dodaniu | różowy  | dodaje specjalizację / komunikat „dodaj specjalizację” znika                   | #29 otwarte        |
|   5 | Wysłanie do akceptacji                     | zielony | profil gotowy / klika „Wyślij” / admini dostają powiadomienie, specjalista nie | access G           |

## Zespół · 4. Admin akceptuje albo odsyła profil

Historyjka: Jako admin chcę sprawdzić profil, zanim pokaże się klientom, i odesłać go z uwagą, gdy czegoś brakuje.

|  Nr | Kartka                                                             | Kolor   | Zakładając / Gdy / Wtedy                                                            | Czym sprawdzone      |
| --: | ------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------- | -------------------- |
|   1 | Podgląd jak na stronie                                             | żółty   | profil czeka / admin otwiera podgląd / wygląda jak na stronie                       | bez testu            |
|   2 | Akceptacja publikuje profil pod adresem z imienia i nazwiska (#26) | zielony | Anna Nowak / admin akceptuje / /specjalisci/anna-nowak; adres z konta przekierowuje | specialist W         |
|   3 | Odesłanie z powodem                                                | zielony | brakuje zdjęcia / admin odsyła z uwagą / specjalista widzi powód i poprawia         | specialist, access G |
|   4 | Opublikowany zostaje, póki nowy szkic czeka                        | żółty   | profil na stronie, specjalista zmienia opis / strona pokazuje stary do akceptacji   | bez osobnego testu   |

Ustalone (niebieskie): Profil pokazuje się dopiero po akceptacji admina.

Pytania (pomarańczowe): Blokować „Widoczny” do pierwszej akceptacji profilu?

## Zespół · 5. Specjalista wybiera usługi i ceny

Historyjka: Jako specjalista chcę wybrać z katalogu centrum usługi, które prowadzę, i ustalić swoją cenę.

|  Nr | Kartka                                | Kolor   | Zakładając / Gdy / Wtedy                                                                    | Czym sprawdzone                                |
| --: | ------------------------------------- | ------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
|   1 | Usługa z katalogu z ceną              | zielony | specjalista wybiera „Terapia indywidualna” i 150 zł / zapisuje / oferta czeka na akceptację | services C–Q                                   |
|   2 | Forma: stacjonarnie, online albo obie | żółty   | zaznacza tylko online / klient widzi tylko terminy online                                   | częściowe testy                                |
|   3 | Własny czas trwania                   | żółty   | usługa 50 min, specjalista 60 / kreator liczy 60                                            | pole jest; bez testu                           |
|   4 | Lista odświeża się po dodaniu         | żółty   | zapisuje / lista od razu z nową usługą                                                      | w kodzie poprawione; #28 do sprawdzenia na DEV |
|   5 | Cena 0 zł albo co najmniej 2 zł       | różowy  | wpisuje 1 zł / odmowa                                                                       | #256                                           |
|   6 | Tylko swoje oferty                    | zielony | specjalista B próbuje zmienić ofertę A / odmowa                                             | services K                                     |

Ustalone (niebieskie): Ta sama usługa może mieć różne ceny u różnych specjalistów (booking AD).

## Zespół · 6. Admin akceptuje oferty

Historyjka: Jako admin chcę zatwierdzić usługi i ceny specjalisty, zanim trafią do Oferty i Cennika.

|  Nr | Kartka                                                | Kolor   | Zakładając / Gdy / Wtedy                                                   | Czym sprawdzone |
| --: | ----------------------------------------------------- | ------- | -------------------------------------------------------------------------- | --------------- |
|   1 | Oferta czeka na akceptację                            | zielony | specjalista dodał usługę / admin widzi ją przy specjaliście i przy usłudze | services U      |
|   2 | Akceptacja albo wstrzymanie                           | zielony | admin akceptuje / oferta na stronie; wstrzymuje / znika                    | services U i T  |
|   3 | Usługa wyłączona przez centrum chowa wszystkie oferty | zielony | admin wyłącza usługę / nikt jej nie prowadzi na stronie                    | services R      |

## Zespół · 7. Specjalista ustawia dyżury

Kolumna z odnośnikiem do ekranu „Specjalista · 3. Dostępność” (szablon tygodnia, godziny gabinetu, nieobecności). Kartki są tam, żeby nie były w dwóch miejscach.

## Zespół · 8. Admin włącza specjalistę na stronie

Historyjka: Jako admin chcę jednym ruchem pokazać specjalistę klientom, gdy wszystko jest gotowe.

|  Nr | Kartka                             | Kolor   | Zakładając / Gdy / Wtedy                                                                     | Czym sprawdzone      |
| --: | ---------------------------------- | ------- | -------------------------------------------------------------------------------------------- | -------------------- |
|   1 | Aktywny i widoczny                 | zielony | profil, oferta i dyżury gotowe / admin włącza oba / klient widzi specjalistę i wolne terminy | access F, services S |
|   2 | Aktywny, ale niewidoczny           | zielony | admin wyłącza „Widoczny” / profil znika ze strony, admin dalej zapisuje za klienta           | access F, booking X  |
|   3 | Czego brakuje do rezerwacji online | żółty   | brak dyżurów / admin włącza / widzi, czego brakuje                                           | bez testu            |
|   4 | Kolor w kalendarzu                 | zielony | admin wybiera kolor / kalendarz w tym kolorze                                                | `colors_domain.sql`  |

Ustalone (niebieskie): Rezerwacja online wymaga: aktywny, widoczny, usługa z ceną, dyżury.

Pytania (pomarańczowe): Czy admin dostaje znać, gdy specjalista ma wszystko gotowe?

## Zespół · 9. Specjalista odchodzi

Historyjka: Jako admin chcę wyłączyć specjalistę tak, żeby żaden klient nie został z wizytą bez specjalisty.

|  Nr | Kartka                                          | Kolor   | Zakładając / Gdy / Wtedy                                                 | Czym sprawdzone             |
| --: | ----------------------------------------------- | ------- | ------------------------------------------------------------------------ | --------------------------- |
|   1 | Dezaktywacja z przyszłymi wizytami: ostrzeżenie | żółty   | specjalista ma 3 wizyty / admin dezaktywuje / ostrzeżenie z liczbą wizyt | ostrzeżenie jest; bez testu |
|   2 | Dezaktywowany znika ze strony i terminów        | zielony | admin dezaktywuje / profil i terminy znikają, stary adres nie działa     | services S, specialist      |
|   3 | Odebranie dostępu do portalu                    | zielony | admin odbiera rolę / osoba nie wejdzie                                   | access D                    |

Pytania (pomarańczowe): Co z przyszłymi wizytami odchodzącego specjalisty: przenieść, odwołać ze zwrotem?

## Zespół · 10. Próby obejścia

|  Nr | Kartka                                            | Kolor   | Zakładając / Gdy / Wtedy                                                                  | Czym sprawdzone         |
| --: | ------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------- | ----------------------- |
|   1 | Specjalista sam się nie opublikuje ani nie włączy | zielony | specjalista próbuje włączyć „Aktywny” albo „Widoczny” albo dać sobie rolę admina / odmowa | access C                |
|   2 | Specjalista nie zmieni adresu profilu             | zielony | specjalista zmienia adres / odmowa, tylko admin                                           | specialist W            |
|   3 | Specjalista nie widzi innych użytkowników portali | zielony | specjalista pyta o listę użytkowników / pusto                                             | access B                |
|   4 | Specjalista nie zaakceptuje sam swojej oferty     | zielony | specjalista zmienia stan oferty / odmowa                                                  | services K i U          |
|   5 | Nieopublikowany profil nie wycieka przez API      | zielony | ktoś pyta API o nieopublikowany adres / brak danych                                       | e2e `specialist-domain` |
