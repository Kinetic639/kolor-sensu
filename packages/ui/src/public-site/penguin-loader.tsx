import { useId } from "react";
import { introPenguin as p } from "./intro-penguin.data";

// Server-safe: no client JavaScript at all. The logo's penguin, alive, in a
// 4.4 s loop: its eyes are plain arcs, it blinks (the arcs straighten for a
// moment), then smiles (the arcs turn into the logo's waves), its body gives
// a small squash, and it flaps its leaves twice like a bird with its wings;
// then the eyes open again. As in the logo, the leaves look see-through:
// the head shows through them in greens.
//
// The eyes morph with SMIL (<animate> on the path data: no script, Safari
// included); the rest is CSS (public-site.css, .ks-penguin), only while it
// is marked data-animation="loop". Under reduced motion, or with
// animation="none", the animated eyes give way to the logo's still smile. Shapes: intro-penguin.data.ts (generated from the logo).

const { pivot, colors, eyes } = p;
const LOOP = 4.4;

// Eye states over the loop (seconds), eased in and out.
const timeline = [
  [0, "open"],
  [0.75, "open"],
  [0.87, "blink"],
  [1, "open"],
  [1.8, "open"],
  [2.35, "smile"],
  [3.85, "smile"],
  [4.3, "open"],
  [LOOP, "open"],
] as const;

const keyTimes = timeline.map(([t]) => (t / LOOP).toFixed(4)).join(";");
const keySplines = timeline
  .slice(1)
  .map(() => "0.45 0 0.25 1")
  .join(";");

function Eye({ side }: { side: "left" | "right" }) {
  return (
    <path d={eyes.open[side]}>
      <animate
        attributeName="d"
        dur={`${LOOP}s`}
        repeatCount="indefinite"
        calcMode="spline"
        keyTimes={keyTimes}
        keySplines={keySplines}
        values={timeline.map(([, state]) => eyes[state][side]).join(";")}
      />
    </path>
  );
}

export interface PenguinLoaderProps {
  /** "loop" (default) plays the loop; "none" is the still logo. */
  animation?: "loop" | "none";
  className?: string;
  /** Accessible name; leave out when the penguin is only decoration. */
  label?: string;
}

export function PenguinLoader({
  animation = "loop",
  className,
  label,
}: PenguinLoaderProps) {
  // Unique per instance: several penguins may share a page.
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const clip = (name: string) => `ks-penguin-${id}-${name}`;
  const pivotStyle = {
    transformOrigin: `${pivot.x}px ${pivot.y}px`,
  };

  return (
    <svg
      className={["ks-penguin", className].filter(Boolean).join(" ")}
      viewBox={p.viewBox}
      data-animation={animation === "loop" ? "loop" : undefined}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <clipPath id={clip("head")}>
          <ellipse {...p.head} />
        </clipPath>
        {(["left", "right"] as const).map((side) => (
          <clipPath key={side} id={clip(side)}>
            <path d={p.leaves[side].shape} />
          </clipPath>
        ))}
      </defs>
      <g
        fill="none"
        stroke={colors.ink}
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g className="ks-penguin__body" style={pivotStyle}>
          <ellipse {...p.head} fill={colors.head} />
          <g clipPath={`url(#${clip("head")})`}>
            <path fill={colors.face} stroke="none" d={p.face.fill} />
            <path d={p.face.left} />
            <path d={p.face.right} />
          </g>
          {animation === "loop" ? (
            <g className="ks-penguin__eyes">
              <Eye side="left" />
              <Eye side="right" />
            </g>
          ) : null}
          <g className="ks-penguin__eyes-still">
            <path d={eyes.smile.left} />
            <path d={eyes.smile.right} />
          </g>
          <path fill={colors.face} d={p.beak} />
        </g>

        {(["left", "right"] as const).map((side) => (
          <g
            key={side}
            className="ks-penguin__leaf"
            data-side={side}
            style={pivotStyle}
          >
            <path fill={colors.leaf} d={p.leaves[side].shape} />
            {/* The head seen through the leaf: it follows the body and
                undoes the leaf's own flap, so it stays under the real head. */}
            <g clipPath={`url(#${clip(side)})`}>
              <g
                className="ks-penguin__unflap"
                data-side={side}
                style={pivotStyle}
              >
                <g className="ks-penguin__body" style={pivotStyle}>
                  <ellipse
                    {...p.head}
                    fill={colors.leafHead}
                    stroke={colors.leafLine}
                  />
                </g>
              </g>
            </g>
            <path d={p.leaves[side].shape} />
            <path fill={colors.ink} stroke="none" d={p.leaves[side].tip} />
          </g>
        ))}

        <g stroke="none">
          {p.feet.map((foot) => (
            <path
              key={foot.d}
              fill={foot.dark ? colors.inkDark : colors.ink}
              d={foot.d}
            />
          ))}
        </g>
      </g>
    </svg>
  );
}
