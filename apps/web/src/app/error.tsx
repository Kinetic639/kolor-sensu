"use client"; // Error boundaries must be Client Components

import { PrimaryButton, SecondaryButton } from "@repo/ui/public-site/actions";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-page px-gutter py-section mx-auto grid justify-items-start gap-5">
      <h1 className="font-display text-h2 text-ink">Coś poszło nie tak</h1>
      <p className="max-w-copy text-lead text-text-muted">
        Nie udało się wyświetlić tej strony. Spróbuj ponownie za chwilę.
      </p>
      <div className="flex flex-wrap gap-3">
        <PrimaryButton onClick={() => retry()}>Spróbuj ponownie</PrimaryButton>
        <SecondaryButton asChild>
          <Link href="/">Strona główna</Link>
        </SecondaryButton>
      </div>
    </div>
  );
}
