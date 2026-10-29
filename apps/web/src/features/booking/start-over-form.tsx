import { SecondaryButton } from "@repo/ui/public-site";
import { startOverAction } from "./actions";

// "Zacznij od nowa" (Klient · 1, card 15): every choice cleared, a held
// time given back at once. A form, so it works before any script loads.
export function StartOverForm({ className }: { className?: string }) {
  return (
    <form action={startOverAction} className={className}>
      <SecondaryButton size="sm" type="submit">
        Zacznij od nowa
      </SecondaryButton>
    </form>
  );
}
