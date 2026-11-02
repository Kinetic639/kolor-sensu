import { getBookingWindow } from "@/lib/public-data";
import { bookingRules, type BookingRule } from "./booking-rules";

// "Zasady rezerwacji" under the Regulamin's text (Klient · 3, card 14):
// the rules as the system applies them, from the centre's settings. While
// online booking is off, there is nothing to show.

export function BookingRulesList({ rules }: { rules: BookingRule[] }) {
  return (
    <section aria-labelledby="zasady-rezerwacji" className="grid gap-4">
      <h2 className="font-display text-h3 text-ink" id="zasady-rezerwacji">
        Zasady rezerwacji
      </h2>
      <p className="text-small text-text-muted">
        Tak działa rezerwacja na stronie, według bieżących ustawień centrum.
      </p>
      <dl className="grid gap-4">
        {rules.map((rule) => (
          <div className="grid gap-1" key={rule.title}>
            <dt className="text-ink font-semibold">{rule.title}</dt>
            <dd className="text-text-muted">{rule.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export async function BookingRulesSection() {
  const window = await getBookingWindow();
  return window ? <BookingRulesList rules={bookingRules(window)} /> : null;
}
