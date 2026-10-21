import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { paragraph } from "../article.fixtures";
import {
  articleBlockCommands,
  canonicalizeArticleJson,
  matchCommands,
  moveBlock,
} from "./commands";

// Moving a block without dragging, the "/" menu's matching, and the
// editor's JSON reduced to the article contract's keys.

let editor: Editor | null = null;
afterEach(() => editor?.destroy());

const texts = (instance: Editor) =>
  instance
    .getJSON()
    .content!.map(
      (node) => (node.content?.[0] as { text?: string } | undefined)?.text,
    );

describe("moving a block", () => {
  it("moves the block holding the caret one place up or down", () => {
    editor = new Editor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [
          paragraph("Pierwszy"),
          paragraph("Drugi"),
          paragraph("Trzeci"),
        ],
      },
    });
    // Inside "Drugi".
    editor.commands.setTextSelection(13);
    expect(moveBlock(editor, -1)).toBe(true);
    expect(texts(editor)).toEqual(["Drugi", "Pierwszy", "Trzeci"]);
    expect(moveBlock(editor, -1)).toBe(false);
    expect(moveBlock(editor, 1)).toBe(true);
    expect(moveBlock(editor, 1)).toBe(true);
    expect(texts(editor)).toEqual(["Pierwszy", "Trzeci", "Drugi"]);
    expect(moveBlock(editor, 1)).toBe(false);
  });
});

describe("the / menu", () => {
  const commands = articleBlockCommands({ pick: () => {} });

  it("finds blocks by their words, Polish letters or not", () => {
    expect(matchCommands(commands, "tab").map((one) => one.id)).toEqual([
      "table",
    ]);
    expect(matchCommands(commands, "zdj").map((one) => one.id)).toEqual([
      "image",
      "image-pair",
    ]);
    expect(matchCommands(commands, "ważne").map((one) => one.id)).toContain(
      "callout-important",
    );
    expect(matchCommands(commands, "")).toHaveLength(commands.length);
  });
});

describe("the editor's JSON", () => {
  it("keeps only the contract's keys on an article's blocks", () => {
    expect(
      canonicalizeArticleJson({
        type: "doc",
        content: [
          {
            type: "callout",
            attrs: { kind: "tip", class: "red" },
            content: [
              {
                type: "paragraph",
                attrs: { textAlign: "left" },
                content: [
                  {
                    type: "text",
                    text: "Link",
                    marks: [
                      {
                        type: "link",
                        attrs: { href: "/kontakt", target: "_blank", rel: "x" },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "table",
            content: [
              {
                type: "tableRow",
                content: [
                  {
                    type: "tableCell",
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                      colwidth: null,
                      style: "x",
                    },
                    content: [{ type: "paragraph" }],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toEqual({
      type: "doc",
      content: [
        {
          type: "callout",
          attrs: { kind: "tip" },
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Link",
                  marks: [{ type: "link", attrs: { href: "/kontakt" } }],
                },
              ],
            },
          ],
        },
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  attrs: { colspan: 1, rowspan: 1, colwidth: null },
                  content: [{ type: "paragraph" }],
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
