// The site-wide data the layout components render: navigation, contact,
// social profiles and legal links. Plain data, so the app can load it from
// the CMS and every layout piece stays server-rendered.

export interface SiteLink {
  label: string;
  href: string;
}

export interface SiteNavItem extends SiteLink {
  /** A second level, shown as a dropdown on desktop and indented on phones. */
  children?: Array<SiteLink & { description?: string }>;
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
