import { ContactRateLimitedError } from "@repo/supabase/contact";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendContactMessage, type ContactDeps } from "./send-contact-message";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const filled = {
  name: "Ola Nowak",
  email: "ola@example.invalid",
  phone: "",
  message: "Czy przyjmujecie pary?",
  consent: "on",
  "cf-turnstile-response": "token",
};

let deps: ContactDeps;
let sent: string[];
beforeEach(() => {
  sent = [];
  deps = {
    verify: vi.fn().mockResolvedValue(true),
    senderKey: "k".repeat(64),
    save: vi.fn().mockResolvedValue("message-id"),
    markNotified: vi.fn().mockResolvedValue(undefined),
    send: vi.fn(async (email) => {
      sent.push(email.to);
    }),
    centre: { email: "kontakt@example.invalid", phoneLabel: "61 123 45 67" },
  };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("sending the contact form", () => {
  it("saves the message, tells the centre and sends the visitor a copy", async () => {
    expect(await sendContactMessage(form(filled), deps)).toEqual({
      status: "sent",
    });
    expect(deps.save).toHaveBeenCalledWith({
      name: "Ola Nowak",
      email: "ola@example.invalid",
      phone: "",
      message: "Czy przyjmujecie pary?",
      senderKey: "k".repeat(64),
    });
    expect(sent).toEqual(["kontakt@example.invalid", "ola@example.invalid"]);
    expect(deps.markNotified).toHaveBeenCalledWith("message-id");
  });

  it("says what is wrong with each field, keeping what was typed", async () => {
    const result = await sendContactMessage(
      form({ ...filled, email: "ola@", consent: "" }),
      deps,
    );
    expect(result).toMatchObject({
      status: "invalid",
      errors: {
        email: "Podaj poprawny adres e-mail",
        consent: expect.stringMatching(/Potwierdź/),
      },
      values: { name: "Ola Nowak", message: "Czy przyjmujecie pary?" },
    });
    expect(deps.save).not.toHaveBeenCalled();
  });

  it("drops a bot's message quietly (the hidden field was filled)", async () => {
    expect(
      await sendContactMessage(
        form({ ...filled, website: "spam.example" }),
        deps,
      ),
    ).toEqual({ status: "sent" });
    expect(deps.save).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("refuses without Turnstile's check", async () => {
    deps.verify = vi.fn().mockResolvedValue(false);
    expect((await sendContactMessage(form(filled), deps)).status).toBe(
      "unverified",
    );
    expect(deps.save).not.toHaveBeenCalled();
  });

  it("says when there were too many messages just now", async () => {
    deps.save = vi.fn().mockRejectedValue(new ContactRateLimitedError());
    expect((await sendContactMessage(form(filled), deps)).status).toBe(
      "limited",
    );
  });

  it("says it failed when the message could not be saved", async () => {
    deps.save = vi.fn().mockRejectedValue(new Error("down"));
    expect((await sendContactMessage(form(filled), deps)).status).toBe(
      "failed",
    );
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("keeps the message, and says sent, when the e-mails fail", async () => {
    deps.send = vi.fn().mockRejectedValue(new Error("Resend down"));
    expect(await sendContactMessage(form(filled), deps)).toEqual({
      status: "sent",
    });
    expect(deps.save).toHaveBeenCalled();
    expect(deps.markNotified).not.toHaveBeenCalled();
  });
});
