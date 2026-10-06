import {
  emptyRichTextDocument,
  type RichTextDocument,
} from "@repo/contracts/rich-text";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RichTextEditor } from "./rich-text-editor";

const populatedDocument: RichTextDocument = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Początkowa treść" }],
    },
  ],
};

describe("RichTextEditor", () => {
  it("renders the accessible toolbar, initial content and canonical empty content", async () => {
    const { rerender } = render(
      <RichTextEditor value={populatedDocument} onChange={vi.fn()} />,
    );
    expect(
      await screen.findByRole("toolbar", { name: "Formatowanie tekstu" }),
    ).toBeVisible();
    expect(
      await screen.findByRole("textbox", {}, { timeout: 3_000 }),
    ).toHaveTextContent("Początkowa treść");
    rerender(
      <RichTextEditor value={emptyRichTextDocument} onChange={vi.fn()} />,
    );
    await waitFor(() =>
      expect(screen.getByRole("textbox")).toHaveTextContent(""),
    );
  });

  it("emits typed content through the controlled onChange API", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <RichTextEditor value={emptyRichTextDocument} onChange={onChange} />,
    );
    await user.click(
      await screen.findByRole("textbox", {}, { timeout: 3_000 }),
    );
    await user.type(screen.getByRole("textbox"), "Nowa treść");
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.lastCall?.[0]).toMatchObject({
      type: "doc",
      content: [{ type: "paragraph", content: [{ text: "Nowa treść" }] }],
    });
  });

  it.each([
    ["Pogrubienie", "bold"],
    ["Kursywa", "italic"],
  ] as const)(
    "applies %s through an accessible toggle",
    async (label, mark) => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <RichTextEditor value={emptyRichTextDocument} onChange={onChange} />,
      );
      await user.click(await screen.findByRole("button", { name: label }));
      await user.type(screen.getByRole("textbox"), "Format");
      expect(
        onChange.mock.lastCall?.[0].content[0].content[0].marks,
      ).toContainEqual({
        type: mark,
      });
    },
  );

  it("creates headings and bullet lists", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <RichTextEditor value={emptyRichTextDocument} onChange={onChange} />,
    );
    await user.click(await screen.findByRole("button", { name: "Nagłówek 2" }));
    // The paragraph has become a heading before anything is typed (on a
    // slow machine the first keys went to the paragraph being replaced).
    await screen.findByRole("heading", { level: 2 });
    await user.type(screen.getByRole("textbox"), "Nagłówek", {
      skipClick: true,
    });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Nagłówek",
    );

    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Lista punktowana" }));
    await user.type(screen.getByRole("textbox"), "Element", {
      skipClick: true,
    });
    expect(screen.getByRole("list")).toBeVisible();
    expect(onChange).toHaveBeenCalled();
  });

  it("validates and inserts links", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <RichTextEditor value={emptyRichTextDocument} onChange={onChange} />,
    );
    const textbox = await screen.findByRole("textbox", {}, { timeout: 3_000 });
    await user.click(textbox);
    await user.type(textbox, "Kolor Sensu");
    await user.keyboard("{Control>}a{/Control}");
    await user.click(screen.getByRole("button", { name: "Edytuj link" }));
    await user.type(
      screen.getByLabelText("Adres linku"),
      "javascript:alert(1)",
    );
    await user.click(screen.getByRole("button", { name: "Zapisz link" }));
    expect(screen.getByRole("alert")).toBeVisible();
    await user.clear(screen.getByLabelText("Adres linku"));
    await user.type(
      screen.getByLabelText("Adres linku"),
      "https://example.com",
    );
    await user.click(screen.getByRole("button", { name: "Zapisz link" }));
    expect(screen.getByRole("link", { name: "Kolor Sensu" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(onChange).toHaveBeenCalled();
  });

  it("supports undo and redo", async () => {
    const user = userEvent.setup();
    render(<RichTextEditor value={emptyRichTextDocument} onChange={vi.fn()} />);
    const textbox = await screen.findByRole("textbox", {}, { timeout: 3_000 });
    await user.type(textbox, "Zmiana");
    await user.click(screen.getByRole("button", { name: "Cofnij" }));
    expect(textbox).toHaveTextContent("");
    await user.click(screen.getByRole("button", { name: "Ponów" }));
    expect(textbox).toHaveTextContent("Zmiana");
  });

  it("blocks editing when disabled", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <RichTextEditor disabled value={populatedDocument} onChange={onChange} />,
    );
    const textbox = await screen.findByRole("textbox", {}, { timeout: 3_000 });
    expect(textbox).toHaveAttribute("aria-disabled", "true");
    expect(textbox).toHaveAttribute("contenteditable", "false");
    await user.type(textbox, " próba");
    expect(onChange).not.toHaveBeenCalled();
  });
});
