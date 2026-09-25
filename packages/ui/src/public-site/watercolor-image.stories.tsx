import type { Decorator, Meta, StoryObj } from "@storybook/react";
import { gsap } from "gsap";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultWatercolorSrc,
  WatercolorImage,
  type WatercolorImageProps,
} from "./watercolor-image";
import { paintMatte } from "./watercolor-paint-matte.data";
import {
  captionTiming,
  type PaintMatte,
  strokeTiming,
} from "./watercolor-paint-matte";
import {
  type WatercolorRevealDebug,
  WatercolorRevealDebugContext,
} from "./watercolor-reveal";

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

// What public-site.css does under prefers-reduced-motion: reduce, for the
// images inside this story: no painting (so nothing pre-hidden) and, for
// "simple-fade", the fade.
const reducedMotionStyles = `
  .ks-story-reduced .ks-wc[data-animation="watercolor-reveal"] .ks-wc__backdrop,
  .ks-story-reduced .ks-wc[data-animation="watercolor-reveal"] .ks-wc__img {
    mask-image: none !important;
  }
  .ks-story-reduced .ks-wc[data-animation="watercolor-reveal"] .ks-wc__caption {
    opacity: 1 !important;
  }
  .ks-story-reduced
    .ks-wc[data-animation="watercolor-reveal"][data-reduced-motion="simple-fade"]:not([data-reveal="done"]) {
    opacity: var(--ks-reveal-fade, 0);
  }
`;

/**
 * Makes the page behave as if the visitor prefers reduced motion (the
 * operating-system setting), while this story is open: the component's
 * script through matchMedia, the stylesheet through the rules above. To
 * check the real thing, use DevTools > Rendering > "Emulate CSS media
 * feature prefers-reduced-motion".
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
  return (
    <div className="ks-story-reduced">
      <style>{reducedMotionStyles}</style>
      {children}
    </div>
  );
}

// Length of the whole reveal: the last stroke or the caption, whichever
// ends later.
const revealLength = Math.max(
  captionTiming.at + captionTiming.duration,
  ...(["backdrop", "photo"] as const).flatMap((layer) =>
    paintMatte[layer].strokes.map((stroke) => {
      const timing = strokeTiming(layer, stroke.id);
      return timing.at + timing.duration;
    }),
  ),
);

/** Inspection hooks for one component (see WatercolorRevealDebug). */
function Debug({
  children,
  ...debug
}: WatercolorRevealDebug & { children: ReactNode }) {
  const { freezeAt, keepMatte, onReveal } = debug;
  const value = useMemo(
    () => ({ freezeAt, keepMatte, onReveal }),
    [freezeAt, keepMatte, onReveal],
  );
  return (
    <WatercolorRevealDebugContext.Provider value={value}>
      {children}
    </WatercolorRevealDebugContext.Provider>
  );
}

// Where the photo layer sits in the composition (public-site.css,
// .ks-wc__photo), to draw its matte in place.
const photoInset = "2.7% 6.03% 1.35% 3.94%";

/**
 * The matte itself, as the layer sees it: white = painted (visible), black =
 * not painted yet (hidden). It is drawn with the very same SVG mask the
 * component uses, on a white panel.
 */
function MattePanel({
  url,
  layer,
  label,
}: {
  url?: string;
  layer: "backdrop" | "photo";
  label?: string;
}) {
  const paint: CSSProperties = {
    position: "absolute",
    inset: layer === "photo" ? photoInset : 0,
    background: "#fff",
    maskImage: url ?? "linear-gradient(transparent, transparent)",
  };
  return (
    <div>
      {label ? <Label>{label}</Label> : null}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "16 / 10", background: "#000" }}
      >
        {layer === "photo" ? (
          // Outline of the photo layer's box, for orientation only.
          <div
            className="absolute border border-dashed border-white/25"
            style={{ inset: photoInset }}
          />
        ) : null}
        <div style={paint} />
      </div>
    </div>
  );
}

/** Both mattes of the component rendered inside it. */
function useMatteUrls() {
  const [urls, setUrls] = useState<{ backdrop?: string; photo?: string }>({});
  const onReveal = useMemo(
    () =>
      ({ matte }: { matte: PaintMatte }) =>
        setUrls({ backdrop: matte.backdrop.url, photo: matte.photo.url }),
    [],
  );
  return { urls, onReveal };
}

/**
 * Every stroke on the time axis, with a playhead: which strokes run at the
 * same moment, and how the photo overlaps the backdrop.
 */
