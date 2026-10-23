// The mist of ThoughtsLens (thoughts-lens.tsx): where each letter of a
// negative thought drifts while it dissolves (in em and degrees; the
// stylesheet moves it there). Pure numbers, no DOM.

/** Where letter `index` of the crowd drifts while it dissolves. */
export function letterDrift(index: number) {
  // A small hash, so the cloud looks random but renders the same on the
  // server and in the browser.
  const random = (salt: number) => {
    const s = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  return {
    x: Number((random(1) * 1.2).toFixed(2)),
    // Mist rises: letters drift up more than down.
    y: Number((random(2) * 0.6 - 0.6).toFixed(2)),
    turn: Math.round(random(3) * 40),
  };
}
