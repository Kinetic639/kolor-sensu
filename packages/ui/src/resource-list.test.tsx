import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResourceList, type ResourceListItem } from "./resource-list";

const items: ResourceListItem[] = [
  {
    id: "anna",
    href: "/specjalisci/anna",
    name: "Anna Nowak",
    description: "Psychoterapeutka",
    avatar: { url: null, initials: "AN", accent: "#7c3aed", tint: "#f5effe" },
    facts: ["4 usługi"],
    statuses: [{ label: "Opublikowany", tone: "success" }],
    tags: ["active", "published"],
  },
  {
    id: "jan",
    href: "/specjalisci/jan",
    name: "Jan Kowalski",
    description: "Psycholog dziecięcy",
    avatar: { url: null, initials: "JK", accent: "#ea580c", tint: "#fdf2ec" },
    facts: ["0 usług"],
    statuses: [{ label: "Do weryfikacji", tone: "warning" }],
    tags: ["active", "pending"],
  },
  {
    id: "ewa",
    href: "/specjalisci/ewa",
    name: "Ewa Zielińska",
    description: "Psychoterapeutka par",
    avatar: { url: null, initials: "EZ", accent: "#0891b2", tint: "#ebf6f9" },
    statuses: [{ label: "Nieaktywna", tone: "neutral" }],
    tags: ["inactive"],
    muted: true,
  },
];

const filters = [
  { id: "active", label: "Aktywni" },
  { id: "pending", label: "Do weryfikacji" },
  { id: "inactive", label: "Nieaktywni" },
];

function list(extra: Partial<Parameters<typeof ResourceList>[0]> = {}) {
  return render(
    <ResourceList
      emptyText="Nie ma jeszcze specjalistów."
      filters={filters}
      items={items}
      label="Specjaliści"
      noMatchText="Nikt nie pasuje do wyszukiwania."
      searchLabel="Szukaj specjalisty"
      {...extra}
    />,
  );
}

const names = () =>
  within(screen.getByRole("list", { name: "Specjaliści" }))
    .getAllByRole("link")
    .map((link) => link.textContent);

describe("ResourceList", () => {
  it("lists every resource, each a link with its facts and status", () => {
    list();
    expect(names()).toEqual(["Anna Nowak", "Jan Kowalski", "Ewa Zielińska"]);
    expect(screen.getByRole("link", { name: "Anna Nowak" })).toHaveAttribute(
      "href",
      "/specjalisci/anna",
    );
    expect(screen.getByText("4 usługi")).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Specjaliści" })).getByText(
        "Do weryfikacji",
      ),
    ).toBeInTheDocument();
  });

  it("filters by a tag, each filter with its count", () => {
    list();
    const all = screen.getByRole("radio", { name: /Wszystkie/ });
    expect(all).toBeChecked();
    expect(all.closest("label")).toHaveTextContent("3");
    const pending = screen.getByRole("radio", { name: /Do weryfikacji/ });
    expect(pending.closest("label")).toHaveTextContent("1");
    fireEvent.click(pending);
    expect(names()).toEqual(["Jan Kowalski"]);
  });

  it("searches the name and the description, ignoring case and accents", () => {
    list();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Szukaj specjalisty" }),
      {
        target: { value: "zielinska" },
      },
    );
    expect(names()).toEqual(["Ewa Zielińska"]);
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Szukaj specjalisty" }),
      {
        target: { value: "PSYCHOTERAPEUTKA" },
      },
    );
    expect(names()).toEqual(["Anna Nowak", "Ewa Zielińska"]);
  });

  it("says when nothing matches, and offers to clear", () => {
    list();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Szukaj specjalisty" }),
      {
        target: { value: "xyz" },
      },
    );
    expect(
      screen.getByText("Nikt nie pasuje do wyszukiwania."),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Wyczyść wyszukiwanie i filtry" }),
    );
    expect(names()).toHaveLength(3);
  });

  it("says when there is nothing yet", () => {
    list({ items: [] });
    expect(
      screen.getByText("Nie ma jeszcze specjalistów."),
    ).toBeInTheDocument();
  });

  it("puts the main action in the toolbar", () => {
    list({ actions: <button type="button">Dodaj gabinet</button> });
    expect(
      screen.getByRole("button", { name: "Dodaj gabinet" }),
    ).toBeInTheDocument();
  });

  it("shows a place's colour mark instead of a picture", () => {
    list({
      items: [
        {
          id: "room",
          href: "/gabinety/room",
          name: "Gabinet Zielony",
          description: "Siedziba Główna",
          color: "#16a34a",
          tags: ["active"],
        },
      ],
    });
    expect(screen.getByTestId("resource-color")).toHaveStyle({
      backgroundColor: "#16a34a",
    });
  });
});
