import type { EbookCardData } from "./ebook-parts";

// Sample e-books for the stories and tests (no network: no covers).

export const sampleEbooks: EbookCardData[] = [
  {
    id: "e1",
    href: "/edukacja/ebooki/spokojny-sen",
    title: "Spokojny sen",
    description:
      "Praktyczny poradnik o tym, jak odzyskać dobry sen, gdy stres nie pozwala zasnąć.",
    coverUrl: null,
    format: "PDF, 48 stron",
  },
  {
    id: "e2",
    href: "/edukacja/ebooki/rodzic-i-emocje",
    title: "Rodzic i emocje dziecka",
    description:
      "Jak towarzyszyć dziecku w złości, smutku i lęku, i zadbać przy tym o siebie.",
    coverUrl: null,
    format: "PDF, 62 strony",
  },
];
