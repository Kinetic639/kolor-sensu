import type { Decorator, Meta, StoryObj } from "@storybook/react";
import type { gsap } from "gsap";
import { type ReactNode, useMemo, useState } from "react";
import {
  type OfferMatte,
  type OfferMatteVariant,
  offerRevealLength,
  offerRevealTiming,
} from "./offer-brush-matte";
import { offerMatte } from "./offer-brush-matte.data";
import { type OfferRevealDebug, OfferRevealDebugContext } from "./offer-reveal";
import { sampleServices } from "./offer-samples";
import { type OfferPaint, OfferTile, type OfferTileProps } from "./offer-tile";
import {
  Label,
  PrefersReducedMotion,
  Replay,
  usePlayhead,
} from "./story-support";

// OfferTile: a service on one of the supplied watercolor patches, painted in
// with five quick brush strokes, top to bottom, at the angle of the patches'
// brushwork. Reference A (homepage-concept.png), "Nasza oferta".

const [individual, couples] = sampleServices;

const paper: Decorator = (Story) => (
  <div className="bg-bg px-gutter font-body text-ink min-h-screen py-12">
    <div className="mx-auto max-w-[75rem]">
      <Story />
    </div>
  </div>
);

const meta = {
  title: "Public site/OfferTile",
  component: OfferTile,
  decorators: [paper],
  parameters: { canvasPadding: false },
  args: { ...individual, className: "max-w-[13rem]" },
  argTypes: {
    paint: {
      control: "inline-radio",
      options: Object.keys(offerMatte.paints),
    },
    animationPreset: {
      control: "inline-radio",
      options: ["none", "brush-reveal"],
    },
    reducedMotionMode: {
      control: "inline-radio",
      options: ["static", "simple-fade"],
    },
    matte: { control: "inline-radio", options: ["a", "b"] },
    icon: { control: false },
  },
} satisfies Meta<typeof OfferTile>;

export default meta;

type Story = StoryObj<typeof meta>;
type Args = OfferTileProps;

// ------------------------------------------------------------ story helpers

/** Inspection hooks for one tile (see OfferRevealDebug). */
function Debug({
  children,
  ...debug
}: OfferRevealDebug & { children: ReactNode }) {
  const { freezeAt, keepMatte, onReveal } = debug;
  const value = useMemo(
    () => ({ freezeAt, keepMatte, onReveal }),
    [freezeAt, keepMatte, onReveal],
  );
  return (
    <OfferRevealDebugContext.Provider value={value}>
      {children}
    </OfferRevealDebugContext.Provider>
  );
}

function useReveal() {
  const [reveal, setReveal] = useState<{
    matte?: OfferMatte;
    timeline: gsap.core.Timeline;
  }>();
  const onReveal = useMemo(() => setReveal, []);
  return { reveal, onReveal };
}

const strokeColours = ["#e0457b", "#17a67a", "#3d7bd9", "#d99a1e", "#8a4fd0"];

/**
 * Each stroke's centreline with an arrow in the direction it is painted and
 * its order: five bands at the patches' angle, top to bottom ("a") or
 * bottom to top ("b").
 */
