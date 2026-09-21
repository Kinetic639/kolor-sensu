import {
  isSafeRichTextHref,
  richTextDocumentSchema,
  type RichTextBlockNode,
  type RichTextDocument,
  type RichTextInlineNode,
  type RichTextListItemNode,
  type RichTextMark,
} from "@repo/contracts/rich-text";
import type { ReactNode } from "react";
import { cn } from "./lib/utils";

export function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-none text-base leading-7 text-[var(--text)]",
        "[&_a]:font-medium [&_a]:text-[var(--accent)] [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-4 hover:[&_a]:decoration-2",
        "[&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--accent)] [&_blockquote]:bg-[var(--surface-muted)] [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:italic",
        "[&_code]:rounded [&_code]:bg-[var(--surface-muted)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
        "[&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:font-heading [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:tracking-tight",
        "[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:font-heading [&_h3]:text-2xl [&_h3]:font-semibold",
        "[&_hr]:my-8 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-[var(--border)]",
        "[&_li]:my-1.5 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-7",
        "[&_p]:my-4 [&_ul]:my-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-7",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function RichTextRenderer({
  document,
  className,
  fallback = null,
}: {
  document: RichTextDocument;
  className?: string;
  fallback?: ReactNode;
}) {
  const parsed = richTextDocumentSchema.safeParse(document);
  if (!parsed.success) return fallback;

  return (
    <Prose className={className}>
      {parsed.data.content.map((node, index) =>
        renderBlock(node, `block-${index}`),
      )}
    </Prose>
  );
}

function renderBlock(node: RichTextBlockNode, key: string): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{renderInlineContent(node.content, key)}</p>;
    case "heading": {
      const content = renderInlineContent(node.content, key);
      return node.attrs.level === 2 ? (
        <h2 key={key}>{content}</h2>
      ) : (
        <h3 key={key}>{content}</h3>
      );
    }
    case "bulletList":
      return (
        <ul key={key}>
          {node.content.map((item, index) =>
            renderListItem(item, `${key}-item-${index}`),
          )}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key}>
          {node.content.map((item, index) =>
            renderListItem(item, `${key}-item-${index}`),
          )}
        </ol>
      );
    case "blockquote":
      return (
        <blockquote key={key}>
          {node.content.map((child, index) =>
            renderBlock(child, `${key}-quote-${index}`),
          )}
        </blockquote>
      );
    case "horizontalRule":
      return <hr key={key} />;
  }
}

function renderListItem(node: RichTextListItemNode, key: string) {
  return (
    <li key={key}>
      {node.content.map((child, index) =>
        renderBlock(child, `${key}-block-${index}`),
      )}
    </li>
  );
}

function renderInlineContent(
  content: RichTextInlineNode[] | undefined,
  keyPrefix: string,
) {
  return content?.map((node, index) => {
    const key = `${keyPrefix}-inline-${index}`;
    if (node.type === "hardBreak") return <br key={key} />;
    return applyMarks(node.text, node.marks ?? [], key);
  });
}

function applyMarks(text: string, marks: RichTextMark[], key: string) {
  let result: ReactNode = text;
  for (const [index, mark] of marks.entries()) {
    const markKey = `${key}-mark-${index}`;
    switch (mark.type) {
      case "bold":
        result = <strong key={markKey}>{result}</strong>;
        break;
      case "italic":
        result = <em key={markKey}>{result}</em>;
        break;
      case "underline":
        result = <u key={markKey}>{result}</u>;
        break;
      case "strike":
        result = <s key={markKey}>{result}</s>;
        break;
      case "code":
        result = <code key={markKey}>{result}</code>;
        break;
      case "link":
        result = renderSafeLink(mark.attrs.href, result, markKey);
        break;
    }
  }
  return <span key={key}>{result}</span>;
}

function renderSafeLink(href: string, content: ReactNode, key: string) {
  if (!isSafeRichTextHref(href)) return <span key={key}>{content}</span>;
  const external = /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      key={key}
      rel={external ? "noopener noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      {content}
    </a>
  );
}
