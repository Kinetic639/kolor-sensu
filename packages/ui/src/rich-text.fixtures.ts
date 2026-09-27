import type { RichTextDocument } from "@repo/contracts/rich-text";

export const basicRichTextDocument: RichTextDocument = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Kolor Sensu pomaga znaleźć właściwe wsparcie." },
      ],
    },
  ],
};

export const formattedRichTextDocument: RichTextDocument = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Jak wygląda pierwsze spotkanie?" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Rozmowa jest " },
        { type: "text", text: "spokojna", marks: [{ type: "bold" }] },
        { type: "text", text: ", " },
        { type: "text", text: "poufna", marks: [{ type: "italic" }] },
        { type: "text", text: " i dopasowana do Twoich potrzeb." },
      ],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Przygotuj przed wizytą" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "krótką listę pytań" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "informację o swoich oczekiwaniach" },
              ],
            },
            {
              type: "orderedList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "najważniejszy cel" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Nie musisz wiedzieć, od czego zacząć." },
          ],
        },
      ],
    },
    { type: "horizontalRule" },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Przeczytaj " },
        {
          type: "text",
          text: "zasady spotkań",
          marks: [{ type: "link", attrs: { href: "/oferta" } }],
        },
        { type: "text", text: " lub napisz na " },
        {
          type: "text",
          text: "kontakt@kolorsensu.pl",
          marks: [
            { type: "underline" },
            { type: "link", attrs: { href: "mailto:kontakt@kolorsensu.pl" } },
          ],
        },
        { type: "hardBreak" },
        { type: "text", text: "kod: KS-01", marks: [{ type: "code" }] },
        { type: "text", text: " — " },
        { type: "text", text: "nieaktualne", marks: [{ type: "strike" }] },
      ],
    },
  ],
};

export const longRichTextDocument: RichTextDocument = {
  type: "doc",
  content: Array.from({ length: 8 }, (_, index) => ({
    type: "paragraph" as const,
    content: [
      {
        type: "text" as const,
        text: `Akapit ${index + 1}. Bezpieczna, czytelna treść demonstracyjna pokazująca rytm dłuższego artykułu i zachowanie edytora na różnych szerokościach ekranu.`,
      },
    ],
  })),
};

