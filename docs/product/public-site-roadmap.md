# Strona publiczna — roadmapa i postęp

Plan brakujących podstron, komponentów i domen danych, potrzebnych, żeby
Kolor Sensu było kompletną, nowoczesną i w pełni dostępną stroną centrum
psychologii i psychoterapii, z najwyższym poziomem SEO, wydajności i UX.
Wzorem jest pracowniakreska.com; analiza jej witryny jest niżej.

## Postęp

Statusy: `NOT STARTED`, `IN PROGRESS`, `DONE`, `SKIPPED` (z uzasadnieniem
w uwagach). Są spójne z [screen-map.md](../design/screen-map.md).

**Zasada aktualizacji:** każdy commit realizujący zadanie zmienia jego status
w tym pliku i wpisuje hash commitu (albo numer PR). Liczniki w podsumowaniu
faz aktualizuje się w tym samym commicie. ID zadań są stałe; zadania dopisuje
się na końcu fazy, nie przenumerowuje.

Przed Fazą 2 jest etap **P — portale** ([portals-content-plan.md](./portals-content-plan.md)):
ekrany admina i specjalisty, w których wprowadza się dane pokazywane na
stronie. Jego zadania (P1–P6) i postęp są w tamtym pliku; tutaj tylko licznik.

### Priorytet: rdzeń — konsultacje

Najpierw ma w pełni działać podstawowy system: **usługi konsultacji →
dostępność specjalistów → umawianie wizyt**. Admin tworzy usługi,
specjalista wybiera te, które oferuje (gotowe, P2), określa grafik
dostępności, a klient umawia wizytę. Kolejność prac:

1. Faza 1 bez nowych rodzajów płatnych usług: F1-11, F1-03, F1-02, F1-13,
   F1-10, F1-08 + F1-09, F1-04, F1-15.
2. Dostępność specjalistów: etap K ([scheduling-ui-plan.md](./scheduling-ui-plan.md)),
   od schematu bazy (KD) i domeny czasu (K1).
3. Rezerwacje: Faza 4 (F4-01–F4-04).

**Odłożone do czasu, aż rdzeń działa:** oferta dla firm (F1-05), praca
(F1-06), vouchery (F1-07, F4-05), warsztaty (F3-01, F3-02). Nie pracujemy
nad nimi wcześniej.

### Podsumowanie faz

| Faza | Zakres                                                         | Status        | Zrobione / wszystkie |
| ---- | -------------------------------------------------------------- | ------------- | -------------------- |
| 0    | Baza: to, co już istnieje                                      | `DONE`        | 16 / 16              |
| 1    | Szybkie wygrane bez nowych domen                               | `IN PROGRESS` | 3 / 15               |
| P    | Portale: treści dla strony ([plan](./portals-content-plan.md)) | `DONE`        | 6 / 6                |
| 2    | Treści SEO: schorzenia, usługi, blog                           | `NOT STARTED` | 0 / 12               |
| 3    | Warsztaty i filtry specjalistów                                | `NOT STARTED` | 0 / 3                |
| 4    | Własny system rezerwacji                                       | `NOT STARTED` | 0 / 5                |
| X    | Przekrojowe (a11y, wydajność, analityka, prawo, admin)         | `NOT STARTED` | 0 / 5                |

### Faza 0 — baza (już zrobione)

