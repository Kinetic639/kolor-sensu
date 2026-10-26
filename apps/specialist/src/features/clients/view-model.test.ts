import { describe, expect, it } from "vitest";
import { myClientRows, shownClients } from "./view-model";

describe("myClientRows", () => {
  it("each client with their visits in words, the next and the last", () => {
    const [row] = myClientRows(
      [
        {
          id: "c-1",
          name: "Joanna Kowalska",
          firstName: "Joanna",
          lastName: "Kowalska",
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
      name: "Kowalska Joanna",
      href: "/klienci/c-1",
      contact: "j@example.invalid · 600100200",
      visits: "5 wizyt",
      next: "12.10, 10:00",
      last: "28.09.2026",
      search: "joanna kowalska kowalska joanna j@example.invalid 600100200",
    });
  });

  it("finds by either order of the name, and sorts by the last one", () => {
    const client = (id: string, firstName: string, lastName: string) => ({
      id,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email: `${id}@example.invalid`,
      phone: null,
      visits: 1,
      upcoming: 0,
      lastVisitAt: null,
      nextVisitAt: null,
    });
    const rows = myClientRows(
      [
        client("c-1", "Ewa", "Żak"),
        client("c-2", "Adam", "Łukasik"),
        client("c-3", "Anna", "Lis"),
      ],
      "Europe/Warsaw",
    );
    expect(shownClients(rows, "", "next").map((row) => row.id)).toEqual([
      "c-1",
      "c-2",
      "c-3",
    ]);
    expect(shownClients(rows, "", "name").map((row) => row.name)).toEqual([
      "Lis Anna",
      "Łukasik Adam",
      "Żak Ewa",
    ]);
    expect(shownClients(rows, "anna lis", "next")).toHaveLength(1);
    expect(shownClients(rows, "lis anna", "next")).toHaveLength(1);
  });
});
