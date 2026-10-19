import { describe, expect, it, vi } from "vitest";
import {
  ContactRateLimitedError,
  markContactMessageNotified,
  submitContactMessage,
} from "./contact";

const message = {
  name: "Ola",
  email: "ola@example.invalid",
  phone: "",
  message: "Czy przyjmujecie pary?",
  senderKey: "a".repeat(64),
};

describe("contact messages", () => {
  it("saves a message through the database's function, an empty phone as none", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "message-id", error: null });
    expect(await submitContactMessage({ rpc } as never, message)).toBe(
      "message-id",
    );
    expect(rpc).toHaveBeenCalledWith("submit_contact_message", {
      p_name: "Ola",
      p_email: "ola@example.invalid",
      p_phone: null,
      p_message: "Czy przyjmujecie pary?",
      p_sender_key: "a".repeat(64),
    });
  });

  it("says when the database refuses one too many", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "contact_rate_limited" },
    });
    await expect(
      submitContactMessage({ rpc } as never, message),
    ).rejects.toBeInstanceOf(ContactRateLimitedError);
  });

  it("records that the centre was told", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    await markContactMessageNotified({ rpc } as never, "message-id");
    expect(rpc).toHaveBeenCalledWith("mark_contact_message_notified", {
      p_id: "message-id",
    });
  });
});
