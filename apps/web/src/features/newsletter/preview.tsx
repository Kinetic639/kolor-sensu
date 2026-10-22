import { render } from "@react-email/components";
import type { EmailPreview } from "@/features/booking/email/catalogue";
import { withCompany } from "@/features/booking/email/confirmation-content";
import { ConfirmationEmail } from "@/features/booking/email/confirmation-email";
import {
  newsletterConfirmationContent,
  newsletterConfirmUrl,
  newsletterWelcomeContent,
} from "./confirmation-email";

// The newsletter's own e-mails for the admin's portal (CMS → E-maile): the
// confirmation link, built as the real one with a sample token, and the
// welcome after it. The issues themselves have their own preview
// (Newsletter → Wydania).

export async function newsletterEmailPreviews(
  siteUrl: string,
  company: string | null,
): Promise<EmailPreview[]> {
  const content = newsletterConfirmationContent(
    newsletterConfirmUrl(siteUrl, "przyklad"),
  );
  const welcome = newsletterWelcomeContent(siteUrl);
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
    {
      key: "newsletter-welcome",
      group: "Newsletter",
      name: "Powitanie w newsletterze",
      when: "Zaraz po potwierdzeniu zapisu linkiem.",
      attachment: null,
      subject: welcome.subject,
      preview: welcome.preview,
      html: await render(
        <ConfirmationEmail company={company} content={welcome} />,
      ),
      text: withCompany(welcome.text, company),
    },
  ];
}
