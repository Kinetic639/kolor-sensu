# Portale: wprowadzanie treści, które pokazuje strona publiczna

Etap między Fazą 1 a Fazą 2 [roadmapy strony publicznej](./public-site-roadmap.md):
ekrany portalu admina i specjalisty, w których wprowadza się dane pokazywane
na stronie.

## Postęp

Statusy: `NOT STARTED`, `IN PROGRESS`, `DONE`, `SKIPPED` (z uzasadnieniem).
Każdy commit realizujący zadanie aktualizuje jego status i wpisuje hash commitu
(albo numer PR).

| ID  | Zadanie                                                                                    | Aplikacja  | Status | Commit / PR | Uwagi                              |
| --- | ------------------------------------------------------------------------------------------ | ---------- | ------ | ----------- | ---------------------------------- |
| P1  | „Mój profil”: zdjęcia, dane, tagi, podgląd, wysyłka do akceptacji                          | specialist | `DONE` | 0c96d05     | kadrowanie zdjęć, opis w rich text |
| P2  | „Moje usługi i stawki”: tabela, dodawanie z katalogu, edycja, statystyki                   | specialist | `DONE` | 0c96d05     | bez „Najczęściej rezerwowanej”     |
| P3  | Akceptacja profili: diff ze zdjęciami i wszystkimi polami                                  | admin      | `DONE` | 0c96d05     | Zdjęcia, tytuł i opis w diffie     |
| P4  | „Ustawienia centrum”: profil publiczny i lokalizacje                                       | admin      | `DONE` | 0c96d05     |                                    |
| P5  | „Gabinety”: edycja profilu publicznego sali                                                | admin      | `DONE` | 0c96d05     | Bez zdjęcia sali (brak bucketu)    |
| P6  | Strona: CMS na stronie głównej (F1-01), `/gabinety` z bazy (F1-12), odświeżanie na żądanie | web        | `DONE` | 0c96d05     |                                    |

## Dlaczego teraz portale (i które ekrany)

Czy teraz pracować nad portalami admina i specjalisty, żeby dało się dodawać
treści, czy najpierw dokończyć stronę? **Portale, ale tylko ekrany zasilające
stronę, która już istnieje.** Powody:

1. **Strona już pokazuje dane z bazy, ale są puste.**
   - Specjaliści mają zastępczą sylwetkę i testowy opis.
   - Cennik i „Kto prowadzi” pokazują „Cena ustalana indywidualnie”, bo nikt
     nie ma ofert.
   - W stopce i na `/kontakt` nie ma telefonu ani e-maila, bo profil centrum
     jest pusty.

   Każdy nowy element strony (blog, schorzenia) miałby ten sam problem.

2. **Backend jest gotowy, brakuje tylko interfejsu.**
   - Są tabele, RLS, RPC i funkcje w `@repo/supabase`: `getMyDraft`,
     `getMyPublishedProfile`, `saveMySpecialistProfileDraft`,
     `submitProfileForReview`, `listMySpecialistServices`,
     `listAvailableServicesForSpecialist`, `upsertMySpecialistService`,
     `updateCenterPublicProfile`, `createLocation` / `updateLocation`, domena
     sal.
   - Bucket `specialist-profile-media` ma polityki INSERT / UPDATE / DELETE dla
     specjalisty.
   - W portalu specjalisty wszystkie ekrany poza dashboardem to dziś zaślepki
     (`/profil`, `/uslugi`, `/dostepnosc`, `/kalendarz`, `/ustawienia`).
   - W adminie działają usługi, przegląd szkiców specjalistów i CMS strony
     głównej. Zaślepki to `/ustawienia`, `/kalendarz`, `/klienci`; `/gabinety`
     ma tylko listę.

   Duża wartość przy relatywnie małym wysiłku.

3. **Są zatwierdzone referencje wizualne**
   (`docs/design/references/specialist/panel_profilu_kolor_sensu_na_desktopie_i_mobile.png`,
   `…/panel_kolor_sensu_usługi_i_stawki.png`, `docs/design/references/admin/*`)
   i gotowe komponenty portali w `@repo/ui` (`portal-layout`, `portal-content`,
   `specialist-admin` z `ProfileReviewDiff` i `SpecialistOfferRow`,
   `service-admin`).
