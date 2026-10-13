// ThoughtsLens: a crowd of outlined negative thoughts, each hiding a
// positive one. Point at a negative thought (or tap it) and it turns into
// its positive one, for good, until the page is loaded again.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { splitRows, ThoughtsLens } from "./thoughts-lens";

const negative = [
  "nie dam rady",
  "wstyd",
  "co jeśli",
  "jestem do niczego",
  "lęk",
  "znowu to samo",
];
const positive = ["Mam prawo czuć", "Krok po kroku", "To minie"];

function renderLens() {
  const { container } = render(
    <ThoughtsLens
      negative={negative}
      positive={positive}
      label="Pod natłokiem myśli kryją się inne"
    />,
  );
  const root = container.querySelector<HTMLElement>(".ks-thoughts")!;
  return {
    root,
    words: Array.from(root.querySelectorAll<HTMLElement>(".ks-thoughts__word")),
  };
}

// jsdom lays nothing out; give the parts the widths a browser would.
function widths(word: HTMLElement, fear: number, hope: number) {
  Object.defineProperty(word, "offsetWidth", { value: fear });
  Object.defineProperty(
    word.querySelector(".ks-thoughts__hope"),
    "offsetWidth",
    { value: hope },
  );
}

function pointAt(element: Element, pointerType = "mouse") {
  const event = new MouseEvent("pointerover", { bubbles: true });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  element.dispatchEvent(event);
}

describe("splitRows", () => {
  it("deals the thoughts into rows, one by one", () => {
    expect(splitRows(["a", "b", "c", "d", "e"], 3)).toEqual([
      ["a", "d"],
      ["b", "e"],
      ["c"],
    ]);
  });
});

describe("ThoughtsLens", () => {
  it("says what it shows to assistive tech, the pictures of words hidden", () => {
    const { root } = renderLens();
    expect(
      screen.getByRole("region", {
        name: "Pod natłokiem myśli kryją się inne",
      }),
    ).toBe(root);
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(positive);
    expect(root.querySelector(".ks-thoughts__noise")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("crowds the negative thoughts into two rows, each repeated to drift", () => {
    const { root } = renderLens();
    const rows = root.querySelectorAll(".ks-thoughts__row");
    expect(rows).toHaveLength(2);
    for (const thought of negative) {
      expect(root.querySelector(".ks-thoughts__noise")).toHaveTextContent(
        thought,
      );
    }
    expect(rows[0]!.textContent!.split("nie dam rady")).toHaveLength(4);
  });

  it("gives every letter of the crowd its own way to drift", () => {
    const { words } = renderLens();
    const letters = words[0]!.querySelectorAll<HTMLElement>(
      ".ks-thoughts__fear > span",
    );
    // "nie dam rady": 10 letters, the spaces left as text.
    expect(letters).toHaveLength(10);
    expect(letters[0]!.style.getPropertyValue("--ks-drift-x")).toMatch(/em$/);
    expect(letters[0]!.style.getPropertyValue("--ks-drift-x")).not.toBe(
      letters[1]!.style.getPropertyValue("--ks-drift-x"),
    );
  });

  it("hides a positive thought under every negative one, in turn", () => {
    const { words } = renderLens();
    const hopes = words.map(
      (word) => word.querySelector(".ks-thoughts__hope")!.textContent,
    );
    expect(hopes.slice(0, 4)).toEqual([
      "Mam prawo czuć",
      "Krok po kroku",
      "To minie",
      "Mam prawo czuć",
    ]);
  });

  it("fills every other word, so neighbours read apart", () => {
    const { words } = renderLens();
    expect(
      words
        .slice(0, 4)
        .map((word) => word.classList.contains("ks-thoughts__word--filled")),
    ).toEqual([false, true, false, true]);
  });

  it("turns just the thought pointed at, easing its width to the new one", () => {
    const { words } = renderLens();
    widths(words[0]!, 180, 260);
    pointAt(words[0]!.querySelector(".ks-thoughts__fear span")!);
    expect(words[0]).toHaveAttribute("data-found");
    expect(words[0]!.style.width).toBe("260px");
    expect(words[1]).not.toHaveAttribute("data-found");
  });

  it("keeps it turned once the pointer has moved on", () => {
    const { words } = renderLens();
    widths(words[0]!, 180, 260);
    pointAt(words[0]!);
    pointAt(words[1]!);
    expect(words[0]).toHaveAttribute("data-found");
    expect(words[0]!.style.width).toBe("260px");
    expect(words[1]).toHaveAttribute("data-found");
  });

  it("turns at a tap too", () => {
    const { words } = renderLens();
    pointAt(words[2]!, "touch");
    expect(words[2]).toHaveAttribute("data-found");
  });
});
