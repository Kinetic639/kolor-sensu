import { AboutPageSection } from "@/features/cms/about-page-section";
import { CmsSection } from "@/features/cms/cms-section";
import { AppearanceSection } from "@/features/cms/appearance-section";
import { ContactPageSection } from "@/features/cms/contact-page-section";
import {
  OfferPageSection,
  ServicePageSection,
} from "@/features/cms/offer-page-section";
import { PricesPageSection } from "@/features/cms/prices-page-section";
import { LegalPageSection } from "@/features/cms/legal-page-section";
import type { LegalPageKey } from "@repo/contracts/cms-legal";
import { CrisisHelpSection } from "@/features/cms/crisis-help-section";
import { FirstStepsSection } from "@/features/cms/first-steps-section";
import { FixedSection, UnavailableSection } from "@/features/cms/fixed-section";
import { HeaderBlock } from "@/features/cms/header-block";
import { HeroSection } from "@/features/cms/hero-section";
import { StorySection } from "@/features/cms/story-section";
import { ThoughtsSection } from "@/features/cms/thoughts-section";
import {
  loadAboutHeaders,
  loadAboutPage,
  loadClosingCta,
  loadContactPage,
  loadLegalPage,
  loadOfferPage,
  loadPricesPage,
  loadServicePage,
  loadSiteContact,
  loadSpecialistsPage,
  loadEducationPage,
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
import { SpecialistsPageSection } from "@/features/cms/specialists-page-section";
import { EducationPageSection } from "@/features/cms/education-page-section";
import { SpecialistsSections } from "@/features/cms/specialists-sections";
import {
  ClosingCtaSection,
  SiteContactSection,
} from "@/features/cms/shared-texts-section";
import { SupportAreasSection } from "@/features/cms/support-areas-section";
import {
  HomeLocationSection,
  NewsletterBandSection,
} from "@/features/cms/visibility-sections";
import { WhyUsSection } from "@/features/cms/why-us-section";
import { pageStatus } from "@/features/cms/view-model";
import type { AboutHeaderSection, HomeHeaderSection } from "@repo/contracts";
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

/**
 * O nas: its search settings, its words (the top, the history, the values
 * and their facts, "Z kim pracujemy") and every section's header.
 */
async function AboutPage() {
  const [about, headers, home, seo] = await Promise.all([
    settle("o nas", loadAboutPage),
    settle("nagłówki sekcji", loadAboutHeaders),
    settle("usługi do linków", loadHomeHeaders),
    loadSeo("o-nas"),
  ]);
  const services = home?.services ?? [];
  const header = (section: AboutHeaderSection) =>
    headers ? (
      <HeaderBlock
        header={headers.content[section]}
        key={section}
        page="about"
        section={section}
        services={services}
      />
    ) : null;
  return (
    <>
      <PagePublishBar
        page="o-nas"
        status={pageStatus([about, headers, seo].filter((one) => one !== null))}
      />
      <Seo model={seo} page="o-nas" />
      {about ? (
        <AboutPageSection
          audiencesHeader={header("audiences")}
          model={about}
          storyHeader={header("story")}
        />
      ) : (
        <UnavailableSection title="Tytuł strony · Historia · Wartości · Z kim pracujemy" />
      )}
      <CmsSection note="pierwsze trzy osoby" title="Nasi specjaliści">
        {header("specialists")}
      </CmsSection>
      <CmsSection note="zdjęcie i link do Gabinetów" title="Gabinety">
        {header("rooms")}
      </CmsSection>
      <CmsSection
        note="adres, telefon, e-mail z Ustawień; znika bez nich"
        title="Kontakt"
      >
        {header("contact")}
      </CmsSection>
      <FixedSection title="Zrób pierwszy krok">
        Baner na końcu strony: jego teksty są w Ustawieniach wspólnych.
      </FixedSection>
    </>
  );
}

/** Specjaliści: its search settings and its words. */
async function SpecialistsPage() {
  const [page, seo] = await Promise.all([
    settle("specjaliści", loadSpecialistsPage),
    loadSeo("specjalisci"),
  ]);
  return (
    <>
      <PagePublishBar
        page="specjalisci"
        status={pageStatus([page, seo].filter((one) => one !== null))}
      />
      <Seo model={seo} page="specjalisci" />
      {page ? (
        <SpecialistsPageSection model={page} />
      ) : (
        <UnavailableSection title="Tytuł strony · Pusta lista · Pomożemy wybrać" />
      )}
      <FixedSection title="Karty specjalistów">
        Zdjęcia i opisy są z profili specjalistów (Specjaliści, w portalu).
      </FixedSection>
    </>
  );
}

/** Oferta: its search settings, its words and every service page's. */
async function OfferPage() {
  const [page, service, seo] = await Promise.all([
    settle("oferta", loadOfferPage),
    settle("strona usługi", loadServicePage),
    loadSeo("oferta"),
  ]);
  return (
    <>
      <PagePublishBar
        page="oferta"
        status={pageStatus([page, service, seo].filter((one) => one !== null))}
      />
      <Seo model={seo} page="oferta" />
      {page ? (
        <OfferPageSection model={page} />
      ) : (
        <UnavailableSection title="Tytuł strony · Pusta oferta" />
      )}
      <FixedSection title="Usługi i katalogi">
        Kafelki, katalogi i ich kolejność są z Usług (w portalu); każda usługa
        ma swoją stronę z nazwą, opisem, czasem i cenami specjalistów.
      </FixedSection>
      {service ? (
        <ServicePageSection model={service} />
      ) : (
        <UnavailableSection title="Strona usługi: Jak pracujemy · bez rezerwacji online" />
      )}
    </>
  );
}

/** Cennik: its search settings, its words and its rules. */
async function PricesPage() {
  const [page, seo] = await Promise.all([
    settle("cennik", loadPricesPage),
    loadSeo("cennik"),
  ]);
  return (
    <>
      <PagePublishBar
        page="cennik"
        status={pageStatus([page, seo].filter((one) => one !== null))}
      />
      <Seo model={seo} page="cennik" />
      {page ? (
        <PricesPageSection model={page} />
      ) : (
        <UnavailableSection title="Tytuł strony · Ceny · Płatności i odwołania" />
      )}
    </>
  );
}

/** A legal document: its search settings and the document. */
async function LegalDocumentPage({
  page,
  tab,
}: {
  page: LegalPageKey;
  tab: "regulamin" | "polityka-prywatnosci" | "cookies";
}) {
  const [document, seo] = await Promise.all([
    settle("dokument", () => loadLegalPage(page)),
    loadSeo(tab),
  ]);
  return (
    <>
      <PagePublishBar
        page={tab}
        status={pageStatus([document, seo].filter((one) => one !== null))}
      />
      <Seo model={seo} page={tab} />
      {document ? (
        <LegalPageSection model={document} page={page} />
      ) : (
        <UnavailableSection title="Tytuł strony · Dokument" />
      )}
    </>
  );
}

/** Kontakt: its search settings and its words. */
async function ContactPage() {
  const [page, seo] = await Promise.all([
    settle("kontakt", loadContactPage),
    loadSeo("kontakt"),
  ]);
  return (
    <>
      <PagePublishBar
        page="kontakt"
        status={pageStatus([page, seo].filter((one) => one !== null))}
      />
      <Seo model={seo} page="kontakt" />
      <FixedSection title="Dane kontaktowe i mapa">
        Adres, telefon i e-mail są w Ustawieniach (Centrum), godziny w
        Ustawieniach wspólnych. Mapa Google pokazuje się po zgodzie na pliki
        cookies.
      </FixedSection>
      {page ? (
        <ContactPageSection model={page} />
      ) : (
        <UnavailableSection title="Tytuł strony · Dojazd · Formularz · FAQ" />
      )}
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

/** Edukacja: its search settings and its words (the articles: Artykuły). */
async function EducationPage() {
  const [page, seo] = await Promise.all([
    settle("edukacja", loadEducationPage),
    loadSeo("edukacja"),
  ]);
  return (
    <>
      <PagePublishBar
        page="edukacja"
        status={pageStatus([page, seo].filter((one) => one !== null))}
      />
      <Seo model={seo} page="edukacja" />
      {page ? (
        <EducationPageSection model={page} />
      ) : (
        <UnavailableSection title="Tytuł strony · Materiały wkrótce · Artykuły · Informacja o terapii" />
      )}
      <FixedSection title="Artykuły i kategorie">
        Artykuły, ich kategorie i e-booki edytujesz w osobnych pozycjach menu:
        Artykuły i E-booki.
      </FixedSection>
    </>
  );
}

/** The settings every page shares: how the components look. */
async function SharedSettingsPage() {
  const [appearance, closing, contact] = await Promise.all([
    settle("ustawienia wspólne", loadSiteAppearance),
    settle("baner na końcu strony", loadClosingCta),
    settle("godziny kontaktu", loadSiteContact),
  ]);
  return (
    <>
      <PagePublishBar
        page="wspolne"
        status={pageStatus(
          [appearance, closing, contact].filter((one) => one !== null),
        )}
      />
      {closing ? (
        <ClosingCtaSection model={closing} />
      ) : (
        <UnavailableSection title="Baner „Zrób pierwszy krok”" />
      )}
      {contact ? (
        <SiteContactSection model={contact} />
      ) : (
        <UnavailableSection title="Godziny kontaktu" />
      )}
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
      ) : strona === "o-nas" ? (
        <AboutPage />
      ) : strona === "oferta" ? (
        <OfferPage />
      ) : strona === "specjalisci" ? (
        <SpecialistsPage />
      ) : strona === "edukacja" ? (
        <EducationPage />
      ) : strona === "cennik" ? (
        <PricesPage />
      ) : strona === "kontakt" ? (
        <ContactPage />
      ) : strona === "gabinety" ? (
        <RoomsPage />
      ) : strona === "regulamin" ? (
        <LegalDocumentPage page="legal_terms" tab="regulamin" />
      ) : strona === "polityka-prywatnosci" ? (
        <LegalDocumentPage page="legal_privacy" tab="polityka-prywatnosci" />
      ) : strona === "cookies" ? (
        <LegalDocumentPage page="legal_cookies" tab="cookies" />
      ) : strona === "wspolne" ? (
        <SharedSettingsPage />
      ) : (
        <SeoOnlyPage key={strona} page={strona} />
      )}
    </FullBleed>
  );
}
