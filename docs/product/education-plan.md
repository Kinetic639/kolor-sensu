# Edukacja: artykuły i e-booki — plan i postęp

## Postęp

Stan na 21.10 · PR-y: 6 / 6 zmergowanych (do sprawdzenia na DEV z opublikowaną treścią) · kartki MVP: 0 / 57 zielonych

- [x] **PR 1 · Edytor artykułów** — [#134](https://github.com/Kinetic639/kolor-sensu/pull/134)
  - [x] kontrakt profilu „artykuł” (bloki, czas czytania, śródtytuły)
  - [x] renderer na serwerze i spis treści
  - [x] edytor: „Wstaw”, menu „/”, przeciąganie i przesuwanie, wklejanie zdjęć, tabela
  - [x] testy (kontrakt 13, renderer 9, edytor 10) i Storybook
  - [x] CI zielone
  - [x] zmergowany do develop
- [x] **PR 2 · Baza Edukacji** — [#136](https://github.com/Kinetic639/kolor-sensu/pull/136) (na PR 1)
  - [x] migracja: kategorie, artykuły, e-booki, przekierowania, PDF
  - [x] kontrakty i `@repo/supabase/education`
  - [x] testy (SQL, kontrakty 10, supabase 6) i dokumentacja
  - [x] CI zielone (po poprawce testu w #138)
  - [x] zmergowany do develop
  - [x] migracja na DEV
- [ ] **PR 3 · Portal admina** — [#141](https://github.com/Kinetic639/kolor-sensu/pull/141) · zmergowany 21.10, na DEV
  - [x] nawigacja i okruszki: Artykuły, E-booki
  - [x] Artykuły: lista z filtrami (stan, kategoria, szukanie), nowy artykuł
  - [x] Artykuł: podstawy, treść w edytorze, ludzie i powiązania, SEO, publikacja, wycofanie, usuwanie
  - [x] Kategorie: dodawanie, edycja, usuwanie
  - [x] E-booki: lista, opis, Naffy i film, fragment PDF, SEO, publikacja
  - [x] testy (listy i adresy 7), typy, lint
  - [x] CI zielone
  - [x] zmergowany do develop, wdrożony na DEV
  - [ ] sprawdzony na DEV (klik po portalu jako admin)
- [ ] **PR 4 · Strony artykułów** — [#143](https://github.com/Kinetic639/kolor-sensu/pull/143) · zmergowany 21.10 · /edukacja, lista, kategoria, artykuł, powiązania, menu, podgląd szkicu, zakładka CMS Edukacja
  - [x] dane strony: artykuły, kategorie, powiązania, przekierowania, podgląd szkicu
  - [x] /edukacja: najnowsze artykuły (do tej pory „wkrótce”)
  - [x] /edukacja/artykuly i kategorie: karty, filtr kategorii jako adresy
  - [x] artykuł: nagłówek, okładka, spis treści, treść, udostępnianie, źródła, „Sprawdzone przez”, informacja o terapii, usługi, specjaliści, „Przeczytaj też”, dane dla Google
  - [x] artykuły autora na profilu, „Warto przeczytać” na stronie usługi, menu Edukacji, mapa strony
  - [x] „Podgląd” w portalu; zakładka CMS Edukacja (`education_page`)
  - [x] testy (widok 9, UI 5, mapa strony, podgląd, kontrakt 2, SQL), typy, lint
  - [x] CI zielone (po dopisaniu udostępniania do listy wysp klienckich)
  - [x] zmergowany do develop
  - [ ] sprawdzony na DEV (lista, artykuł, przekierowanie, podgląd, Lighthouse)
- [ ] **PR 5 · Strony e-booków** — [#145](https://github.com/Kinetic639/kolor-sensu/pull/145) · zmergowany 21.10 · katalog, strona e-booka, film, fragment, karta w artykule
  - [x] dane: e-booki, przekierowania, fragment PDF pod czytelną nazwą
  - [x] /edukacja/ebooki i e-booki na /edukacja, „E-booki” w menu, mapa strony
  - [x] strona e-booka: okładka, H1, „Zobacz cenę i kup na Naffy”, „Pobierz darmowy fragment”, opis, „Dla kogo”, „Co jest w środku”, dane dla Google (Book)
  - [x] film po kliknięciu (YouTube bez ciasteczek, Vimeo bez śledzenia), okładka zamiast miniatury
  - [x] kategoria cookies „Mapy, filmy i treści zewnętrzne” (wersja zgody 2: wszyscy zapytani ponownie), domyślna polityka cookies
  - [x] karta e-booka pod artykułem
  - [x] testy (widok 5, film 2, UI 4, mapa strony), typy, lint
  - [x] CI zielone (e2e banera cookies poprawiony na nową nazwę i wersję)
  - [x] zmergowany do develop
  - [ ] sprawdzony na DEV (z opublikowanym e-bookiem)
- [ ] **PR 6 · SEO i jakość** — [#147](https://github.com/Kinetic639/kolor-sensu/pull/147) · zmergowany 21.10 · dane dla Google, obrazki, mapa strony, e2e, tabela „Każda strona”
  - [x] dane dla Google: Article (PR 4), Book (PR 5)
  - [x] obrazki do udostępniania: okładka albo własny, inaczej generowany z tytułem
  - [x] mapa strony z datami zmian (PR 4, PR 5)
  - [x] e2e: Edukacja (axe, H1, linki, telefon i komputer, film, 404, podgląd); klawiatura i 200 % na listach
  - [x] e2e na DEV: /edukacja i artykuły zielone (artykuł: pominięty, brak opublikowanego)
  - [x] Lighthouse na DEV (telefon): /edukacja 85, artykuły 80–85, dostępność 100, dobre praktyki 100
  - [x] dokumentacja, tabela „Każda strona” (sekcja 3a)
  - [x] CI zielone
  - [x] zmergowany do develop
  - [ ] sprawdzony na DEV (z opublikowanym artykułem i e-bookiem)
- [ ] **Miro** — kartki na zielono, wiersze tabeli „Każda strona”

Kartki MVP: Edukacja i artykuły 21 + 4 nowe, Strona artykułu 8, Tworzenie
artykułu 7, E-booki 9 + 1 nowa, E-booki w CMS 7 (sekcja 4).

**Zasada aktualizacji:** każdy krok odhacza się w commicie, który go
kończy; PR jest odhaczony, gdy jest zmergowany i sprawdzony na DEV; kartki
w sekcji 4, gdy są sprawdzone testem w CI.

## 1. Ustalenia (21.10)

- Same kategorie, bez tagów. Zdjęcia, grafiki i wykresy w artykułach już w
  MVP. Recenzent opcjonalny („Sprawdzone przez: …” tylko gdy jest).
- Wzór wyglądu artykułu: experimental-history.com („The rise and fall of
  peer review”): wąska kolumna tekstu, zdjęcia z podpisem, cytaty,
  śródtytuły.
- E-booki pod /edukacja/ebooki; darmowy fragment do pobrania bez zapisu.
  Cena (zmiana z 21.10, #150): admin wybiera przy każdym e-booku, czy
  pokazać cenę odczytaną z Naffy (przecena jak na Naffy: stara cena
  przekreślona i najniższa cena z 30 dni przed obniżką; przycisk „Kup na
  Naffy”), czy tylko przycisk „Zobacz cenę i kup na Naffy”.
- **Poprawka opublikowanego** artykułu lub e-booka zapisuje się jako szkic;
  strona pokazuje wersję opublikowaną do ponownej publikacji (jak CMS i
  profile specjalistów).
- **Autor**: specjalista z bazy albo „Zespół Kolor Sensu”.
- **PDF z fragmentem**: tylko PDF, do 20 MB, wgrywa admin.
- **Film**: przed kliknięciem okładka (nie miniaturka z YouTube); po
  kliknięciu YouTube „bez ciasteczek” albo Vimeo bez śledzenia; kategoria w
  banerze cookies: „Mapy, filmy i treści zewnętrzne”.
- Spis treści, gdy artykuł ma co najmniej 3 śródtytuły; czas czytania
  liczony z tekstu (ok. 200 słów na minutę); „Informacja o terapii” to
  jeden tekst z CMS Edukacji.
- Udostępnianie: „Kopiuj link”; na telefonie systemowe „Udostępnij”, na
  komputerze link do Facebooka; bez skryptów śledzących.

## 2. Architektura

- **Treść** w formacie edytora (JSON, `@repo/contracts/rich-text`), z
  profilem „artykuł”: nowe bloki ma tylko artykuł i e-book; bio, gabinety i
  dokumenty prawne zostają przy obecnym zestawie. Każdy blok naraz w
  kontrakcie, edytorze, rendererze (serwer) i testach
  ([rich-text-platform.md](../architecture/rich-text-platform.md)). Autor
  wybiera blok, wygląd daje szablon strony.
- **Baza**: osobna dziedzina (nie `site_content`): kategorie, artykuły
  (wersja robocza i opublikowana kopia), e-booki, przekierowania starych
  adresów; odwiedzający czytają tylko opublikowane (RLS), edytuje i
  publikuje admin; testy SQL w CI.
- **Pliki**: zdjęcia w `site-media` (folder artykułów i e-booków); PDF w
  osobnym publicznym miejscu na pliki do pobrania.
- **Strona**: renderowanie na serwerze, nagłówki stron w nowym formacie,
  odświeżanie po publikacji (lista, kategoria, artykuł, profil autora,
  strony usług, mapa strony), 404 dla szkiców, przekierowania.
- **Standard każdej strony** (tabela „Każda strona”): tytuł i opis w
  Google, obrazek do udostępniania, dane dla Google, jeden H1, klawiatura i
  czytnik, kontrast i 200 %, telefon i komputer, szybkość ≥ 85 na
  telefonie, zdjęcia z opisem, linki, test e2e.

## 3. PR-y

### PR 1 · Edytor artykułów

Bloki profilu „artykuł”: zdjęcie (opis obowiązkowy, podpis, szerokość: w
tekście / szeroko / na całą szerokość), dwa zdjęcia obok siebie, ramka
(Ważne / Wskazówka / Uwaga), cytat z autorem, tabela, linia, przycisk
„Umów wizytę” (tekst, opcjonalnie usługa); menu „/”, przeciąganie bloków,
wklejanie i upuszczanie zdjęć (wgrywanie przez funkcję podaną edytorowi);
renderer na serwerze z identyfikatorami śródtytułów i spisem treści;
Storybook; testy kontraktu, edytora, renderera i SSR.

### PR 2 · Baza Edukacji

Migracja: kategorie, artykuły, e-booki, przekierowania; publikacja,
wycofanie, zmiana adresu; miejsce na PDF; kontrakty i `packages/supabase`;
testy SQL.

### PR 3 · Portal admina

Artykuły: lista z filtrami, podstawy, treść, ludzie i powiązania, SEO,
podgląd, publikacja i wycofanie. Kategorie. E-booki (7 elementów).
Zakładka CMS „Edukacja”: nagłówek, sekcje, informacja o terapii.

### PR 4 · Strony artykułów

/edukacja, /edukacja/artykuly, /edukacja/artykuly/kategoria/[slug],
/edukacja/artykuly/[slug] (8 elementów), 404, przekierowania, artykuły
autora na profilu, powiązane artykuły na stronie usługi, menu Edukacji.

### PR 5 · Strony e-booków

/edukacja/ebooki, /edukacja/ebooki/[slug], film po kliknięciu, „Pobierz
fragment”, karta e-booka pod artykułem, przekierowania.

### PR 6 · SEO i jakość

Dane dla Google (Article, Book), obrazki do udostępniania z okładki, mapa
strony z datami zmian, testy e2e nowych stron, test klawiatury i 200 %,
Lighthouse, dokumentacja, wiersze tabeli „Każda strona”.

## 3a. Tabela „Każda strona” (stan po PR 6)

| Strona             | Tytuł i opis                          | Obrazek                       | Dane dla Google | Jeden H1 | Klawiatura, 200 % | Telefon / komputer | Szybkość (telefon)               | Zdjęcia z opisem               | Linki | e2e                  |
| ------------------ | ------------------------------------- | ----------------------------- | --------------- | -------- | ----------------- | ------------------ | -------------------------------- | ------------------------------ | ----- | -------------------- |
| /edukacja          | CMS                                   | generowany                    | —               | ✓        | ✓                 | ✓                  | 85 (DEV, lokalnie)               | ✓                              | ✓     | ✓                    |
| /edukacja/artykuly | CMS                                   | generowany                    | —               | ✓        | ✓                 | ✓                  | 80–85                            | okładki dekoracyjne na kartach | ✓     | ✓                    |
| kategoria          | opis kategorii                        | jak /edukacja                 | —               | ✓        | ✓                 | ✓                  | jak lista                        | jak lista                      | ✓     | ✓ (404)              |
| artykuł            | pola SEO, inaczej tytuł i wstęp       | okładka / własny / generowany | Article         | ✓        | ✓                 | ✓                  | do zmierzenia z artykułem na DEV | opis obowiązkowy               | ✓     | ✓ (gdy opublikowany) |
| /edukacja/ebooki   | kod                                   | generowany                    | —               | ✓        | ✓                 | ✓                  | do zmierzenia po PR 5            | ✓                              | ✓     | ✓                    |
| e-book             | pola SEO, inaczej tytuł i krótki opis | okładka / własny / generowany | Book            | ✓        | ✓                 | ✓                  | do zmierzenia po PR 5            | opis okładki                   | ✓     | ✓ (gdy opublikowany) |

SEO na DEV ma 69, bo DEV jest celowo wyłączony z indeksowania (`noindex`);
liczy się wynik na produkcji. Pomiary z Lighthouse w wierszu poleceń są
ostrzejsze niż w przeglądarce (/oferta: 78 zamiast 87).

## 4. Kartki

### Edukacja i artykuły

- [ ] Strona główna Edukacji
- [ ] Artykuły — katalog
- [ ] Kategorie artykułów
- [ ] Strona artykułu
- [ ] Autor, recenzent i źródła
- [ ] Zdjęcia, grafiki i wykresy w artykule
- [ ] Informacja o terapii i pomocy w kryzysie
- [ ] Powiązane usługi i „Umów wizytę”
- [ ] Powiązane artykuły
- [ ] Udostępnianie artykułu
- [ ] Artykuły autora na profilu specjalisty
- [ ] Powiązane artykuły na stronie usługi
- [ ] SEO artykułów
- [ ] Nieopublikowany artykuł daje 404
- [ ] Zmiana adresu nie psuje linków
- [ ] Teksty strony Edukacji w CMS
- [ ] Tworzenie artykułów w CMS
- [ ] Podgląd i publikacja artykułu
- [ ] Dane artykułu i powiązania
- [ ] Kategorie w CMS
- [ ] Lista artykułów w CMS z filtrami
- [ ] _Nowa:_ Edycja opublikowanego artykułu lub e-booka
- [ ] _Nowa:_ Edukacja w menu
- [ ] _Nowa:_ Pusta albo usuwana kategoria
- [ ] _Nowa:_ Autor bez publicznego profilu

### Strona artykułu

- [ ] 1. Nagłówek
- [ ] 2. Autor i daty
- [ ] 3. Spis treści
- [ ] 4. Treść z blokami
- [ ] 5. Informacja o terapii
- [ ] 6. Źródła
- [ ] 7. Usługa, specjalista, e-book
- [ ] 8. Powiązane artykuły i udostępnianie

### Tworzenie i publikacja artykułu

- [ ] 1. Lista artykułów
- [ ] 2. Podstawy
- [ ] 3. Treść w edytorze
- [ ] 4. Ludzie i powiązania
- [ ] 5. SEO
- [ ] 6. Podgląd
- [ ] 7. Publikacja i wycofanie

### E-booki

- [ ] Katalog e-booków
- [ ] Osobna strona każdego e-booka
- [ ] Film promocyjny
- [ ] Darmowy fragment do pobrania
- [ ] Produkty w artykułach
- [ ] SEO e-booków
- [ ] Nieopublikowany e-book daje 404
- [ ] E-booki zarządzane w CMS
- [ ] Wgrywanie pliku PDF z fragmentem
- [ ] _Nowa:_ Zmiana adresu e-booka nie psuje linków

### E-booki w CMS

- [ ] 1. Lista e-booków
- [ ] 2. Opis e-booka
- [ ] 3. Link do Naffy
- [ ] 4. Film promocyjny
- [ ] 5. Darmowy fragment
- [ ] 6. SEO
- [ ] 7. Podgląd i publikacja

### Po MVP (bez zmian w tym planie)

Artykuły pisane przez specjalistów, RSS, wyszukiwarka, publikacja
zaplanowana na dzień, sprzedaż e-booków i kursów, dostęp do kursu po
zakupie, zapis e-mailem po fragment, zgoda RODO przy zapisie, wypisanie
się; nowe: film z YouTube w treści, galeria, wykresy klikalne, FAQ w
treści, stronicowanie listy artykułów, sprzątanie nieużywanych zdjęć.

### Tabela „Każda strona” (do zmiany w Miro)

„Produkty Naffy” → „E-booki: katalog” i „E-book: strona”; nowy wiersz
„Artykuły: kategoria”; „Edukacja: lista artykułów” → „Edukacja (strona
główna)” i „Artykuły: lista”.
