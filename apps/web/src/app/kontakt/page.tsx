import { FaqSection } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { ContactCard } from "@/components/contact-details";
import { PageIntro } from "@/components/page-intro";
import { turnstileKeys } from "@/features/booking/guards";
import { ConsentMap } from "@/features/contact/consent-map";
import { ContactForm } from "@/features/contact/contact-form";
import { getCompany, getContactPage } from "@/lib/public-data";
import { pageMetadata } from "@/lib/page-metadata";
import { getSiteFrame } from "@/lib/site-frame";

// Kontakt, top to bottom: the CMS's title; the company's address, phone,
// e-mail and hours (Ustawienia, and the hours from Ustawienia wspólne) with
// "Pokaż na mapie"; the map (once the visitor consents to its cookies) and
// how to get here; the form; the questions and answers. Every word is the
// CMS's (CMS → Kontakt).

// Title, description and link preview: the CMS's over the page's own.
export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("contact");
}

export default async function ContactPage() {
  const [page, { contact }, company] = await Promise.all([
    getContactPage(),
    getSiteFrame(),
    getCompany(),
  ]);
  const { intro } = page;
  const address = contact
    ? `${contact.address.street}, ${contact.address.postalCode} ${contact.address.city}`
    : null;
  const reach = [
    contact?.phoneLabel ? `Zadzwoń: ${contact.phoneLabel}` : null,
    contact?.email ? `albo napisz: ${contact.email}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <PageIntro
        eyebrow={intro.eyebrow || undefined}
        heading={intro.heading}
        accent={intro.accent || undefined}
        lead={intro.lead || undefined}
      />
      <section className="max-w-page px-gutter pb-section-sm mx-auto grid items-start gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div className="grid content-start gap-6">
          <ContactCard contact={contact} />
          {page.travel ? (
            <div className="grid gap-2">
              <h2 className="font-display text-h3 text-ink">Dojazd</h2>
              <p className="text-body text-ink max-w-copy whitespace-pre-line">
                {page.travel}
              </p>
            </div>
          ) : null}
        </div>
        {address ? <ConsentMap address={address} /> : null}
      </section>
      <div className="max-w-page px-gutter pb-section-sm mx-auto">
        <div className="max-w-2xl">
          <ContactForm
            controller={company?.legalName ?? "Kolor Sensu"}
            heading={page.formHeading}
            reach={reach}
            turnstileSiteKey={turnstileKeys().siteKey}
          />
        </div>
      </div>
      {page.faq.length > 0 ? (
        <FaqSection heading={page.faqHeading} items={page.faq} />
      ) : null}
    </>
  );
}
