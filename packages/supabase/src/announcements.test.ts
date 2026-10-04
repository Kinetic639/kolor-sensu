import { describe, expect, it, vi } from "vitest";
import {
  deleteAnnouncement,
  getCurrentAnnouncement,
  listAnnouncements,
  saveAnnouncement,
} from "./announcements";

const row = {
  id: "a-1",
  message: "Centrum nieczynne 19–23.12.",
  link_label: "Szczegóły",
  link_href: "/kontakt",
  starts_on: "2026-12-10",
  ends_on: "2026-12-23",
  created_at: "2026-10-05T08:00:00Z",
  updated_at: "2026-10-05T08:00:00Z",
};

describe("listAnnouncements", () => {
  it("every announcement, the latest days first", async () => {
    const order = vi.fn().mockResolvedValue({ data: [row], error: null });
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    await expect(listAnnouncements({ from } as never)).resolves.toEqual([
      {
        id: "a-1",
        message: "Centrum nieczynne 19–23.12.",
        linkLabel: "Szczegóły",
        linkHref: "/kontakt",
        startsOn: "2026-12-10",
        endsOn: "2026-12-23",
      },
    ]);
    expect(from).toHaveBeenCalledWith("site_announcements");
    expect(order).toHaveBeenCalledWith("starts_on", { ascending: false });
  });
});

describe("saveAnnouncement", () => {
  const input = {
    message: "  Centrum nieczynne 19–23.12. ",
    linkLabel: "",
    linkHref: "",
    startsOn: "2026-12-10",
    endsOn: "2026-12-23",
  };

  it("a new one: checked, its blank link none", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    await saveAnnouncement({ from: () => ({ insert }) } as never, null, input);
    expect(insert).toHaveBeenCalledWith({
      message: "Centrum nieczynne 19–23.12.",
      link_label: null,
      link_href: null,
      starts_on: "2026-12-10",
      ends_on: "2026-12-23",
    });
  });

  it("one there is: changed in place", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    await saveAnnouncement({ from: () => ({ update }) } as never, "a-1", input);
    expect(eq).toHaveBeenCalledWith("id", "a-1");
  });

  it("not saved when it does not check out", async () => {
    const insert = vi.fn();
    await expect(
      saveAnnouncement({ from: () => ({ insert }) } as never, null, {
        ...input,
        endsOn: "2026-12-01",
      }),
    ).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("deleteAnnouncement", () => {
  it("removes it", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn(() => ({ eq }));
    await deleteAnnouncement(
      { from: () => ({ delete: remove }) } as never,
      "a-1",
    );
    expect(eq).toHaveBeenCalledWith("id", "a-1");
  });
});

describe("getCurrentAnnouncement", () => {
  it("the one the site shows today, or none", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "a-1",
          message: "Centrum nieczynne.",
          link_label: null,
          link_href: null,
          ends_on: "2026-12-23",
        },
      ],
      error: null,
    });
    await expect(getCurrentAnnouncement({ rpc } as never)).resolves.toEqual({
      id: "a-1",
      message: "Centrum nieczynne.",
      link: null,
    });
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(getCurrentAnnouncement({ rpc } as never)).resolves.toBeNull();
  });
});
