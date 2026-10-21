import {
  articleDocumentSchema,
  articleHeadings,
  CALLOUT_LABELS,
  TABLE_OF_CONTENTS_MIN,
  type ArticleBlockNode,
  type ArticleDocument,
  type ArticleHeading,
  type ArticleImageFile,
  type ArticleImageWidth,
  type CalloutKind,
  type TableNode,
} from "@repo/contracts/article-rich-text";
import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "./lib/utils";
import { PrimaryButton } from "./public-site/actions";
import { PageLink } from "./public-site/page-link";
import { renderInlineContent, renderRichTextBlock } from "./rich-text-renderer";

// Server-safe: an article's body, as the page's template draws it. The
// text runs in a narrow reading column; an image may break out of it
// ("wide") or span the page ("full"). Headings carry ids (the table of
// contents links to them). Nothing here is client code: the page needs no
// script to show the article.
//
//   grid  [gutter | reading column (42rem) | gutter]
//   ├── paragraphs, lists, headings, quotes, boxes, tables: the column
//   ├── image "text": the column; "wide": up to 60rem; "full": the page
//   └── two images: side by side from 40rem, else one under the other

export interface ArticleRendererProps {
  document: ArticleDocument;
  /** An image's public address, from its path in site-media. */
  imageUrl: (src: string) => string;
  /** Where "Umów wizytę" leads: booking, with the service if one is set. */
  bookingHref: (service: string | null) => string;
  className?: string;
  fallback?: ReactNode;
}

const COLUMN = "col-start-2";

const SIZES: Record<ArticleImageWidth, string> = {
  text: "(min-width: 44rem) 42rem, 100vw",
  wide: "(min-width: 62rem) 60rem, 100vw",
  full: "100vw",
};

const WIDTH_CLASS: Record<ArticleImageWidth, string> = {
  text: COLUMN,
  wide: "col-span-full w-full max-w-[60rem] justify-self-center",
  full: "col-span-full w-full",
};

const CALLOUT_CLASS: Record<CalloutKind, string> = {
  important: "border-primary bg-primary-soft",
  tip: "border-border bg-cream",
  warning: "border-pink-strong bg-pink-soft",
};

/** The prose styles of the reading column (the base blocks' look). */
const PROSE = cn(
  "text-body text-ink leading-8",
  "[&_a]:text-primary-strong [&_a]:font-medium [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-4 hover:[&_a]:decoration-2",
  "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-7 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-7 [&_li>p]:my-0",
  "[&_blockquote]:border-primary [&_blockquote]:border-l-4 [&_blockquote]:pl-5 [&_blockquote]:italic",
  "[&_hr]:border-border [&_hr]:border-t",
  "[&_code]:bg-cream [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em]",
);

export function ArticleRenderer({
  document,
  imageUrl,
  bookingHref,
  className,
  fallback = null,
}: ArticleRendererProps) {
  const parsed = articleDocumentSchema.safeParse(document);
  if (!parsed.success) return fallback;
  const ids = articleHeadings(parsed.data).map((heading) => heading.id);
  let heading = 0;
  const context = { imageUrl, bookingHref };

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_min(42rem,100%)_1fr] gap-y-6",
        PROSE,
        className,
      )}
    >
      {parsed.data.content.map((node, index) => {
        const key = `block-${index}`;
        if (node.type === "heading") {
          const hasText = (node.content ?? []).some(
            (part) => part.type === "text" && part.text.trim(),
          );
          const id = hasText ? ids[heading++] : undefined;
          const Tag = node.attrs.level === 2 ? "h2" : "h3";
          return (
            <Tag
              className={cn(
                COLUMN,
                "font-display text-ink scroll-mt-28 text-balance",
                Tag === "h2" ? "text-h3 mt-6" : "text-title mt-2",
              )}
              id={id}
              key={key}
            >
              {renderInlineContent(node.content, key)}
            </Tag>
          );
        }
        return renderArticleBlock(node, key, context);
      })}
    </div>
  );
}

