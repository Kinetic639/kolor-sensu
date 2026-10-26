import { crisisCardArt } from "./crisis-card-art";

const bristles = [
  [0, 0, 5, 0.8],
  [0.85, -0.8, 0.7, 0.26],
  [-0.9, 0.6, 0.6, 0.23],
  [0.3, 1.7, 0.65, 0.16],
] as const;

export function CrisisCardFrame({ index }: { index: number }) {
  const art = crisisCardArt[index % crisisCardArt.length]!;
  return (
    <svg
      className="ks-crisis__frame"
      viewBox="0 0 960 640"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <g transform={art.transform || undefined}>
        {bristles.map(([x, y, width, opacity], index) => (
          <path
            key={index}
            data-ink-stroke="frame"
            d={art.d}
            transform={`translate(${x} ${y})`}
            fill="none"
            stroke="currentColor"
            strokeWidth={width}
            strokeOpacity={opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <path
          data-ink-tip="start"
          d={art.start}
          fill="currentColor"
          fillOpacity="0.8"
        />
        <path
          data-ink-tip="end"
          d={art.end}
          fill="currentColor"
          fillOpacity="0.8"
        />
      </g>
    </svg>
  );
}
