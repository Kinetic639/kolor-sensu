# Newsletter Domain

Stage 1 of the newsletter: visitors sign up on the site, confirm by e-mail
(double opt-in), and the confirmed addresses are copied to Resend, where
the owner writes and sends the newsletter (Broadcasts). Unsubscribing is
Resend's link in every message; Resend tells the site through a webhook.
The admin portal shows the list, the consent each address gave, removes
an address on request and exports a CSV.

Out of scope for now: writing the newsletter in our CMS, segments by
interest, a name field, sending from the site.

## The list: `newsletter_subscribers`

Our database is the record of consent; Resend is a copy for sending. One
row per address (lowercase, unique):

- `status`: `pending` (link sent) → `active` (confirmed) →
  `unsubscribed` (Resend reported an unsubscribe, a permanent bounce or a
  complaint; `stopped_at` and `stop_reason` say when and why). `removing`
  means the address is to be deleted in Resend, then here.
- `consent_text`, `consent_version`: the exact sentence shown beside the
  checkbox and its version (`NEWSLETTER_CONSENT_VERSION` in
  `@repo/contracts/newsletter`). Change the version whenever the words
  change.
- `token_hash`: SHA-256 of the link's token; the token itself is only in
  the e-mail. A link lasts 7 days; unconfirmed sign-ups are removed after
  7 days (`forget-stale-newsletter-signups`, hourly).
- `sender_key`: a keyed hash of the visitor's IP, for the limit of 5
  sign-ups an hour.

RLS is on and forced and nothing is granted to `anon`/`authenticated`;
everything goes through functions. The site's server (service role)
calls `request_newsletter_subscription`, `confirm_newsletter_subscription`,
the sync functions and `stop_newsletter_subscription`. Admins call
`list_newsletter_subscribers`, `get_newsletter_consent` and
`remove_newsletter_subscriber`, which check `private.require_admin()`.

## Signing up (apps/web `features/newsletter`)

The form (`NewsletterSignup`) is in the home page's newsletter band and in
the footer, only while the CMS's `newsletter_band` is visible. It has an
e-mail, an unticked consent checkbox, Turnstile and a honeypot. The answer
is always "check your inbox", so the form never tells who is on the list;
a repeat within 10 minutes sends nothing new.

The e-mail links to `/newsletter/potwierdz?token=…`; the page confirms
only on a button press (mail scanners open links). Confirming copies the
address to Resend at once.

## Resend

- **Sync** (`/api/cron/newsletter`, pg_cron every 10 minutes, and right
  after a confirmation): active rows not yet copied are created or updated
  as contacts (added to `RESEND_NEWSLETTER_SEGMENT_ID` when set);
  `removing` rows are deleted there, then here.
- **Webhook** (`/api/resend/webhook`, signed with `RESEND_WEBHOOK_SECRET`):
  `contact.updated` with `unsubscribed`, `contact.deleted`, and for
  newsletter e-mails (a broadcast, or the `category=newsletter` tag)
  permanent `email.bounced` and `email.complained` stop the address.
  Handling an event twice changes nothing.
- The API key needs Full access (contacts). Broadcasts are sent from the
  `wiadomosci.kolorsensu.pl` subdomain, so the newsletter's reputation is
  kept apart from booking e-mails.

## Removing data

`remove_newsletter_subscriber` (admin) and `forget_client` (the client's
data, matched on the e-mail) remove the address: at once when Resend
cannot know it, else through `removing`. Nightly retention does not touch
the list: consent lasts until the person unsubscribes.
