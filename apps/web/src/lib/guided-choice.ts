import type {
  GuidedAudience,
  GuidedConcern,
  GuidedSpecialist,
} from "@repo/ui/public-site";
import type { ClientGroup } from "@repo/contracts";
import type { SpecialistWithMedia } from "@/lib/public-data";
import {
  portraitPlaceholder,
  specialistHref,
  specialistRole,
} from "@/lib/presentation";

// The guided choice on the homepage matches its answers against what each
// specialist wrote in their profile: who they work with (client groups),
// their specializations (free text, read by keywords) and how they meet
// (modalities: "online" means they also meet online).

const audiences: Record<ClientGroup, GuidedAudience> = {
  adults: "self",
  couples: "couple",
  families: "couple",
  children: "child",
  teens: "child",
};

// Word stems, lower case, matched anywhere in a specialization.
const concernWords: Record<GuidedConcern, string[]> = {
  anxiety: ["lęk", "lek", "stres", "panik", "nerwic", "obsesj"],
  mood: ["depres", "nastr", "smut", "wypalen", "bezsenn"],
  relations: ["relac", "związ", "zwiaz", "komunik", "rodzin", "par", "rozst"],
  crisis: ["kryzys", "traum", "żałob", "zalob", "strat", "przemoc"],
  growth: ["rozw", "samopozn", "samoocen", "coach", "kariera"],
};

export function concernsOf(specializations: readonly string[]) {
  const text = specializations.join(" ").toLowerCase();
  return (Object.keys(concernWords) as GuidedConcern[]).filter((concern) =>
    concernWords[concern].some((word) => text.includes(word)),
  );
}

export function toGuidedSpecialist(
  specialist: SpecialistWithMedia,
): GuidedSpecialist {
  return {
    name: specialist.displayName,
    role: specialistRole(specialist),
    href: specialistHref(specialist.publicSlug),
    portraitSrc:
      specialist.portraitUrl ?? specialist.photoUrl ?? portraitPlaceholder,
    audiences: [
      ...new Set(specialist.clientGroups.map((group) => audiences[group])),
    ],
    concerns: concernsOf(specialist.specializations),
    online: specialist.modalities.some((modality) =>
      modality.toLowerCase().includes("online"),
    ),
  };
}
