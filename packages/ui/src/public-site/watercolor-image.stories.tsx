import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { defaultWatercolorSrc, WatercolorImage } from "./watercolor-image";

// Inputs of the approved composition (docs/design/references/public):
// reference 1 is the watercolor backdrop (the component's default asset),
// reference 2 is an ordinary rectangular photo exactly as it was uploaded,
// with no crop, paint or other preparation, and reference 3 is the approved
// result, served from docs/design/references/public at /references.
const upload = "/kolor-sensu/therapy-room-upload.png";
const target = "/references/painted-hero.png";
const alt =
  "Jasny gabinet terapeutyczny z fotelem, stolikiem, regałem z książkami i roślinami przy dużym oknie";

const paper: Decorator = (Story) => (
  <div className="bg-bg px-gutter font-body text-ink min-h-screen py-12">
    <div className="mx-auto max-w-[75rem]">
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
    src: upload,
    alt,
    watercolorSrc: defaultWatercolorSrc,
    objectPosition: "50% 50%",
    priority: true,
    sizes: "(min-width: 1200px) 1200px, 100vw",
  },
  argTypes: {
    objectPosition: { control: "text" },
    aspectRatio: { control: "text" },
    caption: { control: "text" },
  },
} satisfies Meta<typeof WatercolorImage>;

export default meta;

type Story = StoryObj<typeof meta>;

function Label({ children }: { children: string }) {
  return (
    <p className="text-eyebrow text-text-muted mb-3 uppercase">{children}</p>
  );
}

/**
 * Reference 1 (backdrop) + reference 2 (raw upload), composed by the
 * component, with the handwritten caption from the approved target. Compare
 * with reference 3 directly: the component is shown large and alone.
 */
export const ApprovedTargetComposition: Story = {
  args: { caption: "Przestrzeń dla ważnych rozmów" },
};

/** The same composition next to reference 3, at the same width. */
export const SideBySideWithTarget: Story = {
  args: { caption: "Przestrzeń dla ważnych rozmów" },
  render: (args) => (
    <div className="grid gap-10 xl:grid-cols-2 xl:gap-8">
      <div>
        <Label>WatercolorImage (referencja 1 + referencja 2)</Label>
        <WatercolorImage {...args} sizes="(min-width: 1280px) 600px, 100vw" />
      </div>
      <div>
        <Label>Referencja 3 (zatwierdzony cel)</Label>
        <img src={target} alt="" className="block h-auto w-full" />
      </div>
    </div>
  ),
};

/** Only the two layers: backdrop and masked photo, no overlay. */
export const BackdropAndPhotoOnly: Story = {};

/**
 * What goes in: the backdrop asset and the photo as uploaded. Nothing is
 * prepared by hand; the crop and the brushed edge come from the component.
 */
export const SourceAssets: Story = {
  render: (args) => (
    <div className="grid gap-10">
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <Label>Referencja 1: tło akwarelowe</Label>
          <img
            src={defaultWatercolorSrc}
            alt=""
            className="block h-auto w-full"
          />
        </div>
        <div>
          <Label>Referencja 2: zwykłe zdjęcie z uploadu</Label>
          <img src={upload} alt="" className="block h-auto w-full" />
        </div>
      </div>
      <div>
        <Label>Wynik komponentu</Label>
        <WatercolorImage {...args} />
      </div>
    </div>
  ),
};

/**
 * objectPosition picks what stays in frame when the upload's ratio differs
 * from the frame. Here the composition is 2 / 1, so the 3 / 2 photo is
 * cropped vertically: top, centre and bottom focus.
 */
export const ObjectPosition: Story = {
  args: { aspectRatio: "2 / 1", priority: false },
  render: (args) => (
    <div className="grid gap-8 lg:grid-cols-3">
      {["50% 0%", "50% 50%", "50% 100%"].map((position) => (
        <div key={position}>
          <Label>{`objectPosition="${position}"`}</Label>
          <WatercolorImage
            {...args}
            objectPosition={position}
            sizes="(min-width: 1024px) 33vw, 100vw"
          />
        </div>
      ))}
    </div>
  ),
};

export const ApprovedTargetTablet: Story = {
  ...ApprovedTargetComposition,
  globals: { viewport: { value: "tablet", isRotated: false } },
};

export const ApprovedTargetMobile: Story = {
  ...ApprovedTargetComposition,
  globals: { viewport: { value: "mobile", isRotated: false } },
};
