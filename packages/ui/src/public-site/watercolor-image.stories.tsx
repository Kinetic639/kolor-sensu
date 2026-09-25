import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { gsap } from "gsap";
import { type ReactNode, useEffect, useState } from "react";
import {
  defaultWatercolorSrc,
  WatercolorImage,
  type WatercolorImageProps,
} from "./watercolor-image";
import { revealProperties } from "./watercolor-reveal-timeline";

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
    animationPreset: {
      control: "inline-radio",
      options: ["none", "watercolor-reveal"],
    },
    reducedMotionMode: {
      control: "inline-radio",
      options: ["static", "simple-fade"],
    },
  },
} satisfies Meta<typeof WatercolorImage>;

export default meta;

type Story = StoryObj<typeof meta>;

function Label({ children }: { children: string }) {
  return (
    <p className="text-eyebrow text-text-muted mb-3 uppercase">{children}</p>
  );
}

// ------------------------------------------------------------ story helpers

/**
 * Remounts its children on "Odtwórz ponownie", so the entrance animation
 * plays again. `speed` scales every GSAP animation on the page (1 = real).
 */
function Replay({
  children,
  speed = 1,
}: {
  children: (run: number) => ReactNode;
  speed?: number;
}) {
  const [run, setRun] = useState(0);
  // Set before the children mount, so their timeline starts at this speed.
  useState(() => gsap.globalTimeline.timeScale(speed));
  useEffect(() => {
    gsap.globalTimeline.timeScale(speed);
    return () => {
      gsap.globalTimeline.timeScale(1);
    };
  }, [speed]);

  return (
    <div className="grid gap-4">
      <div>
        <button
          type="button"
          onClick={() => setRun((value) => value + 1)}
          className="border-border-strong text-small hover:bg-surface-muted rounded-full border px-4 py-1.5 font-semibold"
        >
          Odtwórz ponownie
        </button>
      </div>
      <div key={run}>{children(run)}</div>
    </div>
  );
}

/**
 * Makes the component believe the visitor prefers reduced motion (the
 * operating-system setting), while this story is open. To check the real
 * thing, use DevTools > Rendering > "Emulate CSS media feature
 * prefers-reduced-motion".
 */
function PrefersReducedMotion({ children }: { children: ReactNode }) {
  useState(() => {
    const real = window.matchMedia.bind(window);
    const stub = (query: string) =>
      query.includes("prefers-reduced-motion: reduce")
        ? { ...real(query), matches: true, media: query }
        : real(query);
    Object.assign(stub, { real });
    window.matchMedia = stub as typeof window.matchMedia;
  });
  useEffect(
    () => () => {
      const real = (window.matchMedia as { real?: typeof window.matchMedia })
        .real;
      if (real) window.matchMedia = real;
    },
    [],
  );
  return <>{children}</>;
}

const stages = [
  ["Tło z lewej", revealProperties.left],
  ["Tło z prawej", revealProperties.right],
  ["Zdjęcie w poziomie", revealProperties.photoX],
  ["Zdjęcie w pionie", revealProperties.photoY],
  ["Schnięcie koloru", revealProperties.dry],
  ["Podpis", revealProperties.caption],
] as const;

/** Live readout of the timeline: every value the masks read, 0 to 1. */
function TimelineMeter() {
  const [values, setValues] = useState<{ state: string; bars: number[] }>({
    state: "",
    bars: stages.map(() => 0),
  });
  useEffect(() => {
    let frame = 0;
    const read = () => {
      const root = document.querySelector<HTMLElement>(
        '[data-animation="watercolor-reveal"]',
      );
      if (root) {
        const state = root.dataset.reveal ?? "";
        setValues({
          state,
          bars: stages.map(([, property]) =>
            state === "done"
              ? 1
              : Number(root.style.getPropertyValue(property) || 0),
          ),
        });
      }
      frame = requestAnimationFrame(read);
    };
    frame = requestAnimationFrame(read);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="text-small grid max-w-xl gap-1.5">
      <p className="font-semibold">{`Stan: ${values.state || "—"}`}</p>
      {stages.map(([label], index) => (
        <div
          key={label}
          className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3"
        >
          <span>{label}</span>
          <span className="bg-surface-muted h-2 overflow-hidden rounded-full">
            <span
              className="bg-primary block h-full"
              style={{ width: `${values.bars[index]! * 100}%` }}
            />
          </span>
          <span className="text-text-muted tabular-nums">
            {values.bars[index]!.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

const caption = "Przestrzeń dla ważnych rozmów";

// ------------------------------------------------------------ stories

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
 * No animation (`animationPreset="none"`, the default): the server HTML is
 * the finished picture. This is also the exact end state of the animation.
 */
export const Static: Story = {
  args: { caption, animationPreset: "none" },
};

/**
 * `animationPreset="watercolor-reveal"`: the backdrop is painted from the
 * left and the right edge toward the centre, the photo spreads from its
 * centre before the backdrop is finished, and the caption comes in last.
 * It plays once, when the image comes into view.
 */
export const Animated: Story = {
  args: { caption, animationPreset: "watercolor-reveal" },
  render: (args) => <Replay>{() => <WatercolorImage {...args} />}</Replay>,
};

/** The animation without the caption: backdrop and photo only. */
export const AnimatedBackdropAndPhotoOnly: Story = {
  args: { animationPreset: "watercolor-reveal" },
  render: (args) => <Replay>{() => <WatercolorImage {...args} />}</Replay>,
};

/**
 * Visitors who prefer reduced motion never see the painting. By default
 * (`reducedMotionMode="static"`) the finished composition shows at once;
 * `"simple-fade"` fades it in briefly instead. This story emulates the
 * setting for the component.
 */
export const ReducedMotion: Story = {
  args: { caption, animationPreset: "watercolor-reveal" },
  render: (args) => (
    <PrefersReducedMotion>
      <Replay>
        {() => (
          <div className="grid gap-10 xl:grid-cols-2 xl:gap-8">
            {(
              ["static", "simple-fade"] as Array<
                WatercolorImageProps["reducedMotionMode"]
              >
            ).map((mode) => (
              <div key={mode}>
                <Label>{`reducedMotionMode="${mode}"`}</Label>
                <WatercolorImage
                  {...args}
                  reducedMotionMode={mode}
                  sizes="(min-width: 1280px) 600px, 100vw"
                />
              </div>
            ))}
          </div>
        )}
      </Replay>
    </PrefersReducedMotion>
  ),
};

/**
 * The same timeline at a quarter of its speed, with every value it drives,
 * to review the stages and how they overlap.
 */
export const DebugSlowTimeline: Story = {
  args: { caption, animationPreset: "watercolor-reveal" },
  render: (args) => (
    <Replay speed={0.25}>
      {() => (
        <div className="grid gap-6">
          <WatercolorImage {...args} />
          <TimelineMeter />
        </div>
      )}
    </Replay>
  ),
};

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