| ID    | Zadanie                                                                 | Obszar        | Status | Commit / PR               | Uwagi                                          |
| ----- | ----------------------------------------------------------------------- | ------------- | ------ | ------------------------- | ---------------------------------------------- |
| F0-01 | Strona główna: hero, oferta, specjaliści, gabinety, warsztaty, FAQ, CTA | strona        | `DONE` | e7ab233                   | Treść statyczna; regresja CMS → F1-01          |
| F0-02 | `/o-nas`                                                                | strona        | `DONE` | e7ab233                   |                                                |
| F0-03 | `/specjalisci` + profil `/specjalisci/[slug]`                           | strona        | `DONE` | e7ab233                   | Dane z domeny specjalistów                     |
| F0-04 | `/oferta` + `/oferta/[slug]`                                            | strona        | `DONE` | e7ab233                   | Dane z domeny usług                            |
| F0-05 | `/cennik`                                                               | strona        | `DONE` | e7ab233                   | Z `specialist_services`                        |
| F0-06 | `/gabinety`                                                             | strona        | `DONE` | e7ab233                   | Treść statyczna → F1-12                        |
| F0-07 | `/warsztaty`                                                            | strona        | `DONE` | e7ab233                   | Bez wydarzeń → Faza 3                          |
| F0-08 | `/kontakt`, `/umow-wizyte` (telefon/e-mail)                             | strona        | `DONE` | e7ab233                   | Formularz → F1-09, rezerwacje → Faza 4         |
| F0-09 | Strony prawne (szkielety), 404, strona błędu                            | strona        | `DONE` | e7ab233                   | Treść prawna → X-04                            |
| F0-10 | `sitemap.xml`, `robots.txt`, metadane, kanoniczne URL                   | SEO           | `DONE` | e7ab233                   |                                                |
| F0-11 | JSON-LD: MedicalBusiness, Person, Service, BreadcrumbList, FAQPage      | SEO           | `DONE` | e7ab233                   | BreadcrumbList usunięty z okruszkami (d335743) |
| F0-12 | Layout: header, menu mobilne, stopka, okruszki, baner cookies           | komponent     | `DONE` | c5539ee, e69e270          | Okruszki usunięte z podstron (d335743)         |
| F0-13 | Intro przy pierwszej wizycie                                            | komponent     | `DONE` | aa18cba                   |                                                |
| F0-14 | Animacje (WatercolorImage, oferta, specjaliści) bez CLS                 | wydajność     | `DONE` | e8b586a, f3aed5b, b5c5804 |                                                |
| F0-15 | Kontrast kolorów zgodny z WCAG AA                                       | a11y          | `DONE` | 2b076e5                   |                                                |
| F0-16 | Testy Storybook: interakcje, a11y, Visual Tests, coverage               | a11y / jakość | `DONE` | 4b9f434, 021e2e1, 2ab40dd | 139/139 stories                                |

### Faza 1 — szybkie wygrane (bez nowych domen)

| ID    | Zadanie                                                                               | Obszar             | Status        | Commit / PR | Uwagi                                           |
| ----- | ------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- | ----------------------------------------------- |
| F1-01 | Przywrócić treść z CMS na stronie głównej (`site_content`, klucz `home`)              | strona / CMS       | `DONE`        | 0c96d05     | P6; w CMS jest treść testowa                    |
| F1-02 | `/pierwsza-wizyta`                                                                    | strona             | `NOT STARTED` |             |                                                 |
| F1-03 | `/pomoc-w-kryzysie` + `CrisisNotice`                                                  | strona / komponent | `NOT STARTED` |             | Link w stopce, przy formularzach                |
| F1-04 | `/deklaracja-dostepnosci`                                                             | strona             | `NOT STARTED` |             |                                                 |
| F1-05 | `/dla-firm` + formularz zapytania B2B                                                 | strona             | `NOT STARTED` |             | Odłożone: po rdzeniu konsultacji                |
| F1-06 | `/praca` + formularz aplikacji                                                        | strona             | `NOT STARTED` |             | Odłożone: po rdzeniu konsultacji                |
| F1-07 | `/vouchery` + formularz zamówienia                                                    | strona             | `NOT STARTED` |             | Odłożone: po rdzeniu konsultacji                |
| F1-08 | `InquiryForm` + `ConsentField` (Server Action, Zod, honeypot/Turnstile)               | komponent          | `NOT STARTED` |             | Decyzja: e-mail czy tabela `inquiries`          |
| F1-09 | `/kontakt`: formularz, `LocationMap`, dojazd                                          | strona / komponent | `NOT STARTED` |             | Iframe mapy dopiero po kliknięciu               |
| F1-10 | Strona główna: `ProblemGrid`, `StepsSection`, „Stacjonarnie i online”, `TrustSignals` | komponent          | `NOT STARTED` |             | `ProblemGrid` na razie statyczny                |
| F1-11 | Profil specjalisty: usługi i ceny, z kim pracuje, CTA z wybranym specjalistą          | strona / dane      | `NOT STARTED` |             | Nowa funkcja „oferty specjalisty”               |
| F1-12 | `/gabinety` z domeny sal (`room_public_profiles`) + dostępność budynku                | strona / dane      | `DONE`        | 0c96d05     | P6; zdjęcia, lokalizacje, CMS: 3bc8cf6, fc4b495 |
| F1-13 | Cennik: zasady (odwoływanie, płatności, faktury, online) + FAQ                        | strona             | `NOT STARTED` |             | Treść do potwierdzenia przez centrum            |
| F1-14 | Optymalizacja obrazu hero (PNG 2,6 MB → AVIF/WebP)                                    | wydajność          | `DONE`        | 97d23ea     | Dostarczany 39–103 KB (był 85–207 KB)           |
| F1-15 | Nawigacja i stopka: nowe strony, link do pomocy w kryzysie                            | komponent          | `NOT STARTED` |             | `site-frame.ts`                                 |

