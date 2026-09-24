import { PaintReveal, type PaintRevealProps } from "./paint-reveal";
import { WatercolorImage, type WatercolorImageProps } from "./watercolor-image";

export interface AnimatedWatercolorImageProps extends Omit<
  WatercolorImageProps,
  "paint"
> {
  trigger?: PaintRevealProps["trigger"];
  threshold?: PaintRevealProps["threshold"];
  revealClassName?: string;
}

/**
 * WatercolorImage that paints itself in when it scrolls into view. The image
 * is still rendered on the server (PaintReveal only adds a data attribute
 * after hydration), so it is visible without JavaScript and with reduced
 * motion.
 */
export function AnimatedWatercolorImage({
  trigger,
  threshold,
  revealClassName,
  ...props
}: AnimatedWatercolorImageProps) {
  return (
    <PaintReveal
      trigger={trigger}
      threshold={threshold}
      className={revealClassName}
    >
      <WatercolorImage {...props} />
    </PaintReveal>
  );
}
