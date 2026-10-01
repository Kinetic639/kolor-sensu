-- The pay-later schedule (docs/product/booking-plan.md, R11) runs in the
-- database, on any hosting plan: pg_cron cancels the reservations not paid
-- in time every 5 minutes, and every 15 minutes asks the site (pg_net) to
-- send the e-mails due (/api/cron/platnosci; the templates and Resend live
-- there). The site's address and its CRON_SECRET come from Vault, set per
-- environment by hand (never in a migration):
--
--   select vault.create_secret('https://kolorsensu.pl', 'site_url');
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
--
-- Without them the e-mail call is skipped; cancelling works regardless.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Asks the site to send the e-mails due; the request id, or null when the
-- site's address or secret is not set.
CREATE FUNCTION private.request_payment_emails()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets WHERE name = 'site_url';
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'cron_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN net.http_get(
    url := rtrim(v_url, '/') || '/api/cron/platnosci',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 30000
  );
END;
$function$;
REVOKE ALL ON FUNCTION private.request_payment_emails() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'cancel-unpaid-visits',
  '*/5 * * * *',
  'SELECT private.cancel_overdue_payments()'
);
SELECT cron.schedule(
  'payment-emails',
  '*/15 * * * *',
  'SELECT private.request_payment_emails()'
);
