import type { ArticleCardData } from "./article-cards";
import type { ArticlePersonData } from "./article-page";

// Sample articles for the stories and tests (no network: no covers).

export const sampleAuthor: ArticlePersonData = {
  name: "Anna Nowak",
  href: "/specjalisci/anna-nowak",
  title: "Psycholożka, psychoterapeutka",
  photoUrl: null,
};

export const sampleArticles: ArticleCardData[] = [
  {
    id: "a1",
    href: "/edukacja/artykuly/lek-u-dzieci",
    title: "Lęk u dzieci: kiedy to coś więcej niż etap rozwoju",
    lead: "Jak odróżnić zwykłe dziecięce obawy od lęku, który utrudnia codzienne życie, i kiedy warto porozmawiać ze specjalistą.",
    coverUrl: null,
    coverAlt: "",
    category: {
      name: "Dzieci i młodzież",
      href: "/edukacja/artykuly/kategoria/dzieci",
    },
    author: "Anna Nowak",
    authorTitle: "Psycholożka, psychoterapeutka",
    date: "21 października 2026",
    dateTime: "2026-10-21T10:00:00Z",
    reading: "6 min czytania",
  },
  {
    id: "a2",
    href: "/edukacja/artykuly/sen-i-stres",
    title: "Sen i stres",
    lead: "Dlaczego w trudnych okresach śpimy gorzej i co możemy z tym zrobić już dziś wieczorem.",
    coverUrl: null,
    coverAlt: "",
    category: {
      name: "Codzienność",
      href: "/edukacja/artykuly/kategoria/codziennosc",
    },
    author: "Zespół Kolor Sensu",
    date: "14 października 2026",
    dateTime: "2026-10-14T10:00:00Z",
    reading: "4 min czytania",
  },
  {
    id: "a3",
    href: "/edukacja/artykuly/rozmowa-w-parze",
    title: "Jak rozmawiać, gdy w związku jest trudno",
    lead: "Kilka prostych zasad, które pomagają słuchać i być usłyszanym.",
    coverUrl: null,
    coverAlt: "",
    category: null,
    author: "Zespół Kolor Sensu",
    date: "1 października 2026",
    dateTime: "2026-10-01T10:00:00Z",
    reading: "5 min czytania",
  },
];
