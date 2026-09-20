import { getCurrentUser } from "@repo/supabase";
import { redirect } from "next/navigation";
import { resetPassword } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@repo/ui/auth-shell";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const client = await createClient();
  const user = await getCurrentUser(client);

  if (!user) {
    redirect("/login?error=invalid-callback");
  }

  const { error } = await searchParams;

  return (
    <AuthShell
      eyebrow="Kolor Sensu · Specjalista"
      title="Ustaw nowe hasło"
      description="Użyj co najmniej 8 znaków."
    >
      {error ? (
        <p
          className="rounded-md bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          Hasła muszą być identyczne i mieć co najmniej 8 znaków.
        </p>
      ) : null}
      <form action={resetPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nowe hasło</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            aria-invalid={error ? true : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="passwordConfirmation">Powtórz nowe hasło</Label>
          <Input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            aria-invalid={error ? true : undefined}
          />
        </div>
        <Button className="w-full" type="submit">
          Zmień hasło
        </Button>
      </form>
    </AuthShell>
  );
}
