import type { RichTextDocument } from "@repo/contracts/rich-text";
import type { Meta, StoryObj } from "@storybook/react";
import { RichTextRenderer } from "./rich-text-renderer";
import {
  basicRichTextDocument,
  formattedRichTextDocument,
  longRichTextDocument,
} from "./rich-text.fixtures";

const meta = {
  title: "Rich Text/Renderer",
  component: RichTextRenderer,
  args: { document: basicRichTextDocument },
  decorators: [
    (Story) => (
      <article className="mx-auto w-full max-w-3xl rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10">
        <Story />
      </article>
    ),
  ],
} satisfies Meta<typeof RichTextRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BasicText: Story = {};

export const Headings: Story = {
  args: {
    document: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Nagłówek sekcji" }],
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Nagłówek podsekcji" }],
        },
      ],
    },
  },
};

export const Lists: Story = {
  args: {
    document: {
      type: "doc",
      content: formattedRichTextDocument.content.filter(
        (node) => node.type === "bulletList",
      ),
    },
  },
};

export const Blockquote: Story = {
  args: {
    document: {
      type: "doc",
      content: formattedRichTextDocument.content.filter(
        (node) => node.type === "blockquote",
      ),
    },
  },
};

export const Links: Story = {
  args: {
    document: {
      type: "doc",
      content: [formattedRichTextDocument.content.at(-1)!],
    },
  },
};

export const InlineMarks: Story = {
  args: {
    document: {
      type: "doc",
      content: [formattedRichTextDocument.content[1]!],
    },
  },
};

export const AllFormatting: Story = {
  args: { document: formattedRichTextDocument },
};

export const LongArticle: Story = {
  args: { document: longRichTextDocument },
};

export const MalformedSafeFallback: Story = {
  args: {
    document: {
      type: "doc",
      content: [
        { type: "script", content: [{ type: "text", text: "alert(1)" }] },
      ],
    } as unknown as RichTextDocument,
    fallback: (
      <p role="status" className="text-[var(--text-muted)]">
        Treść jest niedostępna.
      </p>
    ),
  },
};
