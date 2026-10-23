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
        {
          id: "1",
          email: "ola@example.invalid",
          status: "active",
          unsubscribeToken: "t-1",
        },
        {
          id: "2",
          email: "ewa@example.invalid",
          status: "removing",
          unsubscribeToken: "t-2",
        },
        {
          id: "3",
          email: "iga@example.invalid",
          status: "unsubscribed",
          unsubscribeToken: "t-3",
        },
      ],
      contacts: {
        upsert: vi.fn(async () => "contact-1"),
        unsubscribe: vi.fn(async () => {}),
        remove: vi.fn(async () => {}),
      },
      markSynced: vi.fn(async () => {}),
      finishRemoval: vi.fn(async () => {}),
    };
    expect(await syncNewsletter(deps)).toEqual({
      synced: 1,
      unsubscribed: 1,
      removed: 1,
      failed: 0,
    });
    expect(deps.contacts.upsert).toHaveBeenCalledWith(
      "ola@example.invalid",
      "t-1",
    );
    expect(deps.markSynced).toHaveBeenCalledWith("1", "contact-1");
    expect(deps.contacts.unsubscribe).toHaveBeenCalledWith(
      "iga@example.invalid",
    );
    expect(deps.markSynced).toHaveBeenCalledWith("3", null);
    expect(deps.contacts.remove).toHaveBeenCalledWith("ewa@example.invalid");
    expect(deps.finishRemoval).toHaveBeenCalledWith("2");
  });

  it("keeps an address for the next pass when Resend fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const deps: SyncDeps = {
      toSync: async () => [
        {
          id: "2",
          email: "ewa@example.invalid",
          status: "removing",
          unsubscribeToken: "t-2",
        },
      ],
      contacts: {
        upsert: vi.fn(async () => "x"),
        unsubscribe: vi.fn(async () => {}),
        remove: vi.fn(async () => {
          throw new Error("down");
        }),
      },
      markSynced: vi.fn(async () => {}),
      finishRemoval: vi.fn(async () => {}),
    };
    expect(await syncNewsletter(deps)).toEqual({
      synced: 0,
      unsubscribed: 0,
      removed: 0,
      failed: 1,
    });
    expect(deps.finishRemoval).not.toHaveBeenCalled();
  });
});

function fakeResend(found: boolean, propertyDefined = true) {
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
  const contactProperties = {
    list: vi.fn(async () => ({
      data: {
        object: "list",
        has_more: false,
        data: propertyDefined ? [{ key: "unsubscribe_token" }] : [],
      },
      error: null,
    })),
    create: vi.fn(async () => ({ data: { id: "p" }, error: null })),
  };
  return {
    client: { contacts, contactProperties } as unknown as Resend,
    contacts,
    contactProperties,
  };
}

describe("resendNewsletterContacts", () => {
  it("creates a new contact in the segment, with its code", async () => {
    const { client, contacts, contactProperties } = fakeResend(false, false);
    const sync = resendNewsletterContacts(client, "seg");
    expect(await sync.upsert("ola@example.invalid", "t-1")).toBe("new");
    expect(contactProperties.create).toHaveBeenCalledWith({
      key: "unsubscribe_token",
      type: "string",
      fallbackValue: "",
    });
    expect(contacts.create).toHaveBeenCalledWith({
      email: "ola@example.invalid",
      unsubscribed: false,
      properties: { unsubscribe_token: "t-1" },
      segments: [{ id: "seg" }],
    });
    // The property is defined once a run.
    await sync.upsert("ewa@example.invalid", "t-2");
    expect(contactProperties.list).toHaveBeenCalledTimes(1);
  });

  it("subscribes a known contact again", async () => {
    const { client, contacts } = fakeResend(true);
    expect(
      await resendNewsletterContacts(client, undefined).upsert(
        "ola@example.invalid",
        "t-1",
      ),
    ).toBe("old");
    expect(contacts.update).toHaveBeenCalledWith({
      email: "ola@example.invalid",
      unsubscribed: false,
      properties: { unsubscribe_token: "t-1" },
    });
    expect(contacts.segments.add).not.toHaveBeenCalled();
  });

  it("unsubscribes a contact there", async () => {
    const { client, contacts } = fakeResend(true);
    await resendNewsletterContacts(client, undefined).unsubscribe(
      "ola@example.invalid",
    );
    expect(contacts.update).toHaveBeenCalledWith({
      email: "ola@example.invalid",
      unsubscribed: true,
    });
  });

  it("treats an unknown contact as removed", async () => {
    const { client } = fakeResend(false);
    await expect(
      resendNewsletterContacts(client, undefined).remove("ola@example.invalid"),
    ).resolves.toBeUndefined();
  });
});
