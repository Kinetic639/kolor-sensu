import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { type ReactNode, useId } from "react";
import { HanddrawnLink } from "./handdrawn-link";
import { HeaderCta, SectionHeader } from "./section-header";
import type { SiteContact } from "./site-types";

export interface LocationSectionProps {
  header: SectionHeaderContent;
  contact: SiteContact;
  /** The app supplies the map, including its consent boundary. */
  map: ReactNode;
}

/** The CMS's address and contact details beside a painted, consent-aware map. */
export function LocationSection({
  header,
  contact,
  map,
}: LocationSectionProps) {
  const headingId = useId();
  const { address } = contact;
  const destination = `${address.street}, ${address.postalCode} ${address.city}`;
  return (
    <section
      className="ks-location max-w-page px-gutter mx-auto"
      aria-labelledby={headingId}
    >
      <div className="ks-location__layout">
        <div className="ks-location__copy">
          <SectionHeader
            content={contact.hours ? { ...header, cta: null } : header}
            id={headingId}
            size="h2"
          />
          <address className="ks-location__details">
            <div className="ks-location__detail">
              <MapPin aria-hidden="true" strokeWidth={1.4} />
              <div>
                <span className="ks-location__label">Adres</span>
                <p>
                  {address.street}
                  <br />
                  {address.postalCode} {address.city}
                </p>
                <div className="ks-location__detail-action">
                  <HanddrawnLink
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`}
                  >
                    Pokaż na mapie
                  </HanddrawnLink>
                </div>
              </div>
            </div>
            {contact.hours ? (
              <div className="ks-location__detail">
                <Clock aria-hidden="true" strokeWidth={1.4} />
                <div>
                  <span className="ks-location__label">Godziny otwarcia</span>
                  <p className="whitespace-pre-line">{contact.hours}</p>
                  {header.cta ? (
                    <div className="ks-location__detail-action">
                      <HeaderCta {...header.cta} />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            {contact.phone ? (
              <div className="ks-location__detail">
                <Phone aria-hidden="true" strokeWidth={1.4} />
                <div>
                  <span className="ks-location__label">Telefon</span>
                  <a href={`tel:${contact.phone}`}>
                    {contact.phoneLabel ?? contact.phone}
                  </a>
                </div>
              </div>
            ) : null}
            {contact.email ? (
              <div className="ks-location__detail">
                <Mail aria-hidden="true" strokeWidth={1.4} />
                <div>
                  <span className="ks-location__label">E-mail</span>
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </div>
              </div>
            ) : null}
          </address>
        </div>
        <div className="ks-location__map">{map}</div>
      </div>
    </section>
  );
}