function renderArticleBlock(
  node: ArticleBlockNode,
  key: string,
  context: Pick<ArticleRendererProps, "imageUrl" | "bookingHref">,
): ReactNode {
  switch (node.type) {
    case "articleImage": {
      const { caption, size, ...file } = node.attrs;
      return (
        <figure className={cn(WIDTH_CLASS[size], "grid gap-2")} key={key}>
          <ArticleImage
            file={file}
            sizes={SIZES[size]}
            src={context.imageUrl(file.src)}
          />
          {caption ? <Caption>{caption}</Caption> : null}
        </figure>
      );
    }
    case "articleImagePair":
      return (
        <figure
          className="col-span-full grid w-full max-w-[60rem] gap-2 justify-self-center"
          key={key}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {node.attrs.images.map((file, index) => (
              <ArticleImage
                file={file}
                key={`${key}-${index}`}
                sizes="(min-width: 62rem) 30rem, (min-width: 40rem) 50vw, 100vw"
                src={context.imageUrl(file.src)}
              />
            ))}
          </div>
          {node.attrs.caption ? <Caption>{node.attrs.caption}</Caption> : null}
        </figure>
      );
    case "callout":
      return (
        <aside
          aria-label={CALLOUT_LABELS[node.attrs.kind]}
          className={cn(
            COLUMN,
            "rounded-card grid gap-2 border-l-4 px-5 py-4",
            CALLOUT_CLASS[node.attrs.kind],
          )}
          key={key}
        >
          <p className="text-small text-ink font-semibold tracking-wide uppercase">
            {CALLOUT_LABELS[node.attrs.kind]}
          </p>
          <div className="grid gap-3 [&>*]:my-0">
            {node.content.map((child, index) =>
              renderRichTextBlock(child, `${key}-${index}`),
            )}
          </div>
        </aside>
      );
    case "pullQuote":
      return (
        <figure className={cn(COLUMN, "my-2 grid gap-3")} key={key}>
          <blockquote className="font-display text-h3 text-ink border-0! pl-0! text-balance not-italic!">
            {node.content.map((child, index) =>
              renderRichTextBlock(child, `${key}-${index}`),
            )}
          </blockquote>
          {node.attrs.author ? (
            <figcaption className="text-small text-text-muted">
              — {node.attrs.author}
            </figcaption>
          ) : null}
        </figure>
      );
    case "table":
      return <ArticleTable key={key} node={node} />;
    case "bookingButton":
      return (
        <div className={COLUMN} key={key}>
          <PrimaryButton arrow asChild>
            <PageLink href={context.bookingHref(node.attrs.service)}>
              {node.attrs.label}
            </PageLink>
          </PrimaryButton>
        </div>
      );
    case "paragraph":
    case "bulletList":
    case "orderedList":
    case "blockquote":
    case "horizontalRule":
    case "heading":
      return (
        <div className={cn(COLUMN, "[&>*]:my-0")} key={key}>
          {renderRichTextBlock(node, key)}
        </div>
      );
  }
}

function ArticleImage({
  file,
  src,
  sizes,
}: {
  file: ArticleImageFile;
  src: string;
  sizes: string;
}) {
  return (
    <Image
      alt={file.alt}
      className="rounded-card h-auto w-full"
      height={file.height}
      sizes={sizes}
      src={src}
      width={file.width}
    />
  );
}

function Caption({ children }: { children: ReactNode }) {
  return (
    <figcaption className="text-small text-text-muted text-center">
      {children}
    </figcaption>
  );
}

/** A table: scrolls sideways in its own box on a phone, never the page. */
function ArticleTable({ node }: { node: TableNode }) {
  const [first, ...rest] = node.content;
  const headed = first?.content.every((cell) => cell.type === "tableHeader");
  const rows = headed ? rest : node.content;
  const cell = (
    one: TableNode["content"][number]["content"][number],
    key: string,
    asHeader: boolean,
  ) => {
    const Tag = asHeader || one.type === "tableHeader" ? "th" : "td";
    return (
      <Tag
        className="border-border border px-3 py-2 text-left align-top [&>p]:my-0"
        colSpan={one.attrs?.colspan ?? 1}
        key={key}
        rowSpan={one.attrs?.rowspan ?? 1}
        scope={Tag === "th" ? (asHeader ? "col" : "row") : undefined}
      >
        {one.content.map((child, index) =>
          renderRichTextBlock(child, `${key}-${index}`),
        )}
      </Tag>
    );
  };
  return (
    <div
      aria-label="Tabela"
      className="col-span-full w-full max-w-[60rem] justify-self-center overflow-x-auto"
      role="region"
      tabIndex={0}
    >
      <table className="text-small w-full border-collapse">
        {headed && first ? (
          <thead className="bg-cream">
            <tr>
              {first.content.map((one, index) =>
                cell(one, `head-${index}`, true),
              )}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.content.map((one, index) =>
                cell(one, `cell-${rowIndex}-${index}`, false),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The article's table of contents: its h2 and h3 headings as links, shown
 * when it has at least TABLE_OF_CONTENTS_MIN h2 headings. Plain links: the
 * keyboard and screen readers reach them as any other.
 */
export function ArticleTableOfContents({
  headings,
  className,
}: {
  headings: readonly ArticleHeading[];
  className?: string;
}) {
  const main = headings.filter((heading) => heading.level === 2).length;
  if (main < TABLE_OF_CONTENTS_MIN) return null;
  return (
    <nav aria-label="Spis treści" className={cn("grid gap-3", className)}>
      <p className="text-small text-text-muted font-semibold tracking-wide uppercase">
        Spis treści
      </p>
      <ol className="text-small grid gap-2">
        {headings.map((heading) => (
          <li
            className={heading.level === 3 ? "pl-4" : undefined}
            key={heading.id}
          >
            <a
              className="text-ink hover:text-primary-strong focus-visible:outline-ring rounded-sm underline-offset-4 hover:underline focus-visible:outline-2"
              href={`#${heading.id}`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
