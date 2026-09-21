// @vitest-environment node

import type { RichTextDocument } from "@repo/contracts/rich-text";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichTextRenderer } from "./rich-text-renderer";

describe("RichTextRenderer SSR", () => {
  it("renders deterministic content without browser globals or hydration", () => {
    expect(typeof window).toBe("undefined");
    const document: RichTextDocument = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Serverowa treść" }],
        },
      ],
    };
    const first = renderToStaticMarkup(
      <RichTextRenderer document={document} />,
    );
    const second = renderToStaticMarkup(
      <RichTextRenderer document={document} />,
    );
    expect(first).toBe(second);
    expect(first).toContain("<p><span>Serverowa treść</span></p>");
  });
});

