import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Foundations/Visual System",
  parameters: {
    controls: { disable: true },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const colors = [
  ["Background", "--background"],
  ["Surface", "--surface"],
  ["Muted surface", "--surface-muted"],
  ["Primary", "--primary"],
  ["Primary soft", "--primary-soft"],
  ["Text", "--text"],
  ["Text muted", "--text-muted"],
  ["Border", "--border"],
  ["Success", "--success"],
  ["Warning", "--warning"],
  ["Danger", "--danger"],
  ["Pastel mint", "--accent-mint"],
  ["Pastel blue", "--accent-blue"],
  ["Pastel lilac", "--accent-lilac"],
  ["Pastel peach", "--accent-peach"],
  ["Pastel rose", "--accent-rose"],
] as const;

export const Colors: Story = {
  render: () => (
    <div className="grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {colors.map(([name, variable]) => (
        <div
          className="overflow-hidden rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)]"
          key={variable}
        >
          <div className="h-24" style={{ background: `var(${variable})` }} />
          <div className="border-t border-[var(--border)] p-3">
            <p className="text-sm font-semibold">{name}</p>
            <code className="text-xs text-[var(--text-muted)]">{variable}</code>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="text-xs font-bold tracking-wider text-[var(--primary)] uppercase">
          Display / Georgia
        </p>
        <p className="font-heading mt-2 text-4xl leading-tight font-semibold">
          Spokojna przestrzeń do codziennej pracy
        </p>
      </div>
      <div className="space-y-3 border-t border-[var(--border)] pt-6">
        <p className="text-3xl font-semibold">Nagłówek 3XL</p>
        <p className="text-2xl font-semibold">Nagłówek 2XL</p>
        <p className="text-xl font-semibold">Nagłówek XL</p>
        <p className="text-base leading-relaxed">
          Tekst podstawowy zachowuje czytelność przy dużej ilości danych i
          wspiera spokojną hierarchię interfejsu.
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          Tekst pomocniczy opisuje kontekst bez konkurowania z treścią główną.
        </p>
      </div>
    </div>
  ),
};

export const Spacing: Story = {
  render: () => (
    <div className="max-w-2xl space-y-3">
      {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((step) => (
        <div className="flex items-center gap-4" key={step}>
          <code className="w-28 text-xs text-[var(--text-muted)]">
            --ks-space-{step}
          </code>
          <div
            className="h-4 rounded-full bg-[var(--primary)]"
            style={{ width: `var(--ks-space-${step})` }}
          />
        </div>
      ))}
    </div>
  ),
};

export const Radius: Story = {
  render: () => (
    <div className="flex flex-wrap gap-5">
      {[
        ["Small", "--ks-radius-sm"],
        ["Control", "--ks-radius-control"],
        ["Surface", "--ks-radius-surface"],
        ["Panel", "--ks-radius-panel"],
        ["Full", "--ks-radius-full"],
      ].map(([name, variable]) => (
        <div key={variable}>
          <div
            className="size-28 border border-[var(--border)] bg-[var(--primary-soft)]"
            style={{ borderRadius: `var(${variable})` }}
          />
          <p className="mt-2 text-sm font-semibold">{name}</p>
          <code className="text-xs text-[var(--text-muted)]">{variable}</code>
        </div>
      ))}
    </div>
  ),
};

export const Shadows: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-8 sm:grid-cols-3">
      {[
        ["Surface", "--shadow-surface"],
        ["Raised", "--shadow-raised"],
        ["Overlay", "--shadow-overlay"],
      ].map(([name, variable]) => (
        <div
          className="flex h-40 items-end rounded-[var(--radius-surface)] border border-[var(--border)] bg-[var(--surface)] p-4"
          key={variable}
          style={{ boxShadow: `var(${variable})` }}
        >
          <div>
            <p className="font-semibold">{name}</p>
            <code className="text-xs text-[var(--text-muted)]">{variable}</code>
          </div>
        </div>
      ))}
    </div>
  ),
};
