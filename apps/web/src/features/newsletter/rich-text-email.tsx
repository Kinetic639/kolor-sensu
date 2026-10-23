import { Heading, Hr, Link, Text } from "@react-email/components";
import type {
  RichTextBlockNode,
  RichTextDocument,
  RichTextInlineNode,
} from "@repo/contracts/rich-text";
import type { CSSProperties, ReactNode } from "react";

// The base rich text (an issue's introduction and closing) for e-mail: the
// same blocks as on the site, with inline styles mail programs keep, and
// as plain text for the text version. A link to the site's own page gets
// the site's address in front.

export interface EmailTextColors {
  ink: string;
  muted: string;
  primary: string;
  border: string;
}

const paragraph: CSSProperties = {
  fontSize: 16,
  lineHeight: "24px",
  margin: "0 0 16px",
};

const absolute = (href: string, origin: string) =>
  href.startsWith("/") ? `${origin}${href}` : href;

function inline(
  nodes: readonly RichTextInlineNode[] | undefined,
  origin: string,
  colors: EmailTextColors,
): ReactNode[] {
  return (nodes ?? []).map((node, index) => {
    if (node.type === "hardBreak") return <br key={index} />;
    let content: ReactNode = node.text;
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") content = <strong>{content}</strong>;
      else if (mark.type === "italic") content = <em>{content}</em>;
      else if (mark.type === "underline") content = <u>{content}</u>;
      else if (mark.type === "strike") content = <s>{content}</s>;
      else if (mark.type === "code") content = <code>{content}</code>;
      else if (mark.type === "link") {
        content = (
          <Link
            href={absolute(mark.attrs.href, origin)}
            style={{ color: colors.primary, textDecoration: "underline" }}
          >
            {content}
          </Link>
        );
      }
    }
    return <span key={index}>{content}</span>;
  });
}

function block(
  node: RichTextBlockNode,
  key: number,
  origin: string,
  colors: EmailTextColors,
): ReactNode {
  switch (node.type) {
    case "paragraph":
      return (
        <Text key={key} style={paragraph}>
          {inline(node.content, origin, colors)}
        </Text>
      );
    case "heading":
      return (
        <Heading
          as={node.attrs.level === 2 ? "h2" : "h3"}
          key={key}
          style={{
            color: colors.ink,
            fontSize: node.attrs.level === 2 ? 20 : 17,
            lineHeight: node.attrs.level === 2 ? "28px" : "24px",
            margin: "24px 0 8px",
          }}
        >
          {inline(node.content, origin, colors)}
        </Heading>
      );
    case "bulletList":
    case "orderedList": {
      const List = node.type === "bulletList" ? "ul" : "ol";
      return (
        <List key={key} style={{ ...paragraph, paddingLeft: 24 }}>
          {node.content.map((item, index) => (
            <li key={index} style={{ margin: "0 0 4px" }}>
              {item.content.map((child, childIndex) =>
                child.type === "paragraph" ? (
                  <span key={childIndex}>
                    {inline(child.content, origin, colors)}
                  </span>
                ) : (
                  block(child, childIndex, origin, colors)
                ),
              )}
            </li>
          ))}
        </List>
      );
    }
    case "blockquote":
      return (
        <div
          key={key}
          style={{
            borderLeft: `3px solid ${colors.primary}`,
            color: colors.muted,
            margin: "0 0 16px",
            paddingLeft: 16,
          }}
        >
          {node.content.map((child, index) =>
            block(child, index, origin, colors),
          )}
        </div>
      );
    case "horizontalRule":
      return (
        <Hr
          key={key}
          style={{ borderColor: colors.border, margin: "24px 0" }}
        />
      );
  }
}

export function EmailRichText({
  document,
  origin,
  colors,
}: {
  document: RichTextDocument;
  origin: string;
  colors: EmailTextColors;
}) {
  return (
    <>
      {document.content.map((node, index) =>
        block(node, index, origin, colors),
      )}
    </>
  );
}

function inlineText(
  nodes: readonly RichTextInlineNode[] | undefined,
  origin: string,
): string {
  return (nodes ?? [])
    .map((node) => {
      if (node.type === "hardBreak") return "\n";
      const link = node.marks?.find((mark) => mark.type === "link");
      return link && link.type === "link"
        ? `${node.text} (${absolute(link.attrs.href, origin)})`
        : node.text;
    })
    .join("");
}

function blockText(node: RichTextBlockNode, origin: string): string {
  switch (node.type) {
    case "paragraph":
      return inlineText(node.content, origin);
    case "heading":
      return inlineText(node.content, origin).toUpperCase();
    case "bulletList":
    case "orderedList":
      return node.content
        .map(
          (item, index) =>
            `${node.type === "bulletList" ? "-" : `${index + 1}.`} ${item.content
              .map((child) => blockText(child, origin))
              .join(" ")}`,
        )
        .join("\n");
    case "blockquote":
      return node.content
        .map((child) => `> ${blockText(child, origin)}`)
        .join("\n");
    case "horizontalRule":
      return "---";
  }
}

/** The rich text as plain text: blocks apart, links with their address. */
export function richTextEmailText(
  document: RichTextDocument,
  origin: string,
): string {
  return document.content
    .map((node) => blockText(node, origin))
    .filter((text) => text.trim())
    .join("\n\n");
}
