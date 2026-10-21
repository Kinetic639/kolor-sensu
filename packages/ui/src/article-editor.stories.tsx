import type { Meta, StoryObj } from "@storybook/react";
import {
  emptyArticleDocument,
  type ArticleDocument,
} from "@repo/contracts/article-rich-text";
import { useState } from "react";
import { ArticleEditor } from "./article-editor";
import { ArticleRenderer } from "./article-renderer";
import { sampleArticle } from "./article.fixtures";

// The article editor: "Wstaw" and "/" for an article's blocks, images
// uploaded (here: pretended), blocks dragged or moved with buttons; and,
// beside it, the article as the page shows it.

const preview = "/kolor-sensu/therapy-room-upload.png";

function Playground({ initial }: { initial: ArticleDocument }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <ArticleEditor
        imageUrl={() => preview}
        onChange={setValue}
        services={[
          {
            slug: "konsultacja-psychologiczna",
            name: "Konsultacja psychologiczna",
          },
          { slug: "terapia-par", name: "Terapia par" },
        ]}
        uploadImage={async () => ({
          src: `articles/${crypto.randomUUID()}.png`,
          width: 1600,
          height: 1067,
        })}
        value={value}
      />
      <ArticleRenderer
        bookingHref={() => "/umow-wizyte"}
        document={value}
        fallback={
          <p className="text-small">
            Artykuł nie jest jeszcze poprawny (np. zdjęcie bez opisu).
          </p>
        }
        imageUrl={() => preview}
      />
    </div>
  );
}

const meta = {
  title: "Rich Text/Article Editor",
  component: Playground,
  args: { initial: emptyArticleDocument },
} satisfies Meta<typeof Playground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const EveryBlock: Story = { args: { initial: sampleArticle } };
