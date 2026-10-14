import { CmsSection } from "@/features/cms/cms-section";
import { FirstStepsSection } from "@/features/cms/first-steps-section";
import { FixedSection, UnavailableSection } from "@/features/cms/fixed-section";
import { HeaderBlock } from "@/features/cms/header-block";
import { HeroSection } from "@/features/cms/hero-section";
import {
  loadFirstSteps,
  loadHomeContent,
  loadHomeHeaders,
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
import type { HomeHeaderSection } from "@repo/contracts";
import { DetailTabs } from "@repo/ui/detail-page";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";

// CMS: one tab per page of the public site (in the address); in each, that
// page's sections top to bottom with their settings, and over them the
// page's status and its one "Publikuj stronę". Sections whose content lives
// in the site's code are listed in their place as "treść stała". A section
// whose settings cannot load says so; the rest keeps working.

async function HomePage() {
  const [hero, headers, areas, steps, sections] = await Promise.all([
    settle("hero", loadHomeContent),
    settle("nagłówki sekcji", loadHomeHeaders),
    settle("obszary wsparcia", loadSupportAreas),
    settle("pierwszy krok", loadFirstSteps),
    settle("sekcje specjalistów", loadHomeSections),
  ]);
  const loaded = [hero, headers, areas, steps, sections].filter(
    (one) => one !== null,
  );
  // A section's header block, when the headers loaded.
  const header = (section: HomeHeaderSection) =>
    headers ? (
      <HeaderBlock
        header={headers.headers[section]}
        section={section}
        services={headers.services}
      />
    ) : null;
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
        <SupportAreasSection content={areas} header={header("supportAreas")} />
      ) : (
        <UnavailableSection title="Obszary wsparcia" />
      )}
      {steps ? (
        <FirstStepsSection content={steps} header={header("firstSteps")} />
      ) : (
        <UnavailableSection title="Pierwszy krok" />
      )}
      {sections ? (
        <SpecialistsSections
          content={sections}
          spotlightHeader={header("spotlight")}
          teamHeader={header("specialists")}
        />
      ) : (
        <UnavailableSection title="Z kim porozmawiasz · Poznaj nasz zespół" />
      )}
      {headers ? (
        <>
          <CmsSection
            note="zdjęcie gabinetu, link do strony Gabinety"
            title="Przestrzeń, która wspiera"
          >
            {header("rooms")}
          </CmsSection>
          <CmsSection
            note="historia malowana przy przewijaniu"
            title="Jak zacząć"
          >
            {header("story")}
          </CmsSection>
          <CmsSection note="najczęstsze pytania" title="Zanim się zobaczymy">
            {header("faq")}
          </CmsSection>
        </>
      ) : (
        <UnavailableSection title="Przestrzeń, która wspiera · Jak zacząć · Zanim się zobaczymy" />
      )}
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
