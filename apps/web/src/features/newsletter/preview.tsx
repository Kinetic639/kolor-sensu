import { render } from "@react-email/components";
import type { EmailPreview } from "@/features/booking/email/catalogue";
import { withCompany } from "@/features/booking/email/confirmation-content";
import { ConfirmationEmail } from "@/features/booking/email/confirmation-email";
import {
  newsletterConfirmationContent,
  newsletterConfirmUrl,
} from "./confirmation-email";

// The newsletter's own e-mail for the admin's portal (CMS → E-maile): the
// confirmation link, built as the real one, with a sample token. The
// newsletter itself is written and sent in Resend.

export async function newsletterEmailPreviews(
  siteUrl: string,
  company: string | null,
): Promise<EmailPreview[]> {
  const content = newsletterConfirmationContent(
    newsletterConfirmUrl(siteUrl, "przyklad"),
  );
  return [
    {
      key: "newsletter-confirm",
      group: "Newsletter",
      name: "Potwierdzenie zapisu na newsletter",
      when: "Od razu po zapisie na stronie. Bez kliknięcia w link adres nie trafia na listę.",
      attachment: null,
      subject: content.subject,
      preview: content.preview,
      html: await render(
        <ConfirmationEmail company={company} content={content} />,
      ),
      text: withCompany(content.text, company),
    },
  ];
}
