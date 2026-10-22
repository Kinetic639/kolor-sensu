// The code in an issue's unsubscribe link (/newsletter/wypisz?kod=): the
// address's own random id, shown masked on the page before the button.

const CODE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUnsubscribeCode = (value: string) => CODE.test(value);

/** "o…@example.invalid": enough to recognise one's own address. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "…";
  return `${email[0]}…${email.slice(at)}`;
}
