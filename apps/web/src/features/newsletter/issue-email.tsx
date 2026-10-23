import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import {
  isRichTextEmpty,
  type RichTextDocument,
} from "@repo/contracts/rich-text";
import { render } from "@react-email/components";
import type { NewsletterCardView } from "./issue-items";
import { EmailRichText, richTextEmailText } from "./rich-text-email";

// A newsletter issue as e-mail, in the look of the visit e-mails: the
// introduction, the cards (each with its cover, a few words and a button
// to its page), the closing word, and at the foot why it came and the link
// to unsubscribe (Resend's, in a broadcast; a test has none).

const colors = {
  ink: "#16302f",
  muted: "#51625f",
  primary: "#527b57",
  bg: "#f6f4ef",
  surface: "#fdfdfb",
  border: "#e3e0d8",
};

/**
 * Each recipient's own link to the site's unsubscribe page: Resend puts in
 * the contact's code (its `unsubscribe_token` property, features/newsletter/
 * sync.ts).
 */
export const newsletterUnsubscribeUrl = (origin: string) =>
  `${origin}/newsletter/wypisz?kod={{{contact.unsubscribe_token}}}`;

export interface NewsletterIssueEmailContent {
  subject: string;
  previewText: string;
  number: number | null;
  intro: RichTextDocument;
  cards: readonly NewsletterCardView[];
  closing: RichTextDocument;
}

export interface NewsletterIssueEmailOptions {
  /** The site's address, before its own paths. */
  origin: string;
  /** The link to unsubscribe; null in a test. */
  unsubscribeUrl: string | null;
  /** Where the issue can be read on the site, if it is kept in the archive. */
  webUrl: string | null;
  company: string | null;
}

function Card({ card }: { card: NewsletterCardView }) {
  return (
    <Section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        margin: "0 0 16px",
        overflow: "hidden",
      }}
    >
      {card.imageUrl ? (
        <Img
          alt={card.imageAlt}
          src={card.imageUrl}
          style={{ display: "block", height: "auto", width: "100%" }}
          width="494"
        />
      ) : null}
      <Row>
        <Column style={{ padding: "16px 20px" }}>
          <Text
            style={{
              color: colors.primary,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.04em",
              margin: "0 0 4px",
              textTransform: "uppercase",
            }}
          >
            {card.eyebrow}
          </Text>
          <Heading
            as="h2"
            style={{
              color: colors.ink,
              fontSize: 19,
              lineHeight: "26px",
              margin: "0 0 8px",
            }}
          >
            {card.href ? (
              <Link href={card.href} style={{ color: colors.ink }}>
                {card.title}
              </Link>
            ) : (
              card.title
            )}
          </Heading>
          {card.text ? (
            <Text
              style={{
                color: colors.muted,
                fontSize: 15,
                lineHeight: "22px",
                margin: "0 0 12px",
              }}
            >
              {card.text}
            </Text>
          ) : null}
          {card.href ? (
            <Button
              href={card.href}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 999,
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 700,
                padding: "10px 20px",
              }}
            >
              {card.label}
            </Button>
          ) : null}
        </Column>
      </Row>
    </Section>
  );
}

export function NewsletterIssueEmail({
  content,
  options,
}: {
  content: NewsletterIssueEmailContent;
  options: NewsletterIssueEmailOptions;
}) {
  return (
    <Html lang="pl">
      <Head />
      <Preview>{content.previewText || content.subject}</Preview>
      <Body
        style={{
          backgroundColor: colors.bg,
          color: colors.ink,
          fontFamily: "Helvetica, Arial, sans-serif",
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            maxWidth: 560,
            padding: 32,
          }}
        >
          <Text
            style={{ color: colors.primary, fontSize: 14, fontWeight: 700 }}
          >
            Kolor Sensu · Newsletter
            {content.number ? ` nr ${content.number}` : ""}
          </Text>
          <Heading
            as="h1"
            style={{ fontSize: 24, lineHeight: "32px", margin: "8px 0 16px" }}
          >
            {content.subject}
          </Heading>
          {isRichTextEmpty(content.intro) ? null : (
            <EmailRichText
              colors={colors}
              document={content.intro}
              origin={options.origin}
            />
          )}
          {content.cards.length ? (
            <Section style={{ margin: "8px 0 8px" }}>
              {content.cards.map((card, index) => (
                <Card card={card} key={index} />
              ))}
            </Section>
          ) : null}
          {isRichTextEmpty(content.closing) ? null : (
            <EmailRichText
              colors={colors}
              document={content.closing}
              origin={options.origin}
            />
          )}
          <Text style={{ color: colors.muted, fontSize: 14 }}>
            Do usłyszenia,
            <br />
            Kolor Sensu
          </Text>

          <Hr style={{ borderColor: colors.border, margin: "24px 0" }} />
          <Text
            style={{ color: colors.muted, fontSize: 12, lineHeight: "18px" }}
          >
            Dostajesz tę wiadomość, bo ten adres zapisano na newsletter Kolor
            Sensu i potwierdzono zapis.{" "}
            {options.unsubscribeUrl ? (
              <Link
                href={options.unsubscribeUrl}
                style={{ color: colors.muted, textDecoration: "underline" }}
              >
                Wypisz się z newslettera
              </Link>
            ) : (
              "Tu będzie link do wypisania się (w wiadomości testowej go nie ma)."
            )}
            {options.webUrl ? (
              <>
                {" · "}
                <Link
                  href={options.webUrl}
                  style={{ color: colors.muted, textDecoration: "underline" }}
                >
                  Czytaj na stronie
                </Link>
              </>
            ) : null}
          </Text>
          {options.company ? (
            <Text
              style={{ color: colors.muted, fontSize: 11, lineHeight: "16px" }}
            >
              {options.company}
            </Text>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}

/** The issue's text version: the same words, links written out. */
export function newsletterIssueText(
  content: NewsletterIssueEmailContent,
  options: NewsletterIssueEmailOptions,
): string {
  const parts = [
    `Kolor Sensu · Newsletter${content.number ? ` nr ${content.number}` : ""}`,
    content.subject.toUpperCase(),
    richTextEmailText(content.intro, options.origin),
    ...content.cards.map((card) =>
      [
        `${card.eyebrow.toUpperCase()}: ${card.title}`,
        card.text,
        card.href ? `${card.label}: ${card.href}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    richTextEmailText(content.closing, options.origin),
    "Do usłyszenia,\nKolor Sensu",
    "---",
    [
      "Dostajesz tę wiadomość, bo ten adres zapisano na newsletter Kolor Sensu i potwierdzono zapis.",
      options.unsubscribeUrl
        ? `Wypisz się z newslettera: ${options.unsubscribeUrl}`
        : "",
      options.webUrl ? `Czytaj na stronie: ${options.webUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    options.company ?? "",
  ];
  return parts.filter((part) => part.trim()).join("\n\n");
}

export interface RenderedNewsletterIssue {
  subject: string;
  preview: string;
  html: string;
  text: string;
}

export async function renderNewsletterIssue(
  content: NewsletterIssueEmailContent,
  options: NewsletterIssueEmailOptions,
): Promise<RenderedNewsletterIssue> {
  return {
    subject: content.subject,
    preview: content.previewText,
    html: await render(
      <NewsletterIssueEmail content={content} options={options} />,
    ),
    text: newsletterIssueText(content, options),
  };
}
