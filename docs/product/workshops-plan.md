# Warsztaty: plan i postęp

Pełna mapa (karteczki z przykładami „Zakładając / Gdy / Wtedy”) jest na
tablicy Miro, kolumna „Strona · 7. Warsztaty” i jej ramki „elementy”.

## Postęp

Stan na 22.10 · PR-y: 0 / 7 zmergowanych

- [ ] **PR 1 · Baza** (czeka na CI i merge)
  - [x] warsztat: opis w edytorze, dla kogo, program, okładka, SEO, minimum, koniec zapisów, potwierdzenie, odwołanie z powodem
  - [x] współprowadzący i link do spotkania online (widzą go tylko admin, prowadzący i potwierdzeni uczestnicy)
  - [x] opublikowany warsztat blokuje prowadzących i salę w rezerwacji wizyt; kolizja z wizytą albo innym warsztatem jest odrzucana
  - [x] zapisy: trzymanie miejsca, dane, „Zapłacę później” do 7 dni przed, bezpłatne potwierdzenie, rezygnacja, przekazanie miejsca
  - [x] lista rezerwowa: wolne miejsce dostaje pierwsza osoba na 24 h
  - [x] zwroty: pełny do 7 dni przed; później, gdy miejsce przejmie lista; pełny, gdy odwołuje centrum
  - [x] wygasanie (trzymanie, oferta, brak wpłaty) i funkcja dla zadania w tle
  - [x] testy SQL, typy
  - [ ] CI zielone
  - [ ] zmergowany i sprawdzony na DEV
- [ ] **PR 2 · Portal admina** — lista, tworzenie i edycja, termin, kolizje, podgląd, publikacja, potwierdzenie, wycofanie; CMS strony Warsztaty i wspólne zasady
- [ ] **PR 3 · Strona** — /warsztaty (nadchodzące, minione, filtr formy) i /warsztaty/[adres], dane Event, mapa strony, sekcja na stronie głównej, przełącznik w menu
- [ ] **PR 4 · Zapis i płatność** — formularz, Stripe (karta, BLIK, P24) albo płatność później, kody rabatowe z zakresem, bezpłatne, potwierdzenie i e-mail z plikiem kalendarza
- [ ] **PR 5 · Po zapisie** — strona zapisu, rezygnacja i zwroty, przekazanie miejsca, przypomnienia o wpłacie i o warsztacie, lista rezerwowa, odwołanie przez centrum
- [ ] **PR 6 · Uczestnicy w portalach** — lista uczestników, eksport, ręczny zapis, wiadomość do wszystkich, obecność, kalendarz, dashboard, powiadomienia, portal specjalisty
- [ ] **PR 7 · Jakość** — e2e na DEV i STAGING, tabela „Każda strona”, Lighthouse, dokumentacja

**Zasada aktualizacji:** każdy krok odhacza się w commicie, który go
kończy; PR jest odhaczony, gdy jest zmergowany i sprawdzony na DEV.

## 1. Ustalenia (22.10)

- Warsztaty są w MVP; na razie jednorazowe (cykl spotkań po MVP).
- Pełny zwrot do 7 dni przed. Później zwrot tylko wtedy, gdy miejsce
  przejmie ktoś z listy rezerwowej; miejsce można przekazać innej osobie.
  Gdy odwołuje centrum, zawsze pełny zwrot.
- Lista rezerwowa od razu: zwolnione miejsce dostaje pierwsza osoba i ma
  24 godziny na zapłatę, potem następna.
- Link do spotkania online wkleja admin; widać go tylko w e-mailu i na
  stronie zapisu, nigdy na stronie publicznej.
- Kontakt do uczestników widzi prowadzący (i admin), inni specjaliści nie.
- Vouchery działają na warsztaty; kod rabatowy dostaje zakres: wszystko,
  konsultacje, warsztaty albo jeden warsztat (istniejące kody: konsultacje).
- „Zapłacę później”: wpłata do 7 dni przed, inaczej miejsce się zwalnia;
  w ostatnim tygodniu tylko płatność od razu. Przypomnienie o wpłacie
  kilka dni przed terminem.
- Minimum osób ustawia admin. Warsztat jest „Potwierdzony”, gdy zapłaci
  minimum osób albo admin go potwierdzi; system sam go nie odwołuje (admin
  dostaje przypomnienie).
- Koniec zapisów ustawia admin (domyślnie 24 godziny przed).

## 2. Architektura

- **Blokady:** opublikowany warsztat zapisuje urlop (`specialist_time_off`)
  każdemu prowadzącemu i blokadę sali (`room_availability_exceptions`,
  na siatce godzin centrum), oznaczone `workshop_id`. Wolne terminy,
  trzymanie terminu i rezerwacja przez centrum już je omijają, więc ich
  funkcje się nie zmieniają. Blokady zmienia tylko warsztat.
- **Miejsce zajmuje** zapis potwierdzony, czekający na wpłatę przed
  terminem, trzymany przed końcem trzymania albo zaproponowany z listy
  przed końcem oferty. Każda zmiana miejsc blokuje najpierw wiersz
  warsztatu, więc dwie osoby nie dostaną ostatniego miejsca.
- **Pieniądze:** zapis pamięta wpłatę (`paid_minor`), należny zwrot
  (`refund_due_minor`) i zwrot wykonany (`refunded_minor`). Stripe
  (płatność i zwrot) dochodzi w PR 4 i PR 5.
- Gość działa przez funkcje dla serwera strony (`service_role`), jak przy
  wizytach; admin i prowadzący czytają zapisy (bez skrótów tokenów).
