import type { Decorator, Meta, StoryObj } from "@storybook/react";
import type { gsap } from "gsap";
import { type CSSProperties, type ReactNode, useMemo, useState } from "react";
import { specialistSplashes } from "./specialist-artwork";
import {
  SpecialistWatercolorCard,
  type SpecialistWatercolorCardProps,
} from "./specialist-card";
import {
  type SpecialistRevealDebug,
  SpecialistRevealDebugContext,
} from "./specialist-reveal";
import { sampleSpecialists } from "./specialist-samples";
import {
  type SplashMatte,
  type SplashMatteVariant,
  specialistRevealTiming,
  splashRevealLength,
} from "./specialist-splash-matte";
import { splashMatte } from "./specialist-splash-matte.data";
import {
  Label,
  PrefersReducedMotion,
  Replay,
  usePlayhead,
} from "./story-support";

// SpecialistWatercolorCard: a cut-out portrait on one of the supplied
// watercolor splashes, its lower edge dissolving into the paint, and a small
// UI plate. Reference: docs/design/references/public/specialists-concept.png
// (served at /references/specialists-concept.png).

const [anna, tomasz, katarzyna] = sampleSpecialists;

const paper: Decorator = (Story) => (
  <div className="bg-bg px-gutter font-body text-ink min-h-screen py-12">
    <div className="mx-auto max-w-[75rem]">
      <Story />
    </div>
  </div>
);

const meta = {
  title: "Public site/SpecialistWatercolorCard",
  component: SpecialistWatercolorCard,
  decorators: [paper],
  parameters: { canvasPadding: false },
  args: { ...anna, className: "max-w-[18rem]" },
  argTypes: {
    splash: {
      control: "inline-radio",
      options: Object.keys(specialistSplashes),
    },
    animationPreset: {
      control: "inline-radio",
      options: ["none", "splash-reveal"],
    },
    reducedMotionMode: {
      control: "inline-radio",
      options: ["static", "simple-fade"],
    },
    matte: { control: "inline-radio", options: ["a", "b"] },
  },
} satisfies Meta<typeof SpecialistWatercolorCard>;

export default meta;

type Story = StoryObj<typeof meta>;
type Args = SpecialistWatercolorCardProps;

// ------------------------------------------------------------ story helpers

/** Inspection hooks for one card (see SpecialistRevealDebug). */
function Debug({
  children,
  ...debug
}: SpecialistRevealDebug & { children: ReactNode }) {
  const { freezeAt, keepMatte, onReveal } = debug;
  const value = useMemo(
    () => ({ freezeAt, keepMatte, onReveal }),
    [freezeAt, keepMatte, onReveal],
  );
  return (
    <SpecialistRevealDebugContext.Provider value={value}>
      {children}
    </SpecialistRevealDebugContext.Provider>
  );
}

function useReveal() {
  const [reveal, setReveal] = useState<{
    matte?: SplashMatte;
    timeline: gsap.core.Timeline;
  }>();
  const onReveal = useMemo(() => setReveal, []);
  return { reveal, onReveal };
}

// Mirrors the bloom layout for variant "b", as the matte itself does.
const mirrored = (variant: SplashMatteVariant): CSSProperties =>
  variant === "b" ? { transform: "scaleX(-1)" } : {};

/**
 * The splash matte alone, as the splash layer sees it: white = revealed,
 * black = not yet. Drawn with the very same SVG mask the card uses, without
 * any watercolor, so only the spreading shapes are judged. `seeds` marks
 * where each bloom starts.
 */
function SplashMattePanel({
  url,
  variant,
  seeds = false,
  label,
}: {
  url?: string;
  variant: SplashMatteVariant;
  seeds?: boolean;
  label?: string;
}) {
  return (
    <div>
      {label ? <Label>{label}</Label> : null}
      <div
        className="relative w-full overflow-hidden bg-black"
        style={{ aspectRatio: "3 / 4" }}
      >
        <div
          className="absolute inset-0 bg-white"
          style={{
            maskImage: url ?? "linear-gradient(transparent, transparent)",
          }}
        />
        {seeds ? <BloomSeeds variant={variant} /> : null}
      </div>
    </div>
  );
}

