import { MapPin, Video } from "lucide-react";
import { ROW_LINE } from "../detail-page/detail-page";
import { cn } from "../lib/utils";
import { OfferToggle } from "./offer-toggle";
import type { OfferStateAction, SpecialistOffer } from "./types";

// A specialist's services at their prices, as a table (in the roster's
// "Usługi" and on their page). The switches save at once (./offer-toggle); without an action
// they only show the state. Rendered on the server.

/** In person, online: an icon and a word each. */
export function OfferForms({ offer }: { offer: SpecialistOffer }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-[0.75rem] text-[var(--text-muted)] [&_svg]:size-3.5 [&_svg]:shrink-0">
      {offer.inPerson ? (
        <span className="inline-flex items-center gap-1">
          <MapPin aria-hidden="true" />
          Stacjonarnie
        </span>
      ) : null}
      {offer.online ? (
        <span className="inline-flex items-center gap-1">
          <Video aria-hidden="true" />
          Online
        </span>
      ) : null}
    </span>
  );
}

function State({
  offer,
  field,
  label,
  action,
}: {
  offer: SpecialistOffer;
  field: "active" | "acceptingNewClients";
  label: string;
  action?: OfferStateAction;
}) {
  if (action) {
    return (
      <OfferToggle action={action} field={field} label={label} offer={offer} />
    );
  }
  return (
    <span className="text-[0.75rem] text-[var(--text-muted)]">
      {offer[field] ? "Tak" : "Nie"}
    </span>
  );
}

const TH =
  "h-8 border-b border-[var(--border)] px-2.5 text-left text-[0.75rem] font-medium whitespace-nowrap text-[var(--text-muted)] first:pl-3.5";
const TD = cn(
  "h-11 border-b px-2.5 align-middle whitespace-nowrap first:pl-3.5",
  ROW_LINE,
);

/** On their page: the services as a table, the switches in the row. */
export function SpecialistOfferTable({
  offers,
  action,
}: {
  offers: SpecialistOffer[];
  action?: OfferStateAction;
}) {
  if (!offers.length) {
    return (
      <p className="px-3.5 py-6 text-[0.8125rem] text-[var(--text-muted)]">
        Specjalista nie ma jeszcze usług w ofercie.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[0.8125rem] text-[var(--text)]">
        <caption className="sr-only">Usługi i cennik specjalisty</caption>
        <thead>
          <tr>
            <th className={TH} scope="col">
              Usługa
            </th>
            <th className={TH} scope="col">
              Cena
            </th>
            <th className={TH} scope="col">
              Czas
            </th>
            <th className={TH} scope="col">
              Formy
            </th>
            <th className={TH} scope="col">
              Nowi klienci
            </th>
            <th className={TH} scope="col">
              Oferta aktywna
            </th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr
              className={cn(
                "hover:bg-[var(--surface-subtle)]",
                !offer.active && "text-[var(--text-muted)]",
              )}
              key={offer.id}
            >
              <th className={cn(TD, "text-left font-normal")} scope="row">
                <span className="font-semibold">{offer.serviceName}</span>
                {offer.category ? (
                  <span className="text-[0.75rem] text-[var(--text-muted)]">
                    {" "}
                    · {offer.category}
                  </span>
                ) : null}
              </th>
              <td className={cn(TD, "tabular-nums")}>{offer.price}</td>
              <td className={cn(TD, "tabular-nums")}>{offer.duration}</td>
              <td className={TD}>
                <OfferForms offer={offer} />
              </td>
              <td className={TD}>
                <State
                  action={action}
                  field="acceptingNewClients"
                  label="Nowi klienci"
                  offer={offer}
                />
              </td>
              <td className={TD}>
                <State
                  action={action}
                  field="active"
                  label="Oferta aktywna"
                  offer={offer}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
