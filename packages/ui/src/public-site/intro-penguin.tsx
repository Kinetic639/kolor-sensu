// Server-safe. The first-visit intro's penguin (site-intro.tsx) as inline
// SVG, drawn in its starting pose: a closed flower bud (the centre leaf at
// the back, the top petals in front of it, the middle petals in front of
// those, the two main leaves in front of all) with the penguin, a little
// smaller, fully hidden behind. That pose is in the markup itself, so it is
// what the first paint shows; IntroMotion (intro-motion.tsx) then opens the
// bud with GSAP. Shapes: intro-penguin.data.ts (generated from the logo).
//
// The ids are fixed: the intro appears once per page.

import { introPenguin as p } from "./intro-penguin.data";

const { pivot, bud, colors } = p;

/** A transform turning by `rotate` degrees and scaling by `scale` about the pivot. */
function aboutPivot(rotate: number, scale: number) {
  return `translate(${pivot.x} ${pivot.y}) rotate(${rotate}) scale(${scale}) translate(${-pivot.x} ${-pivot.y})`;
}

function Petal({
  side,
  part,
}: {
  side: "left" | "right";
  part: "top" | "middle";
}) {
  const sign = side === "left" ? 1 : -1;
  const leaf = p.leaves[side];
  return (
    <g
      className="ks-intro__petal"
      data-part={part}
      data-side={side}
      transform={aboutPivot(sign * bud[part].rotate, bud[part].scale)}
    >
      <path fill={colors.leaf} d={leaf.shape} />
      <path d={leaf.shape} />
      <path fill={colors.ink} stroke="none" d={leaf.tip} />
    </g>
  );
}

export function IntroPenguin({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox={p.viewBox}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="ks-intro-head">
          <ellipse {...p.head} />
        </clipPath>
        {/* The centre leaf slides down out of sight behind the main leaves,
            never below them. */}
        <clipPath id="ks-intro-above-feet">
          <rect x="-100" y="-100" width="900" height="652" />
        </clipPath>
      </defs>
      <g
        fill="none"
        stroke={colors.ink}
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g className="ks-intro__body" transform={aboutPivot(0, bud.body)}>
          <ellipse {...p.head} fill={colors.head} />
          <g clipPath="url(#ks-intro-head)">
            <path fill={colors.face} stroke="none" d={p.face.fill} />
            <path d={p.face.left} />
            <path d={p.face.right} />
          </g>
          <path
            className="ks-intro__eye"
            data-side="left"
            d={p.eyes.open.left}
          />
          <path
            className="ks-intro__eye"
            data-side="right"
            d={p.eyes.open.right}
          />
          <path fill={colors.face} d={p.beak} />
        </g>

        <g clipPath="url(#ks-intro-above-feet)">
          <path
            className="ks-intro__centre-leaf"
            fill={colors.leaf}
            strokeLinejoin="miter"
            strokeMiterlimit="12"
            d={p.centreLeaf}
          />
        </g>
        <Petal side="left" part="top" />
        <Petal side="right" part="top" />
        <Petal side="left" part="middle" />
        <Petal side="right" part="middle" />

        {(["left", "right"] as const).map((side) => (
          <g key={side}>
            <path fill={colors.leaf} d={p.leaves[side].shape} />
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
