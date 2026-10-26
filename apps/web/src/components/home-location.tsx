import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { LocationSection, type SiteContact } from "@repo/ui/public-site";
import { ConsentMap } from "@/features/contact/consent-map";

// Home → the CMS's contact details and a map held back until consent.

export function HomeLocation({
  header,
  contact,
}: {
  header: SectionHeaderContent;
  contact: SiteContact;
}) {
  const address = `${contact.address.street}, ${contact.address.postalCode} ${contact.address.city}`;
  return (
    <LocationSection
      header={header}
      contact={contact}
      map={<ConsentMap address={address} painted />}
    />
  );
}
