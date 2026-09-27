import {
  EditorialHeading,
  PrimaryButton,
  SecondaryButton,
} from "@repo/ui/public-site";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Nie znaleziono strony",
};

export default function NotFound() {
  return (
    <div className="max-w-page px-gutter py-section mx-auto grid justify-items-start gap-5">
      <EditorialHeading
        as="h1"
        accent="Ta strona nie istnieje."
        accentTone="primary"
      >
        Nie znaleźliśmy jej
      </EditorialHeading>
      <p className="max-w-copy text-lead text-text-muted">
        Być może adres się zmienił albo zawiera literówkę. Zacznij od strony
        głównej albo skontaktuj się z nami.
      </p>
      <div className="flex flex-wrap gap-3">
        <PrimaryButton asChild arrow>
          <Link href="/">Strona główna</Link>
        </PrimaryButton>
        <SecondaryButton asChild>
          <Link href="/kontakt">Kontakt</Link>
        </SecondaryButton>
      </div>
    </div>
  );
}
