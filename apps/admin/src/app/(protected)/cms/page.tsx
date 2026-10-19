import { AppearanceSection } from "@/features/cms/appearance-section";
import { CrisisHelpSection } from "@/features/cms/crisis-help-section";
import { FirstStepsSection } from "@/features/cms/first-steps-section";
import { FixedSection, UnavailableSection } from "@/features/cms/fixed-section";
import { HeaderBlock } from "@/features/cms/header-block";
import { HeroSection } from "@/features/cms/hero-section";
import { StorySection } from "@/features/cms/story-section";
import { ThoughtsSection } from "@/features/cms/thoughts-section";
import {
  loadCrisisHelp,
  loadHomeLocation,
  loadNewsletterBand,
  loadWhyUs,
  loadFirstSteps,
  loadHomeContent,
  loadHomeStory,
  loadHomeThoughts,
  loadHomeHeaders,
  loadHomeSections,
  loadPageSeo,
  loadRoomsPageContent,
  loadRoomsPeek,
  loadSupportAreas,
  loadSiteAppearance,
} from "@/features/cms/loaders";
import {
  CMS_PAGE_SEO,
  cmsTabs,
  loadCmsParams,
  type CmsPage,
} from "@/features/cms/page-params";
import { PagePublishBar } from "@/features/cms/page-publish-bar";
import { RoomsPageSections } from "@/features/cms/rooms-page-sections";
import {
  ROOMS_PEEK_TITLE,
  RoomsPeekSection,
} from "@/features/cms/rooms-peek-section";
import { SeoSection } from "@/features/cms/seo-section";
import { settle } from "@/features/cms/settle";
import { SpecialistsSections } from "@/features/cms/specialists-sections";
import { SupportAreasSection } from "@/features/cms/support-areas-section";
import {
  HomeLocationSection,
  NewsletterBandSection,
} from "@/features/cms/visibility-sections";
import { WhyUsSection } from "@/features/cms/why-us-section";
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
// Every page has its search and sharing settings first ("Wyszukiwarka i
// udostępnianie"), published with the page. After the pages, "Ustawienia
// wspólne": what every page shares (how components look), published for all.

const SEO_TITLE = "Wyszukiwarka i udostępnianie";

const loadSeo = (page: CmsPage) =>
  settle("wyszukiwarka i udostępnianie", () => loadPageSeo(CMS_PAGE_SEO[page]));

function Seo({
  page,
  model,
}: {
  page: CmsPage;
  model: Awaited<ReturnType<typeof loadSeo>>;
}) {
  return model ? (
    <SeoSection model={model} page={CMS_PAGE_SEO[page]} />
  ) : (
    <UnavailableSection title={SEO_TITLE} />
  );
}

