# Newsletter Domain

Visitors sign up on the site (the home page's band, the footer, under
every article, the archive, or a box when booking a visit), confirm by
e-mail (double opt-in) and get a welcome e-mail; the confirmed addresses
are copied to Resend. The owner writes each issue in the admin portal
(Newsletter → Wydania) and sends it from there, through Resend Broadcasts,
now or at a chosen time. Every issue links to the site's own unsubscribe
page (`/newsletter/wypisz`); one-click unsubscribing in the mail program
goes through Resend, which tells the site through a webhook. The portal also shows the list,
the consent each address gave, removes an address on request and exports
a CSV. Sent issues can be read on the site at `/newsletter`.

Out of scope for now: segments by interest (topics to choose), a name
field, a free e-book chapter for signing up.

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
- `unsubscribe_token`: the random code in the address's unsubscribe link,
  kept in Resend as the contact's `unsubscribe_token` property.
- `sender_key`: a keyed hash of the visitor's IP, for the limit of 5
  sign-ups an hour.

RLS is on and forced and nothing is granted to `anon`/`authenticated`;
everything goes through functions. The site's server (service role)
calls `request_newsletter_subscription`, `confirm_newsletter_subscription`,
the sync functions and `stop_newsletter_subscription`. Admins call
`list_newsletter_subscribers`, `get_newsletter_consent` and
`remove_newsletter_subscriber`, which check `private.require_admin()`.

## Signing up (apps/web `features/newsletter`)

The form (`NewsletterSignup`) is in the home page's newsletter band, the
footer, under every article and on `/newsletter` (`NewsletterSection`),
only while the CMS's `newsletter_band` is visible. Each records its
`source` (`home`, `footer`, `article`, `archive`). It has an e-mail, an
unticked consent checkbox, Turnstile and a honeypot. The answer is always
"check your inbox", so the form never tells who is on the list; a repeat
within 10 minutes sends nothing new.

The booking form's details step has an unticked "Chcę dostawać
newsletter" box (source `booking`): ticking it starts the same double
opt-in after the booking is saved, without Turnstile (the booking already
passed it).

The e-mail links to `/newsletter/potwierdz?token=…`; the page confirms
only on a button press (mail scanners open links). Confirming copies the
address to Resend at once and sends the welcome e-mail (once per address,
by an idempotency key).

## Issues: `newsletter_issues`

An issue has a subject, a preview line, an introduction and a closing
word (rich text), up to 12 cards and whether it shows in the archive.
A card is a published article, a published e-book (both shown as they are
published at send time) or an own card (title, text, link, button label)
for a workshop, an event or news.

- `status`: `draft` → `sending` (taken by one admin's send; nobody sends
  it twice) → `sent`. A sent issue whose `send_at` is ahead is
  _scheduled_: `unschedule_newsletter_issue` (after Resend cancels the
  broadcast) makes it a draft again. A failed send gives the draft back
  (`release_newsletter_issue`).
- `number` is given when Resend accepts the broadcast (the next after the
  highest), with `broadcast_id` and `recipients` (active addresses in
  Resend at that moment). The list shows how many unsubscribed between an
  issue and the next one.
- Only drafts can be edited or deleted; a sent issue only changes
  `in_archive`. Admin functions check `private.require_admin()`;
  `list_newsletter_archive` is public and returns sent issues kept in the
  archive whose time has come.

Sending: the portal's actions call the site's `/api/centrum/newsletter`
with the admin's token (the site checks the admin role). The site renders
the issue (`features/newsletter/issue-email.tsx`, React Email) and creates
the broadcast for `RESEND_NEWSLETTER_SEGMENT_ID` (required) from
`NEWSLETTER_FROM` (else `EMAIL_FROM`), its unsubscribe link
`/newsletter/wypisz?kod={{{contact.unsubscribe_token}}}` (Resend fills in
each contact's code; the sync runs just before, so every contact has it). "Wyślij test" sends the draft to the
admin's own address as an ordinary e-mail, without an unsubscribe link.

## Resend

- **Sync** (`/api/cron/newsletter`, pg_cron every 10 minutes, and right
  after a confirmation or an unsubscribe): active rows not yet copied are
  created or updated as contacts (added to `RESEND_NEWSLETTER_SEGMENT_ID`
  when set, with the `unsubscribe_token` property, which the sync defines
  in Resend the first time); rows unsubscribed on our page are marked
  unsubscribed there; `removing` rows are deleted there, then here.
- **Unsubscribe page** (`/newsletter/wypisz?kod=…`): names the address
  (masked) and takes it off the list on a button press (mail scanners open
  links): `unsubscribe_newsletter` stops it here at once, and the sync
  tells Resend.
- **Webhook** (`/api/resend/webhook`, signed with `RESEND_WEBHOOK_SECRET`):
  `contact.updated` with `unsubscribed`, `contact.deleted`, and for
  newsletter e-mails (a broadcast, or the `category=newsletter` tag)
  permanent `email.bounced` and `email.complained` stop the address.
  Handling an event twice changes nothing.
- The API key needs Full access (contacts). Broadcasts can later go from
  their own subdomain (`NEWSLETTER_FROM`), so the newsletter's reputation
  is kept apart from booking e-mails.

## Removing data

`remove_newsletter_subscriber` (admin) and `forget_client` (the client's
data, matched on the e-mail) remove the address: at once when Resend
cannot know it, else through `removing`. Nightly retention does not touch
the list: consent lasts until the person unsubscribes.