function StrokeLines({ variant }: { variant: OfferMatteVariant }) {
  const { width, height } = offerMatte;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {offerMatte.variants[variant].map((stroke, index) => {
        const [x0, y0, cx, cy, x1, y1] = stroke.path;
        const colour = strokeColours[index]!;
        // Arrow head part-way along the curve, inside the tile, pointing the
        // way the brush travels.
        const t = 0.62;
        const [hx, hy] = [
          (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1,
          (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1,
        ];
        const [dx, dy] = [
          2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx),
          2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy),
        ];
        const length = Math.hypot(dx, dy) || 1;
        const [ux, uy] = [dx / length, dy / length];
        const head = [
          [hx + ux * 30, hy + uy * 30],
          [hx - uy * 15, hy + ux * 15],
          [hx + uy * 15, hy - ux * 15],
        ]
          .map((point) => point.join(","))
          .join(" ");
        const at =
          offerRevealTiming.strokes.at + index * offerRevealTiming.strokes.gap;
        return (
          <g key={stroke.id}>
            <path
              d={`M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}`}
              fill="none"
              stroke={colour}
              strokeWidth={6}
              strokeDasharray="18 10"
            />
            <polygon points={head} fill={colour} />
            <text
              x={width / 2}
              y={Math.min(760, Math.max(40, (y0 + y1) / 2 + 10))}
              fontSize={30}
              fontFamily="system-ui, sans-serif"
              textAnchor="middle"
              fill="#1d1d1d"
              stroke="#fff"
              strokeWidth={6}
              paintOrder="stroke"
            >
              {`${index + 1} · ${at.toFixed(2)} s`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * The brush matte alone, as the paint layer sees it: white = painted, black
 * = not yet. The very same SVG mask the tile uses, without any watercolor.
 */
function MattePanel({
  url,
  variant,
  lines = false,
  label,
}: {
  url?: string;
  variant: OfferMatteVariant;
  lines?: boolean;
  label?: string;
}) {
  return (
    <div>
      {label ? <Label>{label}</Label> : null}
      <div
        className="relative w-full overflow-hidden bg-black"
        style={{ aspectRatio: "5 / 8" }}
      >
        <div
          className="absolute inset-0 bg-white"
          style={{
            maskImage: url ?? "linear-gradient(transparent, transparent)",
          }}
        />
        {lines ? <StrokeLines variant={variant} /> : null}
      </div>
    </div>
  );
}

/** Every part of the reveal on the time axis, with a playhead. */
function RevealChart({ timeline }: { timeline?: gsap.core.Timeline }) {
  const time = usePlayhead(timeline);
  const scale = (seconds: number) => `${(seconds / 1) * 100}%`;
  const t = offerRevealTiming;
  const rows = [
    ...offerMatte.variants.a.map((stroke, index) => ({
      label: `Pociągnięcie ${index + 1}`,
      colour: strokeColours[index]!,
      at: t.strokes.at + index * t.strokes.gap,
      duration: t.strokes.duration,
    })),
    { label: "Treść", colour: "var(--color-ink)", ...t.content },
    { label: "Strzałka", colour: "var(--color-primary)", ...t.arrow },
  ];
  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1];
  return (
    <div className="text-small grid gap-1">
      <p className="font-semibold tabular-nums">{`t = ${time.toFixed(2)} s`}</p>
      <div className="relative grid gap-0.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[9rem_1fr] items-center gap-3"
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
        <div className="pointer-events-none absolute inset-y-0 right-0 left-[10rem]">
          {ticks.map((tick) => (
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
      <div className="text-text-muted relative ml-[10rem] h-4">
        {ticks.map((tick) => (
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
// tiles inside this story: nothing pre-hidden, and for "simple-fade" the
// tile starts hidden (the script fades it in).
const reducedMotionStyles = `
  .ks-story-reduced .ks-of[data-animation="brush-reveal"]
    :is(.ks-of__paint, .ks-of__content, .ks-of__arrow) {
    opacity: 1 !important;
  }
  .ks-story-reduced
    .ks-of[data-animation="brush-reveal"][data-reduced-motion="simple-fade"]:not([data-reveal="done"]) {
    opacity: var(--ks-of-hidden, 0);
  }
`;

// ------------------------------------------------------------ stories

/** On a sage patch (the finished, static tile). */
export const Sage: Story = {};

/** On a pink patch. */
export const Pink: Story = {
  args: { ...couples, className: "max-w-[13rem]" },
};

/**
 * `animationPreset="none"` (default): the server HTML is the finished tile.
 * All four supplied patches: different files, lined up on the same box.
 */
export const Static: Story = {
  render: () => (
    <ul className="ks-of-list max-w-[52rem]">
      {sampleServices.map((service) => (
        <li key={service.href}>
          <Label>{service.paint}</Label>
          <OfferTile {...service} />
        </li>
      ))}
    </ul>
  ),
};

/**
 * `animationPreset="brush-reveal"`: the patch is painted in five quick
 * strokes, top to bottom, each across the tile at the patches' angle
 * (22°), back and forth; then the content and the arrow arrive. About
 * 0.9 s, once, when the tile comes into view.
 */
export const Animated: Story = {
  args: { animationPreset: "brush-reveal" },
  render: (args) => <Replay>{() => <OfferTile {...args} />}</Replay>,
};

/**
 * Visitors who prefer reduced motion see no painting: the finished tile at
 * once (`reducedMotionMode="static"`, default) or a 0.4 s fade
 * (`"simple-fade"`). This story emulates the setting for the tiles.
 */
export const ReducedMotion: Story = {
  name: "Reduced Motion",
  args: { animationPreset: "brush-reveal" },
  render: (args) => (
    <PrefersReducedMotion styles={reducedMotionStyles}>
      <Replay>
        {() => (
          <div className="grid max-w-[28rem] grid-cols-2 gap-6">
            {(["static", "simple-fade"] as const).map((mode) => (
              <div key={mode}>
                <Label>{mode}</Label>
                <OfferTile {...args} reducedMotionMode={mode} className="" />
              </div>
            ))}
          </div>
        )}
      </Replay>
    </PrefersReducedMotion>
  ),
};

function MatteView({ args, freezeAt }: { args: Args; freezeAt?: number }) {
  const { reveal, onReveal } = useReveal();
  const variant = args.matte ?? "a";
  return (
    <div className="grid max-w-[44rem] grid-cols-2 gap-8 md:grid-cols-3">
      <div>
        <Label>Kafel</Label>
        <Debug onReveal={onReveal} keepMatte freezeAt={freezeAt}>
          <OfferTile {...args} className="" />
        </Debug>
      </div>
      <MattePanel
        url={reveal?.matte?.url}
        variant={variant}
        label="Matte (biały = namalowane)"
      />
      <MattePanel
        url={reveal?.matte?.url}
        variant={variant}
        lines
        label="Pociągnięcia: kierunek i kolejność"
      />
    </div>
  );
}

function MatteControls({ args }: { args: Args }) {
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
              setFreeze(event.target.checked ? 0.3 : undefined)
            }
          />
          <span>Zatrzymaj w chwili</span>
        </label>
        {freeze !== undefined ? (
          <label className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={offerRevealLength}
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
 * The brush matte, live, beside the tile: the SVG mask the patch is painted
 * through, on its own, and with each stroke's centreline, direction and
 * start. Slow it down or stop it at any moment; switch `matte` to "b" for
 * the even tiles' way: bottom to top, starting from the right.
 */
export const BrushMatteDebug: Story = {
  name: "Brush Matte Debug",
  args: { animationPreset: "brush-reveal", className: "" },
  render: (args) => <MatteControls args={args} />,
};

function SlowMotion({ args }: { args: Args }) {
  const { reveal, onReveal } = useReveal();
  return (
    <div className="grid gap-8">
      <div className="grid max-w-[30rem] grid-cols-2 gap-8">
        <Debug onReveal={onReveal} keepMatte>
          <OfferTile {...args} className="" />
        </Debug>
        <MattePanel
          url={reveal?.matte?.url}
          variant={args.matte ?? "a"}
          lines
          label="Matte i pociągnięcia"
        />
      </div>
      <RevealChart timeline={reveal?.timeline} />
    </div>
  );
}

/**
 * The same reveal five times slower, with the matte beside it and every
 * part on a time axis: five strokes overlapping band after band, then the
 * content and the arrow.
 */
export const SlowMotionDebug: Story = {
  name: "Slow Motion Debug",
  args: { animationPreset: "brush-reveal" },
  render: (args) => (
    <Replay speed={0.2}>{() => <SlowMotion args={args} />}</Replay>
  ),
};

const stripTimes = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

function FrameWithMatte({ args, time }: { args: Args; time: number }) {
  const { reveal, onReveal } = useReveal();
  return (
    <div className="grid gap-2">
      <Label>{`${time.toFixed(1).replace(".", ",")} s`}</Label>
      <Debug freezeAt={time} keepMatte onReveal={onReveal}>
        <OfferTile {...args} className="" sizes="10rem" />
      </Debug>
      <MattePanel url={reveal?.matte?.url} variant={args.matte ?? "a"} />
    </div>
  );
}

/**
 * Frame strip: the reveal stopped every 100 ms, each tile with its matte
 * under it. Shows the strokes starting at the top, one band after another
 * at the patches' angle, until the whole patch is painted.
 */
export const FrameStrip: Story = {
  name: "Frame Strip (co 100 ms)",
  args: { animationPreset: "brush-reveal" },
  render: (args) => (
    <div className="grid grid-cols-3 gap-x-5 gap-y-8 sm:grid-cols-5">
      {stripTimes.map((time) => (
        <FrameWithMatte key={time} args={args} time={time} />
      ))}
    </div>
  ),
};

/** Every supplied patch, painted at the same time, to compare. */
export const AllPaints: Story = {
  name: "All Paints Animated",
  args: { animationPreset: "brush-reveal" },
  render: (args) => (
    <Replay>
      {() => (
        <ul className="ks-of-list max-w-[52rem]">
          {(Object.keys(offerMatte.paints) as OfferPaint[]).map(
            (paint, index) => (
              <li key={paint}>
                <OfferTile
                  {...args}
                  {...sampleServices[index]!}
                  animationPreset="brush-reveal"
                  matte={index % 2 ? "b" : "a"}
                  className=""
                />
              </li>
            ),
          )}
        </ul>
      )}
    </Replay>
  ),
};
