import { z } from "zod";

// Who may use the admin's portal (Ustawienia → Dostęp): every portal user
// with their roles, an invitation for a new admin (from the site, which
// holds the service key and the e-mails), the admin's access given to a
// specialist or taken back.

export const adminInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Podaj poprawny adres e-mail.").max(320)),
  firstName: z.string().trim().min(1, "Podaj imię.").max(100),
  lastName: z.string().trim().min(1, "Podaj nazwisko.").max(100),
});

export type AdminInvite = z.infer<typeof adminInviteSchema>;

export interface PortalUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  isSpecialist: boolean;
  /** The last sign in (none: invited, not joined yet). */
  signedInAt: string | null;
  invitedAt: string | null;
}

/** What the site answers an invitation. */
export type AdminInviteResult =
  | {
      ok: true;
      /** A new account, invited; or someone's, given the access. */
      status: "invited" | "granted";
      /** The e-mail went out (invited only). */
      emailed?: boolean;
      /** The invitation's link, to pass on if the e-mail did not go. */
      link?: string;
    }
  | { ok: false; message: string; fields?: Record<string, string> };

const MESSAGES: Record<string, string> = {
  own_access: "Nie możesz odebrać dostępu sobie.",
  last_admin: "Centrum musi mieć co najmniej jednego administratora.",
  forbidden: "Tylko administrator może to zrobić.",
  not_found: "Nie znaleziono tego użytkownika.",
  already_admin: "Ta osoba jest już administratorem.",
  invalid: "Sprawdź pola formularza.",
};

/** Why access could not be changed, in Polish. */
export function accessMessage(code: string | undefined) {
  return (
    (code && MESSAGES[code]) ??
    "Nie udało się zmienić dostępu. Spróbuj ponownie."
  );
}
