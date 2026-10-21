import type { Decorator, Meta, StoryObj } from "@storybook/react";
import type { RichTextDocument } from "@repo/contracts/rich-text";
import { EbookDetails, EbookGrid, EbookHero } from "./ebook-parts";
import { sampleEbooks } from "./ebook-samples";

// Edukacja's e-books: the cards, and an e-book's page (the hero with the
// way to Naffy and the free sample, then what it is about).

const paper: Decorator = (Story) => (
  <div className="bg-bg font-body text-ink min-h-screen py-12">
    <Story />
  </div>
);

const meta = {
  title: "Public site/E-book",
  decorators: [paper],
  parameters: { canvasPadding: false },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const description: RichTextDocument = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Spokojny, praktyczny poradnik o tym, jak odzyskać dobry sen w trudnym okresie.",
        },
      ],
    },
  ],
};

export const Cards: Story = {
  render: () => (
    <div className="max-w-page px-gutter mx-auto">
      <EbookGrid ebooks={sampleEbooks} headingLevel="h2" />
    </div>
  ),
};

export const Page: Story = {
  render: () => (
    <>
      <EbookHero
        coverAlt=""
        coverUrl={null}
        description={sampleEbooks[0]!.description}
        format="PDF, 48 stron"
        naffyUrl="https://example.invalid/naffy"
        sampleHref="https://example.invalid/fragment.pdf"
        title={sampleEbooks[0]!.title}
      />
      <EbookDetails
        audience="Dla dorosłych, którym stres odbiera sen."
        contents={[
          "Skąd bierze się bezsenność",
          "Wieczorny rytuał",
          "Kiedy szukać pomocy",
        ]}
        description={description}
      />
    </>
  ),
};
