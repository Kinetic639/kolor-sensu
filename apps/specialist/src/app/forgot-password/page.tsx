import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { AuthShell } from "@repo/ui/auth-shell";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { error, status } = await searchParams;

  return (
    <AuthShell
      eyebrow="Kolor Sensu · Specjalista"
      title="Odzyskaj hasło"
      description="Wyślemy link do ustawienia nowego hasła, jeśli konto istnieje."
      footer={
        <Link
          className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
          href="/login"
        >
          Wróć do logowania
        </Link>
      }
    >
      {error ? (
        <p
          className="rounded-md bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          Nie udało się wysłać wiadomości. Sprawdź adres lub spróbuj później.
        </p>
      ) : null}
      {status === "sent" ? (
        <p
          className="rounded-md bg-[var(--success-soft)] p-3 text-sm text-[var(--success)]"
          role="status"
        >
          Jeśli konto istnieje, wiadomość została wysłana.
        </p>
      ) : null}
      <form action={requestPasswordReset} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Adres e-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-invalid={error ? true : undefined}
          />
        </div>
        <Button className="w-full" type="submit">
          Wyślij link
        </Button>
      </form>
    </AuthShell>
  );
}
