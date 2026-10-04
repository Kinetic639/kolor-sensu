import { Figtree, Lora } from "next/font/google";

// The public site's fonts, for the profile preview only: the site's theme
// reads these variables (public-theme.css), set on the preview's frame.

const lora = Lora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-lora",
  display: "swap",
});
const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  variable: "--font-figtree",
  display: "swap",
});

/** The classes that set the site's font variables. */
export const publicFonts = `${lora.variable} ${figtree.variable}`;
