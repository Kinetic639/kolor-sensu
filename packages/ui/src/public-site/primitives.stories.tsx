import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { HeartHandshake, Leaf, User, Users } from "lucide-react";
import { ArrowLink, PrimaryButton, SecondaryButton } from "./actions";
import { BotanicalAccent } from "./botanical-accent";
import {
  PastelIconTile,
  SoftCard,
  WatercolorSectionBackground,
} from "./surfaces";
import { EditorialHeading, SectionEyebrow } from "./typography";

const paper: Decorator = (Story) => (
  <div className="bg-bg px-gutter font-body text-ink min-h-screen py-16">
    <div className="max-w-page mx-auto">
      <Story />
    </div>
  </div>
);

const meta = {
  title: "Public site/Primitives",
  decorators: [paper],
  parameters: { canvasPadding: false },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const swatches = [
  ["bg", "bg-bg"],
  ["surface", "bg-surface"],
  ["cream", "bg-cream"],
  ["beige", "bg-beige"],
  ["primary", "bg-primary"],
  ["primary-strong", "bg-primary-strong"],
  ["primary-soft", "bg-primary-soft"],
  ["sage", "bg-sage"],
  ["pink", "bg-pink"],
  ["pink-strong", "bg-pink-strong"],
  ["pink-soft", "bg-pink-soft"],
  ["blush", "bg-blush"],
  ["ink", "bg-ink"],
  ["text-muted", "bg-text-muted"],
  ["border", "bg-border"],
  ["border-strong", "bg-border-strong"],
] as const;

export const Palette: Story = {
  render: () => (
    <ul className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-8">
      {swatches.map(([name, className]) => (
        <li key={name} className="grid gap-2">
          <span
            className={`rounded-card border-border block h-16 border ${className}`}
          />
          <span className="text-small text-text-muted">{name}</span>
        </li>
      ))}
    </ul>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-10">
      <div className="grid gap-4">
        <SectionEyebrow>Centrum psychoterapii i rozwoju</SectionEyebrow>
        <EditorialHeading as="h1" accent="Więcej sensu.">
          Więcej zrozumienia.
        </EditorialHeading>
        <p className="max-w-copy text-lead text-text-muted">
          Psychoterapia, rozwój i wsparcie w bezpiecznej przestrzeni. Dla osób
          dorosłych, par, dzieci i młodzieży.
        </p>
      </div>
      <div className="grid gap-3">
        <SectionEyebrow>O nas</SectionEyebrow>
        <EditorialHeading>Wierzymy, że zmiana jest możliwa</EditorialHeading>
        <p className="max-w-copy text-body text-text-muted">
          Kolor Sensu to miejsce, w którym profesjonalna pomoc psychologiczna i
          psychoterapeutyczna spotyka się z autentyczną troską o drugiego
          człowieka.
        </p>
        <ArrowLink href="#historia">Poznaj naszą historię</ArrowLink>
      </div>
      <div className="grid gap-2">
        <EditorialHeading as="h3">Przestrzeń, która wspiera</EditorialHeading>
        <p className="text-title">Psychoterapia indywidualna</p>
        <p className="text-small text-text-muted">
          Przestrzeń na Ciebie i Twoje potrzeby.
        </p>
        <p className="font-hand text-hand text-primary">
          Przestrzeń dla ważnych rozmów
        </p>
      </div>
    </div>
  ),
};

export const Buttons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <PrimaryButton arrow>Umów wizytę</PrimaryButton>
      <SecondaryButton>Poznaj nas</SecondaryButton>
      <PrimaryButton size="sm" arrow>
        Umów wizytę
      </PrimaryButton>
      <SecondaryButton size="sm">Kontaktuj się</SecondaryButton>
      <PrimaryButton asChild arrow>
        <a href="#wizyta">Link jako przycisk</a>
      </PrimaryButton>
      <ArrowLink href="#oferta">Zobacz całą ofertę</ArrowLink>
    </div>
  ),
};

export const IconTiles: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
      <PastelIconTile
        tone="sage"
        icon={<User />}
        title="Psychoterapia indywidualna"
        description="Przestrzeń na Ciebie i Twoje potrzeby."
        href="#indywidualna"
      />
      <PastelIconTile
        tone="blush"
        icon={<Users />}
        title="Psychoterapia par"
        description="Lepsza komunikacja, większa bliskość."
        href="#pary"
      />
      <PastelIconTile
        tone="sage"
        icon={<HeartHandshake />}
        title="Wsparcie dla dzieci i młodzieży"
        description="Zrozumienie, rozwój, bezpieczeństwo."
        href="#dzieci"
      />
      <PastelIconTile
        tone="blush"
        icon={<Leaf />}
        title="Konsultacje psychologiczne"
        description="Pierwszy krok do zmiany."
        href="#konsultacje"
      />
    </div>
  ),
};

export const SoftCards: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      <SoftCard className="w-64 p-6">
        <p className="text-title">SoftCard</p>
        <p className="text-small text-text-muted mt-1">
          Panel na treść, która potrzebuje tła.
        </p>
      </SoftCard>
      <SoftCard interactive tone="cream" className="w-64 p-6">
        <p className="text-title">Interaktywna, krem</p>
        <p className="text-small text-text-muted mt-1">
          Unosi się delikatnie przy najechaniu.
        </p>
      </SoftCard>
    </div>
  ),
};

export const SectionBand: Story = {
  render: () => (
    <WatercolorSectionBackground accent className="py-section-sm">
      <div className="px-gutter flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:pr-56">
        <EditorialHeading className="max-w-md" size="h3">
          Zrób pierwszy krok do lepszego samopoczucia
        </EditorialHeading>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton arrow>Umów wizytę</PrimaryButton>
          <SecondaryButton>Skontaktuj się</SecondaryButton>
        </div>
      </div>
    </WatercolorSectionBackground>
  ),
};

export const BotanicalAccents: Story = {
  render: () => (
    <div className="text-ink flex items-end gap-12">
      <BotanicalAccent className="w-40" />
      <BotanicalAccent variant="leaf" className="w-28" />
      <BotanicalAccent
        variant="leaf"
        strokeWidth={1.75}
        className="text-primary w-9"
      />
    </div>
  ),
};
