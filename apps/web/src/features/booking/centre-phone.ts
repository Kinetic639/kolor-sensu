import { getSiteFrame } from "@/lib/site-frame";
import type { PaymentPhone } from "./payment-form";

/** The centre's phone, as the site shows it, or null when it has none. */
export async function centrePhone(): Promise<PaymentPhone | null> {
  const { contact } = await getSiteFrame();
  return contact?.phone
    ? { phone: contact.phone, label: contact.phoneLabel ?? contact.phone }
    : null;
}
