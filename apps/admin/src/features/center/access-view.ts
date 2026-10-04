import type { PortalUser } from "@repo/contracts/access";

// The portal's users as Dostęp lists them: the admins first; each with
// their roles in words, when they last signed in (or that they are only
// invited), and what may be done (nobody takes their own access).

export type AccessRow = PortalUser & {
  name: string;
  roles: string[];
  seen: string;
  isMe: boolean;
  canGrant: boolean;
  canRevoke: boolean;
};

export function accessRows(
  users: PortalUser[],
  me: string | null,
  timeZone: string,
): AccessRow[] {
  const day = new Intl.DateTimeFormat("pl-PL", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const admins = users.filter((user) => user.isAdmin).length;
  return users
    .map((user) => ({
      ...user,
      name: `${user.firstName} ${user.lastName}`.trim() || user.email,
      roles: [
        ...(user.isAdmin ? ["Administrator"] : []),
        ...(user.isSpecialist ? ["Specjalista"] : []),
      ],
      seen: user.signedInAt
        ? `ostatnio ${day.format(new Date(user.signedInAt))}`
        : user.invitedAt
          ? `zaproszenie wysłane ${day.format(new Date(user.invitedAt))}`
          : "jeszcze bez logowania",
      isMe: user.id === me,
      canGrant: !user.isAdmin,
      canRevoke: user.isAdmin && user.id !== me && admins > 1,
    }))
    .sort(
      (a, b) =>
        Number(b.isAdmin) - Number(a.isAdmin) ||
        Number(b.isMe) - Number(a.isMe) ||
        a.name.localeCompare(b.name, "pl"),
    );
}
