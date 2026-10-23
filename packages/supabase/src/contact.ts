import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";

// The contact form's messages (contact_messages): written only by the site's
// server, with the service-role client, through submit_contact_message,
// which also refuses a fourth message within an hour from one visitor or
// one address.

/** The database refused the message: too many from this sender just now. */
export class ContactRateLimitedError extends Error {
  constructor() {
    super("contact_rate_limited");
    this.name = "ContactRateLimitedError";
  }
}

export interface ContactMessageRecord {
  name: string;
  email: string;
  phone: string;
  message: string;
  /** A keyed hash of the sender's IP address (never the address itself). */
  senderKey: string;
}

/** Saves one message; returns its id. */
export async function submitContactMessage(
  client: SupabaseClient<Database>,
  message: ContactMessageRecord,
): Promise<string> {
  const { data, error } = await client.rpc("submit_contact_message", {
    p_name: message.name,
    p_email: message.email,
    p_phone: message.phone || null,
    p_message: message.message,
    p_sender_key: message.senderKey,
  });
  if (error) {
    if (error.message.includes("contact_rate_limited")) {
      throw new ContactRateLimitedError();
    }
    throw error;
  }
  return data;
}

/** Records that the centre was told about the message by e-mail. */
export async function markContactMessageNotified(
  client: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await client.rpc("mark_contact_message_notified", {
    p_id: id,
  });
  if (error) throw error;
}
