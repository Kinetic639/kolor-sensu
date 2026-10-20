import { pageHeader } from "@repo/contracts/cms-shared";
import type { LegalPageContent, LegalPageKey } from "@repo/contracts/cms-legal";
import type {
  RichTextBlockNode,
  RichTextInlineNode,
} from "@repo/contracts/rich-text";

// The site's sample legal documents: what each page shows until the
// centre publishes its own (they say so at their top). They describe what
// the site really does (the browser storage, Turnstile, the map after
// consent, Stripe, the e-mails), but they are not legal advice: the centre
// replaces them before the launch. Kept apart from cms-legal.ts so that the
// portal's forms do not ship them.

type Inline = string | RichTextInlineNode;

const inline = (part: Inline): RichTextInlineNode =>
  typeof part === "string" ? { type: "text", text: part } : part;

const bold = (text: string): RichTextInlineNode => ({
  type: "text",
  text,
  marks: [{ type: "bold" }],
});

const link = (text: string, href: string): RichTextInlineNode => ({
  type: "text",
  text,
  marks: [{ type: "link", attrs: { href } }],
});

const p = (...parts: Inline[]): RichTextBlockNode => ({
  type: "paragraph",
  content: parts.map(inline),
});

const h2 = (text: string): RichTextBlockNode => ({
  type: "heading",
  attrs: { level: 2 },
  content: [{ type: "text", text }],
});

const ul = (...items: Inline[][]): RichTextBlockNode => ({
  type: "bulletList",
  content: items.map((parts) => ({ type: "listItem", content: [p(...parts)] })),
});

const sample = (document: string): RichTextBlockNode => ({
  type: "blockquote",
  content: [
    p(
      `To jest przykładowa treść ${document}. Przed uruchomieniem strony centrum zastępuje ją własnym dokumentem.`,
    ),
  ],
});

const terms: LegalPageContent = {
  intro: pageHeader({
    eyebrow: "Dokumenty",
    title: "Regulamin",
    lead: "Zasady korzystania ze strony oraz umawiania i opłacania wizyt online.",
  }),
  effectiveFrom: "",
  body: {
    type: "doc",
    content: [
      sample("regulaminu"),
      h2("1. Postanowienia ogólne"),
      p(
        "Regulamin określa zasady korzystania ze strony Kolor Sensu oraz umawiania i opłacania wizyt online. Usługodawcą jest spółka prowadząca centrum Kolor Sensu; jej nazwa, adres i NIP są podane w stopce strony.",
      ),
      h2("2. Umawianie wizyt"),
      ul(
        [
          "Wizytę umawiasz na stronie, wybierając usługę, specjalistę i wolny termin.",
        ],
        [
          "Do rezerwacji potrzebne są imię i nazwisko, adres e-mail i numer telefonu.",
        ],
        [
          "Potwierdzenie rezerwacji i link do zarządzania wizytą wysyłamy e-mailem.",
        ],
      ),
      h2("3. Płatności"),
      p(
        "Za wizytę umówioną na stronie płacisz online, kartą lub BLIK-iem. Płatności obsługuje operator płatności Stripe. Rezerwacja, której nie opłacisz w wyznaczonym czasie, zostaje anulowana.",
      ),
      h2("4. Zmiana terminu i odwołanie wizyty"),
      p(
        "Wizytę możesz przełożyć albo odwołać przez link z e-maila z potwierdzeniem. Kiedy opłata wraca w całości, opisuje ",
        link("Cennik", "/cennik#zasady"),
        ".",
      ),
      h2("5. Pomoc w kryzysie"),
      p(
        "Centrum nie udziela pomocy w nagłych sytuacjach zagrożenia życia. W takiej sytuacji zadzwoń pod numer 112 albo skorzystaj z ",
        link("numerów pomocy w kryzysie", "/pomoc-w-kryzysie"),
        ".",
      ),
      h2("6. Reklamacje i kontakt"),
      p(
        "Uwagi i reklamacje możesz zgłosić przez ",
        link("formularz kontaktowy", "/kontakt"),
        ". Odpowiadamy w ciągu 14 dni.",
      ),
      h2("7. Postanowienia końcowe"),
      p(
        "W sprawach, których regulamin nie opisuje, stosuje się przepisy prawa polskiego. Zasady przetwarzania danych osobowych opisuje ",
        link("Polityka prywatności", "/polityka-prywatnosci"),
        ".",
      ),
    ],
  },
};

