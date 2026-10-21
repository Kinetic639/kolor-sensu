import type { Meta, StoryObj } from "@storybook/react";
import { articleHeadings } from "@repo/contracts/article-rich-text";
import { ArticleRenderer, ArticleTableOfContents } from "./article-renderer";
import { sampleArticle } from "./article.fixtures";

// An article's body with every block: the reading column, the three image
// widths, two images, the box, the quotation, the table and the button.

const meta = {
  title: "Rich Text/Article Renderer",
  component: ArticleRenderer,
  args: {
    document: sampleArticle,
    imageUrl: () => "/kolor-sensu/therapy-room-upload.png",
    bookingHref: (service) =>
      service ? `/umow-wizyte?usluga=${service}` : "/umow-wizyte",
  },
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="bg-bg px-gutter py-10">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ArticleRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EveryBlock: Story = {};

export const WithTableOfContents: Story = {
  render: (args) => (
    <div className="grid gap-8">
      <ArticleTableOfContents
        className="mx-auto w-full max-w-[42rem]"
        headings={articleHeadings(args.document)}
      />
      <ArticleRenderer {...args} />
    </div>
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: "mobile1" } },
};
