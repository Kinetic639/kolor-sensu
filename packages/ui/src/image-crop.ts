// Pan-and-zoom cropping math. The photo is scaled to cover the frame (zoom 1)
// and can be zoomed in and moved; `offset` is how far, in frame pixels, the
// photo's centre is from the frame's centre.

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point, Size {}

export const MAX_ZOOM = 4;

function scaleOf(image: Size, frame: Size, zoom: number) {
  return (
    Math.max(frame.width / image.width, frame.height / image.height) * zoom
  );
}

/** Keeps the photo covering the whole frame. */
export function clampOffset(
  image: Size,
  frame: Size,
  zoom: number,
  offset: Point,
): Point {
  const scale = scaleOf(image, frame, zoom);
  const slackX = (image.width * scale - frame.width) / 2;
  const slackY = (image.height * scale - frame.height) / 2;
  const clamp = (value: number, limit: number) =>
    Math.min(limit, Math.max(-limit, value)) + 0;
  return { x: clamp(offset.x, slackX), y: clamp(offset.y, slackY) };
}

/** Changes the zoom around the frame's centre. */
export function zoomTo(
  image: Size,
  frame: Size,
  zoom: number,
  offset: Point,
  nextZoom: number,
): { zoom: number; offset: Point } {
  const clamped = Math.min(MAX_ZOOM, Math.max(1, nextZoom));
  const ratio = clamped / zoom;
  return {
    zoom: clamped,
    offset: clampOffset(image, frame, clamped, {
      x: offset.x * ratio,
      y: offset.y * ratio,
    }),
  };
}

/** The part of the photo, in its own pixels, that the frame shows. */
export function cropRect(
  image: Size,
  frame: Size,
  zoom: number,
  offset: Point,
): Rect {
  const scale = scaleOf(image, frame, zoom);
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return {
    x: round(
      (image.width * scale - frame.width) / 2 / scale - offset.x / scale,
    ),
    y: round(
      (image.height * scale - frame.height) / 2 / scale - offset.y / scale,
    ),
    width: round(frame.width / scale),
    height: round(frame.height / scale),
  };
}
