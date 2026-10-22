import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { CursorRing } from "./cursor-ring";
import { SupportAreas, type SupportAreaItem } from "./support-areas";

// SupportAreas: the areas of help as drops of paint around a large
// watercolour blot. Point at a drop (or tap it) and its area blooms in the
// blot, a pink thread running from the drop; scroll and the drops drift at
// two depths against the blot's wash, move the mouse and they lean after
// it. Areas without a photo are drops of plain paint. On phones the blot
// comes first.

const book = { href: "#umow-wizyte", linkLabel: "Umów wizytę" };

const areas: SupportAreaItem[] = [
  {
    id: "indywidualna",
    title: "Terapia indywidualna",
    lead: "Spotkania jeden na jeden, w Twoim tempie: o tym, co trudne, i o tym, czego potrzebujesz.",
    image: {
      src: "/kolor-sensu/therapy-room-upload.png",
      alt: "Jasny gabinet z fotelem",
    },
    ...book,
  },
  {
    id: "pary",
    title: "Terapia dla par",
    lead: "Wspólna przestrzeń, by lepiej się słyszeć, rozumieć i szukać porozumienia.",
    image: { src: "/kolor-sensu/room.jpg", alt: "Gabinet z dwoma fotelami" },
    ...book,
  },
  {
    id: "mlodziez",
    title: "Wsparcie dzieci i młodzieży",
    lead: "Pomoc dla młodszych osób i ich rodziców: w trudnych emocjach, w szkole i w relacjach.",
    image: null,
    ...book,
  },
  {
    id: "rodzinna",
    title: "Terapia rodzinna",
    lead: "Praca z całą rodziną nad tym, co dzieje się między jej członkami.",
    image: null,
    ...book,
  },
  {
    id: "warsztaty",
    title: "Warsztaty i rozwój",
    lead: "Grupy i spotkania tematyczne dla osób, które chcą lepiej siebie poznać.",
    image: { src: "/kolor-sensu/group.jpg", alt: "Warsztat w kręgu" },
    href: "#warsztaty",
    linkLabel: "Zobacz warsztaty",
  },
];

const meta = {
  title: "Public site/Support areas",
  component: SupportAreas,
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink">
        <Story />
        <CursorRing />
      </div>
    ),
  ],
  parameters: { layout: "fullscreen" },
  args: {
    eyebrow: "Obszary wsparcia",
    heading: "W czym możemy pomóc",
    description:
      "Wybierz kroplę, aby zobaczyć, czym zajmujemy się w każdym z obszarów.",
    areas,
    cta: { href: "#oferta", label: "Zobacz całą ofertę" },
  },
} satisfies Meta<typeof SupportAreas>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Five areas, two of them painted. Point at the small circles. */
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const workshops = canvas.getByRole("button", {
      name: "Warsztaty i rozwój",
    });
    await userEvent.hover(workshops);
    await expect(workshops).toHaveAttribute("aria-pressed", "true");
    await expect(
      canvas.getByRole("link", { name: /Zobacz warsztaty/ }),
    ).toBeVisible();
  },
};

/** On a phone: the blot first, the drops in rows under it. */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};

/** The full ten drops the stage has room for. */
export const TenAreas: Story = {
  args: {
    areas: [...areas, ...areas].map((area, index) => ({
      ...area,
      id: `${area.id}-${index}`,
    })),
  },
};
