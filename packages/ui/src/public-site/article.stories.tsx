import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { ArticleGrid } from "./article-cards";
import {
  ArticleHeader,
  ArticlePeople,
  ArticleServices,
  ArticleSources,
  ArticleTrust,
} from "./article-page";
import { sampleArticles, sampleAuthor } from "./article-samples";
import { ArticleShare } from "./article-share";

// Edukacja's article parts: the cards on the lists, and an article's page
// around its text (header, sharing, sources, trust, what to do next).

const paper: Decorator = (Story) => (
  <div className="bg-bg font-body text-ink min-h-screen py-12">
    <Story />
  </div>
);

const meta = {
  title: "Public site/Article",
  decorators: [paper],
  parameters: { canvasPadding: false },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cards: Story = {
  render: () => (
    <div className="max-w-page px-gutter mx-auto">
      <ArticleGrid articles={sampleArticles} headingLevel="h2" />
    </div>
  ),
};

export const PageParts: Story = {
  render: () => (
    <div className="grid gap-12">
      <ArticleHeader
        author={sampleAuthor}
        category={sampleArticles[0]!.category}
        date="21 października 2026"
        dateTime="2026-10-21T10:00:00Z"
        lead={sampleArticles[0]!.lead}
        reading="6 min czytania"
        title={sampleArticles[0]!.title}
        updated={{
          label: "Zaktualizowano 3 listopada 2026",
          dateTime: "2026-11-03T10:00:00Z",
        }}
      />
      <div className="px-gutter mx-auto w-full max-w-[46rem]">
        <ArticleShare
          title={sampleArticles[0]!.title}
          url="https://example.invalid/edukacja/artykuly/lek-u-dzieci"
        />
      </div>
      <ArticleSources
        sources={[
          {
            title: "WHO: Mental health of adolescents",
            url: "https://www.who.int/",
          },
        ]}
      />
      <ArticleTrust
        crisisHref="/pomoc-w-kryzysie"
        reviewer={sampleAuthor}
        therapyNote="Artykuł ma charakter edukacyjny i nie zastępuje konsultacji ze specjalistą."
      />
      <ArticleServices
        services={[
          {
            name: "Psychoterapia dzieci",
            href: "/oferta/psychoterapia-dzieci",
            bookHref: "/umow-wizyte?usluga=psychoterapia-dzieci",
          },
        ]}
      />
      <ArticlePeople people={[sampleAuthor]} />
    </div>
  ),
};
