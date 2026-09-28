import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChoiceCardGroup } from "./choice-card";
import { LinkTabs } from "./link-tabs";

describe("LinkTabs", () => {
  it("links every view and marks the current one", () => {
    render(
      <LinkTabs
        ariaLabel="Widok dostępności"
        items={[
          {
            key: "calendar",
            label: "Widok kalendarza",
            href: "?widok=kalendarz",
            active: true,
            badge: "Podstawowy",
          },
          { key: "rules", label: "Reguły i bloki", href: "?widok=reguly" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Widok dostępności" });
    expect(nav).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Widok kalendarza/ }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: /Reguły i bloki/ }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Podstawowy")).toBeInTheDocument();
  });

  it("renders links with the given component, e.g. next/link", () => {
    function FakeLink(props: { href: string; children: React.ReactNode }) {
      return <a data-fake="" {...props} />;
    }
    render(
      <LinkTabs
        ariaLabel="Filtry"
        items={[{ key: "all", label: "Wszystkie", href: "/x" }]}
        linkAs={FakeLink}
        variant="chips"
      />,
    );
    expect(screen.getByRole("link", { name: "Wszystkie" })).toHaveAttribute(
      "data-fake",
    );
  });
});

describe("ChoiceCardGroup", () => {
  const options = [
    { value: "in_person", label: "Stacjonarnie" },
    { value: "online", label: "Online", description: "Spotkanie wideo" },
  ];

  it("is a labelled radio group with one choice", () => {
    render(
      <ChoiceCardGroup
        legend="Forma pracy"
        name="mode"
        onChange={() => {}}
        options={options}
        value="in_person"
      />,
    );
    expect(
      screen.getByRole("group", { name: "Forma pracy" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Stacjonarnie" })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Online/ })).not.toBeChecked();
  });

  it("reports the chosen value", () => {
    const onChange = vi.fn();
    render(
      <ChoiceCardGroup
        legend="Forma pracy"
        name="mode"
        onChange={onChange}
        options={options}
        value="in_person"
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /Online/ }));
    expect(onChange).toHaveBeenCalledWith("online");
  });
});
