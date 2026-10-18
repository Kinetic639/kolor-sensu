import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { SectionHeader, type SiteContact } from "@repo/ui/public-site";
import { useId } from "react";
import { ContactCard } from "@/components/contact-details";

// Home → "Gdzie jesteśmy": the CMS's header beside the company's address,
// phone, e-mail, hours and "Pokaż na mapie" (the card Kontakt shows).

export function HomeLocation({
  header,
  contact,
}: {
  header: SectionHeaderContent;
  contact: SiteContact | undefined;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="max-w-page px-gutter py-section-sm mx-auto grid items-start gap-10 lg:grid-cols-2 lg:gap-16"
    >
      <SectionHeader content={header} id={headingId} size="h2" />
      <ContactCard contact={contact} />
    </section>
  );
}