4. **Prawdziwe treści pozwolą zweryfikować design strony** na realnych danych:
   długość bio, zdjęcia portretowe, liczba usług.

Prototyp z Google AI Studio służy wyłącznie jako referencja wizualna
(layout portali, kalendarze); jego kodu nie przenosimy
([przegląd](../design/references/ai-studio-portal-review.md)).

**Poza zakresem:** kalendarz, dostępność, klienci, rezerwacje. To Faza 4
roadmapy, osobny duży plan:
[scheduling-ui-plan.md](./scheduling-ui-plan.md). Blog i schorzenia (Faza 2) wracają po tym etapie,
razem z własnymi ekranami w adminie.

## Plan (kolejność = wartość dla strony)

### P1. Portal specjalisty — „Mój profil” (`apps/specialist/src/app/(protected)/profil`)

Według referencji `panel_profilu_kolor_sensu_na_desktopie_i_mobile.png`:

- **Zdjęcia:**
  - avatar 1:1 i portret 3:4, wgrywane do `specialist-profile-media`;
  - ścieżka zgodna z `private.can_manage_specialist_media` (migracja
    `20260919143322_specialist_domain_foundation.sql`);
  - walidacja typu i rozmiaru (JPG/PNG, 5 / 10 MB);
  - nowa funkcja w `packages/supabase/src/specialists.ts`.
- **Dane podstawowe:** imię i nazwisko, tytuł zawodowy, krótki opis (licznik
  znaków), opis długi.
- **Listy tagów:** specjalizacje, nurty pracy, certyfikaty, języki;
  wykształcenie jako tekst. Wymaga komponentu tagów, jeśli go nie ma w
  `@repo/ui`.
- **Formy spotkań:** stacjonarnie / online / wideo, mapowane na `modalities`.
- **Podgląd profilu publicznego** obok formularza, na żywo.
- **Akcje:** „Zapisz zmiany” (`saveMySpecialistProfileDraft`) i „Wyślij do
  akceptacji” (`submitProfileForReview`).
- **Baner stanu:** oczekuje na akceptację / odrzucone z komentarzem admina /
  opublikowane. Data ostatniej modyfikacji.
- **Mobile:** sekcje zwijane jak na referencji.
- **Wzorzec techniczny** jak w adminie:
  `features/<domena>/{loaders,actions,view-model,query-keys}.ts`, Server
  Actions z Zod, formularz RHF + Zod (jak
  `apps/admin/src/features/services/service-form.tsx`).

### P2. Portal specjalisty — „Moje usługi i stawki” (`…/uslugi`)

Według `panel_kolor_sensu_usługi_i_stawki.png`:

- **Tabela usług:** nazwa + opis z katalogu, status, cena, czas, forma
  (stacjonarnie / online / hybrydowo), przełącznik „Nowi klienci”, „Edytuj”.
  Dane z `listMySpecialistServices` i `listAvailableServicesForSpecialist`.
  Reużyć `SpecialistOfferRow`.
- **„Dodaj usługę z katalogu”:** dialog z wyborem usługi i polami ceny, czasu,
  formy (`upsertMySpecialistService`).
- **Karty statystyk:** „Aktywne usługi” i „Średnia stawka”. Kartę
  „Najczęściej rezerwowana” pomijamy do czasu rezerwacji.
- **Mobile:** lista kart.

### P3. Admin — akceptacja profili (istnieje, dopiąć)

- Sprawdzić w `apps/admin/src/features/specialists/specialist-detail.tsx`, że
  diff pokazuje zdjęcia i wszystkie pola z P1. Uzupełnić braki.
- Po akceptacji odświeżać stronę na żądanie (P6).

### P4. Admin — „Ustawienia centrum” (`apps/admin/src/app/(protected)/ustawienia`)

Według referencji `panel_zarządzania_centrum_…png`:

- **Profil publiczny centrum** (`updateCenterPublicProfile`): nazwa, krótki
  opis, telefon, e-mail, strona www, Instagram, Facebook, „opublikowany”.
