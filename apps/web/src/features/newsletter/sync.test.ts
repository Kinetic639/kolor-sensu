import { describe, expect, it, vi } from "vitest";
import type { Resend } from "resend";
import {
  resendNewsletterContacts,
  syncNewsletter,
  type SyncDeps,
} from "./sync";

describe("syncNewsletter", () => {
  it("copies confirmed addresses and removes the ones going", async () => {
    const deps: SyncDeps = {
      toSync: async () => [
        { id: "1", email: "ola@example.invalid", status: "active" },
        { id: "2", email: "ewa@example.invalid", status: "removing" },
      ],
      contacts: {
        upsert: vi.fn(async () => "contact-1"),
        remove: vi.fn(async () => {}),
      },
      markSynced: vi.fn(async () => {}),
      finishRemoval: vi.fn(async () => {}),
    };
    expect(await syncNewsletter(deps)).toEqual({
      synced: 1,
      removed: 1,
      failed: 0,
    });
    expect(deps.markSynced).toHaveBeenCalledWith("1", "contact-1");
    expect(deps.contacts.remove).toHaveBeenCalledWith("ewa@example.invalid");
    expect(deps.finishRemoval).toHaveBeenCalledWith("2");
  });

  it("keeps an address for the next pass when Resend fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const deps: SyncDeps = {
      toSync: async () => [
        { id: "2", email: "ewa@example.invalid", status: "removing" },
      ],
      contacts: {
        upsert: vi.fn(async () => "x"),
        remove: vi.fn(async () => {
          throw new Error("down");
        }),
      },
      markSynced: vi.fn(async () => {}),
      finishRemoval: vi.fn(async () => {}),
    };
    expect(await syncNewsletter(deps)).toEqual({
      synced: 0,
      removed: 0,
      failed: 1,
    });
    expect(deps.finishRemoval).not.toHaveBeenCalled();
  });
});

function fakeResend(found: boolean) {
  const contacts = {
    get: vi.fn(async () =>
      found
        ? { data: { id: "old" }, error: null }
        : { data: null, error: { name: "not_found", message: "Not found" } },
    ),
    update: vi.fn(async () => ({ data: { id: "old" }, error: null })),
    create: vi.fn(async () => ({ data: { id: "new" }, error: null })),
    remove: vi.fn(async () => ({
      data: null,
      error: { name: "not_found", message: "Not found" },
    })),
    segments: { add: vi.fn(async () => ({ data: { id: "s" }, error: null })) },
  };
  return { client: { contacts } as unknown as Resend, contacts };
}

describe("resendNewsletterContacts", () => {
  it("creates a new contact in the segment", async () => {
    const { client, contacts } = fakeResend(false);
    expect(
      await resendNewsletterContacts(client, "seg").upsert(
        "ola@example.invalid",
      ),
    ).toBe("new");
    expect(contacts.create).toHaveBeenCalledWith({
      email: "ola@example.invalid",
      unsubscribed: false,
      segments: [{ id: "seg" }],
    });
  });

  it("subscribes a known contact again", async () => {
    const { client, contacts } = fakeResend(true);
    expect(
      await resendNewsletterContacts(client, undefined).upsert(
        "ola@example.invalid",
      ),
    ).toBe("old");
    expect(contacts.update).toHaveBeenCalledWith({
      email: "ola@example.invalid",
      unsubscribed: false,
    });
    expect(contacts.segments.add).not.toHaveBeenCalled();
  });

  it("treats an unknown contact as removed", async () => {
    const { client } = fakeResend(false);
    await expect(
      resendNewsletterContacts(client, undefined).remove("ola@example.invalid"),
    ).resolves.toBeUndefined();
  });
});
