import type { RichTextDocument } from "@repo/contracts/rich-text";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichTextRenderer } from "./rich-text-renderer";

const document: RichTextDocument = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Tytuł" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Ważny link",
          marks: [
            { type: "bold" },
            { type: "link", attrs: { href: "https://example.com" } },
          ],
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Jeden" }] },
            {
              type: "orderedList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Zagnieżdżony" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "blockquote",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Cytat" }] },
      ],
    },
  ],
};

describe("RichTextRenderer", () => {
  it("renders semantic headings, paragraphs, marks, nested lists and blockquotes", () => {
    const { container } = render(<RichTextRenderer document={document} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Tytuł" }),
    ).toBeVisible();
    expect(container.querySelector("p strong")).toHaveTextContent("Ważny link");
    expect(container.querySelector("ul li ol li")).toHaveTextContent(
      "Zagnieżdżony",
    );
    expect(container.querySelector("blockquote")).toHaveTextContent("Cytat");
  });

  it("adds external-link protection and preserves safe relative links", () => {
    render(<RichTextRenderer document={document} />);
    expect(screen.getByRole("link", { name: "Ważny link" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });

  it("fails safely for unsupported content", () => {
    const invalid = {
      type: "doc",
      content: [
        { type: "html", attrs: { value: "<script>alert(1)</script>" } },
      ],
    } as unknown as RichTextDocument;
    const { container } = render(
      <RichTextRenderer
        document={invalid}
        fallback={<p>Treść niedostępna</p>}
      />,
    );
    expect(screen.getByText("Treść niedostępna")).toBeVisible();
    expect(container.querySelector("script")).toBeNull();
  });

  it("rejects unsafe links again at the render boundary", () => {
    const invalidLink = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Niebezpieczny link",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    } as unknown as RichTextDocument;
    const { container } = render(
      <RichTextRenderer
        document={invalidLink}
        fallback={<p>Treść niedostępna</p>}
      />,
    );
    expect(screen.getByText("Treść niedostępna")).toBeVisible();
    expect(container.querySelector("a")).toBeNull();
  });
});

