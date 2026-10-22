import {
  NEWSLETTER_SEND_PROBLEMS,
  newsletterIssueProblems,
  type NewsletterIssue,
} from "@repo/contracts/newsletter-issue";
import type { RenderedNewsletterIssue } from "./issue-email";

// Sending an issue (kept apart from Next so it can be tested), as the
// admin who asked: the draft is checked and taken (nobody sends it twice),
// the list in Resend brought up to date, the issue rendered and handed to
// Resend as a broadcast to the newsletter's segment, now or at the chosen
// time; then it gets its number. Anything Resend refuses gives the draft
// back. A scheduled issue can be taken back: Resend cancels it first.

export type SendOutcome =
  | { ok: true; number: number; scheduled: boolean }
  | { ok: false; message: string };

export interface SendDeps {
  load: (id: string) => Promise<NewsletterIssue | null>;
  claim: (id: string, sendAt: string | null) => Promise<void>;
  /** The issue as it goes out, with its number (the next one). */
  render: (issue: NewsletterIssue) => Promise<RenderedNewsletterIssue>;
  /** Brings Resend's contacts up to date first (a failure is only logged). */
  sync: () => Promise<unknown>;
  broadcast: (
    issue: RenderedNewsletterIssue & { name: string },
    sendAt: string | null,
  ) => Promise<string>;
  finish: (id: string, broadcastId: string) => Promise<number>;
  release: (id: string) => Promise<void>;
  /** The segment the newsletter goes to; none: nothing can be sent. */
  segmentId: string | undefined;
  now?: () => Date;
}

/** A database refusal's code, if it is one this flow knows. */
export function sendProblem(error: unknown): string | null {
  const message =
    typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "";
  return NEWSLETTER_SEND_PROBLEMS[message] ?? null;
}

export async function sendNewsletterIssue(
  id: string,
  sendAt: string | null,
  deps: SendDeps,
): Promise<SendOutcome> {
  if (!deps.segmentId) {
    return {
      ok: false,
      message:
        "Brakuje segmentu newslettera w Resend (RESEND_NEWSLETTER_SEGMENT_ID). Dodaj go w ustawieniach strony i spróbuj ponownie.",
    };
  }
  const now = deps.now?.() ?? new Date();
  if (sendAt && new Date(sendAt) <= now) {
    return {
      ok: false,
      message: NEWSLETTER_SEND_PROBLEMS.newsletter_issue_time_past!,
    };
  }
  const issue = await deps.load(id);
  if (!issue) return { ok: false, message: "Nie ma takiego wydania." };
  const problems = newsletterIssueProblems(issue);
  if (problems.length) return { ok: false, message: problems.join(" ") };

  try {
    await deps.claim(id, sendAt);
  } catch (error) {
    const problem = sendProblem(error);
    if (problem) return { ok: false, message: problem };
    throw error;
  }

  try {
    await deps.sync().catch((error: unknown) => {
      console.error("[newsletter] bringing Resend up to date failed:", error);
    });
    const rendered = await deps.render(issue);
    const broadcastId = await deps.broadcast(
      { ...rendered, name: `Newsletter: ${issue.subject}` },
      sendAt,
    );
    const number = await deps.finish(id, broadcastId);
    return { ok: true, number, scheduled: sendAt !== null };
  } catch (error) {
    console.error(`[newsletter] sending issue ${id} failed:`, error);
    await deps.release(id).catch((releaseError: unknown) => {
      console.error(
        `[newsletter] giving issue ${id} back failed:`,
        releaseError,
      );
    });
    return {
      ok: false,
      message:
        "Resend nie przyjął wydania. Nic nie wyszło; spróbuj ponownie za chwilę.",
    };
  }
}

export interface CancelDeps {
  load: (id: string) => Promise<NewsletterIssue | null>;
  /** Resend stops the scheduled broadcast. */
  cancel: (broadcastId: string) => Promise<void>;
  unschedule: (id: string) => Promise<void>;
  now?: () => Date;
}

export async function cancelNewsletterIssue(
  id: string,
  deps: CancelDeps,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const issue = await deps.load(id);
  const now = deps.now?.() ?? new Date();
  if (
    !issue ||
    issue.status !== "sent" ||
    !issue.broadcastId ||
    !issue.sendAt ||
    new Date(issue.sendAt) <= now
  ) {
    return {
      ok: false,
      message: NEWSLETTER_SEND_PROBLEMS.newsletter_issue_not_scheduled!,
    };
  }
  try {
    await deps.cancel(issue.broadcastId);
  } catch (error) {
    console.error(`[newsletter] cancelling issue ${id} failed:`, error);
    return {
      ok: false,
      message:
        "Resend nie wycofał wydania. Spróbuj ponownie albo wycofaj je w panelu Resend.",
    };
  }
  try {
    await deps.unschedule(id);
  } catch (error) {
    const problem = sendProblem(error);
    if (problem) return { ok: false, message: problem };
    throw error;
  }
  return { ok: true };
}
