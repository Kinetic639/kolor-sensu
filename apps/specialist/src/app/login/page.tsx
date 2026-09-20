import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { getCurrentPortalAuthorization } from "@/lib/auth";
import { AuthShell } from "@repo/ui/auth-shell";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";

const messages = {
  "invalid-input": "Podaj poprawny adres e-mail i hasło.",
  "invalid-credentials": "Nieprawidłowy adres e-mail lub hasło.",
  "invalid-callback": "Link logowania jest nieprawidłowy lub wygasł.",
} as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const authorization = await getCurrentPortalAuthorization();

  if (authorization.status === "allowed") {
    redirect("/");
  }

  if (authorization.status === "forbidden") {
    redirect("/access-denied");
  }

  const { error, status } = await searchParams;
  const errorMessage = messages[error as keyof typeof messages];
  const statusMessage =
    status === "password-updated"
      ? "Hasło zostało zmienione. Zaloguj się ponownie."
      : status === "signed-out"
        ? "Wylogowano bezpiecznie."
        : null;

  return (
    <AuthShell
      eyebrow="Kolor Sensu · Specjalista"
      title="Zaloguj się"
      description="Dostęp jest przeznaczony wyłącznie dla uprawnionych specjalistów."
      footer={
        <Link
          className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
          href="/forgot-password"
        >
          Nie pamiętasz hasła?
        </Link>
      }
    >
      {errorMessage ? (
        <p
          className="rounded-md bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
      {statusMessage ? (
        <p
          className="rounded-md bg-[var(--success-soft)] p-3 text-sm text-[var(--success)]"
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}
      <form action={login} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Adres e-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            aria-invalid={errorMessage ? true : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Hasło</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={errorMessage ? true : undefined}
          />
        </div>
        <Button className="w-full" type="submit">
          Zaloguj się
        </Button>
      </form>
    </AuthShell>
  );
}
