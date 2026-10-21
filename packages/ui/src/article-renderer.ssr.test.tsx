// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArticleRenderer } from "./article-renderer";
import { sampleArticle } from "./article.fixtures";

// The article renders on the server: no window, no editor, no script.

describe("an article on the server", () => {
  it("renders whole, without a browser", () => {
    expect(typeof window).toBe("undefined");
    const html = renderToString(
      <ArticleRenderer
        bookingHref={() => "/umow-wizyte"}
        document={sampleArticle}
        imageUrl={(src) => `https://cdn.example/${src}`}
      />,
    );
    expect(html).toContain('id="czym-jest-lek"');
    expect(html).toContain("<table");
    expect(html).toContain("Najtrudniej było przyjść pierwszy raz.");
    expect(html).not.toContain("ProseMirror");
  });
});