### Faza 2 — treści SEO

| ID    | Zadanie                                                                                                                         | Obszar          | Status        | Commit / PR | Uwagi                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------- | ----------- | ------------------------------------------------ |
| F2-01 | Domena `conditions` (migracja + RLS, kontrakty, funkcje)                                                                        | domena          | `NOT STARTED` |             | Powiązania z usługami, specjalistami, artykułami |
| F2-02 | `/pomoc` (hub) + `/pomoc/[slug]`                                                                                                | strona          | `NOT STARTED` |             | `MedicalWebPage` + `FAQPage`                     |
| F2-03 | Usługi: pola treści i FAQ + rozbudowa `/oferta/[slug]`                                                                          | domena / strona | `NOT STARTED` |             |                                                  |
| F2-04 | Domena `articles` + `article_categories`                                                                                        | domena          | `NOT STARTED` |             | Autor = specjalista, recenzent                   |
| F2-05 | `/artykuly`, `/artykuly/[slug]`, `/artykuly/kategoria/[slug]`                                                                   | strona          | `NOT STARTED` |             |                                                  |
| F2-06 | Komponenty bloga: `ArticleCard`, `ArticleList`, `ArticleHeader`, `TableOfContents`, `AuthorBox`, `RelatedContent`, `ShareLinks` | komponent       | `NOT STARTED` |             |                                                  |
| F2-07 | RSS                                                                                                                             | SEO             | `NOT STARTED` |             |                                                  |
| F2-08 | Dane strukturalne: Article, MedicalWebPage, Person `hasCredential`, rozbudowany MedicalBusiness                                 | SEO             | `NOT STARTED` |             | `openingHoursSpecification`, `geo`, `priceRange` |
| F2-09 | Obrazy OG per strona (`opengraph-image`)                                                                                        | SEO             | `NOT STARTED` |             |                                                  |
| F2-10 | Sitemap z `lastmod` dla każdej domeny                                                                                           | SEO             | `NOT STARTED` |             |                                                  |
| F2-11 | Linkowanie wewnętrzne schorzenie ↔ usługa ↔ specjalista ↔ artykuł; SEO lokalne w tytułach                                       | SEO             | `NOT STARTED` |             |                                                  |
| F2-12 | Strona główna: zajawka najnowszych artykułów                                                                                    | komponent       | `NOT STARTED` |             |                                                  |

### Faza 3 — warsztaty i filtry

| ID    | Zadanie                                                                                                 | Obszar             | Status        | Commit / PR | Uwagi                                                          |
| ----- | ------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- | -------------------------------------------------------------- |
| F3-01 | Domena `workshops` / `events` + zapisy                                                                  | domena             | `NOT STARTED` |             | Odłożone: po rdzeniu. Tabela `workshops` już jest, bez zapisów |
| F3-02 | `/warsztaty` (nadchodzące + archiwum) + `/warsztaty/[slug]`, `EventCard`, `EventDetails`, `EventSignup` | strona / komponent | `NOT STARTED` |             | Odłożone: po rdzeniu; schema `Event`                           |
| F3-03 | `SpecialistFilters` na `/specjalisci` (parametry URL)                                                   | komponent          | `NOT STARTED` |             |                                                                |

### Faza 4 — własny system rezerwacji

