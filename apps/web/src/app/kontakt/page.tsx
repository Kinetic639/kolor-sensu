import { FaqSection, WatercolorImage } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { ContactDetails } from "@/components/contact-details";
import { PageIntro } from "@/components/page-intro";
import { faq, rooms } from "@/content/site";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Adres, telefon, e-mail i godziny otwarcia Kolor Sensu. Zadzwoń lub napisz, a pomożemy dobrać specjalistę i termin.",
  alternates: { canonical: "/kontakt" },
};

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
          sizes="(min-width: 1024px) 60vw, 117vw"
        />
      </section>
      <FaqSection items={faq} heading="Zanim zadzwonisz" />
    </>
  );
}
