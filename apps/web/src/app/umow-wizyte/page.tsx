import { SecondaryButton, SoftCard } from "@repo/ui/public-site";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { ContactDetails } from "@/components/contact-details";
import { PageIntro } from "@/components/page-intro";
import { bookingPage } from "@/content/site";
import { specialistHref, specialistRole } from "@/lib/presentation";
import { getSpecialist } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Umów wizytę",
  description:
    "Jak umówić pierwszą wizytę w Kolor Sensu: skontaktuj się z nami, a dobierzemy specjalistę i termin.",
  alternates: { canonical: "/umow-wizyte" },
};

// Online booking is not built yet: visitors book by phone or email, and
// this page explains how. Coming from a specialist's profile
// (?specjalista=slug), it also says who the visit is with.
export default async function BookingPage({
  searchParams,
}: PageProps<"/umow-wizyte">) {
  const { specjalista } = await searchParams;
  const specialist =
    typeof specjalista === "string" ? await getSpecialist(specjalista) : null;

  return (
    <>
      <PageIntro
        eyebrow="Pierwsza wizyta"
        heading={bookingPage.heading}
        accent={bookingPage.accent}
        lead={bookingPage.lead}
      />
      <section className="max-w-page px-gutter pb-section-sm mx-auto grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        <ol className="grid gap-4">
          {bookingPage.steps.map((step, index) => (
            <li key={step.title}>
              <SoftCard tone="cream" className="flex gap-5 p-6">
                <span
                  className="bg-primary text-on-primary grid size-10 shrink-0 place-items-center rounded-full font-semibold"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="grid gap-1">
                  <span className="text-title text-ink font-semibold">
                    {step.title}
                  </span>
                  <span className="text-body text-text-muted">{step.text}</span>
                </span>
              </SoftCard>
            </li>
          ))}
        </ol>
        <div className="grid gap-6">
          {specialist ? (
            <SoftCard
              aria-labelledby="chosen-specialist-heading"
              className="grid gap-1 p-6"
              tone="cream"
            >
              <h2
                className="text-small text-text-muted font-body"
                id="chosen-specialist-heading"
              >
                Umawiasz się z
              </h2>
              <p className="text-title text-ink font-semibold">
                <Link
                  className="hover:text-primary-strong underline-offset-4 hover:underline"
                  href={specialistHref(specialist.publicSlug) as Route}
                >
                  {specialist.displayName}
                </Link>
              </p>
              <p className="text-small text-text-muted">
                {specialistRole(specialist)}. Kontaktując się z nami, podaj imię
                i nazwisko specjalisty.
              </p>
            </SoftCard>
          ) : null}
          <ContactDetails />
          <SecondaryButton asChild className="justify-self-start">
            <Link href="/specjalisci">Poznaj naszych specjalistów</Link>
          </SecondaryButton>
        </div>
      </section>
    </>
  );
}
