// The site-wide data the layout components render: navigation, contact,
// social profiles and legal links. Plain data, so the app can load it from
// the CMS and every layout piece stays server-rendered.

export interface SiteLink {
  label: string;
  href: string;
}

/**
 * A booking begun and left: the cookie keeping the link back to it (only
 * a link into `under` is followed), and the action's label meanwhile.
 */
export interface SiteResume {
  cookie: string;
  under: string;
  label: string;
}

/** The header's action ("Umów wizytę"), optionally leading back. */
export interface SiteCta extends SiteLink {
  resume?: SiteResume;
}

/**
 * A link of a dropdown ("Oferta"): a page, or a group of them (a
 * catalogue) opening beside it on desktop and folding out on phones; its
 * own `href` is the group's place on the list page.
 */
export interface SiteNavChild extends SiteLink {
  description?: string;
  children?: SiteLink[];
}

export interface SiteNavItem extends SiteLink {
  /** A second level, shown as a dropdown on desktop and indented on phones. */
  children?: SiteNavChild[];
  /** Pages beside the list (`Cennik`), under it, above the item's own page. */
  links?: SiteLink[];
  /** The dropdown's last link, to the item's own page (default: `Cała …`). */
  allLabel?: string;
  /** In the footer, a column of its own (the offer's pages). */
  footerColumn?: boolean;
}

export interface SiteContact {
  address: { street: string; postalCode: string; city: string };
  /**
   * As dialled, e.g. "+48123456789"; `phoneLabel` is how it is shown. Left
   * out, the phone is simply not shown (likewise the email).
   */
  phone?: string;
  phoneLabel?: string;
  email?: string;
  /** Opening hours as shown, e.g. "Pn–Pt 8:00–20:00". */
  hours?: string;
}

export type SocialNetwork = "instagram" | "facebook" | "linkedin" | "youtube";

export interface SiteSocial {
  network: SocialNetwork;
  href: string;
}
