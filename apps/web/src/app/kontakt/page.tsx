import { FaqSection, WatercolorImage } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { ContactDetails } from "@/components/contact-details";
import { PageIntro } from "@/components/page-intro";
import { faq, rooms } from "@/content/site";
import { pageMetadata } from "@/lib/page-metadata";

// Title, description and link preview: the CMS's over the page's own.
export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("contact");
}

export default function ContactPage() {
  return (
    <>
      <PageIntro
        eyebrow="Kontakt"
        heading="Kontakt"
        accent="Jesteśmy tu dla Ciebie."
        lead="Zadzwoń lub napisz. Odpowiemy na pytania, pomożemy dobrać specjalistę i znaleźć termin."
      />
      <section className="max-w-page px-gutter pb-section-sm mx-auto grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <ContactDetails />
        <WatercolorImage
          src={rooms.image.src}
          alt={rooms.image.alt}
          animationPreset="watercolor-reveal"
          sizes="(min-width: 1024px) 60vw, calc(117vw - 3rem)"
        />
      </section>
      <FaqSection items={faq} heading="Zanim zadzwonisz" />
    </>
  );
}
