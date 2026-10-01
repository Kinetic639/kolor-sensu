import Image from "next/image";
import { cn } from "../lib/utils";

// Server-safe. A row of photos, each set down at a slight tilt like prints
// on a table, that travels sideways while the page scrolls (after Talking
// Walls' tilted gallery). The row is wider than the screen; inside a
// PageMotion it moves from right to left over the band's passage
// (public-site.css, "Drifting photos"). Without motion it is a still row,
// cut at the edge.

export interface DriftingPhoto {
  src: string;
  alt: string;
}

export interface DriftingPhotosProps {
  photos: readonly DriftingPhoto[];
  /** Word in the cursor disc over a photo. */
  cursorLabel?: string;
  className?: string;
}

const TILTS = [-3.5, 2.5, -1.5, 3, -2.5, 1.5];

export function DriftingPhotos({
  photos,
  cursorLabel,
  className,
}: DriftingPhotosProps) {
  return (
    <div className={cn("ks-drift-photos", className)}>
      <ul className="ks-drift-photos__track">
        {photos.map((photo, index) => (
          <li key={photo.src}>
            <figure
              className="ks-drift-photos__print"
              style={{ rotate: `${TILTS[index % TILTS.length]}deg` }}
              data-cursor-label={cursorLabel}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 64rem) 22rem, 60vw"
                loading="lazy"
                className="object-cover"
              />
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}