| ID    | Zadanie                                                                  | Obszar             | Status        | Commit / PR | Uwagi                             |
| ----- | ------------------------------------------------------------------------ | ------------------ | ------------- | ----------- | --------------------------------- |
| F4-01 | Szczegółowy plan rezerwacji (osobny dokument)                            | plan               | `NOT STARTED` |             | `packages/scheduling`, domena sal |
| F4-02 | Domena `appointments`                                                    | domena             | `NOT STARTED` |             |                                   |
| F4-03 | Kreator na `/umow-wizyte` (usługa → specjalista → forma → termin → dane) | strona / komponent | `NOT STARTED` |             | Zastępuje obecny formularz        |
| F4-04 | Potwierdzenia, przypomnienia, zmiana/odwołanie wizyty                    | funkcja            | `NOT STARTED` |             |                                   |
| F4-05 | Płatności online za vouchery                                             | funkcja            | `NOT STARTED` |             | Odłożone: po rdzeniu konsultacji  |

### Przekrojowe

| ID   | Zadanie                                                                      | Obszar     | Status        | Commit / PR | Uwagi                         |
| ---- | ---------------------------------------------------------------------------- | ---------- | ------------- | ----------- | ----------------------------- |
| X-01 | Testy axe na prawdziwych stronach (Playwright e2e)                           | a11y       | `NOT STARTED` |             |                               |
| X-02 | Budżet Lighthouse ≥ 95 + pomiar Core Web Vitals                              | wydajność  | `NOT STARTED` |             | Speed Insights po zgodzie     |
| X-03 | Analityka bez cookies + baner cookies z kategoriami                          | prywatność | `NOT STARTED` |             | Plausible / Umami             |
| X-04 | Treść prawna: polityka prywatności, regulamin rezerwacji, klauzule           | prawo      | `NOT STARTED` |             | Dostarcza centrum lub prawnik |
| X-05 | Ekrany admina dla nowych domen (artykuły, schorzenia, warsztaty, zgłoszenia) | admin      | `NOT STARTED` |             |                               |

---

## Analiza wzoru: pracowniakreska.com

Przeanalizowana witryna Kreski obejmuje:

- stronę główną i hub „Pomoc psychologiczna” z 11 stronami schorzeń;
- usługi: psychoterapia, dzieci i młodzież, psycholog dziecięcy, terapia par, programy rozwojowe;
- Zespół z profilami, Cennik, Kalendarz, Warsztaty ze stronami warsztatów;
- Blog z artykułami;
- Dla firm, Praca u nas, Wynajem gabinetów, Kontakt.

**Najmocniejsze strony Kreski:**

- długie strony schorzeń (~1500 słów, hierarchia nagłówków, linkowanie wewnętrzne, fraza z miastem);
- regularny blog;
- ceny przy każdym specjaliście;
- wiele CTA „Umów wizytę”;
- formularz kontaktowy na każdej stronie.

**Braki Kreski, czyli nasza przewaga:**

- artykuły bez autora i dat, co jest słabe dla E-E-A-T w tematach zdrowotnych (YMYL);
- brak filtrów zespołu, strony „Pomoc w kryzysie” i deklaracji dostępności;
- brak harmonogramu warsztatów, mapy i informacji o dostępności budynku;
- formularz bez ostrzeżenia o danych o zdrowiu.

**Zasady architektury** (`docs/architecture/cms-domain.md`):

- trasy i struktura stron są zapisane w kodzie;
- CMS edytuje tylko typowane pola stron, które już istnieją;
- blog, schorzenia i wydarzenia to osobne domeny z własnym cyklem życia (tabele Supabase + kontrakty Zod + funkcje w `@repo/supabase` + panel w adminie), a nie kreator stron.

**Zakres ustalony z centrum:**

- robimy „Dla firm”, „Praca u nas” i „Vouchery”;
- bez wynajmu gabinetów;
- rezerwacje we własnym systemie.

## Nowe podstrony

