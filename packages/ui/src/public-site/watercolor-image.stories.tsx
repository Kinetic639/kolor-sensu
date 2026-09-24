import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { SecondaryButton } from "./actions";
import { AnimatedWatercolorImage } from "./animated-watercolor-image";
import { SoftCard } from "./surfaces";
import { WatercolorImage } from "./watercolor-image";

// Deterministic placeholder photos: crops of the two approved references,
// served from apps/storybook/public/kolor-sensu. Real photography replaces
// them when the pages are built.
const photos = {
  roomWide: "/kolor-sensu/room-wide.jpg",
  room: "/kolor-sensu/room.jpg",
  roomPortrait: "/kolor-sensu/room-portrait.jpg",
  anna: "/kolor-sensu/anna.jpg",
  group: "/kolor-sensu/group.jpg",
  plant: "/kolor-sensu/plant.jpg",
};

const paper: Decorator = (Story) => (
  <div className="bg-bg px-gutter font-body text-ink min-h-screen py-16">
    <div className="max-w-page mx-auto">
      <Story />
    </div>
  </div>
);

const meta = {
  title: "Public site/WatercolorImage",
  component: WatercolorImage,
  decorators: [paper],
  parameters: { canvasPadding: false },
  args: {
    src: photos.roomWide,
    alt: "Jasny gabinet z fotelem, stolikiem i roślinami przy dużym oknie",
    shape: "wide-brush",
    tone: "sage-blush",
  },
  argTypes: {
    shape: {
      control: "inline-radio",
      options: [
        "soft-horizontal",
        "wide-brush",
        "portrait-soft",
        "compact-brush",
      ],
    },
    tone: {
      control: "inline-radio",
      options: ["sage", "blush", "sage-blush", "neutral"],
    },
  },
} satisfies Meta<typeof WatercolorImage>;

export default meta;

type Story = StoryObj<typeof meta>;

const half = "mx-auto max-w-3xl";

export const HeroWide: Story = {
  args: {
    priority: true,
    caption: "Przestrzeń dla ważnych rozmów",
    sizes: "(min-width: 1024px) 60vw, 100vw",
  },
  render: (args) => (
    <div className={half}>
      <WatercolorImage {...args} />
    </div>
  ),
};

export const SpecialistPortrait: Story = {
  args: {
    src: photos.anna,
    alt: "Anna Nowak, psychoterapeutka",
    shape: "portrait-soft",
    tone: "sage",
    washes: false,
  },
  render: (args) => (
    <SoftCard interactive className="w-64 overflow-hidden p-3">
      <WatercolorImage {...args} />
      <div className="px-2 pt-3 pb-1">
        <p className="text-title text-ink">Anna Nowak</p>
        <p className="text-small text-text-muted">Psychoterapeutka</p>
      </div>
    </SoftCard>
  ),
};

export const Room: Story = {
  args: {
    src: photos.room,
    alt: "Gabinet z beżowym fotelem i zielonym kocem",
    shape: "soft-horizontal",
    tone: "blush",
  },
  render: (args) => (
    <div className={half}>
      <WatercolorImage {...args} />
    </div>
  ),
};

export const Workshop: Story = {
  args: {
    src: photos.group,
    alt: "Grupa uczestników warsztatu rozmawia w kręgu",
    shape: "wide-brush",
    tone: "sage-blush",
    aspectRatio: "21 / 9",
    focalPoint: "50% 45%",
  },
  render: (args) => (
    <div className={half}>
      <WatercolorImage {...args} />
    </div>
  ),
};

const toneRow = (tone: "sage" | "blush" | "sage-blush" | "neutral") =>
  ({
    args: { tone, shape: "soft-horizontal", src: photos.room },
    render: (args) => (
      <div className="mx-auto max-w-xl">
        <WatercolorImage {...args} />
      </div>
    ),
  }) satisfies Story;

export const Sage: Story = toneRow("sage");
export const Blush: Story = toneRow("blush");
export const MixedSageBlush: Story = toneRow("sage-blush");
export const Neutral: Story = toneRow("neutral");

export const WithHandwrittenOverlay: Story = {
  args: {
    caption: "Przestrzeń dla ważnych rozmów",
    captionPosition: "bottom-right",
    accent: "sprig",
    accentPosition: "top-left",
  },
  render: (args) => (
    <div className={half}>
      <WatercolorImage {...args} />
    </div>
  ),
};

export const WithoutOverlay: Story = {
  render: (args) => (
    <div className={half}>
      <WatercolorImage {...args} />
    </div>
  ),
};

export const LongPortraitCrop: Story = {
  args: {
    src: photos.roomPortrait,
    alt: "Fotel przy oknie w gabinecie",
    shape: "portrait-soft",
    tone: "sage",
    aspectRatio: "3 / 5",
    focalPoint: "60% 70%",
  },
  render: (args) => (
    <div className="mx-auto max-w-xs">
      <WatercolorImage {...args} />
    </div>
  ),
};

export const MobileViewport: Story = {
  ...HeroWide,
  globals: { viewport: { value: "mobile", isRotated: false } },
};

export const AllShapes: Story = {
  render: (args) => (
    <div className="grid gap-16 md:grid-cols-2">
      <WatercolorImage {...args} shape="wide-brush" src={photos.roomWide} />
      <WatercolorImage {...args} shape="soft-horizontal" src={photos.room} />
      <div className="mx-auto w-3/4">
        <WatercolorImage
          {...args}
          shape="portrait-soft"
          src={photos.roomPortrait}
          tone="sage"
        />
      </div>
      <div className="mx-auto w-3/4">
        <WatercolorImage
          {...args}
          shape="compact-brush"
          src={photos.plant}
          tone="blush"
          accent="leaf"
          accentPosition="bottom-right"
        />
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------- animation

function PaintDemo({ args }: { args: Story["args"] }) {
  const [run, setRun] = useState(0);

  return (
    <div className="mx-auto grid max-w-3xl gap-8">
      <AnimatedWatercolorImage
        key={run}
        trigger="mount"
        src={photos.roomWide}
        alt={args?.alt ?? ""}
        shape="wide-brush"
        tone="sage-blush"
        accent="sprig"
        accentPosition="top-left"
        caption="Przestrzeń dla ważnych rozmów"
      />
      <div className="flex justify-center">
        <SecondaryButton size="sm" onClick={() => setRun((n) => n + 1)}>
          Namaluj jeszcze raz
        </SecondaryButton>
      </div>
    </div>
  );
}

/**
 * The future reveal sequence: washes are brushed on, the sprig draws, the
 * photo is brushed in desaturated, colour fills in, the caption writes last.
 * Structure only; the production hero would use paint="on-load" (CSS only).
 */
export const PaintRevealDemo: Story = {
  render: (args) => <PaintDemo args={args} />,
};

/**
 * What a visitor with "reduce motion" sees: the finished picture at once.
 * The OS setting is simulated for PaintReveal; the CSS side is covered by
 * @media (prefers-reduced-motion), testable with DevTools emulation.
 */
export const PaintRevealReducedMotion: Story = {
  beforeEach: () => {
    const original = window.matchMedia;
    window.matchMedia = (query: string) => {
      const result = original.call(window, query);
      if (!query.includes("prefers-reduced-motion")) return result;
      return { ...result, matches: query.includes("reduce"), media: query };
    };
    return () => {
      window.matchMedia = original;
    };
  },
  render: (args) => <PaintDemo args={args} />,
};
