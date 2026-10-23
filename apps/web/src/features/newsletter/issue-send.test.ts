import { emptyNewsletterIssue } from "@repo/contracts/newsletter-issue";
import type { NewsletterIssue } from "@repo/contracts/newsletter-issue";
import { describe, expect, it, vi } from "vitest";
import {
  cancelNewsletterIssue,
  sendNewsletterIssue,
  type SendDeps,
} from "./issue-send";

const NOW = new Date("2026-11-01T10:00:00Z");

const issue = (overrides: Partial<NewsletterIssue> = {}): NewsletterIssue => ({
  ...emptyNewsletterIssue(),
  id: "i1",
  subject: "Listopad",
  items: [{ kind: "article", id: "a1" }],
  number: null,
  status: "draft",
  sendAt: null,
  broadcastId: null,
  recipients: null,
  updatedAt: "2026-11-01T09:00:00Z",
  ...overrides,
});

function deps(overrides: Partial<SendDeps> = {}) {
  return {
    load: vi.fn(async () => issue()),
    claim: vi.fn(async () => {}),
    render: vi.fn(async () => ({
      subject: "Listopad",
      preview: "",
      html: "<p>Listopad</p>",
      text: "Listopad",
    })),
    sync: vi.fn(async () => {}),
    broadcast: vi.fn(async () => "b1"),
    finish: vi.fn(async () => 3),
    release: vi.fn(async () => {}),
    segmentId: "seg",
    now: () => NOW,
    ...overrides,
  } satisfies SendDeps;
}

describe("sending an issue", () => {
  it("claims, renders, hands it to Resend and numbers it", async () => {
    const d = deps();
    const outcome = await sendNewsletterIssue("i1", null, d);
    expect(outcome).toEqual({ ok: true, number: 3, scheduled: false });
    expect(d.claim).toHaveBeenCalledWith("i1", null);
    expect(d.sync).toHaveBeenCalled();
    expect(d.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Newsletter: Listopad" }),
      null,
    );
    expect(d.finish).toHaveBeenCalledWith("i1", "b1");
    expect(d.release).not.toHaveBeenCalled();
  });

  it("schedules it at the time chosen", async () => {
    const d = deps();
    const at = "2026-11-02T08:00:00.000Z";
    const outcome = await sendNewsletterIssue("i1", at, d);
    expect(outcome).toEqual({ ok: true, number: 3, scheduled: true });
    expect(d.broadcast).toHaveBeenCalledWith(expect.anything(), at);
  });

  it("sends nothing without the segment", async () => {
    const d = deps({ segmentId: undefined });
    const outcome = await sendNewsletterIssue("i1", null, d);
    expect(outcome.ok).toBe(false);
    expect(d.claim).not.toHaveBeenCalled();
  });

  it("refuses a time already past", async () => {
    const d = deps();
    const outcome = await sendNewsletterIssue(
      "i1",
      "2026-11-01T09:00:00.000Z",
      d,
    );
    expect(outcome.ok).toBe(false);
    expect(d.claim).not.toHaveBeenCalled();
  });

  it("refuses an issue that is not ready", async () => {
    const d = deps({ load: vi.fn(async () => issue({ subject: "" })) });
    const outcome = await sendNewsletterIssue("i1", null, d);
    expect(outcome).toEqual({ ok: false, message: "Wpisz temat wydania." });
    expect(d.claim).not.toHaveBeenCalled();
  });

  it("explains a draft someone else already took", async () => {
    const d = deps({
      claim: vi.fn(async () => {
        throw { message: "newsletter_issue_not_draft" };
      }),
    });
    const outcome = await sendNewsletterIssue("i1", null, d);
    expect(outcome.ok).toBe(false);
    expect(d.broadcast).not.toHaveBeenCalled();
  });

  it("gives the draft back when Resend refuses it", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const d = deps({
      broadcast: vi.fn(async () => {
        throw new Error("down");
      }),
    });
    const outcome = await sendNewsletterIssue("i1", null, d);
    expect(outcome.ok).toBe(false);
    expect(d.release).toHaveBeenCalledWith("i1");
    expect(d.finish).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("still sends when bringing Resend up to date fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const d = deps({
      sync: vi.fn(async () => {
        throw new Error("down");
      }),
    });
    const outcome = await sendNewsletterIssue("i1", null, d);
    expect(outcome.ok).toBe(true);
    error.mockRestore();
  });
});

describe("taking a scheduled issue back", () => {
  const scheduled = issue({
    status: "sent",
    number: 3,
    sendAt: "2026-11-02T08:00:00Z",
    broadcastId: "b1",
    recipients: 10,
  });

  it("cancels it in Resend, then makes it a draft again", async () => {
    const cancel = vi.fn(async () => {});
    const unschedule = vi.fn(async () => {});
    const outcome = await cancelNewsletterIssue("i1", {
      load: async () => scheduled,
      cancel,
      unschedule,
      now: () => NOW,
    });
    expect(outcome).toEqual({ ok: true });
    expect(cancel).toHaveBeenCalledWith("b1");
    expect(unschedule).toHaveBeenCalledWith("i1");
  });

  it("refuses one already gone", async () => {
    const cancel = vi.fn(async () => {});
    const outcome = await cancelNewsletterIssue("i1", {
      load: async () => ({ ...scheduled, sendAt: "2026-10-31T08:00:00Z" }),
      cancel,
      unschedule: async () => {},
      now: () => NOW,
    });
    expect(outcome.ok).toBe(false);
    expect(cancel).not.toHaveBeenCalled();
  });

  it("keeps it scheduled when Resend does not cancel it", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const unschedule = vi.fn(async () => {});
    const outcome = await cancelNewsletterIssue("i1", {
      load: async () => scheduled,
      cancel: async () => {
        throw new Error("down");
      },
      unschedule,
      now: () => NOW,
    });
    expect(outcome.ok).toBe(false);
    expect(unschedule).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
