import { logout } from "@/app/actions/auth";
import { AuthShell } from "@repo/ui/auth-shell";
import { Button } from "@repo/ui/button";

export default function AccessDeniedPage() {
  return (
    <AuthShell
      eyebrow="Kolor Sensu · Admin"
      title="Brak dostępu"
      description="To konto nie ma aktywnego uprawnienia administratora."
    >
      <p className="text-sm text-[var(--text-muted)]">
        Możesz użyć tego samego konta w innym portalu, jeśli ma właściwą rolę.
      </p>
      <form action={logout}>
        <Button className="w-full" type="submit" variant="secondary">
          Wyloguj się
        </Button>
      </form>
    </AuthShell>
  );
}
