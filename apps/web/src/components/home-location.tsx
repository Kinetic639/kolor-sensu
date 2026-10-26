import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { SectionHeader, type SiteContact } from "@repo/ui/public-site";
import { useId } from "react";
import { ContactCard } from "@/components/contact-details";

// Home → "Gdzie jesteśmy": the CMS's header beside the company's address,
// phone, e-mail, hours and "Pokaż na mapie" (the card Kontakt shows). The
// page leaves it out while there are no details to show.

export function HomeLocation({
  header,
  contact,
}: {
  header: SectionHeaderContent;
  contact: SiteContact;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="max-w-page px-gutter mx-auto grid items-start gap-10 py-20 lg:grid-cols-2 lg:gap-16 lg:py-32"
    >
      <SectionHeader content={header} id={headingId} size="h2" />
      <ContactCard contact={contact} />
    </section>
  );
}
