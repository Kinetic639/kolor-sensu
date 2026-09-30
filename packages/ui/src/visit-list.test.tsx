import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VisitList } from "./visit-list";
import { adminVisitDays, specialistVisitDays } from "./visit-list.samples";

describe("VisitList", () => {
  it("lists the visits under their day, with their state and money", () => {
    render(<VisitList days={adminVisitDays} showSpecialist />);
    const wednesday = screen.getByRole("region", {
      name: "środa, 2 października",
    });
    const items = within(wednesday).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("09:00–09:50");
    expect(items[0]).toHaveTextContent("Jan Kowalski");
    expect(items[0]).toHaveTextContent("Anna Kłobuchowska");
    expect(items[0]).toHaveTextContent("Opłacona");
    expect(items[1]).toHaveTextContent("Online");
    expect(items[1]).toHaveTextContent("Przełożona przez klienta");
    expect(
      screen.getByRole("region", { name: "czwartek, 3 października" }),
    ).toHaveTextContent("Zwrot do zlecenia");
  });

  it("keeps the client's contact under a disclosure", () => {
    render(<VisitList days={specialistVisitDays} />);
    const [first] = screen.getAllByText("Dane klienta");
    expect(first!.closest("details")).not.toHaveAttribute("open");
    expect(screen.getAllByText("600 100 200")[0]).toBeInTheDocument();
    expect(screen.queryByText(/Opłacona/)).not.toBeInTheDocument();
    expect(screen.queryByText("Anna Kłobuchowska")).not.toBeInTheDocument();
  });

  it("puts each visit's action next to it", () => {
    render(
      <VisitList
        actions={{ v1: <button type="button">Odwołaj</button> }}
        days={adminVisitDays}
      />,
    );
    const [first] = screen.getAllByRole("listitem");
    expect(
      within(first!).getByRole("button", { name: "Odwołaj" }),
    ).toBeInTheDocument();
  });

  it("says when there is nothing", () => {
    render(<VisitList days={[]} emptyText="Brak wizyt w tym tygodniu." />);
    expect(screen.getByText("Brak wizyt w tym tygodniu.")).toBeInTheDocument();
  });
});