| Strona                                                                 | Po co (UX / SEO)                          | Zawartość                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Blog** `/artykuly`, `/artykuly/[slug]`, `/artykuly/kategoria/[slug]` | Główne źródło ruchu organicznego          | Lista z kategoriami i paginacją. Artykuł: autor (link do profilu), data publikacji i aktualizacji, czas czytania, spis treści, źródła, powiązane usługi / specjaliści / artykuły, CTA. RSS. Schema `Article` z `author` i `reviewedBy` |
| **„Z czym możemy pomóc”** `/pomoc` + `/pomoc/[slug]`                   | Największy silnik SEO Kreski              | Kiedy szukać pomocy, objawy, przyczyny, jak pomaga terapia, metody, ile trwa, FAQ, specjaliści pracujący z problemem, powiązane artykuły, CTA. Schema `MedicalWebPage` + `FAQPage`                                                     |
| **Pierwsza wizyta** `/pierwsza-wizyta`                                 | Obniża próg wejścia                       | Przygotowanie, przebieg konsultacji, poufność, odwoływanie, płatności, sesje online, FAQ                                                                                                                                               |
| **Pomoc w kryzysie** `/pomoc-w-kryzysie`                               | Odpowiedzialność, zaufanie                | „Nie jesteśmy pogotowiem”, numery 112, 116 123, 116 111, 800 70 2222; link w stopce, przy formularzach i na stronach schorzeń                                                                                                          |
| **Dla firm** `/dla-firm`                                               | B2B                                       | Formy wsparcia, tematy szkoleń, przebieg współpracy, formularz zapytania                                                                                                                                                               |
| **Praca u nas** `/praca`                                               | Rekrutacja                                | Kogo szukamy, wymagania, co oferujemy, jak aplikować (formularz + klauzula RODO), `JobPosting`                                                                                                                                         |
| **Vouchery** `/vouchery`                                               | Przychód, prezent                         | Jak działa, wartości/usługi, ważność, formularz zamówienia (później płatność online)                                                                                                                                                   |
| **Warsztaty** `/warsztaty/[slug]`                                      | Dziś pusta strona                         | Nadchodzące i archiwum; termin, miejsce/online, cena, liczba miejsc, prowadzący, zapisy; schema `Event`                                                                                                                                |
| **Rezerwacja online** `/umow-wizyte`                                   | Konwersja                                 | Kreator: usługa → specjalista lub „pierwszy wolny” → forma → termin → dane + zgody → potwierdzenie, zmiana/odwołanie, przypomnienia                                                                                                    |
| **Deklaracja dostępności** `/deklaracja-dostepnosci`                   | Pełna dostępność                          | Zgodność z WCAG 2.1 AA, kontakt w sprawie dostępności, dostępność gabinetów                                                                                                                                                            |
| **Prawne z treścią**                                                   | Wymagane przy formularzach i rezerwacjach | Polityka prywatności (dane o zdrowiu), regulamin rezerwacji, klauzule. Treść dostarcza centrum lub prawnik                                                                                                                             |

**Świadomie pomijamy:**

- **Opinie klientów:** kodeksy etyki psychoterapeutów (PTP, PTTPB) odradzają publikowanie świadectw pacjentów. Zamiast nich pokazujemy sygnały zaufania: nurty, superwizja, członkostwa, lata doświadczenia.
- **Wynajem gabinetów:** poza ofertą.

## Rozbudowa istniejących stron

- **Strona główna:**
  - treść z CMS (`getPublishedHomeContent`, `packages/supabase/src/cms.ts`);
  - „Z czym przychodzą”;
  - „Jak zacząć” w 3 krokach;
  - „Stacjonarnie i online”;
  - sygnały zaufania;
  - najnowsze artykuły.
- **Specjaliści:** filtry w adresie URL (problem, z kim pracuje, online / stacjonarnie, język, „przyjmuje nowe osoby”), widełki cen na karcie; z rezerwacjami „najbliższy wolny termin”.
- **Profil specjalisty:**
  - usługi i ceny z `specialist_services`;
  - z kim pracuje, forma pracy;
  - członkostwa, superwizja, link do rejestru;
  - artykuły autora;
  - CTA rezerwacji.