/** Where every bloom starts, and when (s after the splash starts). */
function BloomSeeds({
  variant,
  labels = false,
}: {
  variant: SplashMatteVariant;
  labels?: boolean;
}) {
  const { width, height, blooms } = splashMatte;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={mirrored(variant)}
      aria-hidden="true"
    >
      {blooms.map(({ id, seed: [x, y], start }) => (
        <g key={id} stroke="#e0457b" strokeWidth={4} strokeLinecap="round">
          <path d={`M${x - 12} ${y}H${x + 12}M${x} ${y - 12}V${y + 12}`} />
          {labels ? (
            <text
              x={x + 16}
              y={y - 10}
              fontSize={26}
              fontFamily="system-ui, sans-serif"
              fill="#1d1d1d"
              stroke="#fff"
              strokeWidth={5}
              paintOrder="stroke"
              style={
                variant === "b"
                  ? {
                      transform: "scaleX(-1)",
                      transformBox: "fill-box",
                      transformOrigin: "center",
                    }
                  : undefined
              }
            >
              {`${id} +${start.toFixed(2)}s`}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

/**
 * The bloom regions as the generator built them: one tint per region, in
 * the order they start (lighter = later), with each seed.
 */
function BloomRegions({ variant }: { variant: SplashMatteVariant }) {
  const { width, height, atlas, blooms } = splashMatte;
  const last = Math.max(...blooms.map((bloom) => bloom.start));
  return (
    <div
      className="relative w-full overflow-hidden bg-white"
      style={{ aspectRatio: "3 / 4" }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 h-full w-full"
        style={mirrored(variant)}
        aria-hidden="true"
      >
        <defs>
          {blooms.map((bloom, index) => (
            <filter
              key={bloom.id}
              id={`ks-bloom-${variant}-${bloom.id}`}
              colorInterpolationFilters="sRGB"
            >
              <feFlood
                floodColor={`hsl(${(index * 47) % 360} 55% ${35 + 40 * (bloom.start / last)}%)`}
              />
              <feComposite in2="SourceAlpha" operator="in" />
            </filter>
          ))}
        </defs>
        {blooms.map((bloom) => {
          const [bx, by, bw, bh] = bloom.box;
          const [ax, ay, aw, ah] = bloom.atlas;
          return (
            <g key={bloom.id} filter={`url(#ks-bloom-${variant}-${bloom.id})`}>
              <svg
                x={bx}
                y={by}
                width={bw}
                height={bh}
                viewBox={`${ax} ${ay} ${aw} ${ah}`}
                preserveAspectRatio="none"
              >
                <image
                  href={atlas.src}
                  width={atlas.width}
                  height={atlas.height}
                />
              </svg>
            </g>
          );
        })}
      </svg>
      <BloomSeeds variant={variant} labels />
    </div>
  );
}

/** Every part of the reveal on the time axis, with a playhead. */
function RevealChart({ timeline }: { timeline?: gsap.core.Timeline }) {
  const time = usePlayhead(timeline);
  const scale = (seconds: number) => `${(seconds / 1.2) * 100}%`;
  const t = specialistRevealTiming;
  const rows = [
    { label: "Portret", colour: "var(--color-ink)", ...t.portrait },
    ...splashMatte.blooms.map((bloom) => ({
      label: `Plama ${bloom.id}`,
      colour: "#e0457b",
      at: t.splash.at + bloom.start,
      duration: bloom.duration,
    })),
    { label: "Pigment na portrecie", colour: "var(--color-pink)", ...t.stain },
    { label: "Tabliczka", colour: "var(--color-primary)", ...t.plate },
  ];
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
                className="absolute inset-y-0 rounded-full"
                style={{
                  left: scale(row.at),
                  width: scale(row.duration),
                  background: row.colour,
                }}
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

// What public-site.css does under prefers-reduced-motion: reduce, for the
// cards inside this story: nothing pre-hidden, and for "simple-fade" the
// card starts hidden (the script fades it in).
const reducedMotionStyles = `
  .ks-story-reduced .ks-sp[data-animation="splash-reveal"]
    :is(.ks-sp__portrait, .ks-sp__splash, .ks-sp__stain, .ks-sp__plate) {
    opacity: 1 !important;
  }
  .ks-story-reduced
    .ks-sp[data-animation="splash-reveal"][data-reduced-motion="simple-fade"]:not([data-reveal="done"]) {
    opacity: var(--ks-sp-hidden, 0);
  }
`;

// ------------------------------------------------------------ stories

/** On a pink splash (the finished, static card). */
export const Pink: Story = {};

/** On a sage splash. */
export const Green: Story = {
  args: { ...tomasz, className: "max-w-[18rem]" },
};

/**
 * `animationPreset="none"` (default): the server HTML is the finished card.
 * All four supplied splashes, so no two cards look duplicated.
 */
export const Static: Story = {
  render: (args) => (
    <ul className="grid grid-cols-2 gap-8 md:grid-cols-4">
      {(Object.keys(specialistSplashes) as Args["splash"][]).map(
        (splash, index) => (
          <li key={splash}>
            <Label>{splash}</Label>
            <SpecialistWatercolorCard
              {...args}
              {...[anna, tomasz, katarzyna, tomasz][index]!}
              splash={splash}
              className=""
            />
          </li>
        ),
      )}
    </ul>
  ),
};

/**
 * `animationPreset="splash-reveal"`: the portrait lifts in, the watercolor
 * blooms outward from behind the torso in many small, uneven patches, and
 * the plate arrives last. About 1.05 s, once, when the card comes into
 * view.
 */
export const Animated: Story = {
  args: { animationPreset: "splash-reveal" },
  render: (args) => (
    <Replay>{() => <SpecialistWatercolorCard {...args} />}</Replay>
  ),
};

/**
 * Visitors who prefer reduced motion see no blooming: the finished card at
 * once (`reducedMotionMode="static"`, default) or a 0.4 s fade
 * (`"simple-fade"`). This story emulates the setting for the cards.
 */
export const ReducedMotion: Story = {
  name: "Reduced Motion",
  args: { animationPreset: "splash-reveal" },
  render: (args) => (
    <PrefersReducedMotion styles={reducedMotionStyles}>
      <Replay>
        {() => (
          <div className="grid max-w-[38rem] grid-cols-2 gap-8">
            {(["static", "simple-fade"] as const).map((mode) => (
              <div key={mode}>
                <Label>{`reducedMotionMode="${mode}"`}</Label>
                <SpecialistWatercolorCard
                  {...args}
                  reducedMotionMode={mode}
                  className=""
                />
              </div>
            ))}
          </div>
        )}
      </Replay>
    </PrefersReducedMotion>
  ),
};

function SplashMatteView({
  args,
  freezeAt,
}: {
  args: Args;
  freezeAt?: number;
}) {
  const { reveal, onReveal } = useReveal();
  const variant = args.matte ?? "a";
  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div>
        <Label>Karta</Label>
        <Debug onReveal={onReveal} keepMatte freezeAt={freezeAt}>
          <SpecialistWatercolorCard {...args} className="" />
        </Debug>
      </div>
      <SplashMattePanel
        url={reveal?.matte?.url}
        variant={variant}
        seeds
        label="Matte plamy (biały = odsłonięte)"
      />
      <div>
        <Label>Regiony rozlewania (jaśniej = później)</Label>
        <BloomRegions variant={variant} />
      </div>
    </div>
  );
}

function SplashMatteControls({ args }: { args: Args }) {
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
              max={splashRevealLength}
              step={0.02}
              value={freeze}
              onChange={(event) => setFreeze(Number(event.target.value))}
            />
            <span className="tabular-nums">{`${freeze.toFixed(2)} s`}</span>
          </label>
        ) : null}
      </div>
      {freeze !== undefined ? (
        <SplashMatteView
          key={`freeze-${freeze}`}
          args={args}
          freezeAt={freeze}
        />
      ) : (
        <Replay key={`speed-${speed}`} speed={speed}>
          {() => <SplashMatteView args={args} />}
        </Replay>
      )}
    </div>
  );
}

/**
 * The splash matte, live, beside the card: the SVG mask the splash is
 * revealed through, on its own (no watercolor), with the bloom seeds; and
 * the bloom regions the generator built, tinted by start time. Slow it
 * down, or stop it at any moment. Switch `matte` to "b" for the mirrored
 * layout.
 */
export const SplashMatteDebug: Story = {
  name: "Splash Matte Debug",
  args: { animationPreset: "splash-reveal", className: "" },
  render: (args) => <SplashMatteControls args={args} />,
};

function SlowMotion({ args }: { args: Args }) {
  const { reveal, onReveal } = useReveal();
  return (
    <div className="grid gap-8">
      <div className="grid max-w-[40rem] grid-cols-2 gap-8">
        <Debug onReveal={onReveal} keepMatte>
          <SpecialistWatercolorCard {...args} className="" />
        </Debug>
        <SplashMattePanel
          url={reveal?.matte?.url}
          variant={args.matte ?? "a"}
          seeds
          label="Matte plamy"
        />
      </div>
      <RevealChart timeline={reveal?.timeline} />
    </div>
  );
}

/**
 * The same reveal five times slower, with the splash matte beside it and
 * every part on a time axis: the portrait first, the blooms from the torso
 * outward, overlapping, the plate last.
 */
export const SlowMotionDebug: Story = {
  name: "Slow Motion Debug",
  args: { animationPreset: "splash-reveal" },
  render: (args) => (
    <Replay speed={0.2}>{() => <SlowMotion args={args} />}</Replay>
  ),
};

const stripTimes = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2];

function FrameWithMatte({ args, time }: { args: Args; time: number }) {
  const { reveal, onReveal } = useReveal();
  return (
    <div className="grid gap-2">
      <Label>{`${time.toFixed(1).replace(".", ",")} s`}</Label>
      <Debug freezeAt={time} keepMatte onReveal={onReveal}>
        <SpecialistWatercolorCard {...args} className="" sizes="14rem" />
      </Debug>
      <SplashMattePanel url={reveal?.matte?.url} variant={args.matte ?? "a"} />
    </div>
  );
}

/**
 * Frame strip: the reveal stopped at fixed times, each card with its splash
 * matte under it. Shows the portrait starting first, the splash beginning
 * behind the torso, many blooms spreading outward, the complete background
 * and the plate arriving at the end.
 */
export const FrameStrip: Story = {
  name: "Frame Strip",
  args: { animationPreset: "splash-reveal" },
  render: (args) => (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-6">
      {stripTimes.map((time) => (
        <FrameWithMatte key={time} args={args} time={time} />
      ))}
    </div>
  ),
};
