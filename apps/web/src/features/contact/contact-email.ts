// The contact form's two e-mails (decided 19.10): the centre is told about
// a new message (replies go straight to the visitor; two buttons open a
// reply with a ready template, in Gmail or the mail program), and the
// visitor gets a copy. Plain words; the visitor's own are escaped, never
// markup.

export interface ContactMessageWords {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export interface CentreContact {
  phoneLabel?: string;
  email?: string;
}

export interface ContactEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const paragraphs = (text: string) =>
  text
    .split("\n")
    .map((line) => escape(line))
    .join("<br>");

/** The reply's starting text: greeting, room for the answer, signature, quote. */
export function replyTemplate(
  message: ContactMessageWords,
  centre: CentreContact,
) {
  const quoted = message.message
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return [
    "Dzień dobry,",
    "",
    "dziękujemy za wiadomość.",
    "",
    "[Tu Twoja odpowiedź]",
    "",
    "Pozdrawiamy serdecznie",
    "Zespół Kolor Sensu",
    ...(centre.phoneLabel ? [`tel. ${centre.phoneLabel}`] : []),
    "",
    `${message.name} napisał(a):`,
    quoted,
  ].join("\n");
}

/** Gmail's compose window, filled in. */
export function gmailComposeUrl(to: string, subject: string, body: string) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** The mail program's new message, filled in (spaces as %20, not +). */
export function mailtoUrl(to: string, subject: string, body: string) {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const button = (href: string, label: string) =>
  `<a href="${escape(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border-radius:999px;background:#45684a;color:#ffffff;text-decoration:none;font-weight:600">${escape(label)}</a>`;

/** To the centre: who wrote, what, and the two ways to reply. */
export function centreNotice(
  message: ContactMessageWords,
  centre: CentreContact & { email: string },
): ContactEmail {
  const subject = "Re: Twoja wiadomość do Kolor Sensu";
  const body = replyTemplate(message, centre);
  const details = [
    `Imię: ${message.name}`,
    `E-mail: ${message.email}`,
    ...(message.phone ? [`Telefon: ${message.phone}`] : []),
  ];
  return {
    to: centre.email,
    replyTo: message.email,
    subject: `Nowa wiadomość ze strony: ${message.name}`,
    text: [
      "Nowa wiadomość z formularza na stronie Kolor Sensu.",
      "",
      ...details,
      "",
      message.message,
      "",
      "Odpowiedz na ten e-mail, a odpowiedź trafi wprost do tej osoby.",
    ].join("\n"),
    html: [
      `<p>Nowa wiadomość z formularza na stronie Kolor Sensu.</p>`,
      `<p>${details.map(escape).join("<br>")}</p>`,
      `<blockquote style="margin:0 0 16px;padding:8px 16px;border-left:3px solid #c5d0bf">${paragraphs(message.message)}</blockquote>`,
      `<p>${button(gmailComposeUrl(message.email, subject, body), "Odpowiedz w Gmailu")}${button(mailtoUrl(message.email, subject, body), "Odpowiedz w programie pocztowym")}</p>`,
      `<p style="color:#566461">Możesz też po prostu odpowiedzieć na ten e-mail: odpowiedź trafi wprost do tej osoby.</p>`,
    ].join("\n"),
  };
}

/** To the visitor: thanks, their message, and help in a crisis. */
export function clientCopy(
  message: ContactMessageWords,
  centre: CentreContact,
): ContactEmail {
  const reach = [
    ...(centre.phoneLabel ? [`tel. ${centre.phoneLabel}`] : []),
    ...(centre.email ? [centre.email] : []),
  ].join(", ");
  const crisis =
    "Jeśli potrzebujesz pomocy od razu: 112 (zagrożenie życia), 800 702 222 (całodobowo, bezpłatnie).";
  return {
    to: message.email,
    subject: "Otrzymaliśmy Twoją wiadomość – Kolor Sensu",
    text: [
      `Dzień dobry, ${message.name},`,
      "",
      "dziękujemy za wiadomość. Odpowiemy najszybciej, jak to możliwe.",
      ...(reach ? [`W pilnej sprawie: ${reach}.`] : []),
      "",
      "Twoja wiadomość:",
      message.message,
      "",
      crisis,
      "",
      "Zespół Kolor Sensu",
    ].join("\n"),
    html: [
      `<p>Dzień dobry, ${escape(message.name)},</p>`,
      `<p>dziękujemy za wiadomość. Odpowiemy najszybciej, jak to możliwe.${reach ? `<br>W pilnej sprawie: ${escape(reach)}.` : ""}</p>`,
      `<p>Twoja wiadomość:</p>`,
      `<blockquote style="margin:0 0 16px;padding:8px 16px;border-left:3px solid #c5d0bf">${paragraphs(message.message)}</blockquote>`,
      `<p style="color:#566461">${escape(crisis)}</p>`,
      `<p>Zespół Kolor Sensu</p>`,
    ].join("\n"),
  };
}
