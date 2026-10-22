import type { Meta, StoryObj } from "@storybook/react";
import {
  NewsletterArchiveList,
  NewsletterIssueCards,
} from "./newsletter-issue";

// The newsletter's archive on the site: the list of issues and an issue's
// cards (an article, an e-book, an own card from the centre).

const meta = {
  title: "Public site/Newsletter archive",
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink max-w-page px-gutter mx-auto min-h-screen py-10">
        <Story />
      </div>
    ),
  ],
  parameters: { canvasPadding: false },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Archive: Story = {
  render: () => (
    <NewsletterArchiveList
      empty="Pierwszy newsletter jeszcze przed nami."
      issues={[
        {
          number: 2,
          href: "#",
          subject: "Listopad w Kolor Sensu",
          previewText: "Warsztaty dla rodziców i dwa nowe artykuły",
          date: "3 listopada 2026",
          dateTime: "2026-11-03T08:00:00Z",
        },
        {
          number: 1,
          href: "#",
          subject: "Pierwszy newsletter",
          previewText: "Kim jesteśmy i co dla Ciebie przygotowujemy",
          date: "6 października 2026",
          dateTime: "2026-10-06T08:00:00Z",
        },
      ]}
    />
  ),
};

export const EmptyArchive: Story = {
  render: () => (
    <NewsletterArchiveList
      empty="Pierwszy newsletter jeszcze przed nami. Zapisz się, a przyjdzie prosto do Ciebie."
      issues={[]}
    />
  ),
};

export const IssueCards: Story = {
  render: () => (
    <NewsletterIssueCards
      cards={[
        {
          eyebrow: "Artykuł",
          title: "Jak rozmawiać z dzieckiem o emocjach",
          text: "Kilka prostych zdań, które pomagają nazwać to, co trudne.",
          href: "#",
          label: "Przeczytaj",
          imageUrl: null,
        },
        {
          eyebrow: "E-book",
          title: "Spokojniejszy wieczór",
          text: "Rytuały na koniec dnia dla całej rodziny.",
          href: "#",
          label: "Zobacz e-book",
          imageUrl: null,
        },
        {
          eyebrow: "Z centrum",
          title: "Warsztaty dla rodziców, 15 listopada",
          text: "Sobota, 10:00–13:00, sala na Nowym Świecie. Zostało kilka miejsc.",
          href: "#",
          label: "Zapisz się",
          imageUrl: null,
        },
      ]}
    />
  ),
};
