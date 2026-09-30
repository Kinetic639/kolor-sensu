import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { VisitEmailContent } from "./confirmation-content";

// A visit e-mail's look (the confirmation, a new time, a cancellation): simple, readable in every mail client,
// in the public site's colours (inline, as e-mail needs).

const colors = {
  ink: "#16302f",
  muted: "#51625f",
  primary: "#527b57",
  bg: "#f6f4ef",
  surface: "#fdfdfb",
  border: "#e3e0d8",
};

export function ConfirmationEmail({ content }: { content: VisitEmailContent }) {
  return (
    <Html lang="pl">
      <Head />
      <Preview>{content.preview}</Preview>
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
            Kolor Sensu
          </Text>
          <Heading
            as="h1"
            style={{ fontSize: 24, lineHeight: "32px", margin: "8px 0 16px" }}
          >
            {content.heading}
          </Heading>
          <Text style={{ fontSize: 16, lineHeight: "24px" }}>
            {content.greeting} {content.intro}
          </Text>

          <Section
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              margin: "16px 0",
              padding: "8px 16px",
            }}
          >
            {content.rows.map(([label, value]) => (
              <Text
                key={label}
                style={{ fontSize: 15, lineHeight: "22px", margin: "8px 0" }}
              >
                <span style={{ color: colors.muted }}>{label}:</span>{" "}
                <strong>{value}</strong>
              </Text>
            ))}
          </Section>

          <Button
            href={content.manageUrl}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 999,
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 700,
              padding: "12px 24px",
            }}
          >
            {content.buttonLabel}
          </Button>

          {content.note ? (
            <Text
              style={{ color: colors.muted, fontSize: 14, lineHeight: "22px" }}
            >
              {content.note}
            </Text>
          ) : null}

          <Hr style={{ borderColor: colors.border, margin: "24px 0" }} />
          {content.contactLine ? (
            <Text
              style={{ color: colors.muted, fontSize: 13, lineHeight: "20px" }}
            >
              Jeśli chcesz coś zmienić, skontaktuj się z nami:{" "}
              {content.contactLine}
            </Text>
          ) : null}
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            Do zobaczenia,
            <br />
            Kolor Sensu
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