async function HomePage() {
  const [
    hero,
    headers,
    areas,
    whyUs,
    steps,
    sections,
    newsletter,
    crisis,
    location,
    thoughts,
    story,
    roomsPeek,
    seo,
  ] = await Promise.all([
    settle("hero", loadHomeContent),
    settle("nagłówki sekcji", loadHomeHeaders),
    settle("obszary wsparcia", loadSupportAreas),
    settle("dlaczego my", loadWhyUs),
    settle("pierwszy krok", loadFirstSteps),
    settle("sekcje specjalistów", loadHomeSections),
    settle("newsletter", loadNewsletterBand),
    settle("pomoc w kryzysie", loadCrisisHelp),
    settle("gdzie jesteśmy", loadHomeLocation),
    settle("myśli", loadHomeThoughts),
    settle("jak zacząć", loadHomeStory),
    // Not a section's content: how many room photos the site shows.
    settle("zdjęcia gabinetów", loadRoomsPeek),
    loadSeo("glowna"),
  ]);
  const loaded = [
    hero,
    headers,
    areas,
    whyUs,
    steps,
    sections,
    newsletter,
    crisis,
    location,
    thoughts,
    story,
    seo,
  ].filter((one) => one !== null);
  // A section's header block, when the headers loaded. Keyed: it is made
  // here, on the server, and placed among a client section's children.
  const header = (section: HomeHeaderSection) =>
    headers ? (
      <HeaderBlock
        key={section}
        header={headers.headers[section]}
        section={section}
        services={headers.services}
      />
    ) : null;
  return (
    <>
      <PagePublishBar page="glowna" status={pageStatus(loaded)} />
      <Seo model={seo} page="glowna" />
      {hero ? (
        <HeroSection content={hero} />
      ) : (
        <UnavailableSection title="Hero" />
      )}
      {thoughts ? (
        <ThoughtsSection model={thoughts} />
      ) : (
        <UnavailableSection title="Myśli" />
      )}
      {areas ? (
        <SupportAreasSection content={areas} header={header("supportAreas")} />
      ) : (
        <UnavailableSection title="Obszary wsparcia" />
      )}
      {whyUs ? (
        <WhyUsSection header={header("whyUs")} model={whyUs} />
      ) : (
        <UnavailableSection title="Dlaczego my" />
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
      {headers || roomsPeek ? (
        <RoomsPeekSection header={header("rooms")} model={roomsPeek} />
      ) : (
        <UnavailableSection title={ROOMS_PEEK_TITLE} />
      )}
      {story ? (
        <StorySection header={header("story")} model={story} />
      ) : (
        <UnavailableSection title="Jak zacząć" />
      )}
      {newsletter ? (
        <NewsletterBandSection
          header={header("newsletter")}
          model={newsletter}
        />
      ) : (
        <UnavailableSection title="Newsletter" />
      )}
      {crisis ? (
        <CrisisHelpSection model={crisis} />
      ) : (
        <UnavailableSection title="Pomoc w kryzysie" />
      )}
      {location ? (
        <HomeLocationSection header={header("location")} model={location} />
      ) : (
        <UnavailableSection title="Gdzie jesteśmy" />
      )}
      <FixedSection title="Zrób pierwszy krok">
        Końcowe zaproszenie do umówienia wizyty.
      </FixedSection>
    </>
  );
}

async function RoomsPage() {
  const [rooms, seo] = await Promise.all([
    settle("gabinety", loadRoomsPageContent),
    loadSeo("gabinety"),
  ]);
  return (
    <>
      <PagePublishBar
        page="gabinety"
        status={pageStatus([rooms, seo].filter((one) => one !== null))}
      />
      <Seo model={seo} page="gabinety" />
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

/** A page whose content is all the site's code: its search settings only. */
async function SeoOnlyPage({ page }: { page: CmsPage }) {
  const seo = await loadSeo(page);
  return (
    <>
      <PagePublishBar page={page} status={pageStatus(seo ? [seo] : [])} />
      <Seo model={seo} page={page} />
      <FixedSection title="Treść strony">
        Teksty tej strony są w kodzie strony; tu ustawiasz, jak wygląda w Google
        i przy udostępnianiu.
      </FixedSection>
    </>
  );
}

/** The settings every page shares: how the components look. */
async function SharedSettingsPage() {
  const appearance = await settle("ustawienia wspólne", loadSiteAppearance);
  return (
    <>
      <PagePublishBar
        page="wspolne"
        status={pageStatus(appearance ? [appearance] : [])}
      />
      {appearance ? (
        <AppearanceSection model={appearance} />
      ) : (
        <UnavailableSection title="Wygląd komponentów · Zdjęcie z akwarelą" />
      )}
    </>
  );
}

export default async function CmsPage({ searchParams }: PageProps<"/cms">) {
  const { strona } = loadCmsParams(await searchParams);
  return (
    <FullBleed>
      <PageTitle>CMS</PageTitle>
      <DetailTabs active={strona} label="Strony serwisu" tabs={cmsTabs()} />
      {strona === "glowna" ? (
        <HomePage />
      ) : strona === "gabinety" ? (
        <RoomsPage />
      ) : strona === "wspolne" ? (
        <SharedSettingsPage />
      ) : (
        <SeoOnlyPage key={strona} page={strona} />
      )}
    </FullBleed>
  );
}