function StrokeChart({ timeline }: { timeline?: gsap.core.Timeline }) {
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (!timeline) return;
    let frame = 0;
    const read = () => {
      setTime(timeline.time());
      frame = requestAnimationFrame(read);
    };
    frame = requestAnimationFrame(read);
    return () => cancelAnimationFrame(frame);
  }, [timeline]);

  const scale = (seconds: number) => `${(seconds / 1.3) * 100}%`;
  const rows = [
    ...(["backdrop", "photo"] as const).flatMap((layer) =>
      paintMatte[layer].strokes.map((stroke) => ({
        label: `${layer === "backdrop" ? "Tło" : "Zdjęcie"} ${stroke.id}`,
        layer,
        ...strokeTiming(layer, stroke.id),
      })),
    ),
    { label: "Podpis (fade)", layer: "caption" as const, ...captionTiming },
  ];
  const colour = {
    backdrop: "bg-accent",
    photo: "bg-primary",
    caption: "bg-text-muted",
  };

  return (
    <div className="text-small grid gap-1">
      <p className="font-semibold tabular-nums">{`t = ${time.toFixed(2)} s`}</p>
      <div className="relative grid gap-0.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[11rem_1fr] items-center gap-3"
          >
            <span className="text-text-muted truncate">{row.label}</span>
            <span className="relative h-2.5">
              <span
                className={`absolute inset-y-0 rounded-full ${colour[row.layer]}`}
                style={{ left: scale(row.at), width: scale(row.duration) }}
              />
            </span>
          </div>
        ))}
        <div className="pointer-events-none absolute inset-y-0 right-0 left-[12rem]">
          {[0, 0.2, 0.4, 0.6, 0.8, 1, 1.2].map((tick) => (
            <span
              key={tick}
              className="border-border absolute inset-y-0 border-l"
              style={{ left: scale(tick) }}
            />
          ))}
          <span
            className="absolute inset-y-0 border-l-2 border-red-500"
            style={{ left: scale(time) }}
          />
        </div>
      </div>
      <div className="text-text-muted relative ml-[12rem] h-4">
        {[0, 0.2, 0.4, 0.6, 0.8, 1, 1.2].map((tick) => (
          <span
            key={tick}
            className="absolute -translate-x-1/2 tabular-nums"
            style={{ left: scale(tick) }}
          >
            {`${tick.toFixed(1)} s`}
          </span>
        ))}
      </div>
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
 * The approved static composition (`animationPreset="none"`, the default):
 * the server HTML is the finished picture. It is also the exact last frame
 * of the animation.
 */
export const StaticApproved: Story = {
  name: "Static Approved",
  args: { caption, animationPreset: "none" },
};

/**
 * `animationPreset="watercolor-reveal"`: the picture is painted in through
 * a paint matte of independent brush strokes. The backdrop starts from the
 * left and the right edge at once and meets in the middle; the photo is
 * painted from its centre outward, starting while the backdrop is still
 * being painted. About 1.2 s; it plays once, when the image comes into
 * view.
 */
export const AnimatedPaintReveal: Story = {
  name: "Animated Paint Reveal",
  args: { caption, animationPreset: "watercolor-reveal" },
  render: (args) => <Replay>{() => <WatercolorImage {...args} />}</Replay>,
};

function SlowMotion({ args }: { args: WatercolorImageProps }) {
  const [timeline, setTimeline] = useState<gsap.core.Timeline>();
  const onReveal = useMemo(
    () =>
      ({ timeline }: { timeline: gsap.core.Timeline }) =>
        setTimeline(timeline),
    [],
  );
  return (
    <div className="grid gap-6">
      <Debug onReveal={onReveal}>
        <WatercolorImage {...args} />
      </Debug>
      <StrokeChart timeline={timeline} />
    </div>
  );
}

/**
 * The same reveal five times slower, with every stroke on a time axis and a
 * playhead, to review the brush fronts and how the strokes overlap.
 */
export const SlowMotionDebug: Story = {
  name: "Slow Motion Debug",
  args: { caption, animationPreset: "watercolor-reveal" },
  render: (args) => (
    <Replay speed={0.2}>{() => <SlowMotion args={args} />}</Replay>
  ),
};

function MatteView({
  args,
  freezeAt,
}: {
  args: WatercolorImageProps;
  freezeAt?: number;
}) {
  const { urls, onReveal } = useMatteUrls();
  return (
    <div className="grid gap-8">
      <Debug onReveal={onReveal} keepMatte freezeAt={freezeAt}>
        <WatercolorImage {...args} sizes="(min-width: 1280px) 600px, 100vw" />
      </Debug>
      <div className="grid gap-8 md:grid-cols-2">
        <MattePanel
          layer="backdrop"
          url={urls.backdrop}
          label="Matte tła (biały = namalowane, czarny = ukryte)"
        />
        <MattePanel
          layer="photo"
          url={urls.photo}
          label="Matte zdjęcia (ramka: pole warstwy zdjęcia)"
        />
      </div>
    </div>
  );
}

