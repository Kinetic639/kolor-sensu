// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import type { HomeStoryMedia } from "@repo/contracts";
import { StoryMediaFields } from "./story-media-fields";

const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
];
function Editor() {
  const [value, setValue] = useState<HomeStoryMedia>({
    type: "ebooks",
    source: "manual",
    ids,
  });
  return (
    <StoryMediaFields
      id="books"
      value={value}
      onChange={setValue}
      options={{
        articles: [],
        workshops: [],
        ebooks: ids.map((id, index) => ({
          id,
          title: `E-book ${index + 1}`,
          imageUrl: null,
        })),
      }}
    />
  );
}
afterEach(cleanup);
describe("the primary mobile ebook", () => {
  it("lets the admin select a book and resets the choice when that book is removed", () => {
    render(<Editor />);
    const primary = screen.getByLabelText("Główny e-book na telefonie");
    fireEvent.change(primary, { target: { value: ids[1] } });
    expect(primary).toHaveValue(ids[1]);
    fireEvent.click(screen.getByRole("checkbox", { name: "E-book 2" }));
    expect(primary).toHaveValue("");
    expect(
      screen.queryByRole("option", { name: "E-book 2" }),
    ).not.toBeInTheDocument();
  });
  it("offers a default and shows this setting only for ebook slides", () => {
    render(<Editor />);
    expect(screen.getByLabelText("Główny e-book na telefonie")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Zawartość slajdu"), {
      target: { value: "articles" },
    });
    expect(
      screen.queryByLabelText("Główny e-book na telefonie"),
    ).not.toBeInTheDocument();
  });
});
