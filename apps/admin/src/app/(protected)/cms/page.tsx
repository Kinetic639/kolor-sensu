import { FixedSection, UnavailableSection } from "@/features/cms/fixed-section";
import { HeroSection } from "@/features/cms/hero-section";
import {
  loadHomeContent,
  loadHomeSections,
  loadRoomsPageContent,
  loadSupportAreas,
} from "@/features/cms/loaders";
import { cmsTabs, loadCmsParams } from "@/features/cms/page-params";
import { PagePublishBar } from "@/features/cms/page-publish-bar";
import { RoomsPageSections } from "@/features/cms/rooms-page-sections";
import { settle } from "@/features/cms/settle";
import { SpecialistsSections } from "@/features/cms/specialists-sections";
import { SupportAreasSection } from "@/features/cms/support-areas-section";
import { pageStatus } from "@/features/cms/view-model";
import { DetailTabs } from "@repo/ui/detail-page";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";

// CMS: one tab per page of the public site (in the address); in each, that
// page's sections top to bottom with their settings, and over them the
// page's status and its one "Publikuj stronę". Sections whose content lives
// in the site's code are listed in their place as "treść stała". A section
// whose settings cannot load says so; the rest keeps working.

async function HomePage() {
  const [hero, areas, sections] = await Promise.all([
    settle("hero", loadHomeContent),
    settle("obszary wsparcia", loadSupportAreas),
    settle("sekcje specjalistów", loadHomeSections),
  ]);
  const loaded = [hero, areas, sections].filter((one) => one !== null);
  return (
    <>
      <PagePublishBar page="glowna" status={pageStatus(loaded)} />
      {hero ? (
        <HeroSection content={hero} />
      ) : (
        <UnavailableSection title="Hero" />
      )}
      <FixedSection title="Myśli">
        Pas trudnych myśli zamieniających się w dobre, pod hero.
      </FixedSection>
      {areas ? (
        <SupportAreasSection content={areas} />
      ) : (
        <UnavailableSection title="Obszary wsparcia" />
      )}
      {sections ? (
        <SpecialistsSections content={sections} />
      ) : (
        <UnavailableSection title="Z kim porozmawiasz · Poznaj nasz zespół" />
      )}
      <FixedSection title="Jak zacząć">
        Historia „Twoja droga do lepszego samopoczucia”, malowana przy
        przewijaniu.
      </FixedSection>
      <FixedSection title="Przestrzeń, która wspiera">
        Zdjęcie i opis gabinetów z linkiem do strony Gabinety.
      </FixedSection>
      <FixedSection title="Wydarzenia, które inspirują">
        Zdjęcie i opis warsztatów z linkiem do strony Warsztaty.
      </FixedSection>
      <FixedSection title="Zanim się zobaczymy">
        Najczęstsze pytania przed pierwszą wizytą.
      </FixedSection>
      <FixedSection title="Zrób pierwszy krok">
        Końcowe zaproszenie do umówienia wizyty.
      </FixedSection>
    </>
  );
}

async function RoomsPage() {
  const rooms = await settle("gabinety", loadRoomsPageContent);
  return (
    <>
      <PagePublishBar
        page="gabinety"
        status={pageStatus(rooms ? [rooms] : [])}
      />
      <FixedSection title="Tytuł strony">
        Nagłówek strony Gabinety.
      </FixedSection>
      {rooms ? (
        <RoomsPageSections content={rooms} />
      ) : (
        <UnavailableSection title="Co u nas znajdziesz · Opis siedziby" />
      )}
      <FixedSection title="Gabinety">
        Zdjęcia i opisy gabinetów edytujesz w Gabinety, przy każdym gabinecie.
      </FixedSection>
    </>
  );
}

export default async function CmsPage({ searchParams }: PageProps<"/cms">) {
  const { strona } = loadCmsParams(await searchParams);
  return (
    <FullBleed>
      <PageTitle>CMS</PageTitle>
      <DetailTabs active={strona} label="Strony serwisu" tabs={cmsTabs()} />
      {strona === "gabinety" ? <RoomsPage /> : <HomePage />}
    </FullBleed>
  );
}
