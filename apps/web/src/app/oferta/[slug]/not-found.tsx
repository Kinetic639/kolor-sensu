import {
  EditorialHeading,
  PrimaryButton,
  SecondaryButton,
} from "@repo/ui/public-site";
import Link from "next/link";

// A hidden service or a wrong address under /oferta: back to the offer.

export default function ServiceNotFound() {
  return (
    <div className="max-w-page px-gutter py-section mx-auto grid justify-items-start gap-5">
      <EditorialHeading
        as="h1"
        accent="Tej usługi nie ma w ofercie."
        accentTone="primary"
      >
        Nie znaleźliśmy jej
      </EditorialHeading>
      <p className="max-w-copy text-lead text-text-muted">
        Być może adres się zmienił albo usługa nie jest już dostępna. Zobacz, w
        czym możemy pomóc, albo skontaktuj się z nami.
      </p>
      <div className="flex flex-wrap gap-3">
        <PrimaryButton asChild arrow>
          <Link href="/oferta">Zobacz ofertę</Link>
        </PrimaryButton>
        <SecondaryButton asChild>
          <Link href="/kontakt">Kontakt</Link>
        </SecondaryButton>
      </div>
    </div>
  );
}
