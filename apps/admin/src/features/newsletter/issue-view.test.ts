import { describe, expect, it } from "vitest";
import {
  defaultSendTime,
  issueSummary,
  issueTag,
  itemTitle,
  moveItem,
  sendAtFromLocal,
} from "./issue-view";

const NOW = new Date("2026-11-01T10:00:00Z");

describe("an issue in the portal", () => {
  it("tags its state", () => {
    expect(issueTag({ status: "draft", sendAt: null }, NOW)).toMatchObject({
      label: "Szkic",
      tone: "neutral",
    });
    expect(
      issueTag({ status: "sent", sendAt: "2026-11-02T08:00:00Z" }, NOW),
    ).toMatchObject({ label: "Zaplanowane", tone: "info" });
  });

  it("says how a sent one went", () => {
    expect(
      issueSummary(
        {
          status: "sent",
          sendAt: "2026-10-30T08:00:00Z",
          recipients: 120,
          stoppedAfter: 2,
        },
        NOW,
      ),
    ).toBe(
      "Wyszło 30 października 2026 09:00 do 120 osób; wypisało się po nim: 2.",
    );
    expect(
      issueSummary(
        { status: "draft", sendAt: null, recipients: null, stoppedAfter: null },
        NOW,
      ),
    ).toBeNull();
  });

  it("names a card", () => {
    const titles = {
      articles: new Map([["a1", "O emocjach"]]),
      ebooks: new Map<string, string>(),
    };
    expect(itemTitle({ kind: "article", id: "a1" }, titles)).toBe("O emocjach");
    expect(itemTitle({ kind: "ebook", id: "e1" }, titles)).toContain(
      "niedostępny",
    );
    expect(
      itemTitle(
        { kind: "card", title: "", text: "", href: "", label: "" },
        titles,
      ),
    ).toBe("Karta bez tytułu");
  });

  it("moves a card within the list", () => {
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
    expect(moveItem(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
  });

  it("reads the chosen time in Warsaw's zone", () => {
    // November: UTC+1.
    expect(sendAtFromLocal("2026-11-02", "09:00")).toBe(
      "2026-11-02T08:00:00.000Z",
    );
    // July: UTC+2.
    expect(sendAtFromLocal("2026-07-02", "09:00")).toBe(
      "2026-07-02T07:00:00.000Z",
    );
    expect(sendAtFromLocal("", "09:00")).toBeNull();
    expect(defaultSendTime(NOW)).toEqual({ date: "2026-11-02", time: "09:00" });
  });
});
