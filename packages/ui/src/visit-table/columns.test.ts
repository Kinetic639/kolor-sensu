import { describe, expect, it } from "vitest";
import {
  defaultColumnLayout,
  parseColumnLayout,
  serializeColumnLayout,
  VISIT_COLUMNS,
} from "./columns";

const all = VISIT_COLUMNS;
const specialist = VISIT_COLUMNS.filter(
  (id) => id !== "specjalista" && id !== "platnosc",
);

describe("the bookings table's column layout", () => {
  it("by default: the usual columns shown, contact details and notes hidden", () => {
    expect(serializeColumnLayout(defaultColumnLayout(all))).toBe(
      "termin,klient,-telefon,-email,usluga,-miejsce,specjalista,status,platnosc,-uwagi",
    );
  });

  it("only the columns the table has (a specialist's has no payments)", () => {
    expect(defaultColumnLayout(specialist).map((c) => c.id)).not.toContain(
      "platnosc",
    );
  });

  it("reads the saved order and what is hidden", () => {
    const layout = parseColumnLayout(
      "status,termin,-klient,telefon,usluga,specjalista,platnosc,-email,miejsce,uwagi",
      all,
    );
    expect(serializeColumnLayout(layout)).toBe(
      "status,termin,-klient,telefon,usluga,specjalista,platnosc,-email,miejsce,uwagi",
    );
  });

  it("drops what it does not know or the table lacks; adds the rest after", () => {
    expect(
      serializeColumnLayout(
        parseColumnLayout("platnosc,status,nieznana,status,klient", specialist),
      ),
    ).toBe("status,klient,termin,-telefon,-email,usluga,-miejsce,-uwagi");
  });

  it("nonsense or everything hidden still shows a table", () => {
    expect(parseColumnLayout("%%%", all)).toEqual(defaultColumnLayout(all));
    expect(parseColumnLayout("", all)).toEqual(defaultColumnLayout(all));
    const hidden = parseColumnLayout(all.map((id) => `-${id}`).join(","), all);
    expect(hidden.filter((c) => c.shown).map((c) => c.id)).toEqual(["termin"]);
  });
});