- **Lokalizacje** (`listLocations`, `createLocation`, `updateLocation`,
  `disableLocation`): adres i widoczność publiczna.
- Pola rezerwacji z `center_settings` zostają na Fazę 4.

To od razu uzupełnia stopkę, `/kontakt`, `/gabinety` i JSON-LD strony.

### P5. Admin — „Gabinety”: profil publiczny sali (`…/gabinety`)

Według `panel_zarządzania_gabinet*.png`:

- edycja `room_public_profiles`: nazwa, opisy, udogodnienia,
  `accessibility_notes`, zdjęcie, „opublikowany”;
- godziny i wyjątki zostają na Fazę 4, chyba że referencja wymaga ich już
  teraz.

Funkcje zapisu w `packages/supabase/src/rooms.ts` trzeba dopisać, jeśli ich
brakuje.

### P6. Strona — podłączenie i odświeżanie

- **F1-01:** strona główna znów czyta `site_content`
  (`getPublishedHomeContent`), tak żeby treść z `/cms` pojawiała się na
  stronie. Statyczna treść zostaje jako fallback.
- **F1-12:** `/gabinety` renderuje opublikowane profile sal (dane z P5).
- **Odświeżanie na żądanie:**
  - rozszerzyć `apps/web/src/app/api/revalidate/route.ts` o
    `type: "layout"`, żeby zmiana danych centrum odświeżała cały layout
    (header, stopka);
  - wywoływać go z akcji admina przez istniejący mechanizm
    (`CMS_REVALIDATE_SECRET`, jak w `apps/admin/src/features/cms/actions.ts`):
    akceptacja profilu → `/specjalisci`, profil, `/`; zmiany ofert →
    `/cennik`, `/oferta/*`; centrum → layout;
  - zmiany ofert robi specjalista, więc portal specjalisty dostaje ten sam
    sekret (nowa zmienna w jego projekcie Vercel).

### Po każdym etapie

Aktualizacja tabeli postępu w tym pliku i zadań F1-01 / F1-12 w
[roadmapie](./public-site-roadmap.md) oraz statusów w
[screen-map.md](../design/screen-map.md) (sekcje ADMIN i SPECIALIST).

## Krytyczne pliki

- `apps/specialist/src/app/(protected)/{profil,uslugi}/page.tsx` + nowe
  `apps/specialist/src/features/{profile,services}/*`;
- `apps/admin/src/app/(protected)/{ustawienia,gabinety}/page.tsx` +
  `apps/admin/src/features/{center,rooms}/*`;
  `apps/admin/src/features/specialists/*`;
- `packages/supabase/src/{specialists,center,rooms,services}.ts` (+ testy);
  `packages/contracts/src/*` (jeśli potrzeba schematów wejścia);
- `packages/ui/src/*`: komponenty portali (tagi, upload zdjęcia, karty
  statystyk), ze stories;
- `apps/web/src/app/page.tsx`, `apps/web/src/app/gabinety/page.tsx`,
  `apps/web/src/app/api/revalidate/route.ts`, `apps/web/src/lib/public-data.ts`.

## Weryfikacja

- `typecheck` / `lint` / `next build` wszystkich trzech aplikacji; testy
  `@repo/supabase` i `@repo/ui`; `test-storybook` dla nowych komponentów (a11y).
- **Przepływ end-to-end na DEV** (logowanie kontem specjalisty i admina):
  - specjalista wgrywa zdjęcia, wypełnia profil, wysyła do akceptacji;
  - admin widzi diff i akceptuje;
  - na `web` profil ma zdjęcie i bio;
  - specjalista dodaje usługi i ceny, które pojawiają się w `/cennik` i „Kto
    prowadzi”;
  - admin uzupełnia telefon i e-mail, które pojawiają się w stopce i na
    `/kontakt`.
- Sprawdzenie w przeglądarce na desktopie i telefonie (390 px) w porównaniu z
  referencjami.
- RLS: specjalista nie może edytować cudzego profilu ani zdjęć (test na
  poziomie DB lub wywołań).