const privacy: LegalPageContent = {
  intro: pageHeader({
    eyebrow: "Dokumenty",
    title: "Polityka prywatności",
    lead: "Jakie dane zbieramy, po co, komu je powierzamy i jakie masz prawa.",
  }),
  effectiveFrom: "",
  body: {
    type: "doc",
    content: [
      sample("polityki prywatności"),
      h2("Kto jest administratorem danych"),
      p(
        "Administratorem Twoich danych osobowych jest spółka prowadząca centrum Kolor Sensu. Jej nazwa, adres i NIP są podane w stopce strony. W sprawach danych osobowych napisz do nas przez ",
        link("stronę Kontakt", "/kontakt"),
        ".",
      ),
      h2("Jakie dane zbieramy i po co"),
      ul(
        [
          bold("Rezerwacja wizyty:"),
          " imię i nazwisko, e-mail, telefon i wybrany termin, żeby umówić i potwierdzić wizytę oraz o niej przypomnieć.",
        ],
        [
          bold("Ankieta przed pierwszą wizytą:"),
          " odpowiedzi, które pomagają przygotować pierwsze spotkanie.",
        ],
        [
          bold("Formularz kontaktowy:"),
          " imię, e-mail, opcjonalnie telefon i treść wiadomości, żeby odpowiedzieć na Twoje pytanie.",
        ],
        [
          bold("Płatność:"),
          " dane potrzebne do rozliczenia wizyty. Dane karty przetwarza wyłącznie operator płatności.",
        ],
      ),
      h2("Komu powierzamy dane"),
      p("Korzystamy z firm, które przetwarzają dane w naszym imieniu:"),
      ul(
        ["Stripe: obsługa płatności online."],
        ["Resend: wysyłka e-maili z potwierdzeniami i przypomnieniami."],
        ["Supabase i Vercel: przechowywanie danych i działanie strony."],
        ["Cloudflare Turnstile: ochrona formularzy przed botami."],
        ["Google: mapa na stronie Kontakt, tylko po Twojej zgodzie."],
      ),
      h2("Jak długo przechowujemy dane"),
      p(
        "Dane z rezerwacji przechowujemy tak długo, jak wymagają tego przepisy, na przykład o rozliczeniach, a wiadomości z formularza kontaktowego do czasu zakończenia sprawy.",
      ),
      h2("Twoje prawa"),
      ul(
        ["dostęp do swoich danych i otrzymanie ich kopii,"],
        ["sprostowanie i usunięcie danych,"],
        ["ograniczenie przetwarzania i sprzeciw wobec niego,"],
        ["przeniesienie danych,"],
        ["skarga do Prezesa Urzędu Ochrony Danych Osobowych."],
      ),
      h2("Pliki cookies"),
      p(
        "Co zapisujemy w Twojej przeglądarce, opisuje strona ",
        link("Pliki cookies", "/cookies"),
        ".",
      ),
    ],
  },
};

const cookies: LegalPageContent = {
  intro: pageHeader({
    eyebrow: "Dokumenty",
    title: "Pliki cookies",
    lead: "Co strona zapisuje w Twojej przeglądarce i jak zmienić swój wybór.",
  }),
  effectiveFrom: "",
  body: {
    type: "doc",
    content: [
      sample("informacji o plikach cookies"),
      h2("Co zapisujemy w Twojej przeglądarce"),
      ul(
        [
          bold("ks-cookie-consent"),
          ": Twój wybór w banerze plików cookies, żeby nie pytać o niego przy każdej wizycie.",
        ],
        [
          bold("ks-intro"),
          ": informacja, że animacja powitalna została już pokazana.",
        ],
      ),
      p(
        "Obie informacje są zapisane w pamięci Twojej przeglądarki i nie są wysyłane do nas ani do nikogo innego.",
      ),
      h2("Pliki zewnętrznych usług"),
      ul(
        [
          "Cloudflare Turnstile przy formularzach rezerwacji i kontaktu sprawdza, czy korzysta z nich człowiek, i może przy tym zapisać własne pliki.",
        ],
        [
          "Mapa Google na stronie Kontakt ładuje się dopiero po Twojej zgodzie i może zapisywać pliki Google.",
        ],
        [
          "Płatność online prowadzi przez Stripe, który używa własnych plików potrzebnych do bezpiecznej płatności.",
        ],
      ),
      h2("Pliki analityczne"),
      p(
        "Obecnie nie używamy plików analitycznych ani marketingowych. Jeśli je wprowadzimy, zadziałają tylko za Twoją zgodą wyrażoną w banerze.",
      ),
      h2("Jak zmienić wybór"),
      p(
        "Swój wybór możesz w każdej chwili usunąć, czyszcząc dane tej witryny w ustawieniach przeglądarki. Baner pojawi się wtedy ponownie.",
      ),
    ],
  },
};

/** Each legal page's sample document, by its key. */
export const defaultLegalPages: Record<LegalPageKey, LegalPageContent> = {
  legal_terms: terms,
  legal_privacy: privacy,
  legal_cookies: cookies,
};
