import {
  INTAKE_VERSION,
  intakeAnswersSchema,
  intakeOutcome,
  intakeSummary,
  type IntakeAnswers,
} from "@repo/contracts/intake";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bookingError } from "./booking";

// The questionnaire before a first consultation, kept (the site, with its
// secret client) as soon as it is given, under a random token the
// visitor's cookie holds; tied to the visit when its details are saved;
// read by the centre and the visit's specialist (row-level security).

type Client = SupabaseClient<Database>;

/** The token's SHA-256, as Postgres reads a bytea (`\x…`, hex). */
export async function intakeTokenHash(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `\\x${hex}`;
}

/** A new random token, URL-safe (24 random bytes). */
function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

/**
 * Keeps the answers; the token to tie them to the visit later. A crisis
 * (mood 0) is never kept for a booking: the site points to help instead.
 */
/** Too many questionnaires from one visitor lately (hint too_many_intakes). */
export class IntakeLimitError extends Error {
  override name = "IntakeLimitError";
}

export async function saveVisitIntake(
  client: Client,
  input: {
    serviceId: string;
    answers: IntakeAnswers;
    /** The visitor's key (an HMAC of their address): at most 5 in 15 min. */
    clientKey?: string | null;
  },
): Promise<string> {
  const {
    healthConsent: _consent,
    mood,
    ...answers
  } = intakeAnswersSchema.parse(input.answers);
  if (intakeOutcome(mood) === "crisis") {
    throw new Error("A crisis is not booked: point to help instead");
  }
  const token = newToken();
  const { error } = await client.from("visit_intakes").insert({
    token_hash: await intakeTokenHash(token),
    service_id: input.serviceId,
    version: INTAKE_VERSION,
    mood,
    answers,
    health_consent_at: new Date().toISOString(),
    client_key: input.clientKey ?? null,
  });
  if (error?.hint === "too_many_intakes") {
    throw new IntakeLimitError(error.message);
  }
  if (error) throw error;
  return token;
}

/**
 * Ties the intake to the held visit, where its service asks for one;
 * refused (`intake_required`) when it asks and there is none.
 */
export async function attachVisitIntake(
  client: Client,
  accessToken: string,
  intakeToken: string | null,
): Promise<boolean> {
  const { data, error } = await client.rpc("attach_visit_intake", {
    p_access_token: accessToken,
    p_intake_token: intakeToken ?? "",
  });
  if (error) throw bookingError(error);
  return Boolean(data);
}

/** The services that ask for the questionnaire, by their slug. */
export async function intakeServiceSlugs(client: Client) {
  const { data, error } = await client
    .from("services")
    .select("slug")
    .eq("requires_intake", true);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.slug));
}

export interface VisitIntake {
  mood: number;
  outcome: ReturnType<typeof intakeOutcome>;
  /** The answers as label and value, in the order asked. */
  rows: { label: string; value: string }[];
  givenAt: string;
}

/** A visit's answers, where this person may read them; else none. */
export async function getVisitIntake(
  client: Client,
  appointmentId: string,
): Promise<VisitIntake | null> {
  const { data, error } = await client
    .from("visit_intakes")
    .select("mood, version, answers, created_at")
    .eq("appointment_id", appointmentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const answers = data.answers as Omit<IntakeAnswers, "mood" | "healthConsent">;
  return {
    mood: data.mood,
    outcome: intakeOutcome(data.mood),
    rows: intakeSummary({ ...answers, mood: data.mood }),
    givenAt: data.created_at,
  };
}
