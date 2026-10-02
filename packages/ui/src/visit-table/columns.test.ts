import { describe, expect, it } from "vitest";
import {
  columnWidth,
  defaultColumnLayout,
  parseColumnLayout,
  parseColumnWidths,
  serializeColumnLayout,
  serializeColumnWidths,
  VISIT_COLUMN_WIDTHS,
  VISIT_COLUMNS,
} from "./columns";

const all = VISIT_COLUMNS;
const specialist = VISIT_COLUMNS.filter(
  (id) => id !== "specjalista" && id !== "platnosc",
);

describe("the bookings table's column layout", () => {
  it("by default: the usual columns shown, contact details and notes hidden", () => {
    expect(serializeColumnLayout(defaultColumnLayout(all))).toBe(
      "termin,utworzono,zmiana,klient,-telefon,-email,usluga,-miejsce,specjalista,status,platnosc,-uwagi",
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
      "status,termin,-klient,telefon,usluga,specjalista,platnosc,-email,miejsce,uwagi,utworzono,zmiana",
    );
  });

  it("drops what it does not know or the table lacks; adds the rest after", () => {
    expect(
      serializeColumnLayout(
        parseColumnLayout("platnosc,status,nieznana,status,klient", specialist),
      ),
    ).toBe(
      "status,klient,termin,utworzono,zmiana,-telefon,-email,usluga,-miejsce,-uwagi",
    );
  });

  it("nonsense or everything hidden still shows a table", () => {
    expect(parseColumnLayout("%%%", all)).toEqual(defaultColumnLayout(all));
    expect(parseColumnLayout("", all)).toEqual(defaultColumnLayout(all));
    const hidden = parseColumnLayout(all.map((id) => `-${id}`).join(","), all);
    expect(hidden.filter((c) => c.shown).map((c) => c.id)).toEqual(["termin"]);
  });
});

describe("column widths", () => {
  it("reads the saved widths, kept within bounds, nonsense left out", () => {
    expect(
      parseColumnWidths("termin:150,klient:9999,nic:100,usluga:abc,status:10"),
    ).toEqual({ termin: 150, klient: 640, status: 60 });
    expect(parseColumnWidths(undefined)).toEqual({});
  });

  it("writes them back, and falls back to the usual width", () => {
    expect(serializeColumnWidths({ termin: 150, klient: 220 })).toBe(
      "termin:150,klient:220",
    );
    expect(columnWidth("termin", { termin: 150 })).toBe(150);
    expect(columnWidth("klient", {})).toBe(VISIT_COLUMN_WIDTHS.klient);
  });
});
