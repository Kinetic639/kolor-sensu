import { describe, expect, it } from "vitest";
import { myClientRows } from "./view-model";

describe("myClientRows", () => {
  it("each client with their visits in words, the next and the last", () => {
    const [row] = myClientRows(
      [
        {
          id: "c-1",
          name: "Joanna Kowalska",
          email: "j@example.invalid",
          phone: "600100200",
          visits: 5,
          upcoming: 1,
          lastVisitAt: "2026-09-28T08:00:00Z",
          nextVisitAt: "2026-10-12T08:00:00Z",
        },
      ],
      "Europe/Warsaw",
    );
    expect(row).toMatchObject({
      id: "c-1",
      href: "/klienci/c-1",
      contact: "j@example.invalid · 600100200",
      visits: "5 wizyt",
      next: "12.10, 10:00",
      last: "28.09.2026",
      search: "joanna kowalska j@example.invalid 600100200",
    });
  });
});
