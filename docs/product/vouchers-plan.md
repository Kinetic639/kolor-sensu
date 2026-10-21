# Kody rabatowe i vouchery: plan i postęp

## Postęp

Stan na 21.10 · PR-y: 0 / 5 zmergowanych (PR 1 w toku)

- [ ] **PR 1 · Kody rabatowe: baza i portal** — [#154](https://github.com/Kinetic639/kolor-sensu/pull/154) · czeka na merge
  - [x] baza: kody, rabat przy wizycie (cena katalogowa, rabat, kod), funkcje i testy SQL
  - [x] kontrakty i `@repo/supabase`
  - [x] portal: Kody rabatowe (lista z użyciami, dodawanie, edycja, wyłączanie)
  - [x] testy (kontrakt 6, supabase 5, SQL), typy, lint
  - [x] CI zielone (po uzupełnieniu danych gościa w teście SQL)
  - [ ] zmergowany i sprawdzony na DEV
- [ ] **PR 2 · Kody rabatowe w rezerwacji** — pole „Kod rabatowy” na kroku Dane, cena po rabacie w podsumowaniu, płatności, e-mailach i w portalu; rabat 100% bez płatności
- [ ] **PR 3 · Vouchery: baza i portal** — voucher na kwotę, saldo, ważność 12 mies., ręczne wystawienie, unieważnienie
- [ ] **PR 4 · Vouchery: zakup na stronie** — /vouchery (CMS), kwota, dane, Stripe, e-mail z PDF
- [ ] **PR 5 · Vouchery w rezerwacji** — kod vouchera w kreatorze, saldo, dopłata, zwrot na saldo przy odwołaniu

**Zasada aktualizacji:** każdy krok odhacza się w commicie, który go
kończy; PR jest odhaczony, gdy jest zmergowany i sprawdzony na DEV.

## 1. Ustalenia (21.10)

- Oba: najpierw kody rabatowe, potem vouchery podarunkowe na tym samym polu
  „kod” w kreatorze.
- **Kod rabatowy:** procent albo kwota; ważny od–do (daty opcjonalne);
  admin może go wyłączyć. Bez limitów użyć i bez ograniczeń do usług (na
  później, jeśli będą potrzebne).
- **Voucher:** na kwotę, z saldem (tańsza wizyta zostawia resztę, droższa:
  dopłata); kupowany online na stronie, e-mail z PDF; ważny 12 miesięcy;
  kwoty 150, 200, 300 zł i dowolna od 100 zł.
- W jednej wizycie albo kod rabatowy, albo voucher, nie oba.
- Bez faktur. Regulamin voucherów: treść od centrum; VAT od voucherów:
  pytanie do księgowej.

## 2. Architektura

- **Cena wizyty** (`appointments.price_minor`) jest kwotą do zapłaty: kod
  ją obniża, a wizyta pamięta cenę katalogową (`list_price_minor`), rabat
  (`discount_minor`) i kod (`discount_code_id`). Płatności Stripe, zwroty,
  e-maile i listy działają bez zmian na kwocie po rabacie.
- Kod wpisuje się na kroku **Dane**, zanim powstanie płatność; zmiana
  kodu unieważnia rozpoczętą płatność, a krok Płatność tworzy nową.
- Rabat 100%: wizyta jest potwierdzana bez Stripe (osobna funkcja w bazie).
- Wszystko sprawdza baza (daty, wyłączenie, stan wizyty); strona tylko
  pokazuje wynik.
