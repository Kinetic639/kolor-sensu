import { render } from "@react-email/components";
import { withCompany, type ConfirmationOptions } from "./confirmation-content";
import { ConfirmationEmail } from "./confirmation-email";
import type { OutgoingEmail } from "./send-confirmation";
import { slotLostContent, type SlotLostEmail } from "./slot-lost-content";

// The e-mail when a payment came after the time was taken (Klient · 4,
// card 17). Sent with the refund; Resend's key (the session's) makes a
// second send of it a no-op.

export interface SlotLostEmailDeps extends Pick<
  ConfirmationOptions,
  "siteUrl" | "contact" | "company"
> {
  from: string;
  send: (message: OutgoingEmail, idempotencyKey: string) => Promise<unknown>;
}

export async function sendSlotLostEmail(
  payment: SlotLostEmail & { to: string; sessionId: string },
  deps: SlotLostEmailDeps,
) {
  const content = slotLostContent(payment, deps);
  await deps.send(
    {
      from: deps.from,
      to: payment.to,
      subject: content.subject,
      html: await render(
        <ConfirmationEmail company={deps.company} content={content} />,
      ),
      text: withCompany(content.text, deps.company),
      attachments: [],
    },
    `slot-lost:${payment.sessionId}`,
  );
}
