import type {
  ArticleBlockNode,
  ArticleDocument,
} from "@repo/contracts/article-rich-text";

// A sample article with every block an article has, for tests and stories.

const text = (value: string) => ({ type: "text" as const, text: value });
export const paragraph = (value: string) => ({
  type: "paragraph" as const,
  content: [text(value)],
});
export const heading = (value: string, level: 2 | 3 = 2) => ({
  type: "heading" as const,
  attrs: { level },
  content: [text(value)],
});

export const sampleImage = {
  src: "articles/0b8c2f2e-5c4f-4c0a-9a1e-3f6c2d1b7a90.webp",
  alt: "Jasny gabinet z fotelem przy oknie",
  width: 1600,
  height: 1067,
};

const cell = (type: "tableCell" | "tableHeader", value: string) => ({
  type,
  attrs: { colspan: 1, rowspan: 1, colwidth: null },
  content: [paragraph(value)],
});

export const sampleArticle: ArticleDocument = {
  type: "doc",
  content: [
    paragraph(
      "Lęk jest naturalną reakcją organizmu. Pomaga nam zauważyć zagrożenie i szybko zareagować.",
    ),
    heading("Czym jest lęk"),
    paragraph("Lęk staje się kłopotem, gdy pojawia się bez wyraźnego powodu."),
    {
      type: "articleImage",
      attrs: { ...sampleImage, caption: "Gabinet Kolor Sensu", size: "wide" },
    },
    heading("Jak go rozpoznać"),
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [paragraph("kołatanie serca")] },
        { type: "listItem", content: [paragraph("trudności ze snem")] },
      ],
    },
    {
      type: "callout",
      attrs: { kind: "important" },
      content: [
        paragraph("Gdy Twoje życie jest w zagrożeniu, zadzwoń pod numer 112."),
      ],
    },
    heading("Objawy w liczbach", 3),
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            cell("tableHeader", "Objaw"),
            cell("tableHeader", "Jak często"),
          ],
        },
        {
          type: "tableRow",
          content: [
            cell("tableCell", "Bezsenność"),
            cell("tableCell", "Często"),
          ],
        },
      ],
    },
    {
      type: "pullQuote",
      attrs: { author: "Anna, klientka centrum" },
      content: [paragraph("Najtrudniej było przyjść pierwszy raz.")],
    },
    heading("Gdzie szukać pomocy"),
    {
      type: "articleImagePair",
      attrs: {
        images: [sampleImage, { ...sampleImage, alt: "Fotel i roślina" }],
        caption: "Dwa gabinety",
      },
    },
    { type: "horizontalRule" },
    {
      type: "bookingButton",
      attrs: {
        label: "Umów konsultację",
        service: "konsultacja-psychologiczna",
      },
    },
  ] satisfies ArticleBlockNode[],
};
