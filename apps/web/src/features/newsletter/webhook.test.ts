import type { WebhookEventPayload } from "resend";
import { describe, expect, it, vi } from "vitest";
import { handleResendEvent } from "./webhook";

const email = {
  created_at: "2026-10-22T08:00:00Z",
  email_id: "e1",
  message_id: "m1",
  from: "Kolor Sensu <newsletter@example.invalid>",
  to: ["ola@example.invalid"],
  subject: "Październik",
};

const contact = {
  id: "c1",
  audience_id: "a1",
  segment_ids: [],
  created_at: "2026-10-22T08:00:00Z",
  updated_at: "2026-10-22T08:00:00Z",
  email: "ola@example.invalid",
};

async function run(event: unknown) {
  const stop = vi.fn(async () => true);
  const bounced = vi.fn(async () => null);
  const stopped = await handleResendEvent(event as WebhookEventPayload, {
    stop,
    bounced,
  });
  return { stop, bounced, stopped };
}

describe("handleResendEvent", () => {
  it("stops a contact that unsubscribed", async () => {
    const { stop, stopped } = await run({
      type: "contact.updated",
      created_at: "",
      data: { ...contact, unsubscribed: true },
    });
    expect(stop).toHaveBeenCalledWith("ola@example.invalid", "unsubscribed");
    expect(stopped).toEqual(["ola@example.invalid"]);
  });

  it("ignores a contact still subscribed", async () => {
    const { stop } = await run({
      type: "contact.updated",
      created_at: "",
      data: { ...contact, unsubscribed: false },
    });
    expect(stop).not.toHaveBeenCalled();
  });

  it("stops an address that bounced for good on a newsletter", async () => {
    const { stop } = await run({
      type: "email.bounced",
      created_at: "",
      data: {
        ...email,
        broadcast_id: "b1",
        bounce: { type: "Permanent", subType: "General", message: "" },
      },
    });
    expect(stop).toHaveBeenCalledWith("ola@example.invalid", "bounced");
  });

  it("leaves a passing bounce and the visits' e-mails alone", async () => {
    const passing = await run({
      type: "email.bounced",
      created_at: "",
      data: {
        ...email,
        broadcast_id: "b1",
        bounce: { type: "Transient", subType: "MailboxFull", message: "" },
      },
    });
    const visit = await run({
      type: "email.complained",
      created_at: "",
      data: email,
    });
    expect(passing.stop).not.toHaveBeenCalled();
    expect(visit.stop).not.toHaveBeenCalled();
  });

  it("a visit's e-mail bounced for good: its history says so, the list is left alone (Klient · 6, card 8)", async () => {
    const visit = await run({
      type: "email.bounced",
      created_at: "",
      data: {
        ...email,
        bounce: { type: "Permanent", subType: "General", message: "" },
      },
    });
    expect(visit.bounced).toHaveBeenCalledWith("e1");
    expect(visit.stop).not.toHaveBeenCalled();
    const passing = await run({
      type: "email.bounced",
      created_at: "",
      data: {
        ...email,
        bounce: { type: "Transient", subType: "MailboxFull", message: "" },
      },
    });
    const newsletter = await run({
      type: "email.bounced",
      created_at: "",
      data: {
        ...email,
        broadcast_id: "b1",
        bounce: { type: "Permanent", subType: "General", message: "" },
      },
    });
    expect(passing.bounced).not.toHaveBeenCalled();
    expect(newsletter.bounced).not.toHaveBeenCalled();
  });

  it("stops an address that reported the confirmation e-mail as spam", async () => {
    const { stop } = await run({
      type: "email.complained",
      created_at: "",
      data: { ...email, tags: { category: "newsletter" } },
    });
    expect(stop).toHaveBeenCalledWith("ola@example.invalid", "complained");
  });
});