function MatteDebugControls({ args }: { args: WatercolorImageProps }) {
  const [speed, setSpeed] = useState(0.25);
  const [freeze, setFreeze] = useState<number | undefined>(undefined);
  return (
    <div className="grid gap-6">
      <div className="text-small flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <span>Tempo</span>
          <select
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className="border-border-strong rounded border px-2 py-1"
          >
            <option value={1}>1× (prawdziwe)</option>
            <option value={0.25}>1/4</option>
            <option value={0.1}>1/10</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={freeze !== undefined}
            onChange={(event) =>
              setFreeze(event.target.checked ? 0.5 : undefined)
            }
          />
          <span>Zatrzymaj w chwili</span>
        </label>
        {freeze !== undefined ? (
          <label className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={revealLength}
              step={0.02}
              value={freeze}
              onChange={(event) => setFreeze(Number(event.target.value))}
            />
            <span className="tabular-nums">{`${freeze.toFixed(2)} s`}</span>
          </label>
        ) : null}
      </div>
      {freeze !== undefined ? (
        <MatteView key={`freeze-${freeze}`} args={args} freezeAt={freeze} />
      ) : (
        <Replay key={`speed-${speed}`} speed={speed}>
          {() => <MatteView args={args} />}
        </Replay>
      )}
    </div>
  );
}

/**
 * The actual paint mattes, live, next to the component: the SVG masks the
 * backdrop and the photo are painted through. They are built from separate
 * irregular strokes that start at different moments, never a growing shape
 * or a sliding edge. Slow it down, or stop it at any moment.
 */
export const MatteDebug: Story = {
  name: "Matte Debug",
  args: { caption, animationPreset: "watercolor-reveal" },
  render: (args) => <MatteDebugControls args={args} />,
};

/**
 * Visitors who prefer reduced motion never see the painting. By default
 * (`reducedMotionMode="static"`) the finished composition shows at once;
 * `"simple-fade"` fades it in briefly instead (0.4 s, no brush strokes).
 * This story emulates the setting for the component.
 */
export const ReducedMotion: Story = {
  name: "Reduced Motion",
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
 * The last animated frame, a moment before the matte is removed, laid over
 * the static composition in "difference" mode: black means identical
 * pixels. Beside it, the two pictures as they are.
 */
export const FinalComposition: Story = {
  name: "Final Composition",
  args: { caption },
  render: (args) => (
    <div className="grid gap-10">
      <div className="grid gap-10 xl:grid-cols-2 xl:gap-8">
        <div>
          <Label>{`Ostatnia klatka animacji (${(revealLength - 0.001).toFixed(3)} s)`}</Label>
          <Debug freezeAt={revealLength - 0.001}>
            <WatercolorImage
              {...args}
              animationPreset="watercolor-reveal"
              sizes="(min-width: 1280px) 600px, 100vw"
            />
          </Debug>
        </div>
        <div>
          <Label>Wersja statyczna (zatwierdzona)</Label>
          <WatercolorImage {...args} sizes="(min-width: 1280px) 600px, 100vw" />
        </div>
      </div>
      <div className="max-w-[37rem]">
        <Label>Różnica (czarny = identyczne piksele)</Label>
        <div className="relative isolate bg-black">
          <WatercolorImage {...args} sizes="(min-width: 1280px) 600px, 100vw" />
          <div className="absolute inset-0 mix-blend-difference">
            <Debug freezeAt={revealLength - 0.001}>
              <WatercolorImage
                {...args}
                animationPreset="watercolor-reveal"
                sizes="(min-width: 1280px) 600px, 100vw"
              />
            </Debug>
          </div>
        </div>
      </div>
    </div>
  ),
};

const stripTimes = Array.from(
  { length: Math.floor(revealLength * 10) + 1 },
  (_, index) => index / 10,
);

/**
 * Frame strip: the reveal stopped every 100 ms, with both mattes under each
 * frame. For reviewing the painting frame by frame, and for screenshots.
 */
export const FrameStrip: Story = {
  name: "Frame Strip (co 100 ms)",
  args: { caption, animationPreset: "watercolor-reveal" },
  render: (args) => (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {stripTimes.map((time) => (
        <FrameWithMatte key={time} args={args} time={time} />
      ))}
    </div>
  ),
};

function FrameWithMatte({
  args,
  time,
}: {
  args: WatercolorImageProps;
  time: number;
}) {
  const { urls, onReveal } = useMatteUrls();
  return (
    <div className="grid gap-2">
      <Label>{`${time.toFixed(1).replace(".", ",")} s`}</Label>
      <Debug freezeAt={time} keepMatte onReveal={onReveal}>
        <WatercolorImage {...args} sizes="300px" />
      </Debug>
      <div className="grid grid-cols-2 gap-2">
        <MattePanel layer="backdrop" url={urls.backdrop} />
        <MattePanel layer="photo" url={urls.photo} />
      </div>
    </div>
  );
}

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
