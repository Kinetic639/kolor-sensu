import type { Decorator, Meta, StoryObj } from "@storybook/react";
import type { CSSProperties } from "react";
import { expect, waitFor } from "storybook/test";
import { ArrowLink, PrimaryButton } from "./actions";
import { CursorRing } from "./cursor-ring";
import { OfferTile } from "./offer-tile";
import { sampleServices } from "./offer-samples";
import { SpecialistWatercolorCard } from "./specialist-card";
import { sampleSpecialists } from "./specialist-samples";
import { Label } from "./story-support";
import { EditorialHeading } from "./typography";

// CursorRing: a hairline ring trailing the mouse, after Talking Walls
// (https://talkingwalls.co.il/art-counseling). It lags behind, turns along
// the way and stretches like a spring on a quick move, then settles back
// into a circle. Over links it steps aside; over offer tiles and specialist
// cards it becomes a "Zobacz" disc. Mouse only, never under reduced motion.

const paper: Decorator = (Story) => (
  <div className="bg-bg px-gutter font-body text-ink min-h-screen py-12">
    <div className="max-w-page mx-auto">
      <Story />
    </div>
  </div>
);

const meta = {
  title: "Public site/Cursor ring",
  component: CursorRing,
  decorators: [paper],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CursorRing>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Move the mouse here: slowly, then in quick flicks (the ring stretches and
 * turns along the way), over the link and the button (it steps aside), over
 * the tile and the card (Zobacz) and over the box with its own word.
 */
export const Playground: Story = {
  render: () => (
    <>
      <div className="grid gap-12">
        <div className="grid max-w-xl gap-4">
          <EditorialHeading as="h1">Rusz myszką</EditorialHeading>
          <p className="text-text-muted">
            Wolno, potem szybkim ruchem. Najedź na link, przycisk, kafelek
            oferty, kartę specjalisty i ramkę z własnym słowem.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <ArrowLink href="#oferta">Zobacz całą ofertę</ArrowLink>
            <PrimaryButton>Umów wizytę</PrimaryButton>
          </div>
        </div>
        <EditorialHeading size="h3">
          Kafelek, karta i ramka z własnym słowem
        </EditorialHeading>
        <div className="-mt-8 grid items-start gap-8 sm:grid-cols-3">
          <div className="max-w-56">
            <OfferTile {...sampleServices[0]!} />
          </div>
          <SpecialistWatercolorCard {...sampleSpecialists[0]!} />
          <div
            data-cursor-label="Przeciągnij"
            className="border-border-strong text-text-muted rounded-card grid h-64 place-items-center border border-dashed"
          >
            data-cursor-label=&quot;Przeciągnij&quot;
          </div>
        </div>
      </div>
      <CursorRing />
    </>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const cursor =
      canvasElement.ownerDocument.querySelector<HTMLElement>(".ks-cursor")!;
    await userEvent.hover(canvas.getByRole("link", { name: /całą ofertę/ }));
    await waitFor(() => expect(cursor.dataset.state).toBe("link"));
    await userEvent.hover(canvas.getByText("Anna Nowak"));
    await waitFor(() => expect(cursor.dataset.state).toBe("view"));
    await userEvent.hover(canvas.getByText(/data-cursor-label/));
    await waitFor(() => expect(cursor).toHaveTextContent("Przeciągnij"));
    await userEvent.hover(canvas.getByRole("heading", { name: "Rusz myszką" }));
    await waitFor(() => expect(cursor.dataset.state).toBe("rest"));
  },
};

const shapes: {
  name: string;
  state: string;
  rotation?: number;
  stretch?: number;
  label?: string;
}[] = [
  { name: "At rest", state: "rest" },
  { name: "Slow move (→)", state: "rest", rotation: 90, stretch: 12 },
  { name: "Quick flick (↗)", state: "rest", rotation: 45, stretch: 40 },
  { name: "Over a link (steps aside)", state: "link" },
  { name: "Over a card", state: "view" },
  { name: "data-cursor-label", state: "view", label: "Przeciągnij" },
];

/**
 * Every shape side by side, frozen (in the page, the script sets the turn
 * and the stretch each frame).
 */
export const Shapes: Story = {
  render: () => (
    <ul className="grid grid-cols-2 gap-8 sm:grid-cols-3">
      {shapes.map(
        ({ name, state, rotation = 0, stretch = 0, label = "Zobacz" }) => (
          <li key={name} className="grid gap-3">
            <Label>{name}</Label>
            <div className="border-border rounded-card relative h-40 border">
              <div
                className="ks-cursor"
                data-state={state}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  rotate: `${rotation}deg`,
                }}
              >
                <div
                  className="ks-cursor__ring"
                  style={
                    {
                      "--ks-cursor-stretch": `${stretch}px`,
                      "--ks-cursor-chars": label.length,
                    } as CSSProperties
                  }
                >
                  <span className="ks-cursor__label">{label}</span>
                </div>
              </div>
            </div>
          </li>
        ),
      )}
    </ul>
  ),
};