- **Usługa:** pola treści (dla kogo, jak wygląda, ile trwa, FAQ), powiązane schorzenia i specjaliści.
- **Cennik:** zasady (odwoływanie, płatności, faktury, online vs stacjonarnie), vouchery, FAQ.
- **Gabinety:** dane z `room_public_profiles` (opisy, udogodnienia, zdjęcie, `accessibility_notes`), dostępność budynku.
- **Kontakt:**
  - formularz z ostrzeżeniem „nie opisuj stanu zdrowia”, zgodą RODO i zabezpieczeniem przed spamem;
  - mapa statyczna z iframe po kliknięciu;
  - dojazd.
- **Baner cookies:** kategorie i Consent Mode, gdy pojawi się analityka (rekomendacja: analityka bez cookies).

## Nowe komponenty (`@repo/ui/public-site`, ze stories i testami a11y)

- **Formularze:** `InquiryForm`, `ConsentField`.
- **Pomoc i sygnały zaufania:** `ProblemGrid` / `ProblemCard`, `StepsSection`, `CrisisNotice`, `TrustSignals`.
- **Blog:** `ArticleCard`, `ArticleList`, `ArticleHeader`, `TableOfContents`, `AuthorBox`, `RelatedContent`, `ShareLinks`.
- **Zespół i ceny:** `SpecialistFilters`, `PriceTable`.
- **Warsztaty:** `EventCard`, `EventDetails`, `EventSignup`.
- **Kontakt:** `LocationMap`.
- **Później:** komponenty kreatora rezerwacji.

Wykorzystujemy istniejące: `PageIntro`, `FaqSection`, `FeatureSection`, `ClosingCta`, `SoftCard`, `PastelIconTile`, `SiteBreadcrumbs`, `JsonLd`, `WatercolorImage`, `SpecialistWatercolorCard`, `OfferTile`.

## Nowe domeny danych

Każda domena powstaje według wzoru domen usług, specjalistów i sal:

- migracja Supabase z RLS (anon czyta tylko opublikowane);
- kontrakty Zod w `packages/contracts`;
- funkcje w `packages/supabase`;
- loadery z fallbackiem w `apps/web/src/lib/public-data.ts`;
- ekrany w adminie.

Domeny do zbudowania:

- `articles` + `article_categories`;
- `conditions`;
- rozszerzenie `services`;
- `workshops` / `events`;
- `inquiries`: retencja, RLS tylko dla admina;
- `vouchers`;
- `appointments`.

## SEO, wydajność, dostępność

- **SEO lokalne:** miasto w tytułach i H1, spójne dane adresowe z profilem Google, `openingHoursSpecification`, `geo`, `priceRange`.
- **Linkowanie wewnętrzne** generowane z relacji w bazie.
- **Dane strukturalne:** Article, MedicalWebPage, Event, JobPosting, Person `hasCredential`.
- **Obrazy OG** per strona, sitemap z `lastmod`, RSS.
- **Wydajność:** obrazy AVIF/WebP, pomiar Core Web Vitals, Lighthouse ≥ 95.
- **Dostępność:** testy axe na prawdziwych stronach, formularze z etykietami i komunikatami błędów, filtry i spis treści obsługiwane klawiaturą.

Treść merytoryczną (artykuły, strony schorzeń, dokumenty prawne) dostarcza
lub akceptuje centrum. Struktura, komponenty i szkice oznaczone do
weryfikacji powstają w kodzie.

## Krytyczne pliki

- `apps/web/src/app/**`: trasy (wzór: `apps/web/src/app/oferta/[slug]/page.tsx`);
- `apps/web/src/content/*`: treść strony;
- `apps/web/src/lib/{public-data,site-frame,presentation}.ts(x)`;
- `packages/ui/src/public-site/*`: komponenty, stories, testy;
- `packages/supabase/src/*`, `packages/contracts/src/*`, `supabase/migrations/*`;
- `docs/architecture/*`, `docs/design/kolor-sensu-public-design-system.md`.

## Weryfikacja (każda faza)

- `typecheck`, `lint`, `next build` aplikacji `web`;
- testy `@repo/ui`;
- `test-storybook` (interakcje + a11y), Visual Tests w Chromatic;
- przegląd w przeglądarce na 1440 i 390 px;
- Lighthouse ≥ 95 we wszystkich kategoriach;
- Rich Results Test dla danych strukturalnych;
- nowe strony w `sitemap.xml`;
- formularze: poprawne i błędne wysłanie, klawiatura, czytnik ekranu.
