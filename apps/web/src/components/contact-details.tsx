import { ArrowLink, SoftCard, type SiteContact } from "@repo/ui/public-site";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Route } from "next";
import { getSiteFrame } from "@/lib/site-frame";

// How to reach the centre: what the database holds (address, phone, email)
// and the opening hours. Missing details are left out, never invented.

const iconStyle = "text-primary mt-1 size-5 shrink-0";

export async function ContactDetails({ className }: { className?: string }) {
  const { contact } = await getSiteFrame();
  return <ContactCard className={className} contact={contact} />;
}

/** The same card from details already loaded (the homepage loads them). */
export function ContactCard({
  contact,
  className,
}: {
  contact: SiteContact | undefined;
  className?: string;
}) {
  if (!contact) {
    return (
      <SoftCard className={className}>
        <p className="text-body text-text-muted p-6">
          Dane kontaktowe pojawią się tu wkrótce.
        </p>
      </SoftCard>
    );
  }

  const { address } = contact;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${address.street}, ${address.postalCode} ${address.city}`,
  )}`;

  return (
    <SoftCard className={className}>
      <address className="text-body grid gap-5 p-6 not-italic lg:p-8">
        <p className="flex gap-4">
          <MapPin className={iconStyle} strokeWidth={1.75} aria-hidden="true" />
          <span>
            <span className="text-ink font-semibold">Adres</span>
            <br />
            {address.street}
            <br />
            {`${address.postalCode} ${address.city}`}
            <br />
            <ArrowLink href={mapUrl as Route} className="mt-2">
              Pokaż na mapie
            </ArrowLink>
          </span>
        </p>
        {contact.phone ? (
          <p className="flex gap-4">
            <Phone
              className={iconStyle}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span>
              <span className="text-ink font-semibold">Telefon</span>
              <br />
              <a
                href={`tel:${contact.phone}`}
                className="hover:text-primary-strong underline-offset-4 hover:underline"
              >
                {contact.phoneLabel ?? contact.phone}
              </a>
            </span>
          </p>
        ) : null}
        {contact.email ? (
          <p className="flex gap-4">
            <Mail className={iconStyle} strokeWidth={1.75} aria-hidden="true" />
            <span>
              <span className="text-ink font-semibold">E-mail</span>
              <br />
              <a
                href={`mailto:${contact.email}`}
                className="hover:text-primary-strong underline-offset-4 hover:underline"
              >
                {contact.email}
              </a>
            </span>
          </p>
        ) : null}
        {contact.hours ? (
          <p className="flex gap-4">
            <Clock
              className={iconStyle}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span>
              <span className="text-ink font-semibold">Godziny otwarcia</span>
              <br />
              {contact.hours}
            </span>
          </p>
        ) : null}
      </address>
    </SoftCard>
  );
}
