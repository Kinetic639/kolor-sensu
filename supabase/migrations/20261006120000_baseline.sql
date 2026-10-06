-- The database as it stood on 2026-10-06 (106 migrations, 2026-09-19 to
-- 2026-10-06, folded into one; they are in the git history before this
-- commit). Made with `supabase db dump` from the first DEV project
-- (jawduzlwnicjfhlkipzi), plus what that dump leaves out: the account
-- trigger, storage buckets and their policies, the live channel's policy,
-- the scheduled jobs and the two rows the app starts from.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- New objects in public get every right for every role by Supabase's
-- default privileges; the migrations took them back one by one, which the
-- dump below does not repeat (it only grants what each object kept). So
-- nothing is granted by default while it runs; its end puts the defaults
-- back as they were.
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon", "authenticated", "service_role";


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'specialist'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."appointment_status" AS ENUM (
    'held',
    'awaiting_payment',
    'confirmed',
    'cancelled',
    'expired'
);


ALTER TYPE "public"."appointment_status" OWNER TO "postgres";


CREATE TYPE "public"."availability_mode" AS ENUM (
    'in_person',
    'online',
    'hybrid'
);


ALTER TYPE "public"."availability_mode" OWNER TO "postgres";


CREATE TYPE "public"."availability_recurrence" AS ENUM (
    'once',
    'weekly'
);


ALTER TYPE "public"."availability_recurrence" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'succeeded',
    'failed',
    'expired',
    'refunded',
    'partially_refunded'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."profile_publication_status" AS ENUM (
    'draft',
    'pending_review',
    'published',
    'rejected'
);


ALTER TYPE "public"."profile_publication_status" OWNER TO "postgres";


CREATE TYPE "public"."room_availability_exception_type" AS ENUM (
    'closed_all_day',
    'blocked_interval',
    'extra_available_interval'
);


ALTER TYPE "public"."room_availability_exception_type" OWNER TO "postgres";


CREATE TYPE "public"."service_category" AS ENUM (
    'consultation',
    'psychotherapy',
    'couples_therapy',
    'assessment',
    'workshop_related',
    'other'
);


ALTER TYPE "public"."service_category" OWNER TO "postgres";


CREATE TYPE "public"."visit_mode" AS ENUM (
    'in_person',
    'online'
);


ALTER TYPE "public"."visit_mode" OWNER TO "postgres";


CREATE TYPE "public"."visit_outcome" AS ENUM (
    'attended',
    'no_show'
);


ALTER TYPE "public"."visit_outcome" OWNER TO "postgres";


CREATE TYPE "public"."workshop_modality" AS ENUM (
    'in_person',
    'online'
);


ALTER TYPE "public"."workshop_modality" OWNER TO "postgres";


CREATE TYPE "public"."workshop_status" AS ENUM (
    'draft',
    'published',
    'cancelled',
    'completed'
);


ALTER TYPE "public"."workshop_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."apply_retention"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  client_id uuid;
BEGIN
  DELETE FROM public.visit_intakes
  WHERE id IN (SELECT private.intakes_past_keeping());
  FOR client_id IN SELECT private.clients_past_keeping() LOOP
    PERFORM private.forget_client_data(client_id);
  END LOOP;
END;
$$;


ALTER FUNCTION "private"."apply_retention"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."appointment_events_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM private.log_appointment_event(NEW.id, 'created',
      CASE WHEN NEW.booked_by = 'centre' THEN 'centre' ELSE 'client' END,
      jsonb_strip_nulls(jsonb_build_object(
        'reference', NEW.reference,
        'starts_at', lower(NEW.during), 'ends_at', upper(NEW.during),
        'mode', NEW.mode, 'price_minor', NEW.price_minor, 'currency_code', NEW.currency_code,
        'status', NEW.status, 'payment_due_at', NEW.payment_due_at
      )));
    RETURN NEW;
  END IF;

  IF OLD.terms_accepted_at IS NULL AND NEW.terms_accepted_at IS NOT NULL THEN
    PERFORM private.log_appointment_event(NEW.id, 'details_saved', 'client');
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'expired' THEN
      PERFORM private.log_appointment_event(NEW.id, 'hold_expired', 'system',
        jsonb_build_object('from', OLD.status));
    ELSIF NEW.status = 'cancelled' AND OLD.status = 'held' THEN
      PERFORM private.log_appointment_event(NEW.id, 'hold_released', 'client');
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM private.log_appointment_event(NEW.id, 'cancelled',
        CASE NEW.cancelled_by WHEN 'centre' THEN 'centre' WHEN 'system' THEN 'system' ELSE 'client' END,
        jsonb_strip_nulls(jsonb_build_object(
          'from', OLD.status, 'refund_due_minor', NEW.refund_due_minor,
          'reason', CASE WHEN NEW.cancelled_by = 'system' THEN 'unpaid'
                         WHEN NEW.cancelled_by = 'centre' THEN private.change_reason() END
        )));
    ELSIF NEW.status = 'awaiting_payment' AND OLD.status = 'held' AND NEW.payment_due_at IS NOT NULL THEN
      PERFORM private.log_appointment_event(NEW.id, 'reserved', 'client',
        jsonb_build_object('payment_due_at', NEW.payment_due_at));
    ELSIF NEW.status = 'awaiting_payment' THEN
      PERFORM private.log_appointment_event(NEW.id, 'awaiting_payment', 'payment');
    ELSIF NEW.status = 'confirmed' THEN
      PERFORM private.log_appointment_event(NEW.id, 'confirmed', 'payment',
        jsonb_build_object('from', OLD.status));
    END IF;
  END IF;

  IF (NEW.during IS DISTINCT FROM OLD.during
      OR NEW.room_id IS DISTINCT FROM OLD.room_id
      OR NEW.mode IS DISTINCT FROM OLD.mode)
     AND OLD.status = NEW.status
     AND NEW.status IN ('confirmed', 'awaiting_payment') THEN
    PERFORM private.log_appointment_event(NEW.id, 'rescheduled',
      CASE WHEN NEW.reschedule_count > OLD.reschedule_count THEN 'client' ELSE 'centre' END,
      jsonb_strip_nulls(jsonb_build_object(
        'from_starts_at', lower(OLD.during), 'from_ends_at', upper(OLD.during),
        'to_starts_at', lower(NEW.during), 'to_ends_at', upper(NEW.during),
        'reason', CASE WHEN NEW.reschedule_count = OLD.reschedule_count THEN private.change_reason() END
      )));
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."appointment_events_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."appointment_is_live"("p_status" "public"."appointment_status", "p_hold_expires_at" timestamp with time zone, "p_payment_due_at" timestamp with time zone) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT p_status = 'confirmed'
    OR (p_status = 'awaiting_payment' AND (p_payment_due_at IS NULL OR p_payment_due_at > now()))
    OR (p_status = 'held' AND p_hold_expires_at > now());
$$;


ALTER FUNCTION "private"."appointment_is_live"("p_status" "public"."appointment_status", "p_hold_expires_at" timestamp with time zone, "p_payment_due_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."availability_clash"("p_ignore_id" "uuid", "p_specialist_id" "uuid", "p_room_id" "uuid", "p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_interval" smallint, "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_valid_until" "date") RETURNS TABLE("kind" "text", "specialist_id" "uuid", "day" "date", "starts_at" time without time zone, "ends_at" time without time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT
    CASE WHEN rule.specialist_id = p_specialist_id THEN 'overlap' ELSE 'room_taken' END,
    rule.specialist_id,
    clash.day,
    rule.starts_at,
    rule.ends_at
  FROM public.specialist_availability_rules AS rule
  CROSS JOIN LATERAL (
    SELECT
      greatest(rule.valid_from, p_valid_from) AS first_day,
      least(
        coalesce(rule.valid_until, 'infinity'::date),
        coalesce(p_valid_until, 'infinity'::date),
        greatest(rule.valid_from, p_valid_from) + 1095
      ) AS last_day
  ) AS period
  CROSS JOIN LATERAL (
    SELECT candidate.day
    FROM generate_series(0, period.last_day - period.first_day) AS offset_days(n)
    CROSS JOIN LATERAL (SELECT period.first_day + offset_days.n AS day) AS candidate
    WHERE private.availability_pattern_on(
        rule.recurrence, rule.weekdays, rule.interval_weeks,
        rule.valid_from, rule.valid_until, candidate.day
      )
      AND private.availability_pattern_on(
        p_recurrence, p_weekdays, p_interval, p_valid_from, p_valid_until, candidate.day
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.specialist_availability_exceptions AS exception
        WHERE exception.date = candidate.day
          AND exception.rule_id IN (rule.id, p_ignore_id)
      )
    ORDER BY candidate.day
    LIMIT 1
  ) AS clash
  WHERE rule.id IS DISTINCT FROM p_ignore_id
    AND (
      rule.specialist_id = p_specialist_id
      OR (p_room_id IS NOT NULL AND rule.room_id = p_room_id)
    )
    AND rule.weekdays && p_weekdays
    AND rule.starts_at < p_ends_at
    AND p_starts_at < rule.ends_at
    AND period.first_day <= period.last_day
  ORDER BY (rule.specialist_id = p_specialist_id) DESC, clash.day
  LIMIT 1;
$$;


ALTER FUNCTION "private"."availability_clash"("p_ignore_id" "uuid", "p_specialist_id" "uuid", "p_room_id" "uuid", "p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_interval" smallint, "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_valid_until" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."availability_conflict"("p_ignore_id" "uuid", "p_specialist_id" "uuid", "p_room_id" "uuid", "p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_interval" smallint, "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_valid_until" "date") RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT clash.kind
  FROM private.availability_clash(
    p_ignore_id, p_specialist_id, p_room_id, p_recurrence, p_weekdays,
    p_interval, p_starts_at, p_ends_at, p_valid_from, p_valid_until
  ) AS clash;
$$;


ALTER FUNCTION "private"."availability_conflict"("p_ignore_id" "uuid", "p_specialist_id" "uuid", "p_room_id" "uuid", "p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_interval" smallint, "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_valid_until" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."availability_nth_date"("p_weekdays" smallint[], "p_interval" smallint, "p_valid_from" "date", "p_count" integer) RETURNS "date"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
DECLARE
  day date := p_valid_from;
  found integer := 0;
BEGIN
  -- At most 200 occurrences, one a month in the sparsest pattern.
  FOR i IN 0..(200 * 28) LOOP
    IF private.availability_pattern_on('weekly', p_weekdays, p_interval, p_valid_from, NULL, day) THEN
      found := found + 1;
      IF found = p_count THEN
        RETURN day;
      END IF;
    END IF;
    day := day + 1;
  END LOOP;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "private"."availability_nth_date"("p_weekdays" smallint[], "p_interval" smallint, "p_valid_from" "date", "p_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."availability_pattern_on"("p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_interval" smallint, "p_valid_from" "date", "p_valid_until" "date", "p_date" "date") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  SELECT extract(isodow FROM p_date)::smallint = ANY (p_weekdays)
    AND p_date >= p_valid_from
    AND (p_valid_until IS NULL OR p_date <= p_valid_until)
    AND (
      p_recurrence = 'once'
      OR (
        (
          (p_date - (extract(isodow FROM p_date)::integer - 1))
          - (p_valid_from - (extract(isodow FROM p_valid_from)::integer - 1))
        ) / 7
      ) % p_interval = 0
    );
$$;


ALTER FUNCTION "private"."availability_pattern_on"("p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_interval" smallint, "p_valid_from" "date", "p_valid_until" "date", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."availability_rule_on"("p_rule_id" "uuid", "p_date" "date") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.specialist_availability_rules AS rule
    WHERE rule.id = p_rule_id
      AND private.availability_pattern_on(
        rule.recurrence, rule.weekdays, rule.interval_weeks,
        rule.valid_from, rule.valid_until, p_date
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.specialist_availability_exceptions AS exception
        WHERE exception.rule_id = rule.id AND exception.date = p_date
      )
  );
$$;


ALTER FUNCTION "private"."availability_rule_on"("p_rule_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."bookable_offer"("p_service_slug" "text", "p_specialist_slug" "text", "p_mode" "public"."visit_mode") RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT offer.id
  FROM public.specialist_services AS offer
  JOIN public.services AS service ON service.id = offer.service_id
  JOIN public.specialists AS specialist ON specialist.id = offer.specialist_id
  WHERE offer.id IN (SELECT private.bookable_offers())
    AND service.slug = p_service_slug
    AND specialist.public_slug = p_specialist_slug
    AND CASE p_mode
      WHEN 'online' THEN offer.supports_online
      ELSE offer.supports_in_person
    END;
$$;


ALTER FUNCTION "private"."bookable_offer"("p_service_slug" "text", "p_specialist_slug" "text", "p_mode" "public"."visit_mode") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."bookable_offers"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT offer.id
  FROM public.specialist_services AS offer
  JOIN public.services AS service ON service.id = offer.service_id
  JOIN public.specialists AS specialist ON specialist.id = offer.specialist_id
  JOIN public.profiles AS account ON account.id = specialist.user_id
  JOIN public.specialist_public_profiles AS profile ON profile.specialist_id = specialist.id
  JOIN public.center_settings AS centre ON centre.id = 1
  WHERE centre.booking_enabled
    AND service.active AND service.publicly_visible AND service.booking_enabled
    AND offer.active
    AND (offer.supports_in_person OR offer.supports_online)
    AND specialist.active AND specialist.publicly_visible AND account.active
    AND profile.publication_status = 'published';
$$;


ALTER FUNCTION "private"."bookable_offers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."broadcast_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'id', NEW.id, 'portal', NEW.portal, 'kind', NEW.kind, 'actor', NEW.actor,
      'appointment_id', NEW.appointment_id, 'details', NEW.details,
      'created_at', NEW.created_at
    ),
    'notification',
    'user:' || NEW.user_id::text,
    true
  );
  RETURN NULL;
END;
$$;


ALTER FUNCTION "private"."broadcast_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."broadcast_payment_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object('appointment_id', NEW.appointment_id),
    'visits',
    'user:' || admin.user_id::text,
    true
  )
  FROM (SELECT DISTINCT role.user_id FROM public.user_roles AS role
        WHERE role.role = 'admin') AS admin;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "private"."broadcast_payment_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."broadcast_profile_draft_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_draft public.specialist_profile_drafts%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_draft := OLD;
  ELSE
    v_draft := NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NULL;
  END IF;

  PERFORM realtime.send(
    jsonb_build_object('draft_id', v_draft.id),
    'visits',
    'user:' || recipient.user_id::text,
    true
  )
  FROM (
    SELECT role.user_id FROM public.user_roles AS role WHERE role.role = 'admin'
    UNION
    SELECT specialist.user_id FROM public.specialists AS specialist
    WHERE specialist.id = v_draft.specialist_id AND specialist.user_id IS NOT NULL
  ) AS recipient;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "private"."broadcast_profile_draft_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."broadcast_visit_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT (
    NEW.status IN ('awaiting_payment', 'confirmed', 'cancelled')
    OR (TG_OP = 'UPDATE' AND OLD.status IN ('awaiting_payment', 'confirmed', 'cancelled'))
  ) THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.status, NEW.during, NEW.mode, NEW.room_id, NEW.payment_due_at,
    NEW.refund_due_minor, NEW.client_name, NEW.client_email, NEW.client_phone,
    NEW.client_notes
  ) IS NOT DISTINCT FROM (
    OLD.status, OLD.during, OLD.mode, OLD.room_id, OLD.payment_due_at,
    OLD.refund_due_minor, OLD.client_name, OLD.client_email, OLD.client_phone,
    OLD.client_notes
  ) THEN
    RETURN NULL;
  END IF;

  PERFORM realtime.send(
    jsonb_build_object('appointment_id', NEW.id),
    'visits',
    'user:' || recipient.user_id::text,
    true
  )
  FROM (
    SELECT role.user_id FROM public.user_roles AS role WHERE role.role = 'admin'
    UNION
    SELECT specialist.user_id FROM public.specialists AS specialist
    WHERE specialist.id = NEW.specialist_id AND specialist.user_id IS NOT NULL
  ) AS recipient;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "private"."broadcast_visit_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_manage_specialist_media"("object_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.specialists
    WHERE id::text = split_part(object_name, '/', 1)
      AND (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      )
  );
$$;


ALTER FUNCTION "private"."can_manage_specialist_media"("object_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_read_published_specialist_media"("object_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.specialist_public_profiles AS profile
    JOIN public.specialists AS specialist ON specialist.id = profile.specialist_id
    WHERE specialist.publicly_visible
      AND profile.publication_status = 'published'
      AND object_name IN (profile.profile_photo_url, profile.portrait_photo_url)
  );
$$;


ALTER FUNCTION "private"."can_read_published_specialist_media"("object_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."cancel_overdue_payments"() RETURNS SETOF "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  UPDATE public.appointments AS visit
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'system',
      refund_due_minor = 0
  WHERE visit.status = 'awaiting_payment'
    AND visit.payment_due_at <= now()
    AND NOT EXISTS (
      SELECT 1 FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id AND payment.status = 'pending'
    )
  RETURNING visit.reference;
$$;


ALTER FUNCTION "private"."cancel_overdue_payments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."centre_closed_on"("p_day" "date") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.centre_closures AS closure
    WHERE p_day BETWEEN closure.starts_on AND closure.ends_on
  );
$$;


ALTER FUNCTION "private"."centre_closed_on"("p_day" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."change_reason"() RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT nullif(current_setting('kolor.change_reason', true), '');
$$;


ALTER FUNCTION "private"."change_reason"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."client_has_open_business"("p_client" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments AS visit
    WHERE visit.client_id = p_client
      AND (
        (private.appointment_is_live(visit.status, visit.hold_expires_at, visit.payment_due_at)
          AND upper(visit.during) > now())
        OR coalesce(visit.refund_due_minor, 0) > 0
      )
  );
$$;


ALTER FUNCTION "private"."client_has_open_business"("p_client" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."client_totals"() RETURNS TABLE("client_id" "uuid", "visits" integer, "upcoming" integer, "cancelled" integer, "last_visit_at" timestamp with time zone, "next_visit_at" timestamp with time zone, "paid_minor" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT visit.client_id,
    count(*) FILTER (WHERE visit.status IN ('confirmed', 'awaiting_payment'))::integer,
    count(*) FILTER (WHERE visit.status IN ('confirmed', 'awaiting_payment')
                       AND lower(visit.during) > now())::integer,
    count(*) FILTER (WHERE visit.status = 'cancelled')::integer,
    max(lower(visit.during)) FILTER (WHERE visit.status = 'confirmed'
                                       AND lower(visit.during) <= now()),
    min(lower(visit.during)) FILTER (WHERE visit.status IN ('confirmed', 'awaiting_payment')
                                       AND lower(visit.during) > now()),
    coalesce(sum((
      SELECT sum(payment.amount_minor - payment.refunded_minor)
      FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
        AND payment.status IN ('succeeded', 'partially_refunded', 'refunded')
    )), 0)::integer
  FROM public.appointments AS visit
  WHERE visit.client_id IS NOT NULL
  GROUP BY visit.client_id;
$$;


ALTER FUNCTION "private"."client_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."clients_past_keeping"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT client.id
  FROM public.clients AS client
  CROSS JOIN public.center_settings AS settings
  WHERE settings.id = 1
    AND settings.client_retention_years IS NOT NULL
    AND client.forgotten_at IS NULL
    AND client.created_at < now() - make_interval(years => settings.client_retention_years)
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments AS visit
      WHERE visit.client_id = client.id
        AND upper(visit.during) >= now() - make_interval(years => settings.client_retention_years)
    )
    AND NOT private.client_has_open_business(client.id);
$$;


ALTER FUNCTION "private"."clients_past_keeping"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."closure_state"("p_status" "public"."appointment_status", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_outcome" "public"."visit_outcome") RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT CASE
    WHEN p_outcome IS NOT NULL THEN p_outcome::text
    WHEN p_status = 'confirmed' AND p_starts_at <= now()
      AND p_ends_at > now() - interval '30 days' THEN 'open'
    ELSE NULL
  END;
$$;


ALTER FUNCTION "private"."closure_state"("p_status" "public"."appointment_status", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_outcome" "public"."visit_outcome") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."email_events_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.sent_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.sent_at IS NULL) THEN
    PERFORM private.log_appointment_event(NEW.appointment_id, 'email_sent', 'system',
      jsonb_build_object('email', NEW.kind));
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."email_events_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."forget_client_data"("p_client" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  placeholder text := 'usuniety-' || left(replace(p_client::text, '-', ''), 12) || '@anonim.invalid';
BEGIN
  UPDATE public.clients
  SET name = 'Klient usunięty',
    email = placeholder,
    phone = NULL,
    notes = NULL,
    forgotten_at = now()
  WHERE id = p_client;

  UPDATE public.notifications AS notification
  SET details = notification.details || jsonb_build_object('client_name', 'Klient usunięty')
  WHERE notification.details ? 'client_name'
    AND notification.appointment_id IN (
      SELECT id FROM public.appointments WHERE client_id = p_client
    );

  DELETE FROM public.visit_intakes
  WHERE appointment_id IN (SELECT id FROM public.appointments WHERE client_id = p_client);

  UPDATE public.visit_closures SET note = NULL
  WHERE appointment_id IN (SELECT id FROM public.appointments WHERE client_id = p_client);

  UPDATE public.appointments
  SET client_name = 'Klient usunięty',
    client_email = placeholder,
    client_phone = NULL,
    client_notes = NULL
  WHERE client_id = p_client;
END;
$$;


ALTER FUNCTION "private"."forget_client_data"("p_client" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."forget_untied_intakes"() RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  WITH gone AS (
    DELETE FROM public.visit_intakes
    WHERE appointment_id IS NULL AND created_at < now() - interval '1 day'
    RETURNING 1
  )
  SELECT count(*)::integer FROM gone;
$$;


ALTER FUNCTION "private"."forget_untied_intakes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."free_slots"("p_offer_id" "uuid", "p_mode" "public"."visit_mode", "p_from" "date", "p_to" "date", "p_location_id" "uuid" DEFAULT NULL::"uuid", "p_ignore_appointment" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "rule_id" "uuid", "room_id" "uuid")
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  WITH settings AS (
    SELECT timezone AS tz,
      slot_step_minutes AS step,
      min_booking_lead_minutes AS lead,
      max_booking_horizon_days AS horizon
    FROM public.center_settings
    WHERE id = 1
  ),
  offer AS (
    SELECT o.specialist_id,
      s.default_duration_minutes AS duration,
      s.after_minutes AS after
    FROM public.specialist_services AS o
    JOIN public.services AS s ON s.id = o.service_id
    WHERE o.id = p_offer_id
  ),
  windows AS (
    SELECT r.id AS rule_id, r.room_id AS window_room, d::date AS day,
      r.starts_at AS window_start, r.ends_at AS window_end
    FROM offer
    JOIN public.specialist_availability_rules AS r ON r.specialist_id = offer.specialist_id
    CROSS JOIN generate_series(p_from, p_to, interval '1 day') AS d
    LEFT JOIN public.rooms AS room ON room.id = r.room_id
    LEFT JOIN public.locations AS location ON location.id = room.location_id
    WHERE private.availability_rule_on(r.id, d::date)
      AND NOT private.centre_closed_on(d::date)
      AND CASE p_mode
        WHEN 'online' THEN r.mode IN ('online', 'hybrid')
        ELSE r.mode IN ('in_person', 'hybrid')
      END
      AND (
        r.room_id IS NULL
        OR (
          room.active AND location.active
          AND NOT EXISTS (
            SELECT 1 FROM public.room_availability_exceptions AS closed
            WHERE closed.room_id = r.room_id
              AND closed.date = d::date
              AND closed.type = 'closed_all_day'
          )
        )
      )
      AND (p_mode = 'online' OR p_location_id IS NULL OR room.location_id = p_location_id)
  ),
  candidates AS (
    SELECT w.rule_id, w.window_room, w.day,
      ((w.day + make_interval(mins => m)) AT TIME ZONE settings.tz) AS slot_start,
      ((w.day + make_interval(mins => m + offer.duration)) AT TIME ZONE settings.tz) AS slot_end,
      ((w.day + make_interval(mins => m + offer.duration + offer.after)) AT TIME ZONE settings.tz) AS slot_held
    FROM windows AS w
    CROSS JOIN settings
    CROSS JOIN offer
    CROSS JOIN generate_series(
      (ceil(extract(epoch FROM w.window_start) / 60 / settings.step) * settings.step)::integer,
      (extract(epoch FROM w.window_end) / 60)::integer - offer.duration - offer.after,
      settings.step
    ) AS m
  )
  SELECT c.slot_start, c.slot_end, c.rule_id,
    CASE WHEN p_mode = 'in_person' THEN c.window_room END
  FROM candidates AS c
  CROSS JOIN settings
  CROSS JOIN offer
  WHERE c.slot_start >= now() + make_interval(mins => settings.lead)
    AND c.slot_start <= now() + make_interval(days => settings.horizon)
    AND NOT EXISTS (
      SELECT 1 FROM public.specialist_time_off AS off
      WHERE off.specialist_id = offer.specialist_id
        AND off.during && tstzrange(c.slot_start, c.slot_held)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.room_availability_exceptions AS blocked
      WHERE blocked.room_id = c.window_room
        AND blocked.date = c.day
        AND blocked.type = 'blocked_interval'
        AND tstzrange(
          (blocked.date + blocked.starts_at) AT TIME ZONE settings.tz,
          (blocked.date + blocked.ends_at) AT TIME ZONE settings.tz
        ) && tstzrange(c.slot_start, c.slot_held)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments AS visit
      WHERE visit.specialist_id = offer.specialist_id
        AND visit.id IS DISTINCT FROM p_ignore_appointment
        AND private.appointment_is_live(visit.status, visit.hold_expires_at, visit.payment_due_at)
        AND visit.blocks && tstzrange(c.slot_start, c.slot_held)
    )
    AND (
      p_mode = 'online'
      OR NOT EXISTS (
        SELECT 1 FROM public.appointments AS visit
        WHERE visit.room_id = c.window_room
          AND visit.id IS DISTINCT FROM p_ignore_appointment
          AND private.appointment_is_live(visit.status, visit.hold_expires_at, visit.payment_due_at)
          AND visit.blocks && tstzrange(c.slot_start, c.slot_held)
      )
    );
$$;


ALTER FUNCTION "private"."free_slots"("p_offer_id" "uuid", "p_mode" "public"."visit_mode", "p_from" "date", "p_to" "date", "p_location_id" "uuid", "p_ignore_appointment" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."grid_down"("p_time" time without time zone, "p_step" integer) RETURNS time without time zone
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  SELECT time '00:00' + make_interval(
    mins => (floor(extract(epoch FROM p_time) / 60 / p_step) * p_step)::integer
  );
$$;


ALTER FUNCTION "private"."grid_down"("p_time" time without time zone, "p_step" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."grid_up"("p_time" time without time zone, "p_step" integer) RETURNS time without time zone
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  SELECT time '00:00' + make_interval(
    mins => (ceil(extract(epoch FROM p_time) / 60 / p_step) * p_step)::integer
  );
$$;


ALTER FUNCTION "private"."grid_up"("p_time" time without time zone, "p_step" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."handle_specialist_role_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  created_specialist_id uuid;
BEGIN
  IF NEW.role <> 'specialist' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.specialists (user_id, public_slug)
  VALUES (
    NEW.user_id,
    'specialist-' || replace(NEW.user_id::text, '-', '')
  )
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO created_specialist_id;

  IF created_specialist_id IS NULL THEN
    SELECT id INTO created_specialist_id
    FROM public.specialists
    WHERE user_id = NEW.user_id;
  END IF;

  INSERT INTO public.specialist_public_profiles (
    specialist_id, first_name, last_name, display_name
  )
  SELECT
    created_specialist_id,
    trim(profile.first_name),
    trim(profile.last_name),
    trim(concat_ws(' ', trim(profile.first_name), trim(profile.last_name)))
  FROM public.profiles AS profile
  WHERE profile.id = NEW.user_id
  ON CONFLICT (specialist_id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."handle_specialist_role_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."intakes_past_keeping"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT intake.id
  FROM public.visit_intakes AS intake
  JOIN public.appointments AS visit ON visit.id = intake.appointment_id
  CROSS JOIN public.center_settings AS settings
  WHERE settings.id = 1
    AND upper(visit.during) < now() - make_interval(months => settings.intake_retention_months);
$$;


ALTER FUNCTION "private"."intakes_past_keeping"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_weekday_set"("p_days" smallint[]) RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  SELECT cardinality(p_days) BETWEEN 1 AND 7
    AND p_days <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[]
    AND p_days = ARRAY(SELECT DISTINCT day FROM unnest(p_days) AS day ORDER BY day);
$$;


ALTER FUNCTION "private"."is_weekday_set"("p_days" smallint[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."limit_intakes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.client_key IS NOT NULL AND (
    SELECT count(*) FROM public.visit_intakes AS intake
    WHERE intake.client_key = NEW.client_key
      AND intake.created_at > now() - interval '15 minutes'
  ) >= 5 THEN
    RAISE EXCEPTION 'Too many questionnaires, try again later'
      USING ERRCODE = 'P0001', HINT = 'too_many_intakes';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."limit_intakes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."link_appointment_client"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.client_email IS NULL OR NOT private.shown_as_visit(NEW) THEN
    RETURN NEW;
  END IF;
  IF NEW.client_id IS NOT NULL AND TG_OP = 'UPDATE'
     AND lower(btrim(NEW.client_email)) = lower(btrim(OLD.client_email)) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.clients AS client (email, name, phone)
  VALUES (
    btrim(NEW.client_email),
    coalesce(nullif(btrim(NEW.client_name), ''), btrim(NEW.client_email)),
    nullif(btrim(NEW.client_phone), '')
  )
  ON CONFLICT (email_key) DO UPDATE
  SET phone = coalesce(client.phone, EXCLUDED.phone)
  RETURNING client.id INTO NEW.client_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."link_appointment_client"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."log_appointment_event"("p_appointment_id" "uuid", "p_kind" "text", "p_actor" "text", "p_details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  INSERT INTO public.appointment_events (appointment_id, kind, actor, actor_user_id, details)
  VALUES (p_appointment_id, p_kind, p_actor, (SELECT auth.uid()), p_details);
$$;


ALTER FUNCTION "private"."log_appointment_event"("p_appointment_id" "uuid", "p_kind" "text", "p_actor" "text", "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."managed_rule_owner"("p_rule_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT specialist_id INTO owner_id
  FROM public.specialist_availability_rules
  WHERE id = p_rule_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Availability window not found' USING ERRCODE = 'P0002';
  END IF;
  BEGIN
    PERFORM private.managed_specialist_id(owner_id);
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE EXCEPTION 'Availability window not found' USING ERRCODE = 'P0002';
  END;
  RETURN owner_id;
END;
$$;


ALTER FUNCTION "private"."managed_rule_owner"("p_rule_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."managed_specialist_id"("p_specialist_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  own_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT specialists.id INTO own_id
  FROM public.specialists
  JOIN public.user_roles
    ON user_roles.user_id = specialists.user_id AND user_roles.role = 'specialist'
  WHERE specialists.user_id = auth.uid();

  IF p_specialist_id IS NULL OR p_specialist_id = own_id THEN
    IF own_id IS NULL THEN
      RAISE EXCEPTION 'Specialist role required' USING ERRCODE = '42501';
    END IF;
    RETURN own_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not allowed to manage this specialist' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.specialists WHERE id = p_specialist_id) THEN
    RAISE EXCEPTION 'Specialist not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN p_specialist_id;
END;
$$;


ALTER FUNCTION "private"."managed_specialist_id"("p_specialist_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."may_close_visit"("p_visit" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT public.has_role('admin') OR EXISTS (
    SELECT 1 FROM public.appointments AS visit
    JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
    WHERE visit.id = p_visit AND specialist.user_id = (SELECT auth.uid())
  );
$$;


ALTER FUNCTION "private"."may_close_visit"("p_visit" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."next_booking_reference"("p_at" timestamp with time zone, "p_time_zone" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_month text := to_char(p_at AT TIME ZONE p_time_zone, 'YYMM');
  v_number integer;
BEGIN
  INSERT INTO private.booking_reference_counters AS counter (month, last)
  VALUES (v_month, 1)
  ON CONFLICT (month) DO UPDATE SET last = counter.last + 1
  RETURNING counter.last INTO v_number;
  RETURN v_month || '-' || lpad(v_number::text, 3, '0');
END;
$$;


ALTER FUNCTION "private"."next_booking_reference"("p_at" timestamp with time zone, "p_time_zone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_profile_reviewed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF OLD.status <> 'pending_review'
     OR NEW.status NOT IN ('published', 'rejected') THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
  SELECT specialist.user_id, 'specialist', NULL,
    CASE NEW.status WHEN 'published' THEN 'profile_approved' ELSE 'profile_rejected' END,
    'centre',
    jsonb_strip_nulls(jsonb_build_object(
      'specialist_id', NEW.specialist_id,
      'reason', CASE WHEN NEW.status = 'rejected'
        THEN nullif(btrim(NEW.review_comment), '') END
    ))
  FROM public.specialists AS specialist
  WHERE specialist.id = NEW.specialist_id
    AND specialist.user_id IS NOT NULL
    AND specialist.user_id IS DISTINCT FROM NEW.reviewed_by;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "private"."notify_profile_reviewed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_profile_submitted"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Only when it comes to wait for review (sent, or sent again).
  IF NEW.status <> 'pending_review'
     OR (TG_OP = 'UPDATE' AND OLD.status = 'pending_review') THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
  SELECT admin.user_id, 'admin', NULL, 'profile_submitted', 'specialist',
    jsonb_build_object(
      'specialist_id', NEW.specialist_id,
      'specialist_name', coalesce(
        nullif(btrim(NEW.display_name), ''),
        nullif(btrim(concat_ws(' ', NEW.first_name, NEW.last_name)), ''),
        'Specjalista'
      )
    )
  FROM (SELECT DISTINCT role.user_id FROM public.user_roles AS role
        WHERE role.role = 'admin') AS admin
  -- Never the person who sent it.
  WHERE admin.user_id IS DISTINCT FROM NEW.submitted_by;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "private"."notify_profile_submitted"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_visit_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_kind text;
  v_visit public.appointments%ROWTYPE;
  v_about jsonb;
  v_money jsonb;
BEGIN
  SELECT * INTO v_visit FROM public.appointments WHERE id = NEW.appointment_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_kind := CASE
    -- Paid: a reservation (the client's or the centre's), or a new visit.
    WHEN NEW.kind = 'confirmed' AND (
      v_visit.booked_by = 'centre' OR EXISTS (
        SELECT 1 FROM public.appointment_events AS event
        WHERE event.appointment_id = v_visit.id AND event.kind = 'reserved'
      )
    ) THEN 'paid'
    WHEN NEW.kind = 'confirmed' THEN 'booked'
    WHEN NEW.kind = 'reserved' THEN 'reserved'
    WHEN NEW.kind = 'created' AND NEW.actor = 'centre' THEN 'centre_booked'
    WHEN NEW.kind = 'cancelled' THEN 'cancelled'
    WHEN NEW.kind = 'rescheduled' THEN 'rescheduled'
    WHEN NEW.kind = 'refund_issued' THEN 'refunded'
  END;
  IF v_kind IS NULL THEN
    RETURN NULL;
  END IF;

  v_about := jsonb_strip_nulls(jsonb_build_object(
    'reference', v_visit.reference,
    'starts_at', lower(v_visit.during),
    'mode', v_visit.mode,
    'client_name', v_visit.client_name,
    'service_name', (SELECT service.name FROM public.services AS service
                     WHERE service.id = v_visit.service_id),
    'specialist_name', (SELECT profile.display_name
                        FROM public.specialist_public_profiles AS profile
                        WHERE profile.specialist_id = v_visit.specialist_id),
    'from_starts_at', NEW.details -> 'from_starts_at',
    'reason', NEW.details -> 'reason'
  ));
  v_money := jsonb_strip_nulls(jsonb_build_object(
    'refund_minor', NEW.details -> 'refund_minor',
    'refund_due_minor', NEW.details -> 'refund_due_minor',
    'price_minor', v_visit.price_minor,
    'currency_code', v_visit.currency_code
  ));

  INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
  SELECT admin.user_id, 'admin', v_visit.id, v_kind, NEW.actor, v_about || v_money
  FROM (SELECT DISTINCT role.user_id FROM public.user_roles AS role
        WHERE role.role = 'admin') AS admin
  WHERE admin.user_id IS DISTINCT FROM NEW.actor_user_id;

  -- The specialist: their visits, without the money.
  IF v_kind <> 'refunded' THEN
    INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
    SELECT specialist.user_id, 'specialist', v_visit.id, v_kind, NEW.actor, v_about
    FROM public.specialists AS specialist
    WHERE specialist.id = v_visit.specialist_id
      AND specialist.user_id IS NOT NULL
      AND specialist.user_id IS DISTINCT FROM NEW.actor_user_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "private"."notify_visit_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_visits_to_close"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
  SELECT specialist.user_id, 'specialist', visit.id, 'visit_to_close', 'system',
    jsonb_build_object(
      'reference', visit.reference,
      'service_name', service.name,
      'starts_at', lower(visit.during),
      'mode', visit.mode
    )
  FROM public.appointments AS visit
  JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
  JOIN public.services AS service ON service.id = visit.service_id
  WHERE visit.status = 'confirmed'
    AND upper(visit.during) <= now()
    AND upper(visit.during) > now() - interval '1 day'
    AND NOT EXISTS (SELECT 1 FROM public.visit_closures WHERE appointment_id = visit.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications AS sent
      WHERE sent.appointment_id = visit.id AND sent.kind = 'visit_to_close'
    );
END;
$$;


ALTER FUNCTION "private"."notify_visits_to_close"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."on_grid"("p_time" time without time zone, "p_step" integer) RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  SELECT (extract(epoch FROM p_time) / 60)::integer % p_step = 0;
$$;


ALTER FUNCTION "private"."on_grid"("p_time" time without time zone, "p_step" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."open_settlements"() RETURNS TABLE("appointment_id" "uuid", "payment_id" "uuid", "kind" "text", "owed_minor" integer, "last_change_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT visit.id, payment.id, owed.kind, owed.minor,
    greatest(
      visit.cancelled_at,
      payment.updated_at,
      (SELECT max(event.occurred_at) FROM public.appointment_events AS event
       WHERE event.appointment_id = visit.id AND event.kind = 'refund_issued')
    )
  FROM public.appointments AS visit
  JOIN LATERAL (
    SELECT p.* FROM public.payments AS p
    WHERE p.appointment_id = visit.id
      AND p.status IN ('succeeded', 'partially_refunded', 'refunded')
      AND p.payment_intent_id IS NOT NULL
    ORDER BY p.created_at DESC
    LIMIT 1
  ) AS payment ON true
  CROSS JOIN LATERAL (
    SELECT
      CASE WHEN visit.confirmed_at IS NULL THEN 'paid_without_visit' ELSE 'refund_owed' END AS kind,
      CASE WHEN visit.confirmed_at IS NULL
        THEN payment.amount_minor - payment.refunded_minor
        ELSE least(coalesce(visit.refund_due_minor, 0), payment.amount_minor) - payment.refunded_minor
      END AS minor
  ) AS owed
  WHERE owed.minor > 0;
$$;


ALTER FUNCTION "private"."open_settlements"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."payment_due"("p_starts_at" timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT CASE
    WHEN p_starts_at - make_interval(hours => settings.payment_due_hours) > now() + interval '1 hour'
      THEN p_starts_at - make_interval(hours => settings.payment_due_hours)
  END
  FROM public.center_settings AS settings
  WHERE settings.id = 1;
$$;


ALTER FUNCTION "private"."payment_due"("p_starts_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."payment_events_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM private.log_appointment_event(NEW.appointment_id, 'payment_started', 'payment',
      jsonb_build_object('amount_minor', NEW.amount_minor, 'currency_code', NEW.currency_code));
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'succeeded' THEN
      PERFORM private.log_appointment_event(NEW.appointment_id, 'payment_succeeded', 'payment',
        jsonb_build_object('amount_minor', NEW.amount_minor, 'currency_code', NEW.currency_code));
    ELSIF NEW.status = 'failed' THEN
      PERFORM private.log_appointment_event(NEW.appointment_id, 'payment_failed', 'payment');
    ELSIF NEW.status = 'expired' THEN
      PERFORM private.log_appointment_event(NEW.appointment_id, 'payment_expired', 'payment');
    END IF;
  END IF;
  IF NEW.refunded_minor > OLD.refunded_minor THEN
    PERFORM private.log_appointment_event(NEW.appointment_id, 'refund_recorded', 'payment',
      jsonb_build_object('refunded_minor', NEW.refunded_minor, 'currency_code', NEW.currency_code));
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."payment_events_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."public_location_id"("p_slug" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT id FROM public.locations
  WHERE slug = p_slug AND active AND publicly_visible;
$$;


ALTER FUNCTION "private"."public_location_id"("p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."refuse_closed_days"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  tz text := (SELECT timezone FROM public.center_settings WHERE id = 1);
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.during IS NOT DISTINCT FROM OLD.during THEN
    RETURN NEW;
  END IF;
  IF NOT private.appointment_is_live(NEW.status, NEW.hold_expires_at, NEW.payment_due_at) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.centre_closures AS closure
    WHERE (lower(NEW.during) AT TIME ZONE tz)::date <= closure.ends_on
      AND ((upper(NEW.during) - interval '1 microsecond') AT TIME ZONE tz)::date
        >= closure.starts_on
  ) THEN
    RAISE EXCEPTION 'The centre is closed that day.'
      USING ERRCODE = 'P0001', HINT = 'centre_closed';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."refuse_closed_days"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."request_closing_emails"() RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'site_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN net.http_get(
    url := rtrim(v_url, '/') || '/api/cron/zamkniecia',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 30000
  );
END;
$$;


ALTER FUNCTION "private"."request_closing_emails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."request_payment_emails"() RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "private"."request_payment_emails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."require_admin"() RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;
END;
$$;


ALTER FUNCTION "private"."require_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."require_grid_fits"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.slot_step_minutes IS DISTINCT FROM OLD.slot_step_minutes AND (
    EXISTS (
      SELECT 1 FROM public.specialist_availability_rules AS rule
      WHERE NOT private.on_grid(rule.starts_at, NEW.slot_step_minutes)
         OR NOT private.on_grid(rule.ends_at, NEW.slot_step_minutes)
    )
    OR EXISTS (
      SELECT 1 FROM public.room_opening_hours AS hours
      WHERE NOT private.on_grid(hours.starts_at, NEW.slot_step_minutes)
         OR NOT private.on_grid(hours.ends_at, NEW.slot_step_minutes)
    )
  ) THEN
    RAISE EXCEPTION 'Some availability or opening hours are off a grid of % minutes',
      NEW.slot_step_minutes
      USING ERRCODE = 'check_violation', HINT = 'grid_misfit';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."require_grid_fits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."require_on_grid"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_step integer;
BEGIN
  IF NEW.starts_at IS NULL OR NEW.ends_at IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT slot_step_minutes INTO v_step FROM public.center_settings WHERE id = 1;
  IF NOT private.on_grid(NEW.starts_at, v_step) OR NOT private.on_grid(NEW.ends_at, v_step) THEN
    RAISE EXCEPTION 'Times must lie on the centre''s grid of % minutes', v_step
      USING ERRCODE = 'check_violation', HINT = 'off_grid',
        DETAIL = json_build_object('step', v_step)::text;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."require_on_grid"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reference" "text" NOT NULL,
    "specialist_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "specialist_service_id" "uuid" NOT NULL,
    "availability_rule_id" "uuid",
    "mode" "public"."visit_mode" NOT NULL,
    "room_id" "uuid",
    "during" "tstzrange" NOT NULL,
    "buffer_minutes" integer NOT NULL,
    "blocks" "tstzrange" NOT NULL,
    "duration_minutes" integer NOT NULL,
    "price_minor" integer NOT NULL,
    "currency_code" "text" NOT NULL,
    "status" "public"."appointment_status" DEFAULT 'held'::"public"."appointment_status" NOT NULL,
    "hold_expires_at" timestamp with time zone,
    "client_name" "text",
    "client_email" "text",
    "client_phone" "text",
    "client_notes" "text",
    "terms_accepted_at" timestamp with time zone,
    "privacy_accepted_at" timestamp with time zone,
    "access_token_hash" "bytea" NOT NULL,
    "confirmed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "manage_token_hash" "bytea",
    "reschedule_count" integer DEFAULT 0 NOT NULL,
    "refund_due_minor" integer,
    "booked_by" "text" DEFAULT 'client'::"text" NOT NULL,
    "payment_due_at" timestamp with time zone,
    "client_id" "uuid",
    CONSTRAINT "appointments_booked_by_valid" CHECK (("booked_by" = ANY (ARRAY['client'::"text", 'centre'::"text"]))),
    CONSTRAINT "appointments_buffer_range" CHECK ((("buffer_minutes" >= 0) AND ("buffer_minutes" <= 240))),
    CONSTRAINT "appointments_cancelled_by_valid" CHECK ((("cancelled_by" IS NULL) OR ("cancelled_by" = ANY (ARRAY['client'::"text", 'centre'::"text", 'system'::"text"])))),
    CONSTRAINT "appointments_client_lengths" CHECK (((("client_name" IS NULL) OR (("char_length"("client_name") >= 1) AND ("char_length"("client_name") <= 200))) AND (("client_email" IS NULL) OR (("char_length"("client_email") <= 320) AND ("client_email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::"text"))) AND (("client_phone" IS NULL) OR (("char_length"("client_phone") >= 3) AND ("char_length"("client_phone") <= 40))) AND (("client_notes" IS NULL) OR ("char_length"("client_notes") <= 1000)))),
    CONSTRAINT "appointments_client_when_booked" CHECK ((("status" <> ALL (ARRAY['awaiting_payment'::"public"."appointment_status", 'confirmed'::"public"."appointment_status"])) OR (("client_name" IS NOT NULL) AND ("client_email" IS NOT NULL) AND ((("status" = 'awaiting_payment'::"public"."appointment_status") AND ("booked_by" = 'centre'::"text")) OR (("terms_accepted_at" IS NOT NULL) AND ("privacy_accepted_at" IS NOT NULL)))))),
    CONSTRAINT "appointments_currency_format" CHECK (("currency_code" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "appointments_duration_range" CHECK ((("duration_minutes" >= 5) AND ("duration_minutes" <= 480))),
    CONSTRAINT "appointments_during_bounded" CHECK (((NOT "isempty"("during")) AND (NOT "lower_inf"("during")) AND (NOT "upper_inf"("during")) AND "lower_inc"("during") AND (NOT "upper_inc"("during")))),
    CONSTRAINT "appointments_hold_expires" CHECK ((("status" <> 'held'::"public"."appointment_status") OR ("hold_expires_at" IS NOT NULL))),
    CONSTRAINT "appointments_price_valid" CHECK (("price_minor" >= 0)),
    CONSTRAINT "appointments_refund_due_valid" CHECK ((("refund_due_minor" IS NULL) OR (("refund_due_minor" >= 0) AND ("refund_due_minor" <= "price_minor")))),
    CONSTRAINT "appointments_reschedule_count_valid" CHECK ((("reschedule_count" >= 0) AND ("reschedule_count" <= 50))),
    CONSTRAINT "appointments_room_when_in_person" CHECK ((("mode" = 'in_person'::"public"."visit_mode") = ("room_id" IS NOT NULL)))
);

ALTER TABLE ONLY "public"."appointments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."reservation_by_token"("p_token" "text") RETURNS "public"."appointments"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT visit.* FROM public.appointments AS visit
  WHERE visit.access_token_hash = extensions.digest(p_token, 'sha256')
     OR visit.manage_token_hash = extensions.digest(p_token, 'sha256')
  LIMIT 1;
$$;


ALTER FUNCTION "private"."reservation_by_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."room_is_publicly_exposable"("p_room_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rooms
    WHERE id = p_room_id
      AND active
      AND publicly_visible
  );
$$;


ALTER FUNCTION "private"."room_is_publicly_exposable"("p_room_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."room_media_is_public"("p_room_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rooms AS room
    JOIN public.room_public_profiles AS profile ON profile.room_id = room.id
    WHERE room.id = p_room_id
      AND room.active
      AND room.publicly_visible
      AND profile.published
  );
$$;


ALTER FUNCTION "private"."room_media_is_public"("p_room_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."self_reschedulable"("p_visit" "public"."appointments") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT p_visit.status = 'confirmed'
    AND p_visit.reschedule_count < settings.max_self_reschedules
    AND now() <= lower(p_visit.during) - make_interval(hours => settings.reschedule_window_hours)
  FROM public.center_settings AS settings
  WHERE settings.id = 1;
$$;


ALTER FUNCTION "private"."self_reschedulable"("p_visit" "public"."appointments") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."service_is_public"("target_service_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.services
    WHERE id = target_service_id
      AND active
      AND publicly_visible
  );
$$;


ALTER FUNCTION "private"."service_is_public"("target_service_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_appointment_after_time"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.buffer_minutes := coalesce(
    (SELECT service.after_minutes FROM public.services AS service
     WHERE service.id = NEW.service_id),
    NEW.buffer_minutes
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."set_appointment_after_time"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_appointment_blocks"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.blocks := tstzrange(
    lower(NEW.during),
    upper(NEW.during) + make_interval(mins => NEW.buffer_minutes)
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."set_appointment_blocks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "private"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."shown_as_visit"("p_visit" "public"."appointments") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT p_visit.status IN ('confirmed', 'awaiting_payment')
    OR (p_visit.status = 'cancelled' AND (
      p_visit.confirmed_at IS NOT NULL
      OR p_visit.cancelled_by IN ('centre', 'system')
      OR p_visit.payment_due_at IS NOT NULL
    ));
$$;


ALTER FUNCTION "private"."shown_as_visit"("p_visit" "public"."appointments") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."site_content_payload_is_valid"("p_key" "text", "p_payload" "jsonb") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  SELECT jsonb_typeof(p_payload) = 'object' AND CASE p_key
    WHEN 'home' THEN p_payload ? 'heading' AND p_payload ? 'body'
    WHEN 'rooms' THEN
      jsonb_typeof(p_payload -> 'showAmenitiesSection') = 'boolean'
      AND jsonb_typeof(p_payload -> 'showLocationDetails') = 'boolean'
    ELSE false
  END;
$$;


ALTER FUNCTION "private"."site_content_payload_is_valid"("p_key" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."specialist_display_name"("p_specialist_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT coalesce(
    nullif(trim(concat_ws(' ', trim(profile.first_name), trim(profile.last_name))), ''),
    nullif(trim(public_profile.display_name), ''),
    'Specjalista'
  )
  FROM public.specialists AS specialist
  JOIN public.profiles AS profile ON profile.id = specialist.user_id
  LEFT JOIN public.specialist_public_profiles AS public_profile
    ON public_profile.specialist_id = specialist.id
  WHERE specialist.id = p_specialist_id;
$$;


ALTER FUNCTION "private"."specialist_display_name"("p_specialist_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."specialist_has_published_profile"("target_specialist_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.specialist_public_profiles
    WHERE specialist_id = target_specialist_id
      AND publication_status = 'published'
  );
$$;


ALTER FUNCTION "private"."specialist_has_published_profile"("target_specialist_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."specialist_is_active"("target_specialist_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.specialists
    WHERE id = target_specialist_id
      AND active
  );
$$;


ALTER FUNCTION "private"."specialist_is_active"("target_specialist_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."specialist_is_listed"("p_specialist" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.specialists
    WHERE id = p_specialist AND publicly_visible
  );
$$;


ALTER FUNCTION "private"."specialist_is_listed"("p_specialist" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."times_moved"("p_appointment_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT count(*)::integer FROM public.appointment_events AS event
  WHERE event.appointment_id = p_appointment_id AND event.kind = 'rescheduled';
$$;


ALTER FUNCTION "private"."times_moved"("p_appointment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."visible_visits"("p_own" boolean) RETURNS TABLE("id" "uuid", "reference" "text", "status" "public"."appointment_status", "mode" "public"."visit_mode", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "service_id" "uuid", "service_name" "text", "specialist_id" "uuid", "specialist_name" "text", "specialist_color" "text", "room_id" "uuid", "room_name" "text", "room_color" "text", "location_name" "text", "client_id" "uuid", "client_name" "text", "client_email" "text", "client_phone" "text", "client_notes" "text", "price_minor" integer, "currency_code" "text", "paid" boolean, "refund_due_minor" integer, "refunded_minor" integer, "cancelled_by" "text", "cancelled_at" timestamp with time zone, "reschedule_count" integer, "created_at" timestamp with time zone, "confirmed_at" timestamp with time zone, "payment_due_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_admin boolean := public.has_role('admin') AND NOT p_own;
  v_own uuid;
BEGIN
  IF NOT v_admin THEN
    SELECT specialist.id INTO v_own FROM public.specialists AS specialist
    WHERE specialist.user_id = (SELECT auth.uid());
    IF v_own IS NULL THEN
      RAISE EXCEPTION 'Only the centre and its specialists see visits'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN QUERY
  SELECT visit.id, visit.reference, visit.status, visit.mode,
    lower(visit.during), upper(visit.during),
    visit.service_id, service.name,
    visit.specialist_id,
    coalesce(
      nullif(profile.display_name, ''),
      nullif(concat_ws(' ', account.first_name, account.last_name), ''),
      'Specjalista'
    ),
    specialist.color,
    visit.room_id, room.name, room.color, location.name,
    visit.client_id,
    visit.client_name, visit.client_email, visit.client_phone, visit.client_notes,
    visit.price_minor, visit.currency_code,
    CASE WHEN v_admin THEN EXISTS (
      SELECT 1 FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
        AND payment.status IN ('succeeded', 'refunded', 'partially_refunded')
    ) END,
    CASE WHEN v_admin THEN visit.refund_due_minor END,
    CASE WHEN v_admin THEN coalesce((
      SELECT sum(payment.refunded_minor)::integer FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
    ), 0) END,
    visit.cancelled_by, visit.cancelled_at, visit.reschedule_count,
    visit.created_at, visit.confirmed_at, visit.payment_due_at
  FROM public.appointments AS visit
  JOIN public.services AS service ON service.id = visit.service_id
  JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
  LEFT JOIN public.profiles AS account ON account.id = specialist.user_id
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE private.shown_as_visit(visit)
    AND (v_admin OR visit.specialist_id = v_own);
END;
$$;


ALTER FUNCTION "private"."visible_visits"("p_own" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."visit_archived"("p_status" "public"."appointment_status", "p_ends_at" timestamp with time zone, "p_cancelled_at" timestamp with time zone, "p_refund_due" integer, "p_refunded" integer) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  -- Held: a week after it. Cancelled: once its time has passed and a week
  -- after the cancellation, whichever comes later.
  SELECT coalesce(p_refund_due, 0) <= coalesce(p_refunded, 0)
    AND CASE p_status
      WHEN 'confirmed' THEN p_ends_at < now() - interval '7 days'
      WHEN 'cancelled' THEN p_ends_at < now()
        AND coalesce(p_cancelled_at, p_ends_at) < now() - interval '7 days'
      ELSE false
    END;
$$;


ALTER FUNCTION "private"."visit_archived"("p_status" "public"."appointment_status", "p_ends_at" timestamp with time zone, "p_cancelled_at" timestamp with time zone, "p_refund_due" integer, "p_refunded" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."write_availability_rule"("p_specialist_id" "uuid", "p_id" "uuid", "p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_interval_weeks" smallint, "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_valid_until" "date", "p_occurrence_count" smallint, "p_mode" "public"."availability_mode", "p_room_id" "uuid", "p_note" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_weekdays smallint[] := ARRAY(
    SELECT DISTINCT day FROM unnest(p_weekdays) AS day ORDER BY day
  );
  v_interval smallint := coalesce(p_interval_weeks, 1);
  v_valid_until date := p_valid_until;
  v_count smallint := p_occurrence_count;
  v_room_id uuid := CASE WHEN p_mode = 'online' THEN NULL ELSE p_room_id END;
  clash record;
  saved_id uuid;
BEGIN
  IF p_recurrence = 'once' THEN
    v_weekdays := ARRAY[extract(isodow FROM p_valid_from)::smallint];
    v_interval := 1;
    v_valid_until := p_valid_from;
    v_count := NULL;
  ELSIF v_count IS NOT NULL THEN
    IF NOT private.is_weekday_set(v_weekdays) THEN
      RAISE EXCEPTION 'Invalid weekdays' USING ERRCODE = '23514';
    END IF;
    v_valid_until := private.availability_nth_date(v_weekdays, v_interval, p_valid_from, v_count);
  END IF;

  IF v_room_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rooms WHERE rooms.id = v_room_id AND rooms.active
  ) THEN
    RAISE EXCEPTION 'Room is not available' USING ERRCODE = '22023';
  END IF;

  -- A room with opening hours is only used while it is open, on each of
  -- the window's weekdays.
  IF v_room_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.room_opening_hours WHERE room_id = v_room_id)
     AND EXISTS (
       SELECT 1 FROM unnest(v_weekdays) AS day
       WHERE NOT EXISTS (
         SELECT 1 FROM public.room_opening_hours AS hours
         WHERE hours.room_id = v_room_id
           AND hours.weekday = day
           AND hours.starts_at <= p_starts_at
           AND hours.ends_at >= p_ends_at
       )
     )
  THEN
    RAISE EXCEPTION 'The room is closed at these hours'
      USING ERRCODE = '23P01', HINT = 'room_closed';
  END IF;

  -- One writer per specialist and per room at a time (fixed order).
  PERFORM pg_advisory_xact_lock(hashtextextended('availability:specialist:' || p_specialist_id, 0));
  IF v_room_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('availability:room:' || v_room_id, 0));
  END IF;

  IF private.is_weekday_set(v_weekdays) THEN
    SELECT * INTO clash
    FROM private.availability_clash(
      p_id, p_specialist_id, v_room_id, p_recurrence, v_weekdays, v_interval,
      p_starts_at, p_ends_at, p_valid_from, v_valid_until
    );
    IF FOUND THEN
      IF clash.kind = 'room_taken' THEN
        RAISE EXCEPTION 'The room is taken at these hours'
          USING ERRCODE = '23P01', HINT = 'room_taken',
            DETAIL = jsonb_build_object(
              'specialist', private.specialist_display_name(clash.specialist_id),
              'date', clash.day,
              'startsAt', to_char(clash.starts_at, 'HH24:MI'),
              'endsAt', to_char(clash.ends_at, 'HH24:MI')
            )::text;
      END IF;
      RAISE EXCEPTION 'Availability window clashes with another one'
        USING ERRCODE = '23P01', HINT = clash.kind;
    END IF;
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.specialist_availability_rules (
      specialist_id, recurrence, weekdays, interval_weeks, starts_at, ends_at,
      valid_from, valid_until, occurrence_count, mode, room_id, note
    ) VALUES (
      p_specialist_id, p_recurrence, v_weekdays, v_interval, p_starts_at, p_ends_at,
      p_valid_from, v_valid_until, v_count, p_mode, v_room_id, nullif(trim(p_note), '')
    )
    RETURNING id INTO saved_id;
  ELSE
    UPDATE public.specialist_availability_rules
    SET recurrence = p_recurrence,
        weekdays = v_weekdays,
        interval_weeks = v_interval,
        starts_at = p_starts_at,
        ends_at = p_ends_at,
        valid_from = p_valid_from,
        valid_until = v_valid_until,
        occurrence_count = v_count,
        mode = p_mode,
        room_id = v_room_id,
        note = nullif(trim(p_note), '')
    WHERE id = p_id
    RETURNING id INTO saved_id;
  END IF;

  RETURN saved_id;
END;
$$;


ALTER FUNCTION "private"."write_availability_rule"("p_specialist_id" "uuid", "p_id" "uuid", "p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_interval_weeks" smallint, "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_valid_until" "date", "p_occurrence_count" smallint, "p_mode" "public"."availability_mode", "p_room_id" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_booking_terms"("p_token" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_visit public.appointments%ROWTYPE;
BEGIN
  v_visit := private.reservation_by_token(p_token);
  IF v_visit.id IS NULL OR v_visit.status <> 'awaiting_payment'
     OR v_visit.payment_due_at IS NULL OR v_visit.payment_due_at <= now() THEN
    RAISE EXCEPTION 'Nothing to pay' USING HINT = 'not_payable';
  END IF;
  UPDATE public.appointments
  SET terms_accepted_at = coalesce(terms_accepted_at, now()),
      privacy_accepted_at = coalesce(privacy_accepted_at, now())
  WHERE id = v_visit.id;
END;
$$;


ALTER FUNCTION "public"."accept_booking_terms"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_room_image"("p_room_id" "uuid", "p_storage_path" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  image_count integer;
  new_id uuid;
BEGIN
  PERFORM private.require_admin();

  -- Serialises concurrent uploads to the same room.
  PERFORM 1 FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(*) INTO image_count
  FROM public.room_images
  WHERE room_id = p_room_id;

  IF image_count >= 5 THEN
    RAISE EXCEPTION 'A room can have at most 5 photos' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.room_images (room_id, storage_path, position, is_main)
  VALUES (p_room_id, p_storage_path, image_count, image_count = 0)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;


ALTER FUNCTION "public"."add_room_image"("p_room_id" "uuid", "p_storage_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_time_off"("p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_reason" "text" DEFAULT NULL::"text", "p_specialist_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  saved_id uuid;
BEGIN
  IF p_starts_at >= p_ends_at THEN
    RAISE EXCEPTION 'Time off must end after it starts' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.specialist_time_off (specialist_id, during, reason)
  VALUES (
    private.managed_specialist_id(p_specialist_id),
    tstzrange(p_starts_at, p_ends_at, '[)'),
    nullif(trim(p_reason), '')
  )
  RETURNING id INTO saved_id;

  RETURN saved_id;
END;
$$;


ALTER FUNCTION "public"."add_time_off"("p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_reason" "text", "p_specialist_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_client"("p_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_notes" "text") RETURNS TABLE("id" "uuid", "upcoming_updated" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_name text := nullif(btrim(p_name), '');
  v_email text := lower(nullif(btrim(p_email), ''));
  v_phone text := nullif(btrim(p_phone), '');
  v_notes text := nullif(btrim(p_notes), '');
  v_count integer;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre changes its clients'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE clients.id = p_id) THEN
    RAISE EXCEPTION 'No such client' USING HINT = 'not_found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.clients
             WHERE clients.email_key = v_email AND clients.id <> p_id) THEN
    RAISE EXCEPTION 'Another client has this address' USING HINT = 'email_taken';
  END IF;

  BEGIN
    UPDATE public.clients
    SET name = v_name, email = v_email, phone = v_phone, notes = v_notes
    WHERE clients.id = p_id;
  EXCEPTION WHEN check_violation OR not_null_violation THEN
    RAISE EXCEPTION 'The client''s details are not valid' USING HINT = 'invalid_details';
  END;

  UPDATE public.appointments
  SET client_name = v_name, client_email = v_email, client_phone = v_phone
  WHERE appointments.client_id = p_id
    AND appointments.status IN ('confirmed', 'awaiting_payment')
    AND lower(appointments.during) > now()
    AND (appointments.client_name, appointments.client_email, appointments.client_phone)
        IS DISTINCT FROM (v_name, v_email, v_phone);
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT p_id, v_count;
END;
$$;


ALTER FUNCTION "public"."admin_update_client"("p_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_specialist_profile_draft"("p_draft_id" "uuid", "p_review_comment" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  draft_record public.specialist_profile_drafts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  SELECT draft.* INTO draft_record
  FROM public.specialist_profile_drafts AS draft
  WHERE draft.id = p_draft_id
  FOR UPDATE;

  IF draft_record.id IS NULL OR draft_record.status <> 'pending_review' THEN
    RAISE EXCEPTION 'Pending draft not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.specialist_public_profiles (
    specialist_id, first_name, last_name, display_name, short_bio, long_bio,
    profile_photo_url, portrait_photo_url, languages, therapy_approaches,
    specializations, education, certificates, modalities, client_groups,
    publication_status, published_at
  ) VALUES (
    draft_record.specialist_id, draft_record.first_name, draft_record.last_name,
    draft_record.display_name, draft_record.short_bio, draft_record.long_bio,
    draft_record.profile_photo_url, draft_record.portrait_photo_url, draft_record.languages, draft_record.therapy_approaches,
    draft_record.specializations, draft_record.education, draft_record.certificates, draft_record.modalities,
    draft_record.client_groups,
    'published', now()
  )
  ON CONFLICT (specialist_id) DO UPDATE
  SET first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      display_name = EXCLUDED.display_name,
      short_bio = EXCLUDED.short_bio,
      long_bio = EXCLUDED.long_bio,
      profile_photo_url = EXCLUDED.profile_photo_url,
      portrait_photo_url = EXCLUDED.portrait_photo_url,
      languages = EXCLUDED.languages,
      therapy_approaches = EXCLUDED.therapy_approaches,
      specializations = EXCLUDED.specializations,
      education = EXCLUDED.education,
      certificates = EXCLUDED.certificates,
      modalities = EXCLUDED.modalities,
      client_groups = EXCLUDED.client_groups,
      publication_status = 'published',
      published_at = now();

  -- The title lives on the specialist (it is also shown in the portals);
  -- a draft without one leaves the current title unchanged.
  IF draft_record.professional_title IS NOT NULL THEN
    UPDATE public.specialists
    SET professional_title = draft_record.professional_title
    WHERE id = draft_record.specialist_id;
  END IF;

  -- The approved name is the person's name: the account takes it too.
  IF trim(draft_record.first_name) <> '' AND trim(draft_record.last_name) <> '' THEN
    UPDATE public.profiles AS profile
    SET first_name = draft_record.first_name,
        last_name = draft_record.last_name
    FROM public.specialists AS specialist
    WHERE specialist.id = draft_record.specialist_id
      AND profile.id = specialist.user_id;
  END IF;

  UPDATE public.specialist_profile_drafts
  SET status = 'published',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_comment = nullif(trim(p_review_comment), '')
  WHERE id = p_draft_id;
END;
$$;


ALTER FUNCTION "public"."approve_specialist_profile_draft"("p_draft_id" "uuid", "p_review_comment" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."arrange_services"("p_catalogs" "jsonb", "p_services" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT public.has_role('admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins arrange the offer'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.service_catalogs AS catalog
  SET sort_order = item.sort_order
  FROM jsonb_to_recordset(p_catalogs) AS item(id uuid, sort_order integer)
  WHERE catalog.id = item.id;

  UPDATE public.services AS service
  SET catalog_id = item.catalog_id,
      sort_order = item.sort_order
  FROM jsonb_to_recordset(p_services)
    AS item(id uuid, catalog_id uuid, sort_order integer)
  WHERE service.id = item.id;
END;
$$;


ALTER FUNCTION "public"."arrange_services"("p_catalogs" "jsonb", "p_services" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."attach_checkout_session"("p_access_token" "text", "p_session_id" "text", "p_expires_at" timestamp with time zone, "p_amount_minor" integer, "p_currency_code" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_visit public.appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_visit FROM public.appointments
  WHERE access_token_hash = extensions.digest(p_access_token, 'sha256')
  FOR UPDATE;
  IF NOT FOUND OR v_visit.status <> 'held' OR v_visit.hold_expires_at <= now() THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;
  IF v_visit.terms_accepted_at IS NULL OR v_visit.client_email IS NULL THEN
    RAISE EXCEPTION 'The client''s details come first' USING HINT = 'details_required';
  END IF;
  IF p_amount_minor IS DISTINCT FROM v_visit.price_minor
     OR upper(p_currency_code) IS DISTINCT FROM v_visit.currency_code THEN
    RAISE EXCEPTION 'The amount is not the visit''s' USING HINT = 'amount_mismatch';
  END IF;

  UPDATE public.payments SET status = 'expired'
  WHERE appointment_id = v_visit.id AND status = 'pending';

  INSERT INTO public.payments (appointment_id, checkout_session_id, amount_minor, currency_code)
  VALUES (v_visit.id, p_session_id, p_amount_minor, v_visit.currency_code);

  -- While the client pays, the time stays theirs (never beyond a day).
  UPDATE public.appointments
  SET hold_expires_at = greatest(
    hold_expires_at,
    least(p_expires_at, now() + interval '1 day')
  )
  WHERE id = v_visit.id;
END;
$$;


ALTER FUNCTION "public"."attach_checkout_session"("p_access_token" "text", "p_session_id" "text", "p_expires_at" timestamp with time zone, "p_amount_minor" integer, "p_currency_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."attach_reservation_payment"("p_token" "text", "p_session_id" "text", "p_amount_minor" integer, "p_currency_code" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_visit public.appointments%ROWTYPE;
BEGIN
  v_visit := private.reservation_by_token(p_token);
  IF v_visit.id IS NULL OR v_visit.status <> 'awaiting_payment'
     OR v_visit.payment_due_at IS NULL OR v_visit.payment_due_at <= now() THEN
    RAISE EXCEPTION 'Nothing to pay' USING HINT = 'not_payable';
  END IF;
  IF v_visit.terms_accepted_at IS NULL THEN
    RAISE EXCEPTION 'The consents come first' USING HINT = 'consent_required';
  END IF;
  IF p_amount_minor IS DISTINCT FROM v_visit.price_minor
     OR upper(p_currency_code) IS DISTINCT FROM v_visit.currency_code THEN
    RAISE EXCEPTION 'The amount is not the visit''s' USING HINT = 'amount_mismatch';
  END IF;
  UPDATE public.payments SET status = 'expired'
  WHERE appointment_id = v_visit.id AND status = 'pending';
  INSERT INTO public.payments (appointment_id, checkout_session_id, amount_minor, currency_code)
  VALUES (v_visit.id, p_session_id, p_amount_minor, v_visit.currency_code);
END;
$$;


ALTER FUNCTION "public"."attach_reservation_payment"("p_token" "text", "p_session_id" "text", "p_amount_minor" integer, "p_currency_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."attach_visit_intake"("p_access_token" "text", "p_intake_token" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_required boolean;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.access_token_hash = extensions.digest(p_access_token, 'sha256')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'hold_expired';
  END IF;
  SELECT service.requires_intake INTO v_required
  FROM public.services AS service WHERE service.id = v_visit.service_id;
  IF NOT coalesce(v_required, false) THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.visit_intakes WHERE appointment_id = v_visit.id) THEN
    RETURN true;
  END IF;

  UPDATE public.visit_intakes
  SET appointment_id = v_visit.id
  WHERE token_hash = extensions.digest(coalesce(p_intake_token, ''), 'sha256')
    AND appointment_id IS NULL
    AND service_id = v_visit.service_id
    AND created_at > now() - interval '1 day';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The questionnaire is required first' USING HINT = 'intake_required';
  END IF;
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."attach_visit_intake"("p_access_token" "text", "p_intake_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."booking_window"() RETURNS TABLE("time_zone" "text", "horizon_days" integer, "hold_minutes" integer, "cancellation_window_hours" integer, "reschedule_window_hours" integer, "max_self_reschedules" integer, "payment_due_hours" integer, "slot_step_minutes" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT timezone, max_booking_horizon_days, hold_minutes,
    cancellation_window_hours, reschedule_window_hours, max_self_reschedules,
    payment_due_hours, slot_step_minutes
  FROM public.center_settings
  WHERE id = 1;
$$;


ALTER FUNCTION "public"."booking_window"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_booking"("p_manage_token" "text") RETURNS TABLE("reference" "text", "refund_minor" integer, "payment_intent_id" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_window integer;
  v_payment public.payments%ROWTYPE;
  v_paid boolean;
  v_refund integer := 0;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.manage_token_hash = extensions.digest(p_manage_token, 'sha256')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  IF NOT (
       v_visit.status = 'confirmed'
       OR (v_visit.status = 'awaiting_payment' AND v_visit.payment_due_at > now())
     ) OR lower(v_visit.during) <= now() THEN
    RAISE EXCEPTION 'This visit cannot be cancelled' USING HINT = 'not_cancellable';
  END IF;

  SELECT cancellation_window_hours INTO v_window
  FROM public.center_settings WHERE id = 1;

  SELECT * INTO v_payment FROM public.payments AS payment
  WHERE payment.appointment_id = v_visit.id
    AND payment.status IN ('succeeded', 'partially_refunded')
    AND payment.payment_intent_id IS NOT NULL
  ORDER BY payment.created_at DESC
  LIMIT 1
  FOR UPDATE;
  v_paid := FOUND;

  IF v_paid AND now() <= lower(v_visit.during) - make_interval(hours => v_window) THEN
    v_refund := v_payment.amount_minor - v_payment.refunded_minor;
  END IF;

  UPDATE public.payments SET status = 'expired'
  WHERE appointment_id = v_visit.id AND status = 'pending';
  UPDATE public.appointments
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'client',
      refund_due_minor = v_refund
  WHERE id = v_visit.id;

  RETURN QUERY SELECT v_visit.reference, v_refund,
    CASE WHEN v_paid THEN v_payment.payment_intent_id END;
END;
$$;


ALTER FUNCTION "public"."cancel_booking"("p_manage_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_unpaid_visits"() RETURNS TABLE("reference" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT reference FROM private.cancel_overdue_payments() AS reference;
$$;


ALTER FUNCTION "public"."cancel_unpaid_visits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."centre_book_visit"("p_offer_id" "uuid", "p_mode" "public"."visit_mode", "p_starts_at" timestamp with time zone, "p_room_id" "uuid", "p_client_name" "text", "p_client_email" "text", "p_client_phone" "text", "p_client_notes" "text") RETURNS TABLE("appointment_id" "uuid", "reference" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "payment_due_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_settings public.center_settings%ROWTYPE;
  v_offer public.specialist_services%ROWTYPE;
  v_duration integer;
  v_during tstzrange;
  v_day date;
  v_room public.rooms%ROWTYPE;
  v_reference text;
  v_due timestamptz;
  v_id uuid;
BEGIN
  SELECT * INTO v_offer FROM public.specialist_services AS offer
  WHERE offer.id = p_offer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such offer' USING HINT = 'not_bookable';
  END IF;
  PERFORM private.managed_specialist_id(v_offer.specialist_id);

  IF NOT v_offer.active
     OR NOT EXISTS (
       SELECT 1 FROM public.specialists AS specialist
       WHERE specialist.id = v_offer.specialist_id AND specialist.active
     )
     OR NOT EXISTS (
       SELECT 1 FROM public.services AS service
       WHERE service.id = v_offer.service_id AND service.active
     )
     OR (p_mode = 'online' AND NOT v_offer.supports_online)
     OR (p_mode = 'in_person' AND NOT v_offer.supports_in_person) THEN
    RAISE EXCEPTION 'This service cannot be booked this way' USING HINT = 'not_bookable';
  END IF;

  IF p_starts_at IS NULL OR p_starts_at <= now() THEN
    RAISE EXCEPTION 'The time has passed' USING HINT = 'in_the_past';
  END IF;

  SELECT * INTO v_settings FROM public.center_settings WHERE id = 1;
  -- Paid by the usual time before the visit, or soon when it is close.
  v_due := coalesce(
    private.payment_due(p_starts_at),
    least(
      now() + make_interval(hours => v_settings.centre_payment_link_hours),
      p_starts_at - interval '1 hour'
    )
  );
  IF v_due <= now() + interval '15 minutes' THEN
    RAISE EXCEPTION 'Too little time left to pay' USING HINT = 'too_soon';
  END IF;

  SELECT coalesce(v_offer.duration_minutes, service.default_duration_minutes)
  INTO v_duration FROM public.services AS service WHERE service.id = v_offer.service_id;
  v_during := tstzrange(p_starts_at, p_starts_at + make_interval(mins => v_duration));
  v_day := (p_starts_at AT TIME ZONE v_settings.timezone)::date;

  IF p_mode = 'in_person' THEN
    SELECT * INTO v_room FROM public.rooms AS room WHERE room.id = p_room_id;
    IF NOT FOUND OR NOT v_room.active OR NOT EXISTS (
      SELECT 1 FROM public.locations AS location
      WHERE location.id = v_room.location_id AND location.active
    ) THEN
      RAISE EXCEPTION 'Choose an open room' USING HINT = 'room_required';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.room_availability_exceptions AS closed
      WHERE closed.room_id = v_room.id
        AND closed.date = v_day
        AND (
          closed.type = 'closed_all_day'
          OR (
            closed.type = 'blocked_interval'
            AND tstzrange(
              (closed.date + closed.starts_at) AT TIME ZONE v_settings.timezone,
              (closed.date + closed.ends_at) AT TIME ZONE v_settings.timezone
            ) && v_during
          )
        )
    ) THEN
      RAISE EXCEPTION 'The room is closed then' USING HINT = 'room_closed';
    END IF;
  ELSIF p_room_id IS NOT NULL THEN
    RAISE EXCEPTION 'An online visit has no room' USING HINT = 'not_bookable';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.specialist_time_off AS off
    WHERE off.specialist_id = v_offer.specialist_id AND off.during && v_during
  ) THEN
    RAISE EXCEPTION 'The specialist is away then' USING HINT = 'time_off';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('booking:specialist:' || v_offer.specialist_id, 0));
  UPDATE public.appointments SET status = 'expired'
  WHERE status = 'held' AND hold_expires_at <= now();
  PERFORM private.cancel_overdue_payments();

  v_reference := private.next_booking_reference(now(), v_settings.timezone);
  BEGIN
    INSERT INTO public.appointments (
      reference, specialist_id, service_id, specialist_service_id,
      mode, room_id, during, buffer_minutes, duration_minutes,
      price_minor, currency_code, status, payment_due_at, booked_by,
      client_name, client_email, client_phone, client_notes,
      access_token_hash
    )
    VALUES (
      v_reference, v_offer.specialist_id, v_offer.service_id, v_offer.id,
      p_mode, CASE WHEN p_mode = 'in_person' THEN v_room.id END,
      v_during, v_settings.default_visit_buffer_minutes, v_duration,
      v_offer.price_minor, v_offer.currency_code, 'awaiting_payment', v_due, 'centre',
      nullif(trim(p_client_name), ''),
      lower(nullif(trim(p_client_email), '')),
      nullif(trim(p_client_phone), ''),
      nullif(trim(p_client_notes), ''),
      extensions.digest(extensions.gen_random_bytes(32), 'sha256')
    )
    RETURNING id INTO v_id;
  EXCEPTION
    WHEN exclusion_violation THEN
      IF SQLERRM LIKE '%appointments_room_no_overlap%' THEN
        RAISE EXCEPTION 'The room is taken then' USING HINT = 'room_busy';
      END IF;
      RAISE EXCEPTION 'The specialist has a visit then' USING HINT = 'specialist_busy';
    WHEN check_violation THEN
      RAISE EXCEPTION 'The client''s details are not valid' USING HINT = 'invalid_details';
  END;

  RETURN QUERY SELECT v_id, v_reference, lower(v_during), upper(v_during), v_due;
END;
$$;


ALTER FUNCTION "public"."centre_book_visit"("p_offer_id" "uuid", "p_mode" "public"."visit_mode", "p_starts_at" timestamp with time zone, "p_room_id" "uuid", "p_client_name" "text", "p_client_email" "text", "p_client_phone" "text", "p_client_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."centre_cancel_visit"("p_appointment_id" "uuid", "p_refund_minor" integer DEFAULT NULL::integer, "p_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("reference" "text", "refund_minor" integer, "payment_intent_id" "text", "reschedule_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_paid boolean;
  v_left integer := 0;
  v_refund integer;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre cancels visits'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.id = p_appointment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  IF v_visit.status NOT IN ('confirmed', 'awaiting_payment') THEN
    RAISE EXCEPTION 'This visit cannot be cancelled' USING HINT = 'not_cancellable';
  END IF;

  SELECT * INTO v_payment FROM public.payments AS payment
  WHERE payment.appointment_id = v_visit.id
    AND payment.status IN ('succeeded', 'partially_refunded')
    AND payment.payment_intent_id IS NOT NULL
  ORDER BY payment.created_at DESC
  LIMIT 1
  FOR UPDATE;
  v_paid := FOUND;
  IF v_paid THEN
    v_left := v_payment.amount_minor - v_payment.refunded_minor;
  END IF;
  v_refund := coalesce(p_refund_minor, v_left);
  IF v_refund < 0 OR v_refund > v_left THEN
    RAISE EXCEPTION 'At most % can be given back', v_left USING HINT = 'refund_too_high';
  END IF;

  -- A payment still going on stops counting.
  UPDATE public.payments SET status = 'expired'
  WHERE appointment_id = v_visit.id AND status = 'pending';
  PERFORM set_config('kolor.change_reason', coalesce(left(btrim(p_reason), 500), ''), true);
  UPDATE public.appointments
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'centre',
      refund_due_minor = v_refund + CASE WHEN v_paid THEN v_payment.refunded_minor ELSE 0 END
  WHERE id = v_visit.id;
  PERFORM set_config('kolor.change_reason', '', true);

  RETURN QUERY SELECT v_visit.reference, v_refund,
    CASE WHEN v_paid THEN v_payment.payment_intent_id END,
    private.times_moved(v_visit.id);
END;
$$;


ALTER FUNCTION "public"."centre_cancel_visit"("p_appointment_id" "uuid", "p_refund_minor" integer, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."centre_refund_visit"("p_appointment_id" "uuid", "p_refund_minor" integer, "p_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("reference" "text", "refund_minor" integer, "payment_intent_id" "text", "refunded_before_minor" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_left integer;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre gives money back'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.id = p_appointment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  SELECT * INTO v_payment FROM public.payments AS payment
  WHERE payment.appointment_id = v_visit.id
    AND payment.status IN ('succeeded', 'partially_refunded')
    AND payment.payment_intent_id IS NOT NULL
  ORDER BY payment.created_at DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nothing was paid' USING HINT = 'not_paid';
  END IF;
  -- What is left past what has gone back and what is owed already.
  v_left := v_payment.amount_minor
    - greatest(v_payment.refunded_minor, coalesce(v_visit.refund_due_minor, 0));
  IF p_refund_minor IS NULL OR p_refund_minor <= 0 OR p_refund_minor > v_left THEN
    RAISE EXCEPTION 'Between 1 and % can be given back', greatest(v_left, 0)
      USING HINT = 'refund_too_high';
  END IF;

  -- What the centre owes back: what it gave (or owes) so far and this.
  UPDATE public.appointments
  SET refund_due_minor = greatest(coalesce(refund_due_minor, 0), v_payment.refunded_minor) + p_refund_minor
  WHERE id = v_visit.id;
  PERFORM private.log_appointment_event(v_visit.id, 'refund_issued', 'centre',
    jsonb_strip_nulls(jsonb_build_object(
      'refund_minor', p_refund_minor,
      'reason', nullif(left(btrim(coalesce(p_reason, '')), 500), '')
    )));
  -- Each refund gets its own e-mail (the last one's row makes way).
  DELETE FROM public.booking_emails
  WHERE appointment_id = v_visit.id AND kind = 'refunded';

  RETURN QUERY SELECT v_visit.reference, p_refund_minor, v_payment.payment_intent_id,
    v_payment.refunded_minor;
END;
$$;


ALTER FUNCTION "public"."centre_refund_visit"("p_appointment_id" "uuid", "p_refund_minor" integer, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."centre_reschedule_visit"("p_appointment_id" "uuid", "p_starts_at" timestamp with time zone, "p_mode" "public"."visit_mode", "p_room_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("reference" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "sequence" integer, "payment_due_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_offer public.specialist_services%ROWTYPE;
  v_settings public.center_settings%ROWTYPE;
  v_room public.rooms%ROWTYPE;
  v_during tstzrange;
  v_day date;
  v_due timestamptz;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre moves visits'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.id = p_appointment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  IF v_visit.status NOT IN ('confirmed', 'awaiting_payment') THEN
    RAISE EXCEPTION 'This visit cannot be moved' USING HINT = 'not_reschedulable';
  END IF;
  IF p_starts_at IS NULL OR p_starts_at <= now() THEN
    RAISE EXCEPTION 'The time has passed' USING HINT = 'in_the_past';
  END IF;

  SELECT * INTO v_offer FROM public.specialist_services AS offer
  WHERE offer.id = v_visit.specialist_service_id;
  IF (p_mode = 'online' AND NOT v_offer.supports_online)
     OR (p_mode = 'in_person' AND NOT v_offer.supports_in_person) THEN
    RAISE EXCEPTION 'This service is not given this way' USING HINT = 'not_bookable';
  END IF;

  SELECT * INTO v_settings FROM public.center_settings WHERE id = 1;
  v_during := tstzrange(p_starts_at, p_starts_at + make_interval(mins => v_visit.duration_minutes));
  v_day := (p_starts_at AT TIME ZONE v_settings.timezone)::date;

  IF v_during = v_visit.during AND p_mode = v_visit.mode
     AND (CASE WHEN p_mode = 'in_person' THEN p_room_id END) IS NOT DISTINCT FROM v_visit.room_id THEN
    RAISE EXCEPTION 'The visit is there already' USING HINT = 'nothing_changed';
  END IF;

  IF p_mode = 'in_person' THEN
    SELECT * INTO v_room FROM public.rooms AS room WHERE room.id = p_room_id;
    IF NOT FOUND OR NOT v_room.active OR NOT EXISTS (
      SELECT 1 FROM public.locations AS location
      WHERE location.id = v_room.location_id AND location.active
    ) THEN
      RAISE EXCEPTION 'Choose an open room' USING HINT = 'room_required';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.room_availability_exceptions AS closed
      WHERE closed.room_id = v_room.id
        AND closed.date = v_day
        AND (
          closed.type = 'closed_all_day'
          OR (
            closed.type = 'blocked_interval'
            AND tstzrange(
              (closed.date + closed.starts_at) AT TIME ZONE v_settings.timezone,
              (closed.date + closed.ends_at) AT TIME ZONE v_settings.timezone
            ) && v_during
          )
        )
    ) THEN
      RAISE EXCEPTION 'The room is closed then' USING HINT = 'room_closed';
    END IF;
  ELSIF p_room_id IS NOT NULL THEN
    RAISE EXCEPTION 'An online visit has no room' USING HINT = 'not_bookable';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.specialist_time_off AS off
    WHERE off.specialist_id = v_visit.specialist_id AND off.during && v_during
  ) THEN
    RAISE EXCEPTION 'The specialist is away then' USING HINT = 'time_off';
  END IF;

  IF v_visit.status = 'awaiting_payment' AND v_visit.payment_due_at IS NOT NULL THEN
    v_due := coalesce(
      private.payment_due(p_starts_at),
      least(
        now() + make_interval(hours => v_settings.centre_payment_link_hours),
        p_starts_at - interval '1 hour'
      )
    );
    IF v_due <= now() + interval '15 minutes' THEN
      RAISE EXCEPTION 'Too little time left to pay' USING HINT = 'too_soon';
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('booking:specialist:' || v_visit.specialist_id, 0));
  UPDATE public.appointments SET status = 'expired'
  WHERE status = 'held' AND hold_expires_at <= now();
  PERFORM private.cancel_overdue_payments();

  PERFORM set_config('kolor.change_reason', coalesce(left(btrim(p_reason), 500), ''), true);
  BEGIN
    UPDATE public.appointments
    SET during = v_during,
        mode = p_mode,
        room_id = CASE WHEN p_mode = 'in_person' THEN v_room.id END,
        availability_rule_id = NULL,
        buffer_minutes = v_settings.default_visit_buffer_minutes,
        payment_due_at = coalesce(v_due, payment_due_at)
    WHERE id = v_visit.id;
  EXCEPTION WHEN exclusion_violation THEN
    IF SQLERRM LIKE '%appointments_room_no_overlap%' THEN
      RAISE EXCEPTION 'The room is taken then' USING HINT = 'room_busy';
    END IF;
    RAISE EXCEPTION 'The specialist has a visit then' USING HINT = 'specialist_busy';
  END;
  PERFORM set_config('kolor.change_reason', '', true);

  -- The e-mails about it (and the reminders) go again for the new time.
  DELETE FROM public.booking_emails
  WHERE appointment_id = v_visit.id
    AND kind IN ('rescheduled', 'reminder', 'payment_reminder', 'payment_last_call');

  RETURN QUERY SELECT v_visit.reference, lower(v_during), upper(v_during),
    private.times_moved(v_visit.id), coalesce(v_due, v_visit.payment_due_at);
END;
$$;


ALTER FUNCTION "public"."centre_reschedule_visit"("p_appointment_id" "uuid", "p_starts_at" timestamp with time zone, "p_mode" "public"."visit_mode", "p_room_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."centre_resend_payment_link"("p_appointment_id" "uuid") RETURNS TABLE("reference" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.id = p_appointment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  PERFORM private.managed_specialist_id(v_visit.specialist_id);
  IF v_visit.status <> 'awaiting_payment' OR v_visit.payment_due_at IS NULL
     OR v_visit.payment_due_at <= now() OR v_visit.client_email IS NULL THEN
    RAISE EXCEPTION 'Nothing to pay' USING HINT = 'not_payable';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.booking_emails AS email
    WHERE email.appointment_id = v_visit.id AND email.kind = 'reserved'
      AND email.claimed_at > now() - interval '5 minutes'
  ) THEN
    RAISE EXCEPTION 'The link was sent a moment ago' USING HINT = 'recently_sent';
  END IF;
  DELETE FROM public.booking_emails AS email
  WHERE email.appointment_id = v_visit.id AND email.kind = 'reserved';
  RETURN QUERY SELECT v_visit.reference;
END;
$$;


ALTER FUNCTION "public"."centre_resend_payment_link"("p_appointment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."centre_settle_visit"("p_appointment_id" "uuid") RETURNS TABLE("reference" "text", "payment_intent_id" "text", "refund_minor" integer, "refunded_before_minor" integer, "settlement_id" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_open record;
  v_event bigint;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre settles payments'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.id = p_appointment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.appointment_events AS event
    WHERE event.appointment_id = v_visit.id AND event.kind = 'refund_issued'
      AND event.details ? 'settlement'
      AND event.occurred_at > now() - interval '1 minute'
  ) THEN
    RAISE EXCEPTION 'Settled a moment ago' USING HINT = 'recently_settled';
  END IF;

  SELECT * INTO v_open FROM private.open_settlements() AS open
  WHERE open.appointment_id = v_visit.id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nothing is owed' USING HINT = 'nothing_owed';
  END IF;
  SELECT * INTO v_payment FROM public.payments AS payment
  WHERE payment.id = v_open.payment_id
  FOR UPDATE;

  -- A payment without a visit: all of it is owed.
  IF v_open.kind = 'paid_without_visit' THEN
    UPDATE public.appointments
    SET refund_due_minor = v_payment.amount_minor
    WHERE id = v_visit.id;
  END IF;

  INSERT INTO public.appointment_events (appointment_id, kind, actor, actor_user_id, details)
  VALUES (v_visit.id, 'refund_issued', 'centre', (SELECT auth.uid()),
    jsonb_build_object(
      'refund_minor', v_open.owed_minor,
      'settlement', v_open.kind,
      'reason', CASE v_open.kind
        WHEN 'paid_without_visit' THEN 'Zwrot płatności za wizytę, która się nie odbyła'
        ELSE 'Ponowienie zwrotu' END
    ))
  RETURNING id INTO v_event;
  -- The e-mail about it (one per refund): the last one's row opens again.
  UPDATE public.booking_emails
  SET sent_at = NULL, provider_message_id = NULL,
      claimed_at = now() - interval '1 hour'
  WHERE appointment_id = v_visit.id AND kind = 'refunded';

  RETURN QUERY SELECT v_visit.reference, v_payment.payment_intent_id,
    v_open.owed_minor, v_payment.refunded_minor, v_event;
END;
$$;


ALTER FUNCTION "public"."centre_settle_visit"("p_appointment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_booking_email"("p_reference" "text", "p_kind" "text") RETURNS TABLE("reference" "text", "mode" "public"."visit_mode", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "service_name" "text", "specialist_name" "text", "room_name" "text", "location_name" "text", "location_address" "text", "price_minor" integer, "currency_code" "text", "client_name" "text", "client_email" "text", "manage_token" "text", "cancelled_by" "text", "booked_by" "text", "paid" boolean, "payment_due_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_token text;
  v_ready boolean;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.reference = p_reference
  FOR UPDATE;
  IF NOT FOUND OR v_visit.client_email IS NULL THEN
    RETURN;
  END IF;
  v_ready := CASE p_kind
    WHEN 'cancelled' THEN v_visit.status = 'cancelled'
    WHEN 'reserved' THEN v_visit.status = 'awaiting_payment' AND v_visit.payment_due_at > now()
    WHEN 'payment_reminder' THEN v_visit.status = 'awaiting_payment' AND v_visit.payment_due_at > now()
    WHEN 'payment_last_call' THEN v_visit.status = 'awaiting_payment' AND v_visit.payment_due_at > now()
    WHEN 'reminder' THEN v_visit.status = 'confirmed' AND lower(v_visit.during) > now()
    WHEN 'rescheduled' THEN v_visit.status IN ('confirmed', 'awaiting_payment')
    WHEN 'refunded' THEN EXISTS (
      SELECT 1 FROM public.appointment_events AS event
      WHERE event.appointment_id = v_visit.id AND event.kind = 'refund_issued'
    )
    ELSE v_visit.status = 'confirmed'
  END;
  IF NOT v_ready THEN
    RETURN;
  END IF;

  INSERT INTO public.booking_emails AS email (appointment_id, kind)
  VALUES (v_visit.id, p_kind)
  ON CONFLICT (appointment_id, kind) DO UPDATE
  SET claimed_at = now()
  WHERE email.sent_at IS NULL AND email.claimed_at < now() - interval '10 minutes';
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_kind IN ('confirmation', 'reminder', 'reserved', 'payment_reminder', 'payment_last_call', 'refunded')
     OR (p_kind = 'cancelled' AND v_visit.cancelled_by = 'centre')
     OR (p_kind = 'rescheduled' AND (
       SELECT event.actor FROM public.appointment_events AS event
       WHERE event.appointment_id = v_visit.id AND event.kind = 'rescheduled'
       ORDER BY event.id DESC LIMIT 1
     ) = 'centre') THEN
    v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
    UPDATE public.appointments
    SET manage_token_hash = extensions.digest(v_token, 'sha256')
    WHERE id = v_visit.id;
  END IF;

  RETURN QUERY
  SELECT v_visit.reference, v_visit.mode, lower(v_visit.during), upper(v_visit.during),
    service.name, profile.display_name, room.name, location.name,
    nullif(concat_ws(', ',
      nullif(concat_ws(' ', location.address_line1, location.address_line2), ''),
      nullif(concat_ws(' ', location.postal_code, location.city), '')
    ), ''),
    v_visit.price_minor, v_visit.currency_code,
    v_visit.client_name, v_visit.client_email, v_token, v_visit.cancelled_by,
    v_visit.booked_by,
    EXISTS (
      SELECT 1 FROM public.payments AS payment
      WHERE payment.appointment_id = v_visit.id
        AND payment.status IN ('succeeded', 'refunded', 'partially_refunded')
    ),
    v_visit.payment_due_at
  FROM public.services AS service
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = v_visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = v_visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE service.id = v_visit.service_id;
END;
$$;


ALTER FUNCTION "public"."claim_booking_email"("p_reference" "text", "p_kind" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."client_duplicates"("p_client" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "email" "text", "phone" "text", "reason" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT other.id, other.name, other.email, other.phone,
    CASE
      WHEN lower(btrim(other.name)) = lower(btrim(this.name)) THEN 'name'
      ELSE 'phone'
    END
  FROM public.clients AS this
  JOIN public.clients AS other ON other.id <> this.id
  WHERE this.id = p_client
    AND public.has_role('admin')
    AND other.forgotten_at IS NULL
    AND (
      lower(btrim(other.name)) = lower(btrim(this.name))
      OR (
        length(regexp_replace(coalesce(this.phone, ''), '\D', '', 'g')) >= 9
        AND right(regexp_replace(coalesce(other.phone, ''), '\D', '', 'g'), 9)
          = right(regexp_replace(this.phone, '\D', '', 'g'), 9)
      )
    )
  ORDER BY other.name
  LIMIT 10;
$$;


ALTER FUNCTION "public"."client_duplicates"("p_client" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_visit"("p_visit" "uuid", "p_outcome" "public"."visit_outcome", "p_tags" "text"[] DEFAULT '{}'::"text"[], "p_note" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_visit public.appointments;
BEGIN
  SELECT * INTO v_visit FROM public.appointments WHERE id = p_visit;
  IF v_visit.id IS NULL THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  IF NOT private.may_close_visit(p_visit) THEN
    RAISE EXCEPTION 'Not your visit' USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  IF v_visit.status <> 'confirmed' OR lower(v_visit.during) > now() THEN
    RAISE EXCEPTION 'Only a held visit, once begun' USING HINT = 'not_closable';
  END IF;
  BEGIN
    INSERT INTO public.visit_closures AS closure
      (appointment_id, outcome, tags, note, closed_by)
    VALUES (
      p_visit, p_outcome,
      ARRAY(SELECT DISTINCT unnest(coalesce(p_tags, '{}'))),
      nullif(btrim(p_note), ''),
      (SELECT auth.uid())
    )
    ON CONFLICT (appointment_id) DO UPDATE
    SET outcome = EXCLUDED.outcome, tags = EXCLUDED.tags, note = EXCLUDED.note,
      closed_by = EXCLUDED.closed_by, updated_at = now();
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'Tags or note not valid' USING HINT = 'invalid';
  END;
  -- The reminder about it is done with.
  UPDATE public.notifications SET read_at = coalesce(read_at, now())
  WHERE appointment_id = p_visit AND kind = 'visit_to_close';
END;
$$;


ALTER FUNCTION "public"."close_visit"("p_visit" "uuid", "p_outcome" "public"."visit_outcome", "p_tags" "text"[], "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."company_details"() RETURNS TABLE("legal_name" "text", "tax_id" "text", "regon" "text", "registered_address" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT settings.legal_name, settings.tax_id, settings.regon,
    settings.registered_address
  FROM public.center_settings AS settings
  WHERE settings.id = 1;
$$;


ALTER FUNCTION "public"."company_details"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_visit_views"("p_views" "jsonb") RETURNS TABLE("view_id" "text", "total" bigint)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
DECLARE
  v_view jsonb;
BEGIN
  IF jsonb_typeof(p_views) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_views) > 20 THEN
    RAISE EXCEPTION 'Invalid views' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  FOR v_view IN SELECT value FROM jsonb_array_elements(p_views) LOOP
    view_id := v_view->>'id';
    SELECT coalesce(max(found.total_count), 0) INTO total
    FROM public.search_bookings(
      p_query => v_view->>'query',
      p_statuses => (SELECT array_agg(one) FROM jsonb_array_elements_text(v_view->'statuses') AS one),
      p_payments => (SELECT array_agg(one) FROM jsonb_array_elements_text(v_view->'payments') AS one),
      p_specialist_ids => (SELECT array_agg(one::uuid) FROM jsonb_array_elements_text(v_view->'specialistIds') AS one),
      p_service_ids => (SELECT array_agg(one::uuid) FROM jsonb_array_elements_text(v_view->'serviceIds') AS one),
      p_room_ids => (SELECT array_agg(one::uuid) FROM jsonb_array_elements_text(v_view->'roomIds') AS one),
      p_online => (v_view->>'online')::boolean,
      p_from => (v_view->>'from')::timestamptz,
      p_to => (v_view->>'to')::timestamptz,
      p_created_from => (v_view->>'createdFrom')::timestamptz,
      p_created_to => (v_view->>'createdTo')::timestamptz,
      p_changed_from => (v_view->>'changedFrom')::timestamptz,
      p_changed_to => (v_view->>'changedTo')::timestamptz,
      p_limit => 1,
      p_own => coalesce((v_view->>'own')::boolean, false)
    ) AS found;
    RETURN NEXT;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."count_visit_views"("p_views" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_announcement"() RETURNS TABLE("id" "uuid", "message" "text", "link_label" "text", "link_href" "text", "ends_on" "date")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT a.id, a.message, a.link_label, a.link_href, a.ends_on
  FROM public.site_announcements AS a
  CROSS JOIN public.center_settings AS settings
  WHERE settings.id = 1
    AND (now() AT TIME ZONE settings.timezone)::date BETWEEN a.starts_on AND a.ends_on
  ORDER BY a.starts_on DESC, a.created_at DESC
  LIMIT 1;
$$;


ALTER FUNCTION "public"."current_announcement"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_availability_occurrence"("p_rule_id" "uuid", "p_date" "date", "p_scope" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  rule public.specialist_availability_rules%ROWTYPE;
BEGIN
  PERFORM private.managed_rule_owner(p_rule_id);
  SELECT * INTO rule FROM public.specialist_availability_rules WHERE id = p_rule_id;

  IF p_scope NOT IN ('this', 'following', 'all') THEN
    RAISE EXCEPTION 'Unknown scope' USING ERRCODE = '22023';
  END IF;

  IF p_scope = 'all' OR rule.recurrence = 'once' THEN
    DELETE FROM public.specialist_availability_rules WHERE id = p_rule_id;
    RETURN;
  END IF;

  IF NOT private.availability_rule_on(p_rule_id, p_date) THEN
    RAISE EXCEPTION 'Occurrence not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_scope = 'this' THEN
    INSERT INTO public.specialist_availability_exceptions (rule_id, date)
    VALUES (p_rule_id, p_date);
    RETURN;
  END IF;

  -- 'following': nothing left before the date means the whole series goes.
  IF NOT EXISTS (
    SELECT 1
    FROM generate_series(0, p_date - rule.valid_from - 1) AS offset_days(n)
    WHERE private.availability_rule_on(p_rule_id, rule.valid_from + offset_days.n)
  ) THEN
    DELETE FROM public.specialist_availability_rules WHERE id = p_rule_id;
    RETURN;
  END IF;

  UPDATE public.specialist_availability_rules
  SET valid_until = p_date - 1, occurrence_count = NULL
  WHERE id = p_rule_id;
  DELETE FROM public.specialist_availability_exceptions
  WHERE rule_id = p_rule_id AND date >= p_date;
END;
$$;


ALTER FUNCTION "public"."delete_availability_occurrence"("p_rule_id" "uuid", "p_date" "date", "p_scope" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_availability_rule"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT specialist_id INTO owner_id
  FROM public.specialist_availability_rules
  WHERE id = p_id
  FOR UPDATE;

  -- Someone else's window looks the same as a missing one.
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Availability window not found' USING ERRCODE = 'P0002';
  END IF;
  BEGIN
    PERFORM private.managed_specialist_id(owner_id);
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE EXCEPTION 'Availability window not found' USING ERRCODE = 'P0002';
  END;

  DELETE FROM public.specialist_availability_rules WHERE id = p_id;
END;
$$;


ALTER FUNCTION "public"."delete_availability_rule"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_time_off"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT specialist_id INTO owner_id
  FROM public.specialist_time_off
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Time off not found' USING ERRCODE = 'P0002';
  END IF;
  BEGIN
    PERFORM private.managed_specialist_id(owner_id);
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE EXCEPTION 'Time off not found' USING ERRCODE = 'P0002';
  END;

  DELETE FROM public.specialist_time_off WHERE id = p_id;
END;
$$;


ALTER FUNCTION "public"."delete_time_off"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."edit_availability_occurrence"("p_rule_id" "uuid", "p_date" "date", "p_scope" "text", "p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_mode" "public"."availability_mode", "p_room_id" "uuid" DEFAULT NULL::"uuid", "p_interval_weeks" smallint DEFAULT 1, "p_valid_until" "date" DEFAULT NULL::"date", "p_occurrence_count" smallint DEFAULT NULL::smallint, "p_note" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  owner_id uuid;
  rule public.specialist_availability_rules%ROWTYPE;
BEGIN
  owner_id := private.managed_rule_owner(p_rule_id);
  SELECT * INTO rule FROM public.specialist_availability_rules WHERE id = p_rule_id;

  IF p_scope NOT IN ('this', 'following', 'all') THEN
    RAISE EXCEPTION 'Unknown scope' USING ERRCODE = '22023';
  END IF;

  IF p_scope = 'all' OR rule.recurrence = 'once' THEN
    RETURN private.write_availability_rule(
      owner_id, p_rule_id, p_recurrence, p_weekdays, p_interval_weeks,
      p_starts_at, p_ends_at, p_valid_from, p_valid_until, p_occurrence_count,
      p_mode, p_room_id, p_note
    );
  END IF;

  IF NOT private.availability_rule_on(p_rule_id, p_date) THEN
    RAISE EXCEPTION 'Occurrence not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_scope = 'this' THEN
    INSERT INTO public.specialist_availability_exceptions (rule_id, date)
    VALUES (p_rule_id, p_date);
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM generate_series(0, p_date - rule.valid_from - 1) AS offset_days(n)
      WHERE private.availability_rule_on(p_rule_id, rule.valid_from + offset_days.n)
    ) THEN
      -- From the first occurrence: the rule itself changes.
      RETURN private.write_availability_rule(
        owner_id, p_rule_id, p_recurrence, p_weekdays, p_interval_weeks,
        p_starts_at, p_ends_at, p_valid_from, p_valid_until, p_occurrence_count,
        p_mode, p_room_id, p_note
      );
    END IF;
    UPDATE public.specialist_availability_rules
    SET valid_until = p_date - 1, occurrence_count = NULL
    WHERE id = p_rule_id;
    DELETE FROM public.specialist_availability_exceptions
    WHERE rule_id = p_rule_id AND date >= p_date;
  END IF;

  RETURN private.write_availability_rule(
    owner_id, NULL,
    CASE WHEN p_scope = 'this' THEN 'once'::public.availability_recurrence ELSE p_recurrence END,
    p_weekdays, p_interval_weeks, p_starts_at, p_ends_at,
    p_valid_from, p_valid_until, p_occurrence_count, p_mode, p_room_id, p_note
  );
END;
$$;


ALTER FUNCTION "public"."edit_availability_occurrence"("p_rule_id" "uuid", "p_date" "date", "p_scope" "text", "p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_mode" "public"."availability_mode", "p_room_id" "uuid", "p_interval_weeks" smallint, "p_valid_until" "date", "p_occurrence_count" smallint, "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fail_checkout_session"("p_session_id" "text", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
BEGIN
  IF p_reason NOT IN ('failed', 'expired') THEN
    RAISE EXCEPTION 'Unknown reason %', p_reason USING ERRCODE = 'invalid_parameter_value';
  END IF;
  UPDATE public.payments
  SET status = p_reason::public.payment_status
  WHERE checkout_session_id = p_session_id AND status = 'pending'
  RETURNING * INTO v_payment;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  UPDATE public.appointments SET status = 'expired'
  WHERE id = v_payment.appointment_id
    AND (status = 'held' OR (status = 'awaiting_payment' AND payment_due_at IS NULL));
END;
$$;


ALTER FUNCTION "public"."fail_checkout_session"("p_session_id" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."forget_client"("p_client" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only an admin may do this.'
      USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client) THEN
    RAISE EXCEPTION 'No such client.' USING ERRCODE = 'P0002', HINT = 'not_found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.clients WHERE id = p_client AND forgotten_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Already removed.' USING ERRCODE = 'P0001', HINT = 'already_forgotten';
  END IF;
  IF private.client_has_open_business(p_client) THEN
    RAISE EXCEPTION 'A visit to come or money owed.'
      USING ERRCODE = 'P0001', HINT = 'client_busy';
  END IF;
  PERFORM private.forget_client_data(p_client);
END;
$$;


ALTER FUNCTION "public"."forget_client"("p_client" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fulfill_checkout_session"("p_session_id" "text", "p_paid" boolean, "p_payment_intent_id" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_visit public.appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM public.payments
  WHERE checkout_session_id = p_session_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'unknown_session';
  END IF;
  SELECT * INTO v_visit FROM public.appointments
  WHERE id = v_payment.appointment_id
  FOR UPDATE;

  IF p_paid THEN
    UPDATE public.payments
    SET status = CASE WHEN status IN ('refunded', 'partially_refunded') THEN status ELSE 'succeeded' END,
        payment_intent_id = coalesce(p_payment_intent_id, payment_intent_id)
    WHERE id = v_payment.id;
  END IF;

  IF v_visit.status = 'confirmed' THEN
    RETURN 'already_confirmed';
  END IF;
  IF v_visit.status = 'cancelled' THEN
    RETURN 'slot_lost';
  END IF;

  BEGIN
    IF p_paid THEN
      UPDATE public.appointments
      SET status = 'confirmed', confirmed_at = now(), hold_expires_at = NULL
      WHERE id = v_visit.id;
      RETURN 'confirmed';
    END IF;
    UPDATE public.appointments
    SET status = 'awaiting_payment', hold_expires_at = NULL
    WHERE id = v_visit.id;
    RETURN 'awaiting_payment';
  EXCEPTION WHEN exclusion_violation THEN
    -- The hold lapsed and someone else has the time now.
    UPDATE public.appointments SET status = 'expired'
    WHERE id = v_visit.id AND status IN ('held', 'awaiting_payment');
    RETURN 'slot_lost';
  END;
END;
$$;


ALTER FUNCTION "public"."fulfill_checkout_session"("p_session_id" "text", "p_paid" boolean, "p_payment_intent_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_booking"("p_access_token" "text") RETURNS TABLE("reference" "text", "status" "public"."appointment_status", "mode" "public"."visit_mode", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "hold_expires_at" timestamp with time zone, "service_name" "text", "specialist_name" "text", "room_name" "text", "location_name" "text", "price_minor" integer, "currency_code" "text", "client_name" "text", "client_email" "text", "client_phone" "text", "client_notes" "text", "details_saved" boolean, "reschedule_count" integer, "cancelled_by" "text", "refund_due_minor" integer, "refunded_minor" integer, "booked_by" "text", "paid" boolean, "payment_due_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT visit.reference, visit.status, visit.mode,
    lower(visit.during), upper(visit.during), visit.hold_expires_at,
    service.name, profile.display_name, room.name, location.name,
    visit.price_minor, visit.currency_code,
    visit.client_name, visit.client_email, visit.client_phone, visit.client_notes,
    visit.terms_accepted_at IS NOT NULL AND visit.privacy_accepted_at IS NOT NULL,
    visit.reschedule_count, visit.cancelled_by, visit.refund_due_minor,
    coalesce((
      SELECT sum(payment.refunded_minor)::integer FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
    ), 0),
    visit.booked_by,
    EXISTS (
      SELECT 1 FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
        AND payment.status IN ('succeeded', 'refunded', 'partially_refunded')
    ),
    visit.payment_due_at
  FROM public.appointments AS visit
  JOIN public.services AS service ON service.id = visit.service_id
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE visit.access_token_hash = extensions.digest(p_access_token, 'sha256')
     OR visit.manage_token_hash = extensions.digest(p_access_token, 'sha256');
$$;


ALTER FUNCTION "public"."get_booking"("p_access_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_client"("p_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "email" "text", "phone" "text", "notes" "text", "visits" integer, "upcoming" integer, "cancelled" integer, "last_visit_at" timestamp with time zone, "next_visit_at" timestamp with time zone, "paid_minor" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre sees its clients'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT client.id, client.name, client.email, client.phone, client.notes,
    coalesce(totals.visits, 0), coalesce(totals.upcoming, 0),
    coalesce(totals.cancelled, 0), totals.last_visit_at, totals.next_visit_at,
    coalesce(totals.paid_minor, 0), client.created_at, client.updated_at
  FROM public.clients AS client
  LEFT JOIN private.client_totals() AS totals ON totals.client_id = client.id
  WHERE client.id = p_id;
END;
$$;


ALTER FUNCTION "public"."get_client"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_visit"("p_id" "uuid", "p_own" boolean DEFAULT false) RETURNS TABLE("id" "uuid", "reference" "text", "status" "public"."appointment_status", "mode" "public"."visit_mode", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "service_id" "uuid", "service_name" "text", "specialist_id" "uuid", "specialist_name" "text", "specialist_color" "text", "room_id" "uuid", "room_name" "text", "room_color" "text", "location_name" "text", "client_id" "uuid", "client_name" "text", "client_email" "text", "client_phone" "text", "client_notes" "text", "price_minor" integer, "currency_code" "text", "paid" boolean, "refund_due_minor" integer, "refunded_minor" integer, "cancelled_by" "text", "cancelled_at" timestamp with time zone, "reschedule_count" integer, "created_at" timestamp with time zone, "confirmed_at" timestamp with time zone, "payment_due_at" timestamp with time zone, "emails" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_admin boolean := public.has_role('admin') AND NOT p_own;
BEGIN
  RETURN QUERY
  SELECT v.*,
    CASE WHEN v_admin THEN coalesce((
      SELECT jsonb_agg(jsonb_build_object('kind', email.kind, 'sent_at', email.sent_at)
        ORDER BY email.claimed_at)
      FROM public.booking_emails AS email
      WHERE email.appointment_id = v.id AND email.sent_at IS NOT NULL
    ), '[]'::jsonb) END
  FROM private.visible_visits(p_own) AS v
  WHERE v.id = p_id;
END;
$$;


ALTER FUNCTION "public"."get_visit"("p_id" "uuid", "p_own" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_visit_client"("p_visit_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "email" "text", "phone" "text", "notes" "text", "visits" integer, "upcoming" integer, "cancelled" integer, "last_visit_at" timestamp with time zone, "next_visit_at" timestamp with time zone, "paid_minor" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre sees its clients'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT found.*
  FROM public.appointments AS visit
  CROSS JOIN LATERAL public.get_client(visit.client_id) AS found
  WHERE visit.id = p_visit_id AND visit.client_id IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."get_visit_client"("p_visit_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_visit_closure"("p_visit" "uuid") RETURNS TABLE("outcome" "public"."visit_outcome", "tags" "text"[], "note" "text", "closed_at" timestamp with time zone, "closed_by_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT closure.outcome, closure.tags, closure.note, closure.updated_at,
    nullif(btrim(concat_ws(' ', profile.first_name, profile.last_name)), '')
  FROM public.visit_closures AS closure
  LEFT JOIN public.profiles AS profile ON profile.id = closure.closed_by
  WHERE closure.appointment_id = p_visit
    AND private.may_close_visit(p_visit);
$$;


ALTER FUNCTION "public"."get_visit_closure"("p_visit" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."grant_admin"("p_user" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only an admin may do this.'
      USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user) THEN
    RAISE EXCEPTION 'No such user.' USING ERRCODE = 'P0002', HINT = 'not_found';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user, 'admin')
  ON CONFLICT DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."grant_admin"("p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("required_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = required_role
    );
$$;


ALTER FUNCTION "public"."has_role"("required_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hold_slot"("p_service_slug" "text", "p_specialist_slug" "text", "p_mode" "public"."visit_mode", "p_starts_at" timestamp with time zone, "p_client_key" "text", "p_location_slug" "text" DEFAULT NULL::"text") RETURNS TABLE("appointment_id" "uuid", "reference" "text", "access_token" "text", "hold_expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_settings public.center_settings%ROWTYPE;
  v_offer public.specialist_services%ROWTYPE;
  v_location uuid;
  v_day date;
  v_slot record;
  v_token text;
  v_reference text;
  v_id uuid;
  v_expires timestamptz;
BEGIN
  IF p_client_key IS NULL OR char_length(p_client_key) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION 'A visitor key is required' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_settings FROM public.center_settings WHERE id = 1;
  SELECT * INTO v_offer FROM public.specialist_services
  WHERE id = private.bookable_offer(p_service_slug, p_specialist_slug, p_mode);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This service cannot be booked with this specialist'
      USING HINT = 'not_bookable';
  END IF;
  IF p_location_slug IS NOT NULL THEN
    v_location := private.public_location_id(p_location_slug);
    IF v_location IS NULL THEN
      RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('booking:visitor:' || p_client_key, 0));
  DELETE FROM private.booking_holds WHERE created_at < now() - interval '1 hour';
  IF (
    SELECT count(*) FROM private.booking_holds AS attempt
    WHERE attempt.client_key = p_client_key
      AND attempt.created_at > now() - interval '15 minutes'
  ) >= 5 THEN
    RAISE EXCEPTION 'Too many holds, try again later' USING HINT = 'too_many_holds';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('booking:specialist:' || v_offer.specialist_id, 0));

  UPDATE public.appointments SET status = 'expired'
  WHERE status = 'held' AND hold_expires_at <= now();
  PERFORM private.cancel_overdue_payments();

  v_day := (p_starts_at AT TIME ZONE v_settings.timezone)::date;
  SELECT * INTO v_slot
  FROM private.free_slots(v_offer.id, p_mode, v_day, v_day, v_location) AS slot
  WHERE slot.starts_at = p_starts_at;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
  END IF;

  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  v_reference := private.next_booking_reference(now(), v_settings.timezone);
  v_expires := now() + make_interval(mins => v_settings.hold_minutes);

  BEGIN
    INSERT INTO public.appointments (
      reference, specialist_id, service_id, specialist_service_id,
      availability_rule_id, mode, room_id, during, buffer_minutes,
      duration_minutes, price_minor, currency_code, status, hold_expires_at,
      access_token_hash
    )
    VALUES (
      v_reference, v_offer.specialist_id, v_offer.service_id, v_offer.id,
      v_slot.rule_id, p_mode, v_slot.room_id,
      tstzrange(v_slot.starts_at, v_slot.ends_at),
      v_settings.default_visit_buffer_minutes,
      (extract(epoch FROM v_slot.ends_at - v_slot.starts_at) / 60)::integer,
      v_offer.price_minor, v_offer.currency_code, 'held', v_expires,
      extensions.digest(v_token, 'sha256')
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
  END;

  INSERT INTO private.booking_holds (client_key) VALUES (p_client_key);

  RETURN QUERY SELECT v_id, v_reference, v_token, v_expires;
END;
$$;


ALTER FUNCTION "public"."hold_slot"("p_service_slug" "text", "p_specialist_slug" "text", "p_mode" "public"."visit_mode", "p_starts_at" timestamp with time zone, "p_client_key" "text", "p_location_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_bookable_offers"() RETURNS TABLE("service_id" "uuid", "service_slug" "text", "service_name" "text", "service_short_description" "text", "service_description" "text", "service_category" "public"."service_category", "service_default_duration_minutes" integer, "specialist_slug" "text", "specialist_name" "text", "specialist_title" "text", "specialist_photo_path" "text", "duration_minutes" integer, "price_minor" integer, "currency_code" "text", "supports_in_person" boolean, "supports_online" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT service.id, service.slug, service.name, service.short_description,
    service.description, service.category, service.default_duration_minutes,
    specialist.public_slug, profile.display_name, specialist.professional_title,
    profile.profile_photo_url,
    coalesce(offer.duration_minutes, service.default_duration_minutes),
    offer.price_minor, offer.currency_code,
    offer.supports_in_person, offer.supports_online
  FROM public.specialist_services AS offer
  JOIN public.services AS service ON service.id = offer.service_id
  JOIN public.specialists AS specialist ON specialist.id = offer.specialist_id
  JOIN public.specialist_public_profiles AS profile ON profile.specialist_id = specialist.id
  WHERE offer.id IN (SELECT private.bookable_offers())
  ORDER BY service.sort_order, service.name, profile.display_name;
$$;


ALTER FUNCTION "public"."list_bookable_offers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_client_visits"("p_client_id" "uuid") RETURNS TABLE("id" "uuid", "reference" "text", "status" "public"."appointment_status", "mode" "public"."visit_mode", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "service_name" "text", "specialist_id" "uuid", "specialist_name" "text", "specialist_color" "text", "room_id" "uuid", "room_name" "text", "room_color" "text", "location_name" "text", "client_name" "text", "client_email" "text", "client_phone" "text", "client_notes" "text", "price_minor" integer, "currency_code" "text", "paid" boolean, "refund_due_minor" integer, "refunded_minor" integer, "cancelled_by" "text", "cancelled_at" timestamp with time zone, "reschedule_count" integer, "payment_due_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre sees its clients'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT v.id, v.reference, v.status, v.mode, v.starts_at, v.ends_at,
    v.service_name, v.specialist_id, v.specialist_name, v.specialist_color,
    v.room_id, v.room_name, v.room_color, v.location_name,
    v.client_name, v.client_email, v.client_phone, v.client_notes,
    v.price_minor, v.currency_code, v.paid, v.refund_due_minor, v.refunded_minor,
    v.cancelled_by, v.cancelled_at, v.reschedule_count, v.payment_due_at
  FROM private.visible_visits(false) AS v
  JOIN public.appointments AS visit ON visit.id = v.id
  WHERE visit.client_id = p_client_id
  ORDER BY v.starts_at DESC, v.reference;
END;
$$;


ALTER FUNCTION "public"."list_client_visits"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_due_emails"() RETURNS TABLE("reference" "text", "kind" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  WITH settings AS (
    SELECT visit_reminder_hours, payment_reminder_hours
    FROM public.center_settings
    WHERE id = 1
  ),
  due AS (
    -- Cancelled for want of payment, lately.
    SELECT visit.id, visit.reference, 'cancelled' AS kind
    FROM public.appointments AS visit
    WHERE visit.status = 'cancelled' AND visit.cancelled_by = 'system'
      AND visit.cancelled_at > now() - interval '7 days'
      AND visit.client_email IS NOT NULL
    UNION ALL
    -- The set time before the payment is due (for reservations made
    -- before that); none when the centre has switched it off.
    SELECT visit.id, visit.reference, 'payment_reminder'
    FROM public.appointments AS visit
    CROSS JOIN settings
    WHERE settings.payment_reminder_hours IS NOT NULL
      AND visit.status = 'awaiting_payment'
      AND visit.payment_due_at > now() + interval '6 hours'
      AND visit.payment_due_at
        <= now() + make_interval(hours => settings.payment_reminder_hours)
      AND visit.created_at
        < visit.payment_due_at - make_interval(hours => settings.payment_reminder_hours)
    UNION ALL
    -- The last call, six hours before.
    SELECT visit.id, visit.reference, 'payment_last_call'
    FROM public.appointments AS visit
    WHERE visit.status = 'awaiting_payment'
      AND visit.payment_due_at > now()
      AND visit.payment_due_at <= now() + interval '6 hours'
      AND visit.created_at < visit.payment_due_at - interval '6 hours'
    UNION ALL
    -- The set time before a paid visit (for visits booked before that);
    -- none when the centre has switched reminders off.
    SELECT visit.id, visit.reference, 'reminder'
    FROM public.appointments AS visit
    CROSS JOIN settings
    WHERE settings.visit_reminder_hours IS NOT NULL
      AND visit.status = 'confirmed'
      AND lower(visit.during) > now()
      AND lower(visit.during)
        <= now() + make_interval(hours => settings.visit_reminder_hours)
      AND visit.created_at
        < lower(visit.during) - make_interval(hours => settings.visit_reminder_hours)
  )
  SELECT due.reference, due.kind FROM due
  WHERE NOT EXISTS (
    SELECT 1 FROM public.booking_emails AS email
    WHERE email.appointment_id = due.id AND email.kind = due.kind
      AND (email.sent_at IS NOT NULL OR email.claimed_at > now() - interval '10 minutes')
  );
$$;


ALTER FUNCTION "public"."list_due_emails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_free_slots"("p_service_slug" "text", "p_specialist_slug" "text", "p_mode" "public"."visit_mode", "p_from" "date", "p_to" "date", "p_location_slug" "text" DEFAULT NULL::"text") RETURNS TABLE("starts_at" timestamp with time zone, "ends_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_location uuid;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 13 THEN
    RAISE EXCEPTION 'A range of one to 14 days is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_location_slug IS NOT NULL THEN
    v_location := private.public_location_id(p_location_slug);
    IF v_location IS NULL THEN RETURN; END IF;
  END IF;

  RETURN QUERY
  SELECT slot.starts_at, slot.ends_at
  FROM private.free_slots(
    private.bookable_offer(p_service_slug, p_specialist_slug, p_mode),
    p_mode, p_from, p_to, v_location
  ) AS slot
  ORDER BY slot.starts_at;
END;
$$;


ALTER FUNCTION "public"."list_free_slots"("p_service_slug" "text", "p_specialist_slug" "text", "p_mode" "public"."visit_mode", "p_from" "date", "p_to" "date", "p_location_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_portal_users"() RETURNS TABLE("user_id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "is_admin" boolean, "is_specialist" boolean, "signed_in_at" timestamp with time zone, "invited_at" timestamp with time zone, "joined" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT account.id, account.email::text, profile.first_name, profile.last_name,
    EXISTS (
      SELECT 1 FROM public.user_roles AS role
      WHERE role.user_id = account.id AND role.role = 'admin'
    ),
    EXISTS (
      SELECT 1 FROM public.user_roles AS role
      WHERE role.user_id = account.id AND role.role = 'specialist'
    ),
    account.last_sign_in_at,
    account.invited_at,
    account.last_sign_in_at IS NOT NULL
  FROM auth.users AS account
  JOIN public.profiles AS profile ON profile.id = account.id
  WHERE public.has_role('admin')
    AND EXISTS (SELECT 1 FROM public.user_roles AS role WHERE role.user_id = account.id)
  ORDER BY profile.last_name, profile.first_name, account.email;
$$;


ALTER FUNCTION "public"."list_portal_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_public_room_locations"() RETURNS TABLE("room_id" "uuid", "room_slug" "text", "location_id" "uuid", "location_name" "text", "location_slug" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT
    rooms.id AS room_id,
    rooms.slug AS room_slug,
    locations.id AS location_id,
    locations.name AS location_name,
    locations.slug AS location_slug
  FROM public.rooms
  JOIN public.locations ON locations.id = rooms.location_id
  WHERE rooms.active
    AND rooms.publicly_visible
    AND locations.active
    AND locations.publicly_visible;
$$;


ALTER FUNCTION "public"."list_public_room_locations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_published_room_placements"() RETURNS TABLE("room_id" "uuid", "location_id" "uuid", "sort_order" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT room.id, room.location_id, room.sort_order
  FROM public.rooms AS room
  JOIN public.room_public_profiles AS profile ON profile.room_id = room.id
  JOIN public.locations AS location ON location.id = room.location_id
  WHERE room.active
    AND room.publicly_visible
    AND profile.published
    AND location.active
    AND location.publicly_visible
  ORDER BY room.sort_order, profile.display_name;
$$;


ALTER FUNCTION "public"."list_published_room_placements"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_reschedule_slots"("p_manage_token" "text", "p_from" "date", "p_to" "date") RETURNS TABLE("starts_at" timestamp with time zone, "ends_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_location uuid;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 13 THEN
    RAISE EXCEPTION 'A range of one to 14 days is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.manage_token_hash = extensions.digest(p_manage_token, 'sha256');
  IF NOT FOUND OR NOT private.self_reschedulable(v_visit) THEN
    RETURN;
  END IF;
  SELECT room.location_id INTO v_location FROM public.rooms AS room
  WHERE room.id = v_visit.room_id;

  RETURN QUERY
  SELECT slot.starts_at, slot.ends_at
  FROM private.free_slots(
    v_visit.specialist_service_id, v_visit.mode, p_from, p_to, v_location, v_visit.id
  ) AS slot
  WHERE slot.starts_at <> lower(v_visit.during)
  ORDER BY slot.starts_at;
END;
$$;


ALTER FUNCTION "public"."list_reschedule_slots"("p_manage_token" "text", "p_from" "date", "p_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_room_occupancy"("p_from" "date", "p_to" "date") RETURNS TABLE("room_id" "uuid", "day" "date", "starts_at" time without time zone, "ends_at" time without time zone, "specialist_id" "uuid", "specialist_name" "text", "specialist_first_name" "text", "specialist_last_name" "text", "specialist_avatar_url" "text", "specialist_photo_path" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT (
    public.has_role('specialist'::public.app_role)
    OR public.has_role('admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 62 THEN
    RAISE EXCEPTION 'Invalid date range' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    rule.room_id,
    candidate.day,
    rule.starts_at,
    rule.ends_at,
    rule.specialist_id,
    private.specialist_display_name(rule.specialist_id),
    person.first_name,
    person.last_name,
    nullif(trim(profile.avatar_url), ''),
    CASE WHEN public_profile.publication_status = 'published'
      THEN public_profile.profile_photo_url
    END
  FROM public.specialist_availability_rules AS rule
  JOIN public.rooms AS room ON room.id = rule.room_id AND room.active
  JOIN public.specialists AS specialist ON specialist.id = rule.specialist_id
  JOIN public.profiles AS profile ON profile.id = specialist.user_id
  LEFT JOIN public.specialist_public_profiles AS public_profile
    ON public_profile.specialist_id = specialist.id
  -- The account's name, else the public profile's.
  CROSS JOIN LATERAL (
    SELECT
      CASE WHEN trim(profile.first_name) <> '' OR trim(profile.last_name) <> ''
        THEN trim(profile.first_name) ELSE coalesce(trim(public_profile.first_name), '') END AS first_name,
      CASE WHEN trim(profile.first_name) <> '' OR trim(profile.last_name) <> ''
        THEN trim(profile.last_name) ELSE coalesce(trim(public_profile.last_name), '') END AS last_name
  ) AS person
  CROSS JOIN LATERAL (
    SELECT generated::date AS day
    FROM generate_series(
      greatest(p_from, rule.valid_from),
      least(p_to, coalesce(rule.valid_until, p_to)),
      interval '1 day'
    ) AS generated
  ) AS candidate
  WHERE rule.room_id IS NOT NULL
    AND rule.valid_from <= p_to
    AND (rule.valid_until IS NULL OR rule.valid_until >= p_from)
    AND private.availability_rule_on(rule.id, candidate.day)
  ORDER BY candidate.day, rule.starts_at;
END;
$$;


ALTER FUNCTION "public"."list_room_occupancy"("p_from" "date", "p_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_settlements"() RETURNS TABLE("appointment_id" "uuid", "reference" "text", "kind" "text", "status" "public"."appointment_status", "starts_at" timestamp with time zone, "client_name" "text", "client_email" "text", "client_phone" "text", "service_name" "text", "specialist_name" "text", "paid_minor" integer, "refunded_minor" integer, "owed_minor" integer, "currency_code" "text", "since" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre settles payments'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT visit.id, visit.reference, open.kind, visit.status, lower(visit.during),
    visit.client_name, visit.client_email, visit.client_phone,
    service.name, profile.display_name,
    payment.amount_minor, payment.refunded_minor, open.owed_minor,
    payment.currency_code, open.last_change_at
  FROM private.open_settlements() AS open
  JOIN public.appointments AS visit ON visit.id = open.appointment_id
  JOIN public.payments AS payment ON payment.id = open.payment_id
  JOIN public.services AS service ON service.id = visit.service_id
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = visit.specialist_id
  WHERE open.last_change_at < now() - interval '2 minutes'
  ORDER BY open.last_change_at;
END;
$$;


ALTER FUNCTION "public"."list_settlements"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_visit_events"("p_id" "uuid", "p_own" boolean DEFAULT false) RETURNS TABLE("id" bigint, "occurred_at" timestamp with time zone, "kind" "text", "actor" "text", "actor_name" "text", "details" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_admin boolean := public.has_role('admin') AND NOT p_own;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM private.visible_visits(p_own) AS v WHERE v.id = p_id) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT event.id, event.occurred_at, event.kind, event.actor,
    nullif(concat_ws(' ', account.first_name, account.last_name), ''),
    CASE WHEN v_admin THEN event.details
      ELSE event.details - 'price_minor' - 'refund_due_minor' - 'amount_minor'
        - 'refunded_minor' - 'refund_minor' END
  FROM public.appointment_events AS event
  LEFT JOIN public.profiles AS account ON account.id = event.actor_user_id
  WHERE event.appointment_id = p_id
    AND (v_admin OR event.kind NOT IN (
      'payment_started', 'payment_succeeded', 'payment_failed',
      'payment_expired', 'refund_recorded', 'refund_issued'))
    AND (v_admin OR event.kind <> 'email_sent' OR event.details ->> 'email' IS DISTINCT FROM 'refunded')
  ORDER BY event.occurred_at, event.id;
END;
$$;


ALTER FUNCTION "public"."list_visit_events"("p_id" "uuid", "p_own" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_visits"("p_from" "date", "p_to" "date", "p_specialist_id" "uuid" DEFAULT NULL::"uuid", "p_own" boolean DEFAULT false) RETURNS TABLE("id" "uuid", "reference" "text", "status" "public"."appointment_status", "mode" "public"."visit_mode", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "service_name" "text", "specialist_id" "uuid", "specialist_name" "text", "specialist_color" "text", "room_id" "uuid", "room_name" "text", "room_color" "text", "location_name" "text", "client_name" "text", "client_email" "text", "client_phone" "text", "client_notes" "text", "price_minor" integer, "currency_code" "text", "paid" boolean, "refund_due_minor" integer, "refunded_minor" integer, "cancelled_by" "text", "cancelled_at" timestamp with time zone, "reschedule_count" integer, "payment_due_at" timestamp with time zone, "held_until" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_tz text;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 62 THEN
    RAISE EXCEPTION 'A range of one to 63 days is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  SELECT timezone INTO v_tz FROM public.center_settings WHERE center_settings.id = 1;

  RETURN QUERY
  SELECT v.id, v.reference, v.status, v.mode, v.starts_at, v.ends_at,
    v.service_name, v.specialist_id, v.specialist_name, v.specialist_color,
    v.room_id, v.room_name, v.room_color, v.location_name,
    v.client_name, v.client_email, v.client_phone, v.client_notes,
    v.price_minor, v.currency_code, v.paid, v.refund_due_minor, v.refunded_minor,
    v.cancelled_by, v.cancelled_at, v.reschedule_count, v.payment_due_at,
    (SELECT upper(visit.blocks) FROM public.appointments AS visit WHERE visit.id = v.id)
  FROM private.visible_visits(p_own) AS v
  WHERE (v.starts_at AT TIME ZONE v_tz)::date BETWEEN p_from AND p_to
    AND (p_specialist_id IS NULL OR v.specialist_id = p_specialist_id)
  ORDER BY v.starts_at, v.reference;
END;
$$;


ALTER FUNCTION "public"."list_visits"("p_from" "date", "p_to" "date", "p_specialist_id" "uuid", "p_own" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_booking_email_sent"("p_reference" "text", "p_kind" "text", "p_message_id" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  UPDATE public.booking_emails AS email
  SET sent_at = now(), provider_message_id = p_message_id
  FROM public.appointments AS visit
  WHERE visit.reference = p_reference
    AND email.appointment_id = visit.id
    AND email.kind = p_kind;
$$;


ALTER FUNCTION "public"."mark_booking_email_sent"("p_reference" "text", "p_kind" "text", "p_message_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("p_id" bigint) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  WITH done AS (
    UPDATE public.notifications
    SET read_at = now()
    WHERE id = p_id
      AND user_id = (SELECT auth.uid())
      AND read_at IS NULL
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM done);
$$;


ALTER FUNCTION "public"."mark_notification_read"("p_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_unread"("p_id" bigint) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  WITH done AS (
    UPDATE public.notifications
    SET read_at = NULL
    WHERE id = p_id
      AND user_id = (SELECT auth.uid())
      AND read_at IS NOT NULL
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM done);
$$;


ALTER FUNCTION "public"."mark_notification_unread"("p_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notifications_read"("p_portal" "text") RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  WITH done AS (
    UPDATE public.notifications
    SET read_at = now()
    WHERE user_id = (SELECT auth.uid())
      AND portal = p_portal
      AND read_at IS NULL
    RETURNING 1
  )
  SELECT count(*)::integer FROM done;
$$;


ALTER FUNCTION "public"."mark_notifications_read"("p_portal" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merge_clients"("p_keep" "uuid", "p_merge" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_keep public.clients;
  v_merge public.clients;
  v_moved integer;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre merges its clients'
      USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  IF p_keep = p_merge THEN
    RAISE EXCEPTION 'The same client' USING HINT = 'same_client';
  END IF;
  SELECT * INTO v_keep FROM public.clients WHERE id = p_keep FOR UPDATE;
  SELECT * INTO v_merge FROM public.clients WHERE id = p_merge FOR UPDATE;
  IF v_keep.id IS NULL OR v_merge.id IS NULL THEN
    RAISE EXCEPTION 'No such client' USING HINT = 'not_found';
  END IF;

  UPDATE public.clients
  SET phone = coalesce(v_keep.phone, v_merge.phone),
    notes = nullif(concat_ws(E'\n\n', v_keep.notes, v_merge.notes), ''),
    created_at = least(v_keep.created_at, v_merge.created_at)
  WHERE id = p_keep;

  -- The visits to come: this card's details (one address for e-mails).
  UPDATE public.appointments
  SET client_name = v_keep.name,
    client_email = v_keep.email,
    client_phone = coalesce(v_keep.phone, v_merge.phone)
  WHERE client_id = p_merge
    AND status IN ('confirmed', 'awaiting_payment', 'held')
    AND lower(during) > now();

  -- Every visit of the other card belongs to this one.
  UPDATE public.appointments SET client_id = p_keep WHERE client_id = p_merge;
  GET DIAGNOSTICS v_moved = ROW_COUNT;

  DELETE FROM public.clients WHERE id = p_merge;
  RETURN v_moved;
END;
$$;


ALTER FUNCTION "public"."merge_clients"("p_keep" "uuid", "p_merge" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_clients"("p_query" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "name" "text", "email" "text", "phone" "text", "visits" integer, "upcoming" integer, "last_visit_at" timestamp with time zone, "next_visit_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_own uuid;
  v_pattern text;
BEGIN
  SELECT specialist.id INTO v_own FROM public.specialists AS specialist
  WHERE specialist.user_id = (SELECT auth.uid());
  IF v_own IS NULL THEN
    RAISE EXCEPTION 'Only specialists have their own clients'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF nullif(btrim(p_query), '') IS NOT NULL THEN
    v_pattern := '%' || replace(replace(replace(
      left(btrim(p_query), 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  RETURN QUERY
  SELECT client.id, client.name, client.email, client.phone,
    (count(*) FILTER (WHERE visit.status IN ('confirmed', 'awaiting_payment')))::integer,
    (count(*) FILTER (WHERE visit.status IN ('confirmed', 'awaiting_payment')
      AND lower(visit.during) > now()))::integer,
    max(lower(visit.during)) FILTER (WHERE visit.status = 'confirmed'
      AND lower(visit.during) <= now()),
    min(lower(visit.during)) FILTER (WHERE visit.status IN ('confirmed', 'awaiting_payment')
      AND lower(visit.during) > now())
  FROM public.appointments AS visit
  JOIN public.clients AS client ON client.id = visit.client_id
  WHERE visit.specialist_id = v_own
    AND visit.status IN ('confirmed', 'awaiting_payment', 'cancelled')
    AND client.forgotten_at IS NULL
    AND (v_pattern IS NULL
      OR client.name ILIKE v_pattern
      OR client.email ILIKE v_pattern
      OR client.phone ILIKE v_pattern)
  GROUP BY client.id
  ORDER BY min(lower(visit.during)) FILTER (WHERE visit.status IN ('confirmed', 'awaiting_payment')
      AND lower(visit.during) > now()) NULLS LAST, lower(client.name);
END;
$$;


ALTER FUNCTION "public"."my_clients"("p_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pending_checkout_session"("p_access_token" "text") RETURNS TABLE("checkout_session_id" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT payment.checkout_session_id
  FROM public.payments AS payment
  JOIN public.appointments AS visit ON visit.id = payment.appointment_id
  WHERE visit.access_token_hash = extensions.digest(p_access_token, 'sha256')
    AND payment.status = 'pending'
  ORDER BY payment.created_at DESC
  LIMIT 1;
$$;


ALTER FUNCTION "public"."pending_checkout_session"("p_access_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pending_reservation_payment"("p_token" "text") RETURNS TABLE("checkout_session_id" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT payment.checkout_session_id
  FROM public.payments AS payment
  WHERE payment.appointment_id = (private.reservation_by_token(p_token)).id
    AND payment.status = 'pending'
  ORDER BY payment.created_at DESC
  LIMIT 1;
$$;


ALTER FUNCTION "public"."pending_reservation_payment"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."portal_user_id_by_email"("p_email" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
$$;


ALTER FUNCTION "public"."portal_user_id_by_email"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."publish_site_content"("p_key" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.site_content
  SET published_payload = draft_payload, published_at = now()
  WHERE key = p_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Site content not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;


ALTER FUNCTION "public"."publish_site_content"("p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_refund"("p_payment_intent_id" "text", "p_refunded_minor" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.payments
  SET refunded_minor = least(p_refunded_minor, amount_minor),
      status = CASE
        WHEN p_refunded_minor >= amount_minor THEN 'refunded'::public.payment_status
        ELSE 'partially_refunded'::public.payment_status
      END
  WHERE payment_intent_id = p_payment_intent_id;
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."record_refund"("p_payment_intent_id" "text", "p_refunded_minor" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_specialist_profile_draft"("p_draft_id" "uuid", "p_review_comment" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  IF p_review_comment IS NULL OR char_length(trim(p_review_comment)) = 0 THEN
    RAISE EXCEPTION 'A rejection comment is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.specialist_profile_drafts
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_comment = trim(p_review_comment)
  WHERE id = p_draft_id
    AND status = 'pending_review';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending draft not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;


ALTER FUNCTION "public"."reject_specialist_profile_draft"("p_draft_id" "uuid", "p_review_comment" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_booking_email"("p_reference" "text", "p_kind" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  DELETE FROM public.booking_emails AS email
  USING public.appointments AS visit
  WHERE visit.reference = p_reference
    AND email.appointment_id = visit.id
    AND email.kind = p_kind
    AND email.sent_at IS NULL;
$$;


ALTER FUNCTION "public"."release_booking_email"("p_reference" "text", "p_kind" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_hold"("p_access_token" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.appointments
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'client'
  WHERE access_token_hash = extensions.digest(p_access_token, 'sha256')
    AND status = 'held';
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."release_hold"("p_access_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_room_image"("p_image_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  removed public.room_images%ROWTYPE;
BEGIN
  PERFORM private.require_admin();

  DELETE FROM public.room_images
  WHERE id = p_image_id
  RETURNING * INTO removed;

  IF removed.id IS NULL THEN
    RAISE EXCEPTION 'Room photo not found' USING ERRCODE = 'P0002';
  END IF;

  -- Close the gap in the order.
  UPDATE public.room_images
  SET position = position - 1
  WHERE room_id = removed.room_id
    AND position > removed.position;

  -- The first remaining photo becomes the main one.
  IF removed.is_main THEN
    UPDATE public.room_images
    SET is_main = true
    WHERE room_id = removed.room_id
      AND position = 0;
  END IF;

  RETURN removed.storage_path;
END;
$$;


ALTER FUNCTION "public"."remove_room_image"("p_image_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_room_images"("p_room_id" "uuid", "p_image_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM private.require_admin();

  IF p_image_ids IS NULL
    OR cardinality(p_image_ids) <> (
      SELECT count(*) FROM public.room_images WHERE room_id = p_room_id
    )
    OR cardinality(p_image_ids) <> (
      SELECT count(DISTINCT image_id)
      FROM unnest(p_image_ids) AS ids(image_id)
      JOIN public.room_images AS image
        ON image.id = ids.image_id AND image.room_id = p_room_id
    )
  THEN
    RAISE EXCEPTION 'The new order must list every photo of the room once'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.room_images AS image
  SET position = ordered.new_position - 1
  FROM unnest(p_image_ids) WITH ORDINALITY AS ordered(image_id, new_position)
  WHERE image.id = ordered.image_id;
END;
$$;


ALTER FUNCTION "public"."reorder_room_images"("p_room_id" "uuid", "p_image_ids" "uuid"[]) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_opening_hours" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "weekday" smallint NOT NULL,
    "starts_at" time without time zone NOT NULL,
    "ends_at" time without time zone NOT NULL,
    "time_span" "int4range" GENERATED ALWAYS AS ("int4range"((EXTRACT(epoch FROM "starts_at"))::integer, (EXTRACT(epoch FROM "ends_at"))::integer, '[)'::"text")) STORED,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "room_opening_hours_time_order" CHECK (("starts_at" < "ends_at")),
    CONSTRAINT "room_opening_hours_weekday_range" CHECK ((("weekday" >= 1) AND ("weekday" <= 7)))
);

ALTER TABLE ONLY "public"."room_opening_hours" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_opening_hours" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_room_opening_hours"("p_room_id" "uuid", "p_intervals" "jsonb") RETURNS SETOF "public"."room_opening_hours"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT public.has_role('admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can replace room opening hours'
      USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_intervals) <> 'array' THEN
    RAISE EXCEPTION 'Opening hours must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.room_opening_hours WHERE room_id = p_room_id;

  INSERT INTO public.room_opening_hours (room_id, weekday, starts_at, ends_at)
  SELECT p_room_id, interval.weekday, interval.starts_at, interval.ends_at
  FROM jsonb_to_recordset(p_intervals) AS interval(
    weekday smallint,
    starts_at time,
    ends_at time
  );

  RETURN QUERY
  SELECT * FROM public.room_opening_hours
  WHERE room_id = p_room_id
  ORDER BY weekday, starts_at;
END;
$$;


ALTER FUNCTION "public"."replace_room_opening_hours"("p_room_id" "uuid", "p_intervals" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reschedule_booking"("p_manage_token" "text", "p_starts_at" timestamp with time zone) RETURNS TABLE("reference" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "reschedule_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_settings public.center_settings%ROWTYPE;
  v_location uuid;
  v_day date;
  v_slot record;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.manage_token_hash = extensions.digest(p_manage_token, 'sha256')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  IF NOT private.self_reschedulable(v_visit) THEN
    RAISE EXCEPTION 'This visit cannot be moved by the client' USING HINT = 'not_reschedulable';
  END IF;

  SELECT * INTO v_settings FROM public.center_settings WHERE id = 1;
  PERFORM pg_advisory_xact_lock(hashtextextended('booking:specialist:' || v_visit.specialist_id, 0));
  UPDATE public.appointments SET status = 'expired'
  WHERE status = 'held' AND hold_expires_at <= now();
  PERFORM private.cancel_overdue_payments();

  SELECT room.location_id INTO v_location FROM public.rooms AS room
  WHERE room.id = v_visit.room_id;
  v_day := (p_starts_at AT TIME ZONE v_settings.timezone)::date;
  SELECT * INTO v_slot
  FROM private.free_slots(
    v_visit.specialist_service_id, v_visit.mode, v_day, v_day, v_location, v_visit.id
  ) AS slot
  WHERE slot.starts_at = p_starts_at AND slot.starts_at <> lower(v_visit.during);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
  END IF;

  BEGIN
    UPDATE public.appointments
    SET during = tstzrange(v_slot.starts_at, v_slot.ends_at),
        room_id = v_slot.room_id,
        availability_rule_id = v_slot.rule_id,
        buffer_minutes = v_settings.default_visit_buffer_minutes,
        duration_minutes = (extract(epoch FROM v_slot.ends_at - v_slot.starts_at) / 60)::integer,
        reschedule_count = reschedule_count + 1
    WHERE id = v_visit.id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
  END;

  DELETE FROM public.booking_emails
  WHERE appointment_id = v_visit.id AND kind IN ('rescheduled', 'reminder');

  RETURN QUERY SELECT v_visit.reference, v_slot.starts_at, v_slot.ends_at,
    v_visit.reschedule_count + 1;
END;
$$;


ALTER FUNCTION "public"."reschedule_booking"("p_manage_token" "text", "p_starts_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_hold"("p_access_token" "text") RETURNS TABLE("reference" "text", "payment_due_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_due timestamptz;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.access_token_hash = extensions.digest(p_access_token, 'sha256')
  FOR UPDATE;
  IF NOT FOUND OR v_visit.status <> 'held' OR v_visit.hold_expires_at <= now() THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;
  IF v_visit.terms_accepted_at IS NULL OR v_visit.client_email IS NULL THEN
    RAISE EXCEPTION 'The client''s details come first' USING HINT = 'details_required';
  END IF;
  v_due := private.payment_due(lower(v_visit.during));
  IF v_due IS NULL THEN
    RAISE EXCEPTION 'This visit is paid at once' USING HINT = 'pay_now_required';
  END IF;
  -- A payment already started for it stops counting.
  UPDATE public.payments SET status = 'expired'
  WHERE appointment_id = v_visit.id AND status = 'pending';
  UPDATE public.appointments
  SET status = 'awaiting_payment', hold_expires_at = NULL, payment_due_at = v_due
  WHERE id = v_visit.id;
  RETURN QUERY SELECT v_visit.reference, v_due;
END;
$$;


ALTER FUNCTION "public"."reserve_hold"("p_access_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."retention_preview"() RETURNS TABLE("clients" integer, "intakes" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT
    (SELECT count(*)::integer FROM private.clients_past_keeping()),
    (SELECT count(*)::integer FROM private.intakes_past_keeping())
  WHERE public.has_role('admin');
$$;


ALTER FUNCTION "public"."retention_preview"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_admin"("p_user" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only an admin may do this.'
      USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  IF p_user = auth.uid() THEN
    RAISE EXCEPTION 'You cannot take your own access.'
      USING ERRCODE = 'P0001', HINT = 'own_access';
  END IF;
  -- The last admin stays (locked so two cannot take each other's at once).
  PERFORM 1 FROM public.user_roles WHERE role = 'admin' FOR UPDATE;
  IF (SELECT count(*) FROM public.user_roles WHERE role = 'admin' AND user_id <> p_user) = 0 THEN
    RAISE EXCEPTION 'The centre needs an admin.'
      USING ERRCODE = 'P0001', HINT = 'last_admin';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = p_user AND role = 'admin';
END;
$$;


ALTER FUNCTION "public"."revoke_admin"("p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_availability_rule"("p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_mode" "public"."availability_mode", "p_room_id" "uuid" DEFAULT NULL::"uuid", "p_interval_weeks" smallint DEFAULT 1, "p_valid_until" "date" DEFAULT NULL::"date", "p_occurrence_count" smallint DEFAULT NULL::smallint, "p_note" "text" DEFAULT NULL::"text", "p_id" "uuid" DEFAULT NULL::"uuid", "p_specialist_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  target_specialist_id uuid;
BEGIN
  IF p_id IS NOT NULL THEN
    target_specialist_id := private.managed_rule_owner(p_id);
    IF p_specialist_id IS NOT NULL AND p_specialist_id <> target_specialist_id THEN
      RAISE EXCEPTION 'Availability window not found' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    target_specialist_id := private.managed_specialist_id(p_specialist_id);
  END IF;

  RETURN private.write_availability_rule(
    target_specialist_id, p_id, p_recurrence, p_weekdays, p_interval_weeks,
    p_starts_at, p_ends_at, p_valid_from, p_valid_until, p_occurrence_count,
    p_mode, p_room_id, p_note
  );
END;
$$;


ALTER FUNCTION "public"."save_availability_rule"("p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_mode" "public"."availability_mode", "p_room_id" "uuid", "p_interval_weeks" smallint, "p_valid_until" "date", "p_occurrence_count" smallint, "p_note" "text", "p_id" "uuid", "p_specialist_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_booking_details"("p_access_token" "text", "p_name" "text", "p_email" "text", "p_phone" "text", "p_notes" "text", "p_accept_terms" boolean, "p_accept_privacy" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_accept_terms IS NOT TRUE OR p_accept_privacy IS NOT TRUE THEN
    RAISE EXCEPTION 'Both consents are required' USING HINT = 'consent_required';
  END IF;

  SELECT id INTO v_id FROM public.appointments
  WHERE access_token_hash = extensions.digest(p_access_token, 'sha256')
    AND status = 'held' AND hold_expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;

  BEGIN
    UPDATE public.appointments
    SET client_name = nullif(trim(p_name), ''),
        client_email = lower(nullif(trim(p_email), '')),
        client_phone = nullif(trim(p_phone), ''),
        client_notes = nullif(trim(p_notes), ''),
        terms_accepted_at = now(),
        privacy_accepted_at = now()
    WHERE id = v_id;
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END;
  IF (SELECT client_name IS NULL OR client_email IS NULL OR client_phone IS NULL
      FROM public.appointments WHERE id = v_id) THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END IF;
END;
$$;


ALTER FUNCTION "public"."save_booking_details"("p_access_token" "text", "p_name" "text", "p_email" "text", "p_phone" "text", "p_notes" "text", "p_accept_terms" boolean, "p_accept_privacy" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_specialist_profile_draft"("p_first_name" "text", "p_last_name" "text", "p_short_bio" "text" DEFAULT ''::"text", "p_long_bio" "jsonb" DEFAULT '{"type": "doc", "content": [{"type": "paragraph"}]}'::"jsonb", "p_profile_photo_url" "text" DEFAULT NULL::"text", "p_portrait_photo_url" "text" DEFAULT NULL::"text", "p_languages" "text"[] DEFAULT '{}'::"text"[], "p_therapy_approaches" "text"[] DEFAULT '{}'::"text"[], "p_specializations" "text"[] DEFAULT '{}'::"text"[], "p_education" "text"[] DEFAULT '{}'::"text"[], "p_certificates" "text"[] DEFAULT '{}'::"text"[], "p_modalities" "text"[] DEFAULT '{}'::"text"[], "p_professional_title" "text" DEFAULT NULL::"text", "p_client_groups" "text"[] DEFAULT '{}'::"text"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  current_specialist_id uuid;
  current_draft_id uuid;
  v_first_name text := trim(coalesce(p_first_name, ''));
  v_last_name text := trim(coalesce(p_last_name, ''));
  v_display_name text := trim(concat_ws(' ',
    nullif(trim(coalesce(p_first_name, '')), ''),
    nullif(trim(coalesce(p_last_name, '')), '')
  ));
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'specialist'
  ) THEN
    RAISE EXCEPTION 'Specialist role required' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO current_specialist_id
  FROM public.specialists
  WHERE user_id = auth.uid();

  IF current_specialist_id IS NULL THEN
    RAISE EXCEPTION 'Specialist record not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT id INTO current_draft_id
  FROM public.specialist_profile_drafts
  WHERE specialist_id = current_specialist_id
    AND status IN ('draft', 'pending_review')
  FOR UPDATE;

  IF current_draft_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.specialist_profile_drafts
    WHERE id = current_draft_id AND status = 'pending_review'
  ) THEN
    RAISE EXCEPTION 'Pending drafts cannot be edited' USING ERRCODE = '55000';
  END IF;

  IF current_draft_id IS NULL THEN
    INSERT INTO public.specialist_profile_drafts (
      specialist_id, first_name, last_name, display_name, professional_title,
      short_bio, long_bio, profile_photo_url, portrait_photo_url, languages,
      therapy_approaches, specializations, education, certificates, modalities,
      client_groups
    ) VALUES (
      current_specialist_id, v_first_name, v_last_name, v_display_name,
      nullif(trim(p_professional_title), ''),
      p_short_bio, p_long_bio, p_profile_photo_url, p_portrait_photo_url, p_languages,
      p_therapy_approaches, p_specializations, p_education, p_certificates, p_modalities,
      p_client_groups
    )
    RETURNING id INTO current_draft_id;
  ELSE
    UPDATE public.specialist_profile_drafts
    SET first_name = v_first_name,
        last_name = v_last_name,
        display_name = v_display_name,
        professional_title = nullif(trim(p_professional_title), ''),
        short_bio = p_short_bio,
        long_bio = p_long_bio,
        profile_photo_url = p_profile_photo_url,
        portrait_photo_url = p_portrait_photo_url,
        languages = p_languages,
        therapy_approaches = p_therapy_approaches,
        specializations = p_specializations,
        education = p_education,
        certificates = p_certificates,
        modalities = p_modalities,
        client_groups = p_client_groups
    WHERE id = current_draft_id;
  END IF;

  RETURN current_draft_id;
END;
$$;


ALTER FUNCTION "public"."save_my_specialist_profile_draft"("p_first_name" "text", "p_last_name" "text", "p_short_bio" "text", "p_long_bio" "jsonb", "p_profile_photo_url" "text", "p_portrait_photo_url" "text", "p_languages" "text"[], "p_therapy_approaches" "text"[], "p_specializations" "text"[], "p_education" "text"[], "p_certificates" "text"[], "p_modalities" "text"[], "p_professional_title" "text", "p_client_groups" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_bookings"("p_query" "text" DEFAULT NULL::"text", "p_statuses" "text"[] DEFAULT NULL::"text"[], "p_payments" "text"[] DEFAULT NULL::"text"[], "p_specialist_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_service_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_room_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_online" boolean DEFAULT NULL::boolean, "p_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_to" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_created_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_created_to" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_changed_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_changed_to" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_sort" "text" DEFAULT 'starts_at'::"text", "p_desc" boolean DEFAULT false, "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0, "p_own" boolean DEFAULT false, "p_archived" boolean DEFAULT NULL::boolean, "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_closure" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "reference" "text", "status" "public"."appointment_status", "mode" "public"."visit_mode", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "service_id" "uuid", "service_name" "text", "specialist_id" "uuid", "specialist_name" "text", "specialist_color" "text", "room_id" "uuid", "room_name" "text", "room_color" "text", "location_name" "text", "client_id" "uuid", "client_name" "text", "client_email" "text", "client_phone" "text", "client_notes" "text", "price_minor" integer, "currency_code" "text", "paid" boolean, "refund_due_minor" integer, "refunded_minor" integer, "cancelled_by" "text", "cancelled_at" timestamp with time zone, "reschedule_count" integer, "created_at" timestamp with time zone, "confirmed_at" timestamp with time zone, "payment_due_at" timestamp with time zone, "changed_at" timestamp with time zone, "archived" boolean, "closure" "text", "total_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_pattern text;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_offset IS NULL OR p_offset < 0
     OR p_sort IS NULL
     OR p_sort NOT IN ('starts_at', 'client', 'specialist', 'service', 'price', 'status', 'place', 'created', 'changed') THEN
    RAISE EXCEPTION 'Invalid page or sort' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_statuses IS NOT NULL
     AND NOT p_statuses <@ ARRAY['confirmed', 'awaiting_payment', 'cancelled'] THEN
    RAISE EXCEPTION 'Invalid status' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_payments IS NOT NULL
     AND NOT p_payments <@ ARRAY['paid', 'unpaid', 'refund_due', 'refunded'] THEN
    RAISE EXCEPTION 'Invalid payment filter' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_closure IS NOT NULL AND p_closure NOT IN ('open', 'attended', 'no_show') THEN
    RAISE EXCEPTION 'Invalid closure filter' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF cardinality(p_specialist_ids) > 50 OR cardinality(p_service_ids) > 50
     OR cardinality(p_room_ids) > 50 THEN
    RAISE EXCEPTION 'Too many values' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF nullif(btrim(p_query), '') IS NOT NULL THEN
    v_pattern := '%' || replace(replace(replace(
      left(btrim(p_query), 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  RETURN QUERY
  SELECT v.*, coalesce(changed.at, v.created_at) AS changed_at,
    private.visit_archived(v.status, v.ends_at, v.cancelled_at,
      v.refund_due_minor, v.refunded_minor) AS archived,
    private.closure_state(v.status, v.starts_at, v.ends_at, closed.outcome) AS closure,
    count(*) OVER () AS total_count
  FROM private.visible_visits(p_own) AS v
  -- The last change: any event but an e-mail or a payment begun.
  LEFT JOIN LATERAL (
    SELECT max(event.occurred_at) AS at
    FROM public.appointment_events AS event
    WHERE event.appointment_id = v.id
      AND event.kind NOT IN ('email_sent', 'payment_started')
  ) AS changed ON true
  LEFT JOIN public.visit_closures AS closed ON closed.appointment_id = v.id
  WHERE (p_specialist_ids IS NULL OR v.specialist_id = ANY (p_specialist_ids))
    AND (p_service_ids IS NULL OR v.service_id = ANY (p_service_ids))
    -- Places: these rooms, and/or online.
    AND ((p_room_ids IS NULL AND p_online IS NULL)
      OR v.room_id = ANY (p_room_ids)
      OR (p_online IS TRUE AND v.mode = 'online'))
    AND (p_from IS NULL OR v.starts_at >= p_from)
    AND (p_to IS NULL OR v.starts_at < p_to)
    AND (p_created_from IS NULL OR v.created_at >= p_created_from)
    AND (p_created_to IS NULL OR v.created_at < p_created_to)
    AND (p_changed_from IS NULL OR coalesce(changed.at, v.created_at) >= p_changed_from)
    AND (p_changed_to IS NULL OR coalesce(changed.at, v.created_at) < p_changed_to)
    AND (p_statuses IS NULL OR v.status::text = ANY (p_statuses))
    AND (p_client_id IS NULL OR v.client_id = p_client_id)
    AND (p_closure IS NULL
      OR private.closure_state(v.status, v.starts_at, v.ends_at, closed.outcome) = p_closure)
    AND (p_archived IS NULL
      OR private.visit_archived(v.status, v.ends_at, v.cancelled_at,
        v.refund_due_minor, v.refunded_minor) = p_archived)
    -- Payments: any of those asked for.
    AND (p_payments IS NULL
      OR ('paid' = ANY (p_payments) AND v.paid AND v.status <> 'cancelled')
      OR ('unpaid' = ANY (p_payments) AND NOT v.paid)
      OR ('refund_due' = ANY (p_payments) AND v.status = 'cancelled'
        AND coalesce(v.refund_due_minor, 0) > coalesce(v.refunded_minor, 0))
      OR ('refunded' = ANY (p_payments) AND coalesce(v.refunded_minor, 0) > 0))
    AND (v_pattern IS NULL
      OR v.client_name ILIKE v_pattern
      OR v.client_email ILIKE v_pattern
      OR v.client_phone ILIKE v_pattern
      OR v.reference ILIKE v_pattern
      OR v.service_name ILIKE v_pattern
      OR v.specialist_name ILIKE v_pattern)
  ORDER BY
    CASE WHEN p_sort = 'starts_at' AND NOT p_desc THEN v.starts_at END ASC,
    CASE WHEN p_sort = 'starts_at' AND p_desc THEN v.starts_at END DESC,
    CASE WHEN p_sort = 'client' AND NOT p_desc THEN lower(v.client_name) END ASC,
    CASE WHEN p_sort = 'client' AND p_desc THEN lower(v.client_name) END DESC,
    CASE WHEN p_sort = 'specialist' AND NOT p_desc THEN lower(v.specialist_name) END ASC,
    CASE WHEN p_sort = 'specialist' AND p_desc THEN lower(v.specialist_name) END DESC,
    CASE WHEN p_sort = 'service' AND NOT p_desc THEN lower(v.service_name) END ASC,
    CASE WHEN p_sort = 'service' AND p_desc THEN lower(v.service_name) END DESC,
    CASE WHEN p_sort = 'price' AND NOT p_desc THEN v.price_minor END ASC,
    CASE WHEN p_sort = 'price' AND p_desc THEN v.price_minor END DESC,
    CASE WHEN p_sort = 'status' AND NOT p_desc THEN v.status::text END ASC,
    CASE WHEN p_sort = 'status' AND p_desc THEN v.status::text END DESC,
    CASE WHEN p_sort = 'place' AND NOT p_desc THEN lower(coalesce(v.room_name, 'online')) END ASC,
    CASE WHEN p_sort = 'place' AND p_desc THEN lower(coalesce(v.room_name, 'online')) END DESC,
    CASE WHEN p_sort = 'created' AND NOT p_desc THEN v.created_at END ASC,
    CASE WHEN p_sort = 'created' AND p_desc THEN v.created_at END DESC,
    CASE WHEN p_sort = 'changed' AND NOT p_desc THEN coalesce(changed.at, v.created_at) END ASC,
    CASE WHEN p_sort = 'changed' AND p_desc THEN coalesce(changed.at, v.created_at) END DESC,
    v.starts_at, v.reference
  LIMIT p_limit OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."search_bookings"("p_query" "text", "p_statuses" "text"[], "p_payments" "text"[], "p_specialist_ids" "uuid"[], "p_service_ids" "uuid"[], "p_room_ids" "uuid"[], "p_online" boolean, "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_created_from" timestamp with time zone, "p_created_to" timestamp with time zone, "p_changed_from" timestamp with time zone, "p_changed_to" timestamp with time zone, "p_sort" "text", "p_desc" boolean, "p_limit" integer, "p_offset" integer, "p_own" boolean, "p_archived" boolean, "p_client_id" "uuid", "p_closure" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_clients"("p_query" "text" DEFAULT NULL::"text", "p_upcoming" boolean DEFAULT NULL::boolean, "p_last_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_last_to" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_created_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_created_to" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_sort" "text" DEFAULT 'last_visit'::"text", "p_desc" boolean DEFAULT true, "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "name" "text", "email" "text", "phone" "text", "notes" "text", "visits" integer, "upcoming" integer, "cancelled" integer, "last_visit_at" timestamp with time zone, "next_visit_at" timestamp with time zone, "paid_minor" integer, "created_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_pattern text;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre sees its clients'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_offset IS NULL OR p_offset < 0
     OR p_sort IS NULL
     OR p_sort NOT IN ('name', 'last_visit', 'next_visit', 'visits', 'paid', 'created') THEN
    RAISE EXCEPTION 'Invalid page or sort' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  v_pattern := '%' || replace(replace(replace(btrim(coalesce(p_query, '')),
    '\', '\\'), '%', '\%'), '_', '\_') || '%';

  RETURN QUERY
  SELECT client.id, client.name, client.email, client.phone, client.notes,
    coalesce(totals.visits, 0), coalesce(totals.upcoming, 0),
    coalesce(totals.cancelled, 0), totals.last_visit_at, totals.next_visit_at,
    coalesce(totals.paid_minor, 0), client.created_at,
    count(*) OVER ()
  FROM public.clients AS client
  LEFT JOIN private.client_totals() AS totals ON totals.client_id = client.id
  WHERE (nullif(btrim(coalesce(p_query, '')), '') IS NULL
      OR client.name ILIKE v_pattern ESCAPE '\'
      OR client.email ILIKE v_pattern ESCAPE '\'
      OR coalesce(client.phone, '') ILIKE v_pattern ESCAPE '\')
    AND (p_upcoming IS NULL OR (coalesce(totals.upcoming, 0) > 0) = p_upcoming)
    AND (p_last_from IS NULL OR totals.last_visit_at >= p_last_from)
    AND (p_last_to IS NULL OR totals.last_visit_at < p_last_to)
    AND (p_created_from IS NULL OR client.created_at >= p_created_from)
    AND (p_created_to IS NULL OR client.created_at < p_created_to)
  ORDER BY
    CASE WHEN p_sort = 'name' AND NOT p_desc THEN lower(client.name) END ASC,
    CASE WHEN p_sort = 'name' AND p_desc THEN lower(client.name) END DESC,
    CASE WHEN p_sort = 'last_visit' AND NOT p_desc THEN totals.last_visit_at END ASC NULLS LAST,
    CASE WHEN p_sort = 'last_visit' AND p_desc THEN totals.last_visit_at END DESC NULLS LAST,
    CASE WHEN p_sort = 'next_visit' AND NOT p_desc THEN totals.next_visit_at END ASC NULLS LAST,
    CASE WHEN p_sort = 'next_visit' AND p_desc THEN totals.next_visit_at END DESC NULLS LAST,
    CASE WHEN p_sort = 'visits' AND NOT p_desc THEN coalesce(totals.visits, 0) END ASC,
    CASE WHEN p_sort = 'visits' AND p_desc THEN coalesce(totals.visits, 0) END DESC,
    CASE WHEN p_sort = 'paid' AND NOT p_desc THEN coalesce(totals.paid_minor, 0) END ASC,
    CASE WHEN p_sort = 'paid' AND p_desc THEN coalesce(totals.paid_minor, 0) END DESC,
    CASE WHEN p_sort = 'created' AND NOT p_desc THEN client.created_at END ASC,
    CASE WHEN p_sort = 'created' AND p_desc THEN client.created_at END DESC,
    lower(client.name), client.id
  LIMIT p_limit OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."search_clients"("p_query" "text", "p_upcoming" boolean, "p_last_from" timestamp with time zone, "p_last_to" timestamp with time zone, "p_created_from" timestamp with time zone, "p_created_to" timestamp with time zone, "p_sort" "text", "p_desc" boolean, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_room_main_image"("p_image_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  target_room_id uuid;
BEGIN
  PERFORM private.require_admin();

  SELECT room_id INTO target_room_id
  FROM public.room_images
  WHERE id = p_image_id;

  IF target_room_id IS NULL THEN
    RAISE EXCEPTION 'Room photo not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.room_images
  SET is_main = false
  WHERE room_id = target_room_id AND is_main AND id <> p_image_id;

  UPDATE public.room_images
  SET is_main = true
  WHERE id = p_image_id;
END;
$$;


ALTER FUNCTION "public"."set_room_main_image"("p_image_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_specialist_active"("p_specialist" "uuid", "p_active" boolean) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_upcoming integer;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only an admin may do this.'
      USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  UPDATE public.specialists SET active = p_active WHERE id = p_specialist;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such specialist.' USING HINT = 'not_found';
  END IF;
  -- The visits still booked with them (they stay).
  SELECT count(*)::integer INTO v_upcoming
  FROM public.appointments
  WHERE specialist_id = p_specialist
    AND status IN ('confirmed', 'awaiting_payment')
    AND lower(during) > now();
  RETURN v_upcoming;
END;
$$;


ALTER FUNCTION "public"."set_specialist_active"("p_specialist" "uuid", "p_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_specialist_color"("p_specialist_id" "uuid", "p_color" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_color text := lower(nullif(trim(p_color), ''));
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role('admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.specialists
  SET color = v_color
  WHERE id = p_specialist_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Specialist not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_color;
END;
$$;


ALTER FUNCTION "public"."set_specialist_color"("p_specialist_id" "uuid", "p_color" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_specialist_public_slug"("p_specialist_id" "uuid", "p_public_slug" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  new_slug text := lower(trim(p_public_slug));
  current_slug text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  SELECT public_slug INTO current_slug
  FROM public.specialists
  WHERE id = p_specialist_id
  FOR UPDATE;

  IF current_slug IS NULL THEN
    RAISE EXCEPTION 'Specialist not found' USING ERRCODE = 'P0002';
  END IF;

  IF new_slug = current_slug THEN
    RETURN current_slug;
  END IF;

  -- Taken by another specialist: the unique constraint would say the same,
  -- but this names the problem.
  IF EXISTS (
    SELECT 1 FROM public.specialists
    WHERE public_slug = new_slug AND id <> p_specialist_id
  ) THEN
    RAISE EXCEPTION 'Public slug already in use' USING ERRCODE = '23505';
  END IF;

  -- The new slug stops redirecting anywhere (it may be this specialist's old
  -- one, or a long-retired one of someone else).
  DELETE FROM public.specialist_slug_redirects WHERE old_slug = new_slug;

  UPDATE public.specialists
  SET public_slug = new_slug
  WHERE id = p_specialist_id;

  INSERT INTO public.specialist_slug_redirects (old_slug, specialist_id)
  VALUES (current_slug, p_specialist_id)
  ON CONFLICT (old_slug) DO UPDATE
  SET specialist_id = EXCLUDED.specialist_id,
      created_at = now();

  RETURN new_slug;
END;
$$;


ALTER FUNCTION "public"."set_specialist_public_slug"("p_specialist_id" "uuid", "p_public_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_specialist_visibility"("p_specialist" "uuid", "p_visible" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only an admin may do this.'
      USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  UPDATE public.specialists SET publicly_visible = p_visible WHERE id = p_specialist;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such specialist.' USING HINT = 'not_found';
  END IF;
END;
$$;


ALTER FUNCTION "public"."set_specialist_visibility"("p_specialist" "uuid", "p_visible" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_my_specialist_profile_draft"("p_draft_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'specialist'
  ) THEN
    RAISE EXCEPTION 'Specialist role required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.specialist_profile_drafts AS draft
  SET status = 'pending_review',
      submitted_at = now(),
      submitted_by = auth.uid()
  FROM public.specialists AS specialist
  WHERE draft.id = p_draft_id
    AND draft.specialist_id = specialist.id
    AND specialist.user_id = auth.uid()
    AND draft.status = 'draft'
    AND char_length(trim(draft.first_name)) > 0
    AND char_length(trim(draft.last_name)) > 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Editable complete draft not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;


ALTER FUNCTION "public"."submit_my_specialist_profile_draft"("p_draft_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unclosed_visits_summary"("p_own" boolean DEFAULT false) RETURNS TABLE("specialist_id" "uuid", "specialist_name" "text", "visits" integer, "oldest_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT visit.specialist_id,
    coalesce(nullif(profile.display_name, ''), 'Specjalista'),
    count(*)::integer, min(lower(visit.during))
  FROM public.appointments AS visit
  JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
  LEFT JOIN public.specialist_public_profiles AS profile ON profile.specialist_id = visit.specialist_id
  LEFT JOIN public.visit_closures AS closure ON closure.appointment_id = visit.id
  WHERE closure.appointment_id IS NULL
    AND private.closure_state(visit.status, lower(visit.during), upper(visit.during), NULL) = 'open'
    AND ((NOT p_own AND public.has_role('admin'))
      OR specialist.user_id = (SELECT auth.uid()))
  GROUP BY visit.specialist_id, profile.display_name
  ORDER BY count(*) DESC;
$$;


ALTER FUNCTION "public"."unclosed_visits_summary"("p_own" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."visits_on_days"("p_from" "date", "p_to" "date") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT CASE WHEN public.has_role('admin') THEN (
    SELECT count(*)::integer
    FROM public.appointments AS visit
    CROSS JOIN public.center_settings AS settings
    WHERE settings.id = 1
      AND private.appointment_is_live(visit.status, visit.hold_expires_at, visit.payment_due_at)
      AND (lower(visit.during) AT TIME ZONE settings.timezone)::date
        BETWEEN p_from AND p_to
  ) END;
$$;


ALTER FUNCTION "public"."visits_on_days"("p_from" "date", "p_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."visits_to_close_by_specialist"() RETURNS TABLE("specialist_id" "uuid", "specialist_name" "text", "email" "text", "visits" "jsonb")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT specialist.id,
    coalesce(nullif(profile.display_name, ''), 'Specjalista'),
    account.email::text,
    jsonb_agg(jsonb_build_object(
      'reference', visit.reference,
      'service_name', service.name,
      'starts_at', lower(visit.during)
    ) ORDER BY lower(visit.during))
  FROM public.appointments AS visit
  JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
  JOIN auth.users AS account ON account.id = specialist.user_id
  JOIN public.services AS service ON service.id = visit.service_id
  LEFT JOIN public.specialist_public_profiles AS profile ON profile.specialist_id = specialist.id
  WHERE NOT EXISTS (SELECT 1 FROM public.visit_closures WHERE appointment_id = visit.id)
    AND private.closure_state(visit.status, lower(visit.during), upper(visit.during), NULL) = 'open'
    AND upper(visit.during) <= now()
  GROUP BY specialist.id, profile.display_name, account.email;
$$;


ALTER FUNCTION "public"."visits_to_close_by_specialist"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."booking_holds" (
    "client_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "private"."booking_holds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."booking_reference_counters" (
    "month" "text" NOT NULL,
    "last" integer NOT NULL,
    CONSTRAINT "booking_reference_counters_last_check" CHECK (("last" > 0)),
    CONSTRAINT "booking_reference_counters_month_check" CHECK (("month" ~ '^[0-9]{4}$'::"text"))
);


ALTER TABLE "private"."booking_reference_counters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointment_events" (
    "id" bigint NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "kind" "text" NOT NULL,
    "actor" "text" NOT NULL,
    "actor_user_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "appointment_events_actor_check" CHECK (("actor" = ANY (ARRAY['client'::"text", 'centre'::"text", 'payment'::"text", 'system'::"text"]))),
    CONSTRAINT "appointment_events_kind_check" CHECK (("kind" = ANY (ARRAY['created'::"text", 'details_saved'::"text", 'hold_released'::"text", 'hold_expired'::"text", 'awaiting_payment'::"text", 'confirmed'::"text", 'cancelled'::"text", 'rescheduled'::"text", 'payment_started'::"text", 'payment_succeeded'::"text", 'payment_failed'::"text", 'payment_expired'::"text", 'refund_recorded'::"text", 'email_sent'::"text", 'reserved'::"text", 'refund_issued'::"text"])))
);


ALTER TABLE "public"."appointment_events" OWNER TO "postgres";


ALTER TABLE "public"."appointment_events" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."appointment_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."booking_emails" (
    "appointment_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "claimed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "provider_message_id" "text",
    CONSTRAINT "booking_emails_kind_valid" CHECK (("kind" = ANY (ARRAY['confirmation'::"text", 'reminder'::"text", 'rescheduled'::"text", 'cancelled'::"text", 'reserved'::"text", 'payment_reminder'::"text", 'payment_last_call'::"text", 'refunded'::"text"])))
);

ALTER TABLE ONLY "public"."booking_emails" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."booking_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."center_public_profile" (
    "id" integer DEFAULT 1 NOT NULL,
    "display_name" "text" NOT NULL,
    "short_description" "text",
    "logo_path" "text",
    "public_email" "text",
    "public_phone" "text",
    "website_url" "text",
    "instagram_url" "text",
    "facebook_url" "text",
    "published" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "center_public_profile_display_name_length" CHECK ((("char_length"("display_name") >= 1) AND ("char_length"("display_name") <= 200))),
    CONSTRAINT "center_public_profile_email_format" CHECK ((("public_email" IS NULL) OR ("public_email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::"text"))),
    CONSTRAINT "center_public_profile_logo_path_length" CHECK ((("logo_path" IS NULL) OR ("char_length"("logo_path") <= 2048))),
    CONSTRAINT "center_public_profile_phone_length" CHECK ((("public_phone" IS NULL) OR ("char_length"("public_phone") <= 40))),
    CONSTRAINT "center_public_profile_short_description_length" CHECK ((("short_description" IS NULL) OR ("char_length"("short_description") <= 500))),
    CONSTRAINT "center_public_profile_singleton" CHECK (("id" = 1)),
    CONSTRAINT "center_public_profile_url_lengths" CHECK (((("website_url" IS NULL) OR ("char_length"("website_url") <= 2048)) AND (("instagram_url" IS NULL) OR ("char_length"("instagram_url") <= 2048)) AND (("facebook_url" IS NULL) OR ("char_length"("facebook_url") <= 2048))))
);

ALTER TABLE ONLY "public"."center_public_profile" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."center_public_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."center_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "business_name" "text" NOT NULL,
    "timezone" "text" DEFAULT 'Europe/Warsaw'::"text" NOT NULL,
    "default_locale" "text" DEFAULT 'pl-PL'::"text" NOT NULL,
    "default_currency" "text" DEFAULT 'PLN'::"text" NOT NULL,
    "booking_enabled" boolean DEFAULT false NOT NULL,
    "default_visit_buffer_minutes" integer DEFAULT 10 NOT NULL,
    "min_booking_lead_minutes" integer DEFAULT 60 NOT NULL,
    "max_booking_horizon_days" integer DEFAULT 60 NOT NULL,
    "cancellation_window_hours" integer DEFAULT 48 NOT NULL,
    "phone" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slot_step_minutes" integer DEFAULT 60 NOT NULL,
    "hold_minutes" integer DEFAULT 10 NOT NULL,
    "reschedule_window_hours" integer DEFAULT 48 NOT NULL,
    "max_self_reschedules" integer DEFAULT 1 NOT NULL,
    "payment_due_hours" integer DEFAULT 48 NOT NULL,
    "centre_payment_link_hours" integer DEFAULT 2 NOT NULL,
    "legal_name" "text",
    "tax_id" "text",
    "regon" "text",
    "registered_address" "text",
    "visit_reminder_hours" integer DEFAULT 24,
    "payment_reminder_hours" integer DEFAULT 24,
    "client_retention_years" integer DEFAULT 5,
    "intake_retention_months" integer DEFAULT 12 NOT NULL,
    CONSTRAINT "center_settings_buffer_range" CHECK ((("default_visit_buffer_minutes" >= 0) AND ("default_visit_buffer_minutes" <= 240))),
    CONSTRAINT "center_settings_business_name_length" CHECK ((("char_length"("business_name") >= 1) AND ("char_length"("business_name") <= 200))),
    CONSTRAINT "center_settings_cancellation_range" CHECK ((("cancellation_window_hours" >= 0) AND ("cancellation_window_hours" <= 720))),
    CONSTRAINT "center_settings_centre_payment_link_hours" CHECK ((("centre_payment_link_hours" >= 1) AND ("centre_payment_link_hours" <= 72))),
    CONSTRAINT "center_settings_client_retention_years_range" CHECK ((("client_retention_years" IS NULL) OR (("client_retention_years" >= 1) AND ("client_retention_years" <= 20)))),
    CONSTRAINT "center_settings_currency_format" CHECK (("default_currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "center_settings_email_format" CHECK ((("email" IS NULL) OR ("email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::"text"))),
    CONSTRAINT "center_settings_hold_minutes_range" CHECK ((("hold_minutes" >= 5) AND ("hold_minutes" <= 30))),
    CONSTRAINT "center_settings_horizon_range" CHECK ((("max_booking_horizon_days" >= 1) AND ("max_booking_horizon_days" <= 730))),
    CONSTRAINT "center_settings_intake_retention_months_range" CHECK ((("intake_retention_months" >= 1) AND ("intake_retention_months" <= 120))),
    CONSTRAINT "center_settings_lead_range" CHECK ((("min_booking_lead_minutes" >= 0) AND ("min_booking_lead_minutes" <= 10080))),
    CONSTRAINT "center_settings_legal_name_length" CHECK ((("legal_name" IS NULL) OR (("char_length"("legal_name") >= 1) AND ("char_length"("legal_name") <= 200)))),
    CONSTRAINT "center_settings_locale_format" CHECK (("default_locale" ~ '^[a-z]{2}(-[A-Z]{2})?$'::"text")),
    CONSTRAINT "center_settings_max_self_reschedules_range" CHECK ((("max_self_reschedules" >= 0) AND ("max_self_reschedules" <= 5))),
    CONSTRAINT "center_settings_payment_due_hours" CHECK ((("payment_due_hours" >= 1) AND ("payment_due_hours" <= 720))),
    CONSTRAINT "center_settings_payment_reminder_hours_range" CHECK ((("payment_reminder_hours" IS NULL) OR (("payment_reminder_hours" >= 7) AND ("payment_reminder_hours" <= 168)))),
    CONSTRAINT "center_settings_phone_length" CHECK ((("phone" IS NULL) OR ("char_length"("phone") <= 40))),
    CONSTRAINT "center_settings_registered_address_length" CHECK ((("registered_address" IS NULL) OR (("char_length"("registered_address") >= 1) AND ("char_length"("registered_address") <= 300)))),
    CONSTRAINT "center_settings_regon_format" CHECK ((("regon" IS NULL) OR ("regon" ~ '^([0-9]{9}|[0-9]{14})$'::"text"))),
    CONSTRAINT "center_settings_reschedule_window_range" CHECK ((("reschedule_window_hours" >= 0) AND ("reschedule_window_hours" <= 720))),
    CONSTRAINT "center_settings_singleton" CHECK (("id" = 1)),
    CONSTRAINT "center_settings_slot_step_valid" CHECK (("slot_step_minutes" = ANY (ARRAY[15, 20, 30, 60]))),
    CONSTRAINT "center_settings_tax_id_format" CHECK ((("tax_id" IS NULL) OR ("tax_id" ~ '^[0-9]{10}$'::"text"))),
    CONSTRAINT "center_settings_timezone_length" CHECK ((("char_length"("timezone") >= 1) AND ("char_length"("timezone") <= 100))),
    CONSTRAINT "center_settings_visit_reminder_hours_range" CHECK ((("visit_reminder_hours" IS NULL) OR (("visit_reminder_hours" >= 1) AND ("visit_reminder_hours" <= 168))))
);

ALTER TABLE ONLY "public"."center_settings" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."center_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."centre_closures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "starts_on" "date" NOT NULL,
    "ends_on" "date" NOT NULL,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "centre_closures_days" CHECK (("ends_on" >= "starts_on")),
    CONSTRAINT "centre_closures_reason_length" CHECK ((("char_length"("reason") >= 1) AND ("char_length"("reason") <= 120)))
);

ALTER TABLE ONLY "public"."centre_closures" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."centre_closures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "email_key" "text" GENERATED ALWAYS AS ("lower"("btrim"("email"))) STORED,
    "name" "text" NOT NULL,
    "phone" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "forgotten_at" timestamp with time zone,
    CONSTRAINT "clients_details_valid" CHECK (((("char_length"("name") >= 1) AND ("char_length"("name") <= 200)) AND ("char_length"("email") <= 320) AND ("email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::"text") AND (("phone" IS NULL) OR (("char_length"("phone") >= 3) AND ("char_length"("phone") <= 40))) AND (("notes" IS NULL) OR ("char_length"("notes") <= 5000))))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "address_line1" "text",
    "address_line2" "text",
    "postal_code" "text",
    "city" "text",
    "country_code" "text" DEFAULT 'PL'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "publicly_visible" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "public_description" "text",
    "amenities" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "accessibility_notes" "text",
    CONSTRAINT "locations_accessibility_notes_length" CHECK ((("accessibility_notes" IS NULL) OR ("char_length"("accessibility_notes") <= 1000))),
    CONSTRAINT "locations_address_lengths" CHECK (((("address_line1" IS NULL) OR ("char_length"("address_line1") <= 200)) AND (("address_line2" IS NULL) OR ("char_length"("address_line2") <= 200)) AND (("postal_code" IS NULL) OR ("char_length"("postal_code") <= 20)) AND (("city" IS NULL) OR ("char_length"("city") <= 100)))),
    CONSTRAINT "locations_amenities_count" CHECK ((("cardinality"("amenities") <= 30) AND ("array_position"("amenities", NULL::"text") IS NULL))),
    CONSTRAINT "locations_country_code_format" CHECK (("country_code" ~ '^[A-Z]{2}$'::"text")),
    CONSTRAINT "locations_name_length" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 200))),
    CONSTRAINT "locations_public_description_length" CHECK ((("public_description" IS NULL) OR ("char_length"("public_description") <= 1000))),
    CONSTRAINT "locations_slug_format" CHECK ((("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text") AND (("char_length"("slug") >= 3) AND ("char_length"("slug") <= 100)))),
    CONSTRAINT "locations_sort_order_range" CHECK ((("sort_order" >= 0) AND ("sort_order" <= 10000)))
);

ALTER TABLE ONLY "public"."locations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "portal" "text" NOT NULL,
    "appointment_id" "uuid",
    "kind" "text" NOT NULL,
    "actor" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone,
    CONSTRAINT "notifications_kind_check" CHECK (("kind" = ANY (ARRAY['booked'::"text", 'reserved'::"text", 'centre_booked'::"text", 'paid'::"text", 'cancelled'::"text", 'rescheduled'::"text", 'refunded'::"text", 'profile_submitted'::"text", 'profile_approved'::"text", 'profile_rejected'::"text", 'visit_to_close'::"text"]))),
    CONSTRAINT "notifications_portal_check" CHECK (("portal" = ANY (ARRAY['admin'::"text", 'specialist'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


ALTER TABLE "public"."notifications" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."notifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "checkout_session_id" "text" NOT NULL,
    "payment_intent_id" "text",
    "amount_minor" integer NOT NULL,
    "currency_code" "text" NOT NULL,
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "refunded_minor" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payments_amount_valid" CHECK (("amount_minor" >= 0)),
    CONSTRAINT "payments_currency_format" CHECK (("currency_code" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "payments_refund_valid" CHECK ((("refunded_minor" >= 0) AND ("refunded_minor" <= "amount_minor"))),
    CONSTRAINT "payments_stripe_ids" CHECK ((("checkout_session_id" ~ '^cs_'::"text") AND (("payment_intent_id" IS NULL) OR ("payment_intent_id" ~ '^pi_'::"text"))))
);

ALTER TABLE ONLY "public"."payments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text" DEFAULT ''::"text" NOT NULL,
    "last_name" "text" DEFAULT ''::"text" NOT NULL,
    "avatar_url" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_avatar_url_length" CHECK ((("avatar_url" IS NULL) OR ("char_length"("avatar_url") <= 2048))),
    CONSTRAINT "profiles_first_name_length" CHECK (("char_length"("first_name") <= 100)),
    CONSTRAINT "profiles_last_name_length" CHECK (("char_length"("last_name") <= 100))
);

ALTER TABLE ONLY "public"."profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_availability_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "type" "public"."room_availability_exception_type" NOT NULL,
    "starts_at" time without time zone,
    "ends_at" time without time zone,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "room_availability_exceptions_reason_length" CHECK ((("reason" IS NULL) OR ("char_length"("reason") <= 500))),
    CONSTRAINT "room_availability_exceptions_time_shape" CHECK (((("type" = 'closed_all_day'::"public"."room_availability_exception_type") AND ("starts_at" IS NULL) AND ("ends_at" IS NULL)) OR (("type" = ANY (ARRAY['blocked_interval'::"public"."room_availability_exception_type", 'extra_available_interval'::"public"."room_availability_exception_type"])) AND ("starts_at" IS NOT NULL) AND ("ends_at" IS NOT NULL) AND ("starts_at" < "ends_at"))))
);

ALTER TABLE ONLY "public"."room_availability_exceptions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_availability_exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "position" smallint NOT NULL,
    "is_main" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "room_images_position_range" CHECK ((("position" >= 0) AND ("position" <= 4))),
    CONSTRAINT "room_images_storage_path_in_room_folder" CHECK ((("storage_path" ~ '^[0-9a-f-]{36}/[a-zA-Z0-9_-]+\.(jpe?g|png|webp)$'::"text") AND ("split_part"("storage_path", '/'::"text", 1) = ("room_id")::"text")))
);

ALTER TABLE ONLY "public"."room_images" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_public_profiles" (
    "room_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "short_description" "text",
    "long_description" "jsonb" DEFAULT '{"type": "doc", "content": [{"type": "paragraph"}]}'::"jsonb" NOT NULL,
    "image_path" "text",
    "accessibility_notes" "text",
    "amenities" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "published" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "room_public_profiles_accessibility_notes_length" CHECK ((("accessibility_notes" IS NULL) OR ("char_length"("accessibility_notes") <= 2000))),
    CONSTRAINT "room_public_profiles_amenities_count" CHECK ((("cardinality"("amenities") <= 50) AND ("array_position"("amenities", NULL::"text") IS NULL))),
    CONSTRAINT "room_public_profiles_display_name_length" CHECK ((("char_length"("display_name") >= 1) AND ("char_length"("display_name") <= 200))),
    CONSTRAINT "room_public_profiles_image_path_length" CHECK ((("image_path" IS NULL) OR ("char_length"("image_path") <= 2048))),
    CONSTRAINT "room_public_profiles_long_description_document" CHECK ((("jsonb_typeof"("long_description") = 'object'::"text") AND (("long_description" ->> 'type'::"text") = 'doc'::"text") AND ("octet_length"(("long_description")::"text") <= 500000))),
    CONSTRAINT "room_public_profiles_short_description_length" CHECK ((("short_description" IS NULL) OR ("char_length"("short_description") <= 500)))
);

ALTER TABLE ONLY "public"."room_public_profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_public_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "publicly_visible" boolean DEFAULT false NOT NULL,
    "capacity" integer DEFAULT 1 NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "color" "text",
    CONSTRAINT "rooms_capacity_range" CHECK ((("capacity" >= 1) AND ("capacity" <= 100))),
    CONSTRAINT "rooms_color_format" CHECK (("color" ~ '^#[0-9a-f]{6}$'::"text")),
    CONSTRAINT "rooms_description_length" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 2000))),
    CONSTRAINT "rooms_name_length" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 200))),
    CONSTRAINT "rooms_slug_format" CHECK ((("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text") AND (("char_length"("slug") >= 3) AND ("char_length"("slug") <= 100)))),
    CONSTRAINT "rooms_sort_order_range" CHECK ((("sort_order" >= 0) AND ("sort_order" <= 10000)))
);

ALTER TABLE ONLY "public"."rooms" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_catalogs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "service_catalogs_name_length" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 120))),
    CONSTRAINT "service_catalogs_sort_order_range" CHECK ((("sort_order" >= 0) AND ("sort_order" <= 10000)))
);

ALTER TABLE ONLY "public"."service_catalogs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_catalogs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "short_description" "text",
    "description" "text",
    "category" "public"."service_category" DEFAULT 'other'::"public"."service_category" NOT NULL,
    "default_duration_minutes" integer NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "publicly_visible" boolean DEFAULT true NOT NULL,
    "booking_enabled" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "catalog_id" "uuid",
    "after_minutes" integer DEFAULT 10 NOT NULL,
    "requires_intake" boolean DEFAULT false NOT NULL,
    CONSTRAINT "services_after_minutes_range" CHECK ((("after_minutes" >= 0) AND ("after_minutes" <= 120))),
    CONSTRAINT "services_default_duration_range" CHECK ((("default_duration_minutes" >= 15) AND ("default_duration_minutes" <= 300))),
    CONSTRAINT "services_description_length" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 10000))),
    CONSTRAINT "services_name_length" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 200))),
    CONSTRAINT "services_short_description_length" CHECK ((("short_description" IS NULL) OR ("char_length"("short_description") <= 500))),
    CONSTRAINT "services_slug_format" CHECK ((("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text") AND (("char_length"("slug") >= 3) AND ("char_length"("slug") <= 100)))),
    CONSTRAINT "services_sort_order_range" CHECK ((("sort_order" >= 0) AND ("sort_order" <= 10000)))
);

ALTER TABLE ONLY "public"."services" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message" "text" NOT NULL,
    "link_label" "text",
    "link_href" "text",
    "starts_on" "date" NOT NULL,
    "ends_on" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "site_announcements_dates" CHECK (("ends_on" >= "starts_on")),
    CONSTRAINT "site_announcements_link_href_shape" CHECK ((("link_href" IS NULL) OR ("link_href" ~ '^(/[^/]|/$|https://)'::"text"))),
    CONSTRAINT "site_announcements_link_label_length" CHECK ((("link_label" IS NULL) OR (("char_length"("btrim"("link_label")) >= 1) AND ("char_length"("btrim"("link_label")) <= 40)))),
    CONSTRAINT "site_announcements_link_whole" CHECK ((("link_label" IS NULL) = ("link_href" IS NULL))),
    CONSTRAINT "site_announcements_message_length" CHECK ((("char_length"("btrim"("message")) >= 1) AND ("char_length"("btrim"("message")) <= 200)))
);


ALTER TABLE "public"."site_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_content" (
    "key" "text" NOT NULL,
    "draft_payload" "jsonb" NOT NULL,
    "published_payload" "jsonb",
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "site_content_draft_payload_shape" CHECK ("private"."site_content_payload_is_valid"("key", "draft_payload")),
    CONSTRAINT "site_content_key_check" CHECK (("key" = ANY (ARRAY['home'::"text", 'rooms'::"text"]))),
    CONSTRAINT "site_content_publication_time" CHECK ((("published_payload" IS NULL) OR ("published_at" IS NOT NULL))),
    CONSTRAINT "site_content_published_payload_shape" CHECK ((("published_payload" IS NULL) OR "private"."site_content_payload_is_valid"("key", "published_payload")))
);

ALTER TABLE ONLY "public"."site_content" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_content" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."specialist_availability_exceptions" (
    "rule_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."specialist_availability_exceptions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialist_availability_exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."specialist_availability_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "specialist_id" "uuid" NOT NULL,
    "recurrence" "public"."availability_recurrence" DEFAULT 'once'::"public"."availability_recurrence" NOT NULL,
    "starts_at" time without time zone NOT NULL,
    "ends_at" time without time zone NOT NULL,
    "valid_from" "date" NOT NULL,
    "valid_until" "date",
    "mode" "public"."availability_mode" NOT NULL,
    "room_id" "uuid",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "weekdays" smallint[] NOT NULL,
    "interval_weeks" smallint DEFAULT 1 NOT NULL,
    "occurrence_count" smallint,
    CONSTRAINT "specialist_availability_rules_count_range" CHECK ((("occurrence_count" IS NULL) OR ((("occurrence_count" >= 1) AND ("occurrence_count" <= 200)) AND ("valid_until" IS NOT NULL)))),
    CONSTRAINT "specialist_availability_rules_interval_range" CHECK ((("interval_weeks" >= 1) AND ("interval_weeks" <= 4))),
    CONSTRAINT "specialist_availability_rules_note_length" CHECK ((("note" IS NULL) OR ("char_length"("note") <= 500))),
    CONSTRAINT "specialist_availability_rules_once_is_one_day" CHECK ((("recurrence" <> 'once'::"public"."availability_recurrence") OR (("valid_until" = "valid_from") AND ("weekdays" = ARRAY[(EXTRACT(isodow FROM "valid_from"))::smallint]) AND ("interval_weeks" = 1) AND ("occurrence_count" IS NULL)))),
    CONSTRAINT "specialist_availability_rules_quarter_hours" CHECK (((EXTRACT(second FROM "starts_at") = (0)::numeric) AND (EXTRACT(second FROM "ends_at") = (0)::numeric) AND (((EXTRACT(minute FROM "starts_at"))::integer % 15) = 0) AND (((EXTRACT(minute FROM "ends_at"))::integer % 15) = 0))),
    CONSTRAINT "specialist_availability_rules_room_matches_mode" CHECK ((("mode" = 'online'::"public"."availability_mode") = ("room_id" IS NULL))),
    CONSTRAINT "specialist_availability_rules_time_order" CHECK (("starts_at" < "ends_at")),
    CONSTRAINT "specialist_availability_rules_validity_order" CHECK ((("valid_until" IS NULL) OR ("valid_until" >= "valid_from"))),
    CONSTRAINT "specialist_availability_rules_weekdays_valid" CHECK ("private"."is_weekday_set"("weekdays"))
);

ALTER TABLE ONLY "public"."specialist_availability_rules" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialist_availability_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."specialist_profile_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "specialist_id" "uuid" NOT NULL,
    "display_name" "text" DEFAULT ''::"text" NOT NULL,
    "short_bio" "text" DEFAULT ''::"text" NOT NULL,
    "long_bio" "jsonb" DEFAULT '{"type": "doc", "content": [{"type": "paragraph"}]}'::"jsonb" NOT NULL,
    "profile_photo_url" "text",
    "portrait_photo_url" "text",
    "languages" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "therapy_approaches" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "specializations" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "education" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "certificates" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "modalities" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status" "public"."profile_publication_status" DEFAULT 'draft'::"public"."profile_publication_status" NOT NULL,
    "submitted_at" timestamp with time zone,
    "submitted_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "review_comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "professional_title" "text",
    "client_groups" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "first_name" "text" DEFAULT ''::"text" NOT NULL,
    "last_name" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "specialist_profile_drafts_array_limits" CHECK ((("cardinality"("languages") <= 20) AND ("cardinality"("therapy_approaches") <= 50) AND ("cardinality"("specializations") <= 50) AND ("cardinality"("education") <= 50) AND ("cardinality"("certificates") <= 50) AND ("cardinality"("modalities") <= 20) AND (COALESCE("array_ndims"("languages"), 1) = 1) AND (COALESCE("array_ndims"("therapy_approaches"), 1) = 1) AND (COALESCE("array_ndims"("specializations"), 1) = 1) AND (COALESCE("array_ndims"("education"), 1) = 1) AND (COALESCE("array_ndims"("certificates"), 1) = 1) AND (COALESCE("array_ndims"("modalities"), 1) = 1))),
    CONSTRAINT "specialist_profile_drafts_client_groups_known" CHECK (("client_groups" <@ ARRAY['adults'::"text", 'teens'::"text", 'children'::"text", 'couples'::"text", 'families'::"text"])),
    CONSTRAINT "specialist_profile_drafts_display_name_length" CHECK (("char_length"("display_name") <= 160)),
    CONSTRAINT "specialist_profile_drafts_long_bio_document" CHECK ((("jsonb_typeof"("long_bio") = 'object'::"text") AND (("long_bio" ->> 'type'::"text") = 'doc'::"text") AND ("octet_length"(("long_bio")::"text") <= 500000))),
    CONSTRAINT "specialist_profile_drafts_media_ownership" CHECK (((("profile_photo_url" IS NULL) OR ("split_part"("profile_photo_url", '/'::"text", 1) = ("specialist_id")::"text")) AND (("portrait_photo_url" IS NULL) OR ("split_part"("portrait_photo_url", '/'::"text", 1) = ("specialist_id")::"text")))),
    CONSTRAINT "specialist_profile_drafts_name_parts_length" CHECK ((("char_length"("first_name") <= 80) AND ("char_length"("last_name") <= 80))),
    CONSTRAINT "specialist_profile_drafts_photo_url_length" CHECK (((("profile_photo_url" IS NULL) OR ("char_length"("profile_photo_url") <= 2048)) AND (("portrait_photo_url" IS NULL) OR ("char_length"("portrait_photo_url") <= 2048)))),
    CONSTRAINT "specialist_profile_drafts_professional_title_length" CHECK ((("professional_title" IS NULL) OR ("char_length"("professional_title") <= 160))),
    CONSTRAINT "specialist_profile_drafts_review_comment_length" CHECK ((("review_comment" IS NULL) OR ("char_length"("review_comment") <= 2000))),
    CONSTRAINT "specialist_profile_drafts_short_bio_length" CHECK (("char_length"("short_bio") <= 500)),
    CONSTRAINT "specialist_profile_drafts_submission_metadata" CHECK (((("status" = 'draft'::"public"."profile_publication_status") AND ("submitted_at" IS NULL) AND ("submitted_by" IS NULL) AND ("reviewed_at" IS NULL) AND ("reviewed_by" IS NULL)) OR (("status" = 'pending_review'::"public"."profile_publication_status") AND ("submitted_at" IS NOT NULL) AND ("submitted_by" IS NOT NULL) AND ("reviewed_at" IS NULL) AND ("reviewed_by" IS NULL)) OR (("status" = ANY (ARRAY['published'::"public"."profile_publication_status", 'rejected'::"public"."profile_publication_status"])) AND ("submitted_at" IS NOT NULL) AND ("submitted_by" IS NOT NULL) AND ("reviewed_at" IS NOT NULL) AND ("reviewed_by" IS NOT NULL))))
);

ALTER TABLE ONLY "public"."specialist_profile_drafts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialist_profile_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."specialist_public_profiles" (
    "specialist_id" "uuid" NOT NULL,
    "display_name" "text" DEFAULT ''::"text" NOT NULL,
    "short_bio" "text" DEFAULT ''::"text" NOT NULL,
    "long_bio" "jsonb" DEFAULT '{"type": "doc", "content": [{"type": "paragraph"}]}'::"jsonb" NOT NULL,
    "profile_photo_url" "text",
    "portrait_photo_url" "text",
    "languages" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "therapy_approaches" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "specializations" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "education" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "certificates" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "modalities" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "publication_status" "public"."profile_publication_status" DEFAULT 'draft'::"public"."profile_publication_status" NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_groups" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "first_name" "text" DEFAULT ''::"text" NOT NULL,
    "last_name" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "specialist_public_profiles_array_limits" CHECK ((("cardinality"("languages") <= 20) AND ("cardinality"("therapy_approaches") <= 50) AND ("cardinality"("specializations") <= 50) AND ("cardinality"("education") <= 50) AND ("cardinality"("certificates") <= 50) AND ("cardinality"("modalities") <= 20) AND (COALESCE("array_ndims"("languages"), 1) = 1) AND (COALESCE("array_ndims"("therapy_approaches"), 1) = 1) AND (COALESCE("array_ndims"("specializations"), 1) = 1) AND (COALESCE("array_ndims"("education"), 1) = 1) AND (COALESCE("array_ndims"("certificates"), 1) = 1) AND (COALESCE("array_ndims"("modalities"), 1) = 1))),
    CONSTRAINT "specialist_public_profiles_client_groups_known" CHECK (("client_groups" <@ ARRAY['adults'::"text", 'teens'::"text", 'children'::"text", 'couples'::"text", 'families'::"text"])),
    CONSTRAINT "specialist_public_profiles_display_name_length" CHECK ((("char_length"("display_name") <= 160) AND (("publication_status" <> 'published'::"public"."profile_publication_status") OR ("char_length"(TRIM(BOTH FROM "display_name")) > 0)))),
    CONSTRAINT "specialist_public_profiles_long_bio_document" CHECK ((("jsonb_typeof"("long_bio") = 'object'::"text") AND (("long_bio" ->> 'type'::"text") = 'doc'::"text") AND ("octet_length"(("long_bio")::"text") <= 500000))),
    CONSTRAINT "specialist_public_profiles_media_ownership" CHECK (((("profile_photo_url" IS NULL) OR ("split_part"("profile_photo_url", '/'::"text", 1) = ("specialist_id")::"text")) AND (("portrait_photo_url" IS NULL) OR ("split_part"("portrait_photo_url", '/'::"text", 1) = ("specialist_id")::"text")))),
    CONSTRAINT "specialist_public_profiles_name_parts_length" CHECK ((("char_length"("first_name") <= 80) AND ("char_length"("last_name") <= 80))),
    CONSTRAINT "specialist_public_profiles_photo_url_length" CHECK (((("profile_photo_url" IS NULL) OR ("char_length"("profile_photo_url") <= 2048)) AND (("portrait_photo_url" IS NULL) OR ("char_length"("portrait_photo_url") <= 2048)))),
    CONSTRAINT "specialist_public_profiles_publication_time" CHECK (((("publication_status" = 'published'::"public"."profile_publication_status") AND ("published_at" IS NOT NULL)) OR (("publication_status" = 'draft'::"public"."profile_publication_status") AND ("published_at" IS NULL)))),
    CONSTRAINT "specialist_public_profiles_short_bio_length" CHECK (("char_length"("short_bio") <= 500)),
    CONSTRAINT "specialist_public_profiles_status" CHECK (("publication_status" = ANY (ARRAY['draft'::"public"."profile_publication_status", 'published'::"public"."profile_publication_status"])))
);

ALTER TABLE ONLY "public"."specialist_public_profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialist_public_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."specialist_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "specialist_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "price_minor" integer NOT NULL,
    "currency_code" "text" DEFAULT 'PLN'::"text" NOT NULL,
    "duration_minutes" integer,
    "supports_in_person" boolean DEFAULT true NOT NULL,
    "supports_online" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "specialist_services_currency_format" CHECK (("currency_code" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "specialist_services_duration_from_service" CHECK (("duration_minutes" IS NULL)),
    CONSTRAINT "specialist_services_duration_range" CHECK ((("duration_minutes" IS NULL) OR (("duration_minutes" >= 15) AND ("duration_minutes" <= 300)))),
    CONSTRAINT "specialist_services_modality_required" CHECK (((NOT "active") OR "supports_in_person" OR "supports_online")),
    CONSTRAINT "specialist_services_price_range" CHECK ((("price_minor" >= 0) AND ("price_minor" <= 10000000)))
);

ALTER TABLE ONLY "public"."specialist_services" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialist_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."specialist_slug_redirects" (
    "old_slug" "text" NOT NULL,
    "specialist_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "specialist_slug_redirects_old_slug_format" CHECK ((("old_slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text") AND (("char_length"("old_slug") >= 3) AND ("char_length"("old_slug") <= 100))))
);

ALTER TABLE ONLY "public"."specialist_slug_redirects" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialist_slug_redirects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."specialist_time_off" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "specialist_id" "uuid" NOT NULL,
    "during" "tstzrange" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "specialist_time_off_bounded" CHECK (((NOT "isempty"("during")) AND (NOT "lower_inf"("during")) AND (NOT "upper_inf"("during")))),
    CONSTRAINT "specialist_time_off_reason_length" CHECK ((("reason" IS NULL) OR ("char_length"("reason") <= 500)))
);

ALTER TABLE ONLY "public"."specialist_time_off" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialist_time_off" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."specialists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "active" boolean DEFAULT false NOT NULL,
    "public_slug" "text" NOT NULL,
    "professional_title" "text",
    "joined_at" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "color" "text",
    "publicly_visible" boolean DEFAULT false NOT NULL,
    CONSTRAINT "specialists_color_format" CHECK (("color" ~ '^#[0-9a-f]{6}$'::"text")),
    CONSTRAINT "specialists_professional_title_length" CHECK ((("professional_title" IS NULL) OR ("char_length"("professional_title") <= 160))),
    CONSTRAINT "specialists_public_slug_format" CHECK ((("public_slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text") AND (("char_length"("public_slug") >= 3) AND ("char_length"("public_slug") <= 100))))
);

ALTER TABLE ONLY "public"."specialists" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_events" (
    "id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."stripe_events" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."user_roles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visit_closures" (
    "appointment_id" "uuid" NOT NULL,
    "outcome" "public"."visit_outcome" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "note" "text",
    "closed_by" "uuid",
    "closed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "visit_closures_note_length" CHECK ((("note" IS NULL) OR (("char_length"("note") >= 1) AND ("char_length"("note") <= 300)))),
    CONSTRAINT "visit_closures_tags" CHECK ((("tags" <@ ARRAY['late'::"text", 'shortened'::"text", 'difficult'::"text", 'follow_up'::"text", 'technical'::"text"]) AND ("cardinality"("tags") <= 5)))
);

ALTER TABLE ONLY "public"."visit_closures" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."visit_closures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visit_intakes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token_hash" "bytea" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "appointment_id" "uuid",
    "version" smallint DEFAULT 1 NOT NULL,
    "mood" smallint NOT NULL,
    "answers" "jsonb" NOT NULL,
    "health_consent_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_key" "text",
    CONSTRAINT "visit_intakes_answers_object" CHECK (("jsonb_typeof"("answers") = 'object'::"text")),
    CONSTRAINT "visit_intakes_mood_bookable" CHECK ((("mood" >= 1) AND ("mood" <= 10)))
);


ALTER TABLE "public"."visit_intakes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workshops" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "short_description" "text",
    "long_description" "text",
    "specialist_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "room_id" "uuid",
    "modality" "public"."workshop_modality" DEFAULT 'in_person'::"public"."workshop_modality" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "price_minor" integer NOT NULL,
    "currency_code" "text" DEFAULT 'PLN'::"text" NOT NULL,
    "capacity" integer NOT NULL,
    "registration_enabled" boolean DEFAULT false NOT NULL,
    "status" "public"."workshop_status" DEFAULT 'draft'::"public"."workshop_status" NOT NULL,
    "cover_image_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workshops_capacity_range" CHECK ((("capacity" >= 1) AND ("capacity" <= 500))),
    CONSTRAINT "workshops_cover_image_path_length" CHECK ((("cover_image_path" IS NULL) OR ("char_length"("cover_image_path") <= 2048))),
    CONSTRAINT "workshops_currency_format" CHECK (("currency_code" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "workshops_long_description_length" CHECK ((("long_description" IS NULL) OR ("char_length"("long_description") <= 10000))),
    CONSTRAINT "workshops_modality_location_check" CHECK (((("modality" = 'online'::"public"."workshop_modality") AND ("location_id" IS NULL) AND ("room_id" IS NULL)) OR (("modality" = 'in_person'::"public"."workshop_modality") AND ("location_id" IS NOT NULL)))),
    CONSTRAINT "workshops_price_range" CHECK ((("price_minor" >= 0) AND ("price_minor" <= 10000000))),
    CONSTRAINT "workshops_short_description_length" CHECK ((("short_description" IS NULL) OR ("char_length"("short_description") <= 500))),
    CONSTRAINT "workshops_slug_format" CHECK ((("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text") AND (("char_length"("slug") >= 3) AND ("char_length"("slug") <= 100)))),
    CONSTRAINT "workshops_time_range" CHECK (("starts_at" < "ends_at")),
    CONSTRAINT "workshops_title_length" CHECK ((("char_length"("title") >= 1) AND ("char_length"("title") <= 200)))
);

ALTER TABLE ONLY "public"."workshops" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."workshops" OWNER TO "postgres";


ALTER TABLE ONLY "private"."booking_reference_counters"
    ADD CONSTRAINT "booking_reference_counters_pkey" PRIMARY KEY ("month");



ALTER TABLE ONLY "public"."appointment_events"
    ADD CONSTRAINT "appointment_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_access_token_hash_key" UNIQUE ("access_token_hash");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_manage_token_hash_key" UNIQUE ("manage_token_hash");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_room_no_overlap" EXCLUDE USING "gist" ("room_id" WITH =, "blocks" WITH &&) WHERE ((("room_id" IS NOT NULL) AND ("status" = ANY (ARRAY['held'::"public"."appointment_status", 'awaiting_payment'::"public"."appointment_status", 'confirmed'::"public"."appointment_status"]))));



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_specialist_no_overlap" EXCLUDE USING "gist" ("specialist_id" WITH =, "blocks" WITH &&) WHERE (("status" = ANY (ARRAY['held'::"public"."appointment_status", 'awaiting_payment'::"public"."appointment_status", 'confirmed'::"public"."appointment_status"])));



ALTER TABLE ONLY "public"."booking_emails"
    ADD CONSTRAINT "booking_emails_pkey" PRIMARY KEY ("appointment_id", "kind");



ALTER TABLE ONLY "public"."center_public_profile"
    ADD CONSTRAINT "center_public_profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."center_settings"
    ADD CONSTRAINT "center_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."centre_closures"
    ADD CONSTRAINT "centre_closures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_email_key_unique" UNIQUE ("email_key");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_checkout_session_id_key" UNIQUE ("checkout_session_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_payment_intent_id_key" UNIQUE ("payment_intent_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_availability_exceptions"
    ADD CONSTRAINT "room_availability_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_availability_exceptions"
    ADD CONSTRAINT "room_availability_exceptions_unique" UNIQUE NULLS NOT DISTINCT ("room_id", "date", "type", "starts_at", "ends_at");



ALTER TABLE ONLY "public"."room_images"
    ADD CONSTRAINT "room_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_images"
    ADD CONSTRAINT "room_images_room_position_key" UNIQUE ("room_id", "position") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."room_images"
    ADD CONSTRAINT "room_images_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."room_opening_hours"
    ADD CONSTRAINT "room_opening_hours_exact_interval_key" UNIQUE ("room_id", "weekday", "starts_at", "ends_at");



ALTER TABLE ONLY "public"."room_opening_hours"
    ADD CONSTRAINT "room_opening_hours_no_overlap" EXCLUDE USING "gist" ("room_id" WITH =, "weekday" WITH =, "time_span" WITH &&);



ALTER TABLE ONLY "public"."room_opening_hours"
    ADD CONSTRAINT "room_opening_hours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_public_profiles"
    ADD CONSTRAINT "room_public_profiles_pkey" PRIMARY KEY ("room_id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_id_location_id_key" UNIQUE ("id", "location_id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_location_slug_key" UNIQUE ("location_id", "slug");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_catalogs"
    ADD CONSTRAINT "service_catalogs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."site_announcements"
    ADD CONSTRAINT "site_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_content"
    ADD CONSTRAINT "site_content_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."specialist_availability_exceptions"
    ADD CONSTRAINT "specialist_availability_exceptions_pkey" PRIMARY KEY ("rule_id", "date");



ALTER TABLE ONLY "public"."specialist_availability_rules"
    ADD CONSTRAINT "specialist_availability_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."specialist_profile_drafts"
    ADD CONSTRAINT "specialist_profile_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."specialist_public_profiles"
    ADD CONSTRAINT "specialist_public_profiles_pkey" PRIMARY KEY ("specialist_id");



ALTER TABLE ONLY "public"."specialist_services"
    ADD CONSTRAINT "specialist_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."specialist_services"
    ADD CONSTRAINT "specialist_services_specialist_service_key" UNIQUE ("specialist_id", "service_id");



ALTER TABLE ONLY "public"."specialist_slug_redirects"
    ADD CONSTRAINT "specialist_slug_redirects_pkey" PRIMARY KEY ("old_slug");



ALTER TABLE ONLY "public"."specialist_time_off"
    ADD CONSTRAINT "specialist_time_off_no_overlap" EXCLUDE USING "gist" ("specialist_id" WITH =, "during" WITH &&);



ALTER TABLE ONLY "public"."specialist_time_off"
    ADD CONSTRAINT "specialist_time_off_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."specialists"
    ADD CONSTRAINT "specialists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."specialists"
    ADD CONSTRAINT "specialists_public_slug_key" UNIQUE ("public_slug");



ALTER TABLE ONLY "public"."specialists"
    ADD CONSTRAINT "specialists_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."stripe_events"
    ADD CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role");



ALTER TABLE ONLY "public"."visit_closures"
    ADD CONSTRAINT "visit_closures_pkey" PRIMARY KEY ("appointment_id");



ALTER TABLE ONLY "public"."visit_intakes"
    ADD CONSTRAINT "visit_intakes_appointment_id_key" UNIQUE ("appointment_id");



ALTER TABLE ONLY "public"."visit_intakes"
    ADD CONSTRAINT "visit_intakes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visit_intakes"
    ADD CONSTRAINT "visit_intakes_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."workshops"
    ADD CONSTRAINT "workshops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workshops"
    ADD CONSTRAINT "workshops_slug_key" UNIQUE ("slug");



CREATE INDEX "booking_holds_client_idx" ON "private"."booking_holds" USING "btree" ("client_key", "created_at");



CREATE INDEX "appointment_events_appointment_idx" ON "public"."appointment_events" USING "btree" ("appointment_id", "occurred_at", "id");



CREATE INDEX "appointments_client_id_idx" ON "public"."appointments" USING "btree" ("client_id");



CREATE INDEX "appointments_held_idx" ON "public"."appointments" USING "btree" ("hold_expires_at") WHERE ("status" = 'held'::"public"."appointment_status");



CREATE INDEX "appointments_offer_idx" ON "public"."appointments" USING "btree" ("specialist_service_id");



CREATE INDEX "appointments_rule_idx" ON "public"."appointments" USING "btree" ("availability_rule_id") WHERE ("availability_rule_id" IS NOT NULL);



CREATE INDEX "appointments_service_idx" ON "public"."appointments" USING "btree" ("service_id");



CREATE INDEX "appointments_specialist_start_idx" ON "public"."appointments" USING "btree" ("specialist_id", "lower"("during"));



CREATE INDEX "appointments_specialist_starts_at_idx" ON "public"."appointments" USING "btree" ("specialist_id", "lower"("during"));



CREATE INDEX "appointments_starts_at_idx" ON "public"."appointments" USING "btree" ("lower"("during"));



CREATE INDEX "centre_closures_days_idx" ON "public"."centre_closures" USING "btree" ("starts_on", "ends_on");



CREATE INDEX "locations_active_sort_order_idx" ON "public"."locations" USING "btree" ("active", "sort_order");



CREATE INDEX "notifications_appointment_id_idx" ON "public"."notifications" USING "btree" ("appointment_id");



CREATE INDEX "notifications_inbox_idx" ON "public"."notifications" USING "btree" ("user_id", "portal", "created_at" DESC);



CREATE INDEX "payments_appointment_idx" ON "public"."payments" USING "btree" ("appointment_id");



CREATE INDEX "room_availability_exceptions_room_date_idx" ON "public"."room_availability_exceptions" USING "btree" ("room_id", "date");



CREATE UNIQUE INDEX "room_images_one_main_per_room" ON "public"."room_images" USING "btree" ("room_id") WHERE "is_main";



CREATE INDEX "room_opening_hours_room_weekday_idx" ON "public"."room_opening_hours" USING "btree" ("room_id", "weekday", "starts_at");



CREATE INDEX "rooms_location_id_active_sort_order_idx" ON "public"."rooms" USING "btree" ("location_id", "active", "sort_order");



CREATE INDEX "services_active_publicly_visible_sort_order_idx" ON "public"."services" USING "btree" ("active", "publicly_visible", "sort_order");



CREATE INDEX "services_catalog_id_idx" ON "public"."services" USING "btree" ("catalog_id");



CREATE INDEX "site_announcements_dates_idx" ON "public"."site_announcements" USING "btree" ("starts_on", "ends_on");



CREATE INDEX "specialist_availability_rules_room_idx" ON "public"."specialist_availability_rules" USING "btree" ("room_id") WHERE ("room_id" IS NOT NULL);



CREATE INDEX "specialist_availability_rules_specialist_idx" ON "public"."specialist_availability_rules" USING "btree" ("specialist_id", "valid_from");



CREATE UNIQUE INDEX "specialist_profile_drafts_one_active_idx" ON "public"."specialist_profile_drafts" USING "btree" ("specialist_id") WHERE ("status" = ANY (ARRAY['draft'::"public"."profile_publication_status", 'pending_review'::"public"."profile_publication_status"]));



CREATE INDEX "specialist_profile_drafts_pending_review_idx" ON "public"."specialist_profile_drafts" USING "btree" ("submitted_at", "specialist_id") WHERE ("status" = 'pending_review'::"public"."profile_publication_status");



CREATE INDEX "specialist_profile_drafts_reviewed_by_idx" ON "public"."specialist_profile_drafts" USING "btree" ("reviewed_by") WHERE ("reviewed_by" IS NOT NULL);



CREATE INDEX "specialist_profile_drafts_submitted_by_idx" ON "public"."specialist_profile_drafts" USING "btree" ("submitted_by") WHERE ("submitted_by" IS NOT NULL);



CREATE INDEX "specialist_public_profiles_published_idx" ON "public"."specialist_public_profiles" USING "btree" ("published_at" DESC, "specialist_id") WHERE ("publication_status" = 'published'::"public"."profile_publication_status");



CREATE INDEX "specialist_services_service_id_active_idx" ON "public"."specialist_services" USING "btree" ("service_id", "active");



CREATE INDEX "specialist_slug_redirects_specialist_id_idx" ON "public"."specialist_slug_redirects" USING "btree" ("specialist_id");



CREATE INDEX "visit_intakes_client_key_idx" ON "public"."visit_intakes" USING "btree" ("client_key", "created_at") WHERE ("client_key" IS NOT NULL);



CREATE INDEX "visit_intakes_service_id_idx" ON "public"."visit_intakes" USING "btree" ("service_id");



CREATE INDEX "workshops_location_id_idx" ON "public"."workshops" USING "btree" ("location_id") WHERE ("location_id" IS NOT NULL);



CREATE INDEX "workshops_room_id_starts_at_idx" ON "public"."workshops" USING "btree" ("room_id", "starts_at") WHERE ("room_id" IS NOT NULL);



CREATE INDEX "workshops_specialist_id_starts_at_idx" ON "public"."workshops" USING "btree" ("specialist_id", "starts_at");



CREATE INDEX "workshops_status_starts_at_idx" ON "public"."workshops" USING "btree" ("status", "starts_at");



CREATE OR REPLACE TRIGGER "appointment_events_notify" AFTER INSERT ON "public"."appointment_events" FOR EACH ROW EXECUTE FUNCTION "private"."notify_visit_event"();



CREATE OR REPLACE TRIGGER "appointments_a_after_time" BEFORE INSERT OR UPDATE OF "during", "buffer_minutes", "service_id" ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "private"."set_appointment_after_time"();



CREATE OR REPLACE TRIGGER "appointments_broadcast" AFTER INSERT OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "private"."broadcast_visit_change"();



CREATE OR REPLACE TRIGGER "appointments_link_client" BEFORE INSERT OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "private"."link_appointment_client"();



CREATE OR REPLACE TRIGGER "appointments_log_events" AFTER INSERT OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "private"."appointment_events_trigger"();



CREATE OR REPLACE TRIGGER "appointments_refuse_closed_days" BEFORE INSERT OR UPDATE OF "during" ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "private"."refuse_closed_days"();



CREATE OR REPLACE TRIGGER "appointments_set_blocks" BEFORE INSERT OR UPDATE OF "during", "buffer_minutes" ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "private"."set_appointment_blocks"();



CREATE OR REPLACE TRIGGER "appointments_set_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "booking_emails_log_events" AFTER INSERT OR UPDATE ON "public"."booking_emails" FOR EACH ROW EXECUTE FUNCTION "private"."email_events_trigger"();



CREATE OR REPLACE TRIGGER "center_settings_grid_fits" BEFORE UPDATE OF "slot_step_minutes" ON "public"."center_settings" FOR EACH ROW EXECUTE FUNCTION "private"."require_grid_fits"();



CREATE OR REPLACE TRIGGER "clients_set_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "create_specialist_after_role_insert" AFTER INSERT ON "public"."user_roles" FOR EACH ROW WHEN (("new"."role" = 'specialist'::"public"."app_role")) EXECUTE FUNCTION "private"."handle_specialist_role_insert"();



CREATE OR REPLACE TRIGGER "notifications_broadcast" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "private"."broadcast_notification"();



CREATE OR REPLACE TRIGGER "payments_broadcast" AFTER UPDATE OF "status", "refunded_minor" ON "public"."payments" FOR EACH ROW WHEN ((("old"."status" IS DISTINCT FROM "new"."status") OR ("old"."refunded_minor" IS DISTINCT FROM "new"."refunded_minor"))) EXECUTE FUNCTION "private"."broadcast_payment_change"();



CREATE OR REPLACE TRIGGER "payments_log_events" AFTER INSERT OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "private"."payment_events_trigger"();



CREATE OR REPLACE TRIGGER "payments_set_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "room_availability_exceptions_on_grid" BEFORE INSERT OR UPDATE OF "starts_at", "ends_at" ON "public"."room_availability_exceptions" FOR EACH ROW EXECUTE FUNCTION "private"."require_on_grid"();



CREATE OR REPLACE TRIGGER "room_opening_hours_on_grid" BEFORE INSERT OR UPDATE OF "starts_at", "ends_at" ON "public"."room_opening_hours" FOR EACH ROW EXECUTE FUNCTION "private"."require_on_grid"();



CREATE OR REPLACE TRIGGER "set_center_public_profile_updated_at" BEFORE UPDATE ON "public"."center_public_profile" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_center_settings_updated_at" BEFORE UPDATE ON "public"."center_settings" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_locations_updated_at" BEFORE UPDATE ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_room_availability_exceptions_updated_at" BEFORE UPDATE ON "public"."room_availability_exceptions" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_room_images_updated_at" BEFORE UPDATE ON "public"."room_images" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_room_opening_hours_updated_at" BEFORE UPDATE ON "public"."room_opening_hours" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_room_public_profiles_updated_at" BEFORE UPDATE ON "public"."room_public_profiles" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_rooms_updated_at" BEFORE UPDATE ON "public"."rooms" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_service_catalogs_updated_at" BEFORE UPDATE ON "public"."service_catalogs" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_services_updated_at" BEFORE UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_site_announcements_updated_at" BEFORE UPDATE ON "public"."site_announcements" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_site_content_updated_at" BEFORE UPDATE ON "public"."site_content" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_specialist_availability_rules_updated_at" BEFORE UPDATE ON "public"."specialist_availability_rules" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_specialist_profile_drafts_updated_at" BEFORE UPDATE ON "public"."specialist_profile_drafts" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_specialist_public_profiles_updated_at" BEFORE UPDATE ON "public"."specialist_public_profiles" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_specialist_services_updated_at" BEFORE UPDATE ON "public"."specialist_services" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_specialist_time_off_updated_at" BEFORE UPDATE ON "public"."specialist_time_off" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_specialists_updated_at" BEFORE UPDATE ON "public"."specialists" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_workshops_updated_at" BEFORE UPDATE ON "public"."workshops" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "specialist_availability_rules_on_grid" BEFORE INSERT OR UPDATE OF "starts_at", "ends_at" ON "public"."specialist_availability_rules" FOR EACH ROW EXECUTE FUNCTION "private"."require_on_grid"();



CREATE OR REPLACE TRIGGER "specialist_profile_drafts_broadcast" AFTER INSERT OR DELETE OR UPDATE OF "status" ON "public"."specialist_profile_drafts" FOR EACH ROW EXECUTE FUNCTION "private"."broadcast_profile_draft_change"();



CREATE OR REPLACE TRIGGER "specialist_profile_drafts_notify" AFTER INSERT OR UPDATE OF "status" ON "public"."specialist_profile_drafts" FOR EACH ROW EXECUTE FUNCTION "private"."notify_profile_submitted"();



CREATE OR REPLACE TRIGGER "specialist_profile_drafts_notify_reviewed" AFTER UPDATE OF "status" ON "public"."specialist_profile_drafts" FOR EACH ROW EXECUTE FUNCTION "private"."notify_profile_reviewed"();



CREATE OR REPLACE TRIGGER "visit_intakes_limit" BEFORE INSERT ON "public"."visit_intakes" FOR EACH ROW EXECUTE FUNCTION "private"."limit_intakes"();



ALTER TABLE ONLY "public"."appointment_events"
    ADD CONSTRAINT "appointment_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointment_events"
    ADD CONSTRAINT "appointment_events_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_availability_rule_id_fkey" FOREIGN KEY ("availability_rule_id") REFERENCES "public"."specialist_availability_rules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_specialist_service_id_fkey" FOREIGN KEY ("specialist_service_id") REFERENCES "public"."specialist_services"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."booking_emails"
    ADD CONSTRAINT "booking_emails_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_availability_exceptions"
    ADD CONSTRAINT "room_availability_exceptions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."room_images"
    ADD CONSTRAINT "room_images_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_opening_hours"
    ADD CONSTRAINT "room_opening_hours_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."room_public_profiles"
    ADD CONSTRAINT "room_public_profiles_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "public"."service_catalogs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."specialist_availability_exceptions"
    ADD CONSTRAINT "specialist_availability_exceptions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."specialist_availability_rules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."specialist_availability_rules"
    ADD CONSTRAINT "specialist_availability_rules_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."specialist_availability_rules"
    ADD CONSTRAINT "specialist_availability_rules_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."specialist_profile_drafts"
    ADD CONSTRAINT "specialist_profile_drafts_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."specialist_profile_drafts"
    ADD CONSTRAINT "specialist_profile_drafts_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."specialist_profile_drafts"
    ADD CONSTRAINT "specialist_profile_drafts_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."specialist_public_profiles"
    ADD CONSTRAINT "specialist_public_profiles_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."specialist_services"
    ADD CONSTRAINT "specialist_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."specialist_services"
    ADD CONSTRAINT "specialist_services_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."specialist_slug_redirects"
    ADD CONSTRAINT "specialist_slug_redirects_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."specialist_time_off"
    ADD CONSTRAINT "specialist_time_off_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."specialists"
    ADD CONSTRAINT "specialists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."visit_closures"
    ADD CONSTRAINT "visit_closures_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."visit_closures"
    ADD CONSTRAINT "visit_closures_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."visit_intakes"
    ADD CONSTRAINT "visit_intakes_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."visit_intakes"
    ADD CONSTRAINT "visit_intakes_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workshops"
    ADD CONSTRAINT "workshops_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."workshops"
    ADD CONSTRAINT "workshops_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."workshops"
    ADD CONSTRAINT "workshops_room_location_fkey" FOREIGN KEY ("room_id", "location_id") REFERENCES "public"."rooms"("id", "location_id");



ALTER TABLE ONLY "public"."workshops"
    ADD CONSTRAINT "workshops_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "public"."specialists"("id") ON DELETE RESTRICT;



ALTER TABLE "private"."booking_reference_counters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admins can delete room availability exceptions" ON "public"."room_availability_exceptions" FOR DELETE TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can delete room opening hours" ON "public"."room_opening_hours" FOR DELETE TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can delete service catalogs" ON "public"."service_catalogs" FOR DELETE TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can insert locations" ON "public"."locations" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can insert room availability exceptions" ON "public"."room_availability_exceptions" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can insert room opening hours" ON "public"."room_opening_hours" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can insert room public profiles" ON "public"."room_public_profiles" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can insert rooms" ON "public"."rooms" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can insert service catalogs" ON "public"."service_catalogs" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can insert services" ON "public"."services" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can insert workshops" ON "public"."workshops" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can read center settings" ON "public"."center_settings" FOR SELECT TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can read site content" ON "public"."site_content" FOR SELECT TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can update center public profile" ON "public"."center_public_profile" FOR UPDATE TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role")) WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can update center settings" ON "public"."center_settings" FOR UPDATE TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role")) WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can update locations" ON "public"."locations" FOR UPDATE TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role")) WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can update room availability exceptions" ON "public"."room_availability_exceptions" FOR UPDATE TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role")) WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can update room opening hours" ON "public"."room_opening_hours" FOR UPDATE TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role")) WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can update room public profiles" ON "public"."room_public_profiles" FOR UPDATE TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role")) WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can update rooms" ON "public"."rooms" FOR UPDATE TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role")) WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can update service catalogs" ON "public"."service_catalogs" FOR UPDATE TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role")) WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can update services" ON "public"."services" FOR UPDATE TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role")) WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can update site content" ON "public"."site_content" FOR UPDATE TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role")) WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins can update workshops" ON "public"."workshops" FOR UPDATE TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role")) WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins manage announcements" ON "public"."site_announcements" TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role")) WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins manage centre closures" ON "public"."centre_closures" TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role")) WITH CHECK ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins read booking e-mails" ON "public"."booking_emails" FOR SELECT TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Admins read payments" ON "public"."payments" FOR SELECT TO "authenticated" USING ("public"."has_role"('admin'::"public"."app_role"));



CREATE POLICY "Anon can read published room public profiles" ON "public"."room_public_profiles" FOR SELECT TO "anon" USING (("published" AND ( SELECT "private"."room_is_publicly_exposable"("room_public_profiles"."room_id") AS "room_is_publicly_exposable")));



CREATE POLICY "Anyone can read photos of published rooms" ON "public"."room_images" FOR SELECT TO "anon" USING ("private"."room_media_is_public"("room_id"));



CREATE POLICY "Anyone can read service catalogs" ON "public"."service_catalogs" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Authenticated users can insert permitted specialist services" ON "public"."specialist_services" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_role"('admin'::"public"."app_role") OR ("public"."has_role"('specialist'::"public"."app_role") AND (EXISTS ( SELECT 1
   FROM "public"."specialists"
  WHERE (("specialists"."id" = "specialist_services"."specialist_id") AND ("specialists"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Authenticated users can read permitted locations" ON "public"."locations" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR ("public"."has_role"('specialist'::"public"."app_role") AND "active")));



CREATE POLICY "Authenticated users can read permitted public profiles" ON "public"."specialist_public_profiles" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR (EXISTS ( SELECT 1
   FROM "public"."specialists"
  WHERE (("specialists"."id" = "specialist_public_profiles"."specialist_id") AND ("specialists"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (("publication_status" = 'published'::"public"."profile_publication_status") AND "private"."specialist_is_active"("specialist_id"))));



CREATE POLICY "Authenticated users can read permitted rooms" ON "public"."rooms" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR ("public"."has_role"('specialist'::"public"."app_role") AND "active")));



CREATE POLICY "Authenticated users can read permitted services" ON "public"."services" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR ("public"."has_role"('specialist'::"public"."app_role") AND "active")));



CREATE POLICY "Authenticated users can read permitted specialist services" ON "public"."specialist_services" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR (EXISTS ( SELECT 1
   FROM "public"."specialists"
  WHERE (("specialists"."id" = "specialist_services"."specialist_id") AND ("specialists"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Authenticated users can read permitted specialists" ON "public"."specialists" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_role"('admin'::"public"."app_role") OR ("publicly_visible" AND "private"."specialist_has_published_profile"("id"))));



CREATE POLICY "Authenticated users can read permitted workshops" ON "public"."workshops" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR ("public"."has_role"('specialist'::"public"."app_role") AND (EXISTS ( SELECT 1
   FROM "public"."specialists"
  WHERE (("specialists"."id" = "workshops"."specialist_id") AND ("specialists"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Authenticated users can update permitted specialist services" ON "public"."specialist_services" FOR UPDATE TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR (EXISTS ( SELECT 1
   FROM "public"."specialists"
  WHERE (("specialists"."id" = "specialist_services"."specialist_id") AND ("specialists"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK (("public"."has_role"('admin'::"public"."app_role") OR (EXISTS ( SELECT 1
   FROM "public"."specialists"
  WHERE (("specialists"."id" = "specialist_services"."specialist_id") AND ("specialists"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Portal roles can read center public profile" ON "public"."center_public_profile" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR "public"."has_role"('specialist'::"public"."app_role")));



CREATE POLICY "Public can read active public locations" ON "public"."locations" FOR SELECT TO "anon" USING (("active" AND "publicly_visible"));



CREATE POLICY "Public can read active public services" ON "public"."services" FOR SELECT TO "anon" USING (("active" AND "publicly_visible"));



CREATE POLICY "Public can read active specialists with published profiles" ON "public"."specialists" FOR SELECT TO "anon" USING (("publicly_visible" AND "private"."specialist_has_published_profile"("id")));



CREATE POLICY "Public can read effective public specialist services" ON "public"."specialist_services" FOR SELECT TO "anon" USING (("active" AND "private"."service_is_public"("service_id") AND "private"."specialist_is_listed"("specialist_id")));



CREATE POLICY "Public can read non-draft workshops" ON "public"."workshops" FOR SELECT TO "anon" USING (("status" <> 'draft'::"public"."workshop_status"));



CREATE POLICY "Public can read published center public profile" ON "public"."center_public_profile" FOR SELECT TO "anon" USING ("published");



CREATE POLICY "Public can read published profiles of active specialists" ON "public"."specialist_public_profiles" FOR SELECT TO "anon" USING ((("publication_status" = 'published'::"public"."profile_publication_status") AND "private"."specialist_is_listed"("specialist_id")));



CREATE POLICY "Public can read published site content" ON "public"."site_content" FOR SELECT TO "anon" USING (("published_payload" IS NOT NULL));



CREATE POLICY "Read own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Redirects to published specialists are readable" ON "public"."specialist_slug_redirects" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."specialists" "specialist"
  WHERE (("specialist"."id" = "specialist_slug_redirects"."specialist_id") AND "specialist"."publicly_visible" AND "private"."specialist_has_published_profile"("specialist"."id")))));



CREATE POLICY "Signed-in users can read permitted room photos" ON "public"."room_images" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR "private"."room_media_is_public"("room_id")));



CREATE POLICY "Specialists and admins can read availability" ON "public"."specialist_availability_rules" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR (EXISTS ( SELECT 1
   FROM "public"."specialists"
  WHERE (("specialists"."id" = "specialist_availability_rules"."specialist_id") AND ("specialists"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Specialists and admins can read availability exceptions" ON "public"."specialist_availability_exceptions" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR (EXISTS ( SELECT 1
   FROM ("public"."specialist_availability_rules" "rule"
     JOIN "public"."specialists" ON (("specialists"."id" = "rule"."specialist_id")))
  WHERE (("rule"."id" = "specialist_availability_exceptions"."rule_id") AND ("specialists"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Specialists and admins can read permitted drafts" ON "public"."specialist_profile_drafts" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR (EXISTS ( SELECT 1
   FROM "public"."specialists"
  WHERE (("specialists"."id" = "specialist_profile_drafts"."specialist_id") AND ("specialists"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Specialists and admins can read time off" ON "public"."specialist_time_off" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR (EXISTS ( SELECT 1
   FROM "public"."specialists"
  WHERE (("specialists"."id" = "specialist_time_off"."specialist_id") AND ("specialists"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Specialists read centre closures" ON "public"."centre_closures" FOR SELECT TO "authenticated" USING ("public"."has_role"('specialist'::"public"."app_role"));



CREATE POLICY "Specialists read their visits, admins all" ON "public"."appointments" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR ("specialist_id" IN ( SELECT "specialists"."id"
   FROM "public"."specialists"
  WHERE ("specialists"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Staff can read permitted room availability exceptions" ON "public"."room_availability_exceptions" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR ("public"."has_role"('specialist'::"public"."app_role") AND (EXISTS ( SELECT 1
   FROM "public"."rooms"
  WHERE (("rooms"."id" = "room_availability_exceptions"."room_id") AND "rooms"."active"))))));



CREATE POLICY "Staff can read permitted room opening hours" ON "public"."room_opening_hours" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR ("public"."has_role"('specialist'::"public"."app_role") AND (EXISTS ( SELECT 1
   FROM "public"."rooms"
  WHERE (("rooms"."id" = "room_opening_hours"."room_id") AND "rooms"."active"))))));



CREATE POLICY "Staff can read permitted room public profiles" ON "public"."room_public_profiles" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR ("public"."has_role"('specialist'::"public"."app_role") AND (EXISTS ( SELECT 1
   FROM "public"."rooms"
  WHERE (("rooms"."id" = "room_public_profiles"."room_id") AND "rooms"."active"))))));



CREATE POLICY "The centre and the visit's specialist read its intake" ON "public"."visit_intakes" FOR SELECT TO "authenticated" USING (("public"."has_role"('admin'::"public"."app_role") OR (EXISTS ( SELECT 1
   FROM ("public"."appointments" "visit"
     JOIN "public"."specialists" "specialist" ON (("specialist"."id" = "visit"."specialist_id")))
  WHERE (("visit"."id" = "visit_intakes"."appointment_id") AND ("specialist"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can read permitted profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "id") OR "public"."has_role"('admin'::"public"."app_role")));



CREATE POLICY "Users can read their own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."appointment_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."booking_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."center_public_profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."center_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."centre_closures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_availability_exceptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_opening_hours" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_public_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_catalogs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialist_availability_exceptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialist_availability_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialist_profile_drafts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialist_public_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialist_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialist_slug_redirects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialist_time_off" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."visit_closures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."visit_intakes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workshops" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";












GRANT USAGE ON SCHEMA "private" TO "anon";
GRANT USAGE ON SCHEMA "private" TO "authenticated";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";







































REVOKE ALL ON TYPE "public"."app_role" FROM PUBLIC;
GRANT ALL ON TYPE "public"."app_role" TO "authenticated";
GRANT ALL ON TYPE "public"."app_role" TO "service_role";



REVOKE ALL ON TYPE "public"."profile_publication_status" FROM PUBLIC;
GRANT ALL ON TYPE "public"."profile_publication_status" TO "authenticated";
GRANT ALL ON TYPE "public"."profile_publication_status" TO "service_role";



REVOKE ALL ON TYPE "public"."service_category" FROM PUBLIC;
GRANT ALL ON TYPE "public"."service_category" TO "authenticated";
GRANT ALL ON TYPE "public"."service_category" TO "service_role";



REVOKE ALL ON TYPE "public"."workshop_modality" FROM PUBLIC;
GRANT ALL ON TYPE "public"."workshop_modality" TO "anon";
GRANT ALL ON TYPE "public"."workshop_modality" TO "authenticated";
GRANT ALL ON TYPE "public"."workshop_modality" TO "service_role";



REVOKE ALL ON TYPE "public"."workshop_status" FROM PUBLIC;
GRANT ALL ON TYPE "public"."workshop_status" TO "anon";
GRANT ALL ON TYPE "public"."workshop_status" TO "authenticated";
GRANT ALL ON TYPE "public"."workshop_status" TO "service_role";



























































































































































































































































































































































































































































































































































































































































































































REVOKE ALL ON FUNCTION "private"."apply_retention"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."appointment_events_trigger"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."appointment_is_live"("p_status" "public"."appointment_status", "p_hold_expires_at" timestamp with time zone, "p_payment_due_at" timestamp with time zone) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."availability_clash"("p_ignore_id" "uuid", "p_specialist_id" "uuid", "p_room_id" "uuid", "p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_interval" smallint, "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_valid_until" "date") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."availability_conflict"("p_ignore_id" "uuid", "p_specialist_id" "uuid", "p_room_id" "uuid", "p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_interval" smallint, "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_valid_until" "date") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."availability_nth_date"("p_weekdays" smallint[], "p_interval" smallint, "p_valid_from" "date", "p_count" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."availability_pattern_on"("p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_interval" smallint, "p_valid_from" "date", "p_valid_until" "date", "p_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."availability_pattern_on"("p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_interval" smallint, "p_valid_from" "date", "p_valid_until" "date", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "private"."availability_pattern_on"("p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_interval" smallint, "p_valid_from" "date", "p_valid_until" "date", "p_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "private"."availability_rule_on"("p_rule_id" "uuid", "p_date" "date") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."bookable_offer"("p_service_slug" "text", "p_specialist_slug" "text", "p_mode" "public"."visit_mode") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."bookable_offers"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."broadcast_notification"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."broadcast_payment_change"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."broadcast_profile_draft_change"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."broadcast_visit_change"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."can_manage_specialist_media"("object_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_manage_specialist_media"("object_name" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."can_read_published_specialist_media"("object_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_read_published_specialist_media"("object_name" "text") TO "anon";
GRANT ALL ON FUNCTION "private"."can_read_published_specialist_media"("object_name" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."cancel_overdue_payments"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."centre_closed_on"("p_day" "date") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."change_reason"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."client_has_open_business"("p_client" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."client_totals"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."clients_past_keeping"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."closure_state"("p_status" "public"."appointment_status", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_outcome" "public"."visit_outcome") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."email_events_trigger"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."forget_client_data"("p_client" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."forget_untied_intakes"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."free_slots"("p_offer_id" "uuid", "p_mode" "public"."visit_mode", "p_from" "date", "p_to" "date", "p_location_id" "uuid", "p_ignore_appointment" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."grid_down"("p_time" time without time zone, "p_step" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."grid_up"("p_time" time without time zone, "p_step" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."handle_new_auth_user"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."handle_specialist_role_insert"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."intakes_past_keeping"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."is_weekday_set"("p_days" smallint[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_weekday_set"("p_days" smallint[]) TO "authenticated";
GRANT ALL ON FUNCTION "private"."is_weekday_set"("p_days" smallint[]) TO "service_role";



REVOKE ALL ON FUNCTION "private"."limit_intakes"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."link_appointment_client"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."log_appointment_event"("p_appointment_id" "uuid", "p_kind" "text", "p_actor" "text", "p_details" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."managed_rule_owner"("p_rule_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."managed_specialist_id"("p_specialist_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."managed_specialist_id"("p_specialist_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."may_close_visit"("p_visit" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."next_booking_reference"("p_at" timestamp with time zone, "p_time_zone" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."notify_profile_reviewed"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."notify_profile_submitted"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."notify_visit_event"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."notify_visits_to_close"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."on_grid"("p_time" time without time zone, "p_step" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."open_settlements"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."payment_due"("p_starts_at" timestamp with time zone) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."payment_events_trigger"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."public_location_id"("p_slug" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."refuse_closed_days"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."request_closing_emails"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."request_payment_emails"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."require_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."require_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."require_grid_fits"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."require_on_grid"() FROM PUBLIC;



GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("reference") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("specialist_id") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("service_id") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("specialist_service_id") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("availability_rule_id") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("mode") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("room_id") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("during") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("buffer_minutes") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("blocks") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("duration_minutes") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("price_minor") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("currency_code") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("status") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("hold_expires_at") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("client_name") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("client_email") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("client_phone") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("client_notes") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("terms_accepted_at") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("privacy_accepted_at") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("confirmed_at") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("cancelled_at") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("cancelled_by") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("updated_at") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("reschedule_count") ON TABLE "public"."appointments" TO "authenticated";



GRANT SELECT("refund_due_minor") ON TABLE "public"."appointments" TO "authenticated";



REVOKE ALL ON FUNCTION "private"."reservation_by_token"("p_token" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."room_is_publicly_exposable"("p_room_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."room_is_publicly_exposable"("p_room_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "private"."room_is_publicly_exposable"("p_room_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "private"."room_is_publicly_exposable"("p_room_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."room_media_is_public"("p_room_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."room_media_is_public"("p_room_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "private"."room_media_is_public"("p_room_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."self_reschedulable"("p_visit" "public"."appointments") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."service_is_public"("target_service_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."service_is_public"("target_service_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "private"."service_is_public"("target_service_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."set_appointment_after_time"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."set_appointment_blocks"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."set_updated_at"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."shown_as_visit"("p_visit" "public"."appointments") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."specialist_display_name"("p_specialist_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."specialist_has_published_profile"("target_specialist_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."specialist_has_published_profile"("target_specialist_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "private"."specialist_has_published_profile"("target_specialist_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."specialist_is_active"("target_specialist_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."specialist_is_active"("target_specialist_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "private"."specialist_is_active"("target_specialist_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."specialist_is_listed"("p_specialist" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."specialist_is_listed"("p_specialist" "uuid") TO "anon";
GRANT ALL ON FUNCTION "private"."specialist_is_listed"("p_specialist" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."times_moved"("p_appointment_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."visible_visits"("p_own" boolean) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."visit_archived"("p_status" "public"."appointment_status", "p_ends_at" timestamp with time zone, "p_cancelled_at" timestamp with time zone, "p_refund_due" integer, "p_refunded" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."write_availability_rule"("p_specialist_id" "uuid", "p_id" "uuid", "p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_interval_weeks" smallint, "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_valid_until" "date", "p_occurrence_count" smallint, "p_mode" "public"."availability_mode", "p_room_id" "uuid", "p_note" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."accept_booking_terms"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_booking_terms"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_room_image"("p_room_id" "uuid", "p_storage_path" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_room_image"("p_room_id" "uuid", "p_storage_path" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_room_image"("p_room_id" "uuid", "p_storage_path" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_time_off"("p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_reason" "text", "p_specialist_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_time_off"("p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_reason" "text", "p_specialist_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_time_off"("p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_reason" "text", "p_specialist_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_update_client"("p_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_update_client"("p_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_client"("p_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."approve_specialist_profile_draft"("p_draft_id" "uuid", "p_review_comment" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_specialist_profile_draft"("p_draft_id" "uuid", "p_review_comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_specialist_profile_draft"("p_draft_id" "uuid", "p_review_comment" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."arrange_services"("p_catalogs" "jsonb", "p_services" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."arrange_services"("p_catalogs" "jsonb", "p_services" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."arrange_services"("p_catalogs" "jsonb", "p_services" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."attach_checkout_session"("p_access_token" "text", "p_session_id" "text", "p_expires_at" timestamp with time zone, "p_amount_minor" integer, "p_currency_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."attach_checkout_session"("p_access_token" "text", "p_session_id" "text", "p_expires_at" timestamp with time zone, "p_amount_minor" integer, "p_currency_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."attach_reservation_payment"("p_token" "text", "p_session_id" "text", "p_amount_minor" integer, "p_currency_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."attach_reservation_payment"("p_token" "text", "p_session_id" "text", "p_amount_minor" integer, "p_currency_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."attach_visit_intake"("p_access_token" "text", "p_intake_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."attach_visit_intake"("p_access_token" "text", "p_intake_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."booking_window"() TO "anon";
GRANT ALL ON FUNCTION "public"."booking_window"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."booking_window"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_booking"("p_manage_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_booking"("p_manage_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_unpaid_visits"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_unpaid_visits"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."centre_book_visit"("p_offer_id" "uuid", "p_mode" "public"."visit_mode", "p_starts_at" timestamp with time zone, "p_room_id" "uuid", "p_client_name" "text", "p_client_email" "text", "p_client_phone" "text", "p_client_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."centre_book_visit"("p_offer_id" "uuid", "p_mode" "public"."visit_mode", "p_starts_at" timestamp with time zone, "p_room_id" "uuid", "p_client_name" "text", "p_client_email" "text", "p_client_phone" "text", "p_client_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."centre_book_visit"("p_offer_id" "uuid", "p_mode" "public"."visit_mode", "p_starts_at" timestamp with time zone, "p_room_id" "uuid", "p_client_name" "text", "p_client_email" "text", "p_client_phone" "text", "p_client_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."centre_cancel_visit"("p_appointment_id" "uuid", "p_refund_minor" integer, "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."centre_cancel_visit"("p_appointment_id" "uuid", "p_refund_minor" integer, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."centre_cancel_visit"("p_appointment_id" "uuid", "p_refund_minor" integer, "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."centre_refund_visit"("p_appointment_id" "uuid", "p_refund_minor" integer, "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."centre_refund_visit"("p_appointment_id" "uuid", "p_refund_minor" integer, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."centre_refund_visit"("p_appointment_id" "uuid", "p_refund_minor" integer, "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."centre_reschedule_visit"("p_appointment_id" "uuid", "p_starts_at" timestamp with time zone, "p_mode" "public"."visit_mode", "p_room_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."centre_reschedule_visit"("p_appointment_id" "uuid", "p_starts_at" timestamp with time zone, "p_mode" "public"."visit_mode", "p_room_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."centre_reschedule_visit"("p_appointment_id" "uuid", "p_starts_at" timestamp with time zone, "p_mode" "public"."visit_mode", "p_room_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."centre_resend_payment_link"("p_appointment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."centre_resend_payment_link"("p_appointment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."centre_resend_payment_link"("p_appointment_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."centre_settle_visit"("p_appointment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."centre_settle_visit"("p_appointment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."centre_settle_visit"("p_appointment_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_booking_email"("p_reference" "text", "p_kind" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_booking_email"("p_reference" "text", "p_kind" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."client_duplicates"("p_client" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."client_duplicates"("p_client" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."client_duplicates"("p_client" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."close_visit"("p_visit" "uuid", "p_outcome" "public"."visit_outcome", "p_tags" "text"[], "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."close_visit"("p_visit" "uuid", "p_outcome" "public"."visit_outcome", "p_tags" "text"[], "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_visit"("p_visit" "uuid", "p_outcome" "public"."visit_outcome", "p_tags" "text"[], "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."company_details"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."company_details"() TO "anon";
GRANT ALL ON FUNCTION "public"."company_details"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."company_details"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."count_visit_views"("p_views" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."count_visit_views"("p_views" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_visit_views"("p_views" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_announcement"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_announcement"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_announcement"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_announcement"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_availability_occurrence"("p_rule_id" "uuid", "p_date" "date", "p_scope" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_availability_occurrence"("p_rule_id" "uuid", "p_date" "date", "p_scope" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_availability_occurrence"("p_rule_id" "uuid", "p_date" "date", "p_scope" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_availability_rule"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_availability_rule"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_availability_rule"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_time_off"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_time_off"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_time_off"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."edit_availability_occurrence"("p_rule_id" "uuid", "p_date" "date", "p_scope" "text", "p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_mode" "public"."availability_mode", "p_room_id" "uuid", "p_interval_weeks" smallint, "p_valid_until" "date", "p_occurrence_count" smallint, "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."edit_availability_occurrence"("p_rule_id" "uuid", "p_date" "date", "p_scope" "text", "p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_mode" "public"."availability_mode", "p_room_id" "uuid", "p_interval_weeks" smallint, "p_valid_until" "date", "p_occurrence_count" smallint, "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."edit_availability_occurrence"("p_rule_id" "uuid", "p_date" "date", "p_scope" "text", "p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_mode" "public"."availability_mode", "p_room_id" "uuid", "p_interval_weeks" smallint, "p_valid_until" "date", "p_occurrence_count" smallint, "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fail_checkout_session"("p_session_id" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fail_checkout_session"("p_session_id" "text", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."forget_client"("p_client" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."forget_client"("p_client" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."forget_client"("p_client" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fulfill_checkout_session"("p_session_id" "text", "p_paid" boolean, "p_payment_intent_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fulfill_checkout_session"("p_session_id" "text", "p_paid" boolean, "p_payment_intent_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_booking"("p_access_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_booking"("p_access_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_client"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_client"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_visit"("p_id" "uuid", "p_own" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_visit"("p_id" "uuid", "p_own" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_visit"("p_id" "uuid", "p_own" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_visit_client"("p_visit_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_visit_client"("p_visit_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_visit_client"("p_visit_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_visit_closure"("p_visit" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_visit_closure"("p_visit" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_visit_closure"("p_visit" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."grant_admin"("p_user" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."grant_admin"("p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_admin"("p_user" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_role"("required_role" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_role"("required_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("required_role" "public"."app_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."hold_slot"("p_service_slug" "text", "p_specialist_slug" "text", "p_mode" "public"."visit_mode", "p_starts_at" timestamp with time zone, "p_client_key" "text", "p_location_slug" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."hold_slot"("p_service_slug" "text", "p_specialist_slug" "text", "p_mode" "public"."visit_mode", "p_starts_at" timestamp with time zone, "p_client_key" "text", "p_location_slug" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_bookable_offers"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_bookable_offers"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_bookable_offers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_bookable_offers"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_client_visits"("p_client_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_client_visits"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_client_visits"("p_client_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_due_emails"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_due_emails"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_free_slots"("p_service_slug" "text", "p_specialist_slug" "text", "p_mode" "public"."visit_mode", "p_from" "date", "p_to" "date", "p_location_slug" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_free_slots"("p_service_slug" "text", "p_specialist_slug" "text", "p_mode" "public"."visit_mode", "p_from" "date", "p_to" "date", "p_location_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."list_free_slots"("p_service_slug" "text", "p_specialist_slug" "text", "p_mode" "public"."visit_mode", "p_from" "date", "p_to" "date", "p_location_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_free_slots"("p_service_slug" "text", "p_specialist_slug" "text", "p_mode" "public"."visit_mode", "p_from" "date", "p_to" "date", "p_location_slug" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_portal_users"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_portal_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_portal_users"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_public_room_locations"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_public_room_locations"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_public_room_locations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_public_room_locations"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_published_room_placements"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_published_room_placements"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_published_room_placements"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_published_room_placements"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_reschedule_slots"("p_manage_token" "text", "p_from" "date", "p_to" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_reschedule_slots"("p_manage_token" "text", "p_from" "date", "p_to" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_room_occupancy"("p_from" "date", "p_to" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_room_occupancy"("p_from" "date", "p_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_room_occupancy"("p_from" "date", "p_to" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_settlements"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_settlements"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_settlements"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_visit_events"("p_id" "uuid", "p_own" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_visit_events"("p_id" "uuid", "p_own" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_visit_events"("p_id" "uuid", "p_own" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_visits"("p_from" "date", "p_to" "date", "p_specialist_id" "uuid", "p_own" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_visits"("p_from" "date", "p_to" "date", "p_specialist_id" "uuid", "p_own" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_visits"("p_from" "date", "p_to" "date", "p_specialist_id" "uuid", "p_own" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_booking_email_sent"("p_reference" "text", "p_kind" "text", "p_message_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_booking_email_sent"("p_reference" "text", "p_kind" "text", "p_message_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_notification_read"("p_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_notification_unread"("p_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_notification_unread"("p_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_unread"("p_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_notifications_read"("p_portal" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_portal" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notifications_read"("p_portal" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."merge_clients"("p_keep" "uuid", "p_merge" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."merge_clients"("p_keep" "uuid", "p_merge" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."merge_clients"("p_keep" "uuid", "p_merge" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."my_clients"("p_query" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_clients"("p_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_clients"("p_query" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."pending_checkout_session"("p_access_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."pending_checkout_session"("p_access_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."pending_reservation_payment"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."pending_reservation_payment"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."portal_user_id_by_email"("p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."portal_user_id_by_email"("p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."publish_site_content"("p_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."publish_site_content"("p_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."publish_site_content"("p_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_refund"("p_payment_intent_id" "text", "p_refunded_minor" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_refund"("p_payment_intent_id" "text", "p_refunded_minor" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."reject_specialist_profile_draft"("p_draft_id" "uuid", "p_review_comment" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_specialist_profile_draft"("p_draft_id" "uuid", "p_review_comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_specialist_profile_draft"("p_draft_id" "uuid", "p_review_comment" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."release_booking_email"("p_reference" "text", "p_kind" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."release_booking_email"("p_reference" "text", "p_kind" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."release_hold"("p_access_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."release_hold"("p_access_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."remove_room_image"("p_image_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_room_image"("p_image_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_room_image"("p_image_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reorder_room_images"("p_room_id" "uuid", "p_image_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reorder_room_images"("p_room_id" "uuid", "p_image_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_room_images"("p_room_id" "uuid", "p_image_ids" "uuid"[]) TO "service_role";



GRANT ALL ON TABLE "public"."room_opening_hours" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."room_opening_hours" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."replace_room_opening_hours"("p_room_id" "uuid", "p_intervals" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_room_opening_hours"("p_room_id" "uuid", "p_intervals" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_room_opening_hours"("p_room_id" "uuid", "p_intervals" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reschedule_booking"("p_manage_token" "text", "p_starts_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reschedule_booking"("p_manage_token" "text", "p_starts_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."reserve_hold"("p_access_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reserve_hold"("p_access_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."retention_preview"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."retention_preview"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."retention_preview"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."revoke_admin"("p_user" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revoke_admin"("p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_admin"("p_user" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_availability_rule"("p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_mode" "public"."availability_mode", "p_room_id" "uuid", "p_interval_weeks" smallint, "p_valid_until" "date", "p_occurrence_count" smallint, "p_note" "text", "p_id" "uuid", "p_specialist_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_availability_rule"("p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_mode" "public"."availability_mode", "p_room_id" "uuid", "p_interval_weeks" smallint, "p_valid_until" "date", "p_occurrence_count" smallint, "p_note" "text", "p_id" "uuid", "p_specialist_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_availability_rule"("p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_mode" "public"."availability_mode", "p_room_id" "uuid", "p_interval_weeks" smallint, "p_valid_until" "date", "p_occurrence_count" smallint, "p_note" "text", "p_id" "uuid", "p_specialist_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_booking_details"("p_access_token" "text", "p_name" "text", "p_email" "text", "p_phone" "text", "p_notes" "text", "p_accept_terms" boolean, "p_accept_privacy" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_booking_details"("p_access_token" "text", "p_name" "text", "p_email" "text", "p_phone" "text", "p_notes" "text", "p_accept_terms" boolean, "p_accept_privacy" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_specialist_profile_draft"("p_first_name" "text", "p_last_name" "text", "p_short_bio" "text", "p_long_bio" "jsonb", "p_profile_photo_url" "text", "p_portrait_photo_url" "text", "p_languages" "text"[], "p_therapy_approaches" "text"[], "p_specializations" "text"[], "p_education" "text"[], "p_certificates" "text"[], "p_modalities" "text"[], "p_professional_title" "text", "p_client_groups" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_specialist_profile_draft"("p_first_name" "text", "p_last_name" "text", "p_short_bio" "text", "p_long_bio" "jsonb", "p_profile_photo_url" "text", "p_portrait_photo_url" "text", "p_languages" "text"[], "p_therapy_approaches" "text"[], "p_specializations" "text"[], "p_education" "text"[], "p_certificates" "text"[], "p_modalities" "text"[], "p_professional_title" "text", "p_client_groups" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_specialist_profile_draft"("p_first_name" "text", "p_last_name" "text", "p_short_bio" "text", "p_long_bio" "jsonb", "p_profile_photo_url" "text", "p_portrait_photo_url" "text", "p_languages" "text"[], "p_therapy_approaches" "text"[], "p_specializations" "text"[], "p_education" "text"[], "p_certificates" "text"[], "p_modalities" "text"[], "p_professional_title" "text", "p_client_groups" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_bookings"("p_query" "text", "p_statuses" "text"[], "p_payments" "text"[], "p_specialist_ids" "uuid"[], "p_service_ids" "uuid"[], "p_room_ids" "uuid"[], "p_online" boolean, "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_created_from" timestamp with time zone, "p_created_to" timestamp with time zone, "p_changed_from" timestamp with time zone, "p_changed_to" timestamp with time zone, "p_sort" "text", "p_desc" boolean, "p_limit" integer, "p_offset" integer, "p_own" boolean, "p_archived" boolean, "p_client_id" "uuid", "p_closure" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_bookings"("p_query" "text", "p_statuses" "text"[], "p_payments" "text"[], "p_specialist_ids" "uuid"[], "p_service_ids" "uuid"[], "p_room_ids" "uuid"[], "p_online" boolean, "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_created_from" timestamp with time zone, "p_created_to" timestamp with time zone, "p_changed_from" timestamp with time zone, "p_changed_to" timestamp with time zone, "p_sort" "text", "p_desc" boolean, "p_limit" integer, "p_offset" integer, "p_own" boolean, "p_archived" boolean, "p_client_id" "uuid", "p_closure" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_bookings"("p_query" "text", "p_statuses" "text"[], "p_payments" "text"[], "p_specialist_ids" "uuid"[], "p_service_ids" "uuid"[], "p_room_ids" "uuid"[], "p_online" boolean, "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_created_from" timestamp with time zone, "p_created_to" timestamp with time zone, "p_changed_from" timestamp with time zone, "p_changed_to" timestamp with time zone, "p_sort" "text", "p_desc" boolean, "p_limit" integer, "p_offset" integer, "p_own" boolean, "p_archived" boolean, "p_client_id" "uuid", "p_closure" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_clients"("p_query" "text", "p_upcoming" boolean, "p_last_from" timestamp with time zone, "p_last_to" timestamp with time zone, "p_created_from" timestamp with time zone, "p_created_to" timestamp with time zone, "p_sort" "text", "p_desc" boolean, "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_clients"("p_query" "text", "p_upcoming" boolean, "p_last_from" timestamp with time zone, "p_last_to" timestamp with time zone, "p_created_from" timestamp with time zone, "p_created_to" timestamp with time zone, "p_sort" "text", "p_desc" boolean, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_clients"("p_query" "text", "p_upcoming" boolean, "p_last_from" timestamp with time zone, "p_last_to" timestamp with time zone, "p_created_from" timestamp with time zone, "p_created_to" timestamp with time zone, "p_sort" "text", "p_desc" boolean, "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_room_main_image"("p_image_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_room_main_image"("p_image_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_room_main_image"("p_image_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_specialist_active"("p_specialist" "uuid", "p_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_specialist_active"("p_specialist" "uuid", "p_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_specialist_active"("p_specialist" "uuid", "p_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_specialist_color"("p_specialist_id" "uuid", "p_color" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_specialist_color"("p_specialist_id" "uuid", "p_color" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_specialist_color"("p_specialist_id" "uuid", "p_color" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_specialist_public_slug"("p_specialist_id" "uuid", "p_public_slug" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_specialist_public_slug"("p_specialist_id" "uuid", "p_public_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_specialist_public_slug"("p_specialist_id" "uuid", "p_public_slug" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_specialist_visibility"("p_specialist" "uuid", "p_visible" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_specialist_visibility"("p_specialist" "uuid", "p_visible" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_specialist_visibility"("p_specialist" "uuid", "p_visible" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_my_specialist_profile_draft"("p_draft_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_my_specialist_profile_draft"("p_draft_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_my_specialist_profile_draft"("p_draft_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."unclosed_visits_summary"("p_own" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."unclosed_visits_summary"("p_own" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."unclosed_visits_summary"("p_own" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."visits_on_days"("p_from" "date", "p_to" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."visits_on_days"("p_from" "date", "p_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."visits_on_days"("p_from" "date", "p_to" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."visits_to_close_by_specialist"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."visits_to_close_by_specialist"() TO "service_role";
























GRANT ALL ON TABLE "public"."appointment_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."appointment_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."appointment_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."appointment_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."booking_emails" TO "service_role";
GRANT SELECT ON TABLE "public"."booking_emails" TO "authenticated";



GRANT ALL ON TABLE "public"."center_public_profile" TO "service_role";
GRANT SELECT ON TABLE "public"."center_public_profile" TO "anon";
GRANT SELECT,UPDATE ON TABLE "public"."center_public_profile" TO "authenticated";



GRANT ALL ON TABLE "public"."center_settings" TO "service_role";
GRANT SELECT,UPDATE ON TABLE "public"."center_settings" TO "authenticated";



GRANT ALL ON TABLE "public"."centre_closures" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."centre_closures" TO "authenticated";



GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "service_role";
GRANT SELECT ON TABLE "public"."locations" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."locations" TO "authenticated";



GRANT ALL ON TABLE "public"."notifications" TO "service_role";
GRANT SELECT ON TABLE "public"."notifications" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "service_role";
GRANT SELECT ON TABLE "public"."payments" TO "authenticated";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."room_availability_exceptions" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."room_availability_exceptions" TO "authenticated";



GRANT ALL ON TABLE "public"."room_images" TO "service_role";
GRANT SELECT ON TABLE "public"."room_images" TO "anon";
GRANT SELECT ON TABLE "public"."room_images" TO "authenticated";



GRANT ALL ON TABLE "public"."room_public_profiles" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."room_public_profiles" TO "authenticated";
GRANT SELECT ON TABLE "public"."room_public_profiles" TO "anon";



GRANT ALL ON TABLE "public"."rooms" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."rooms" TO "authenticated";



GRANT ALL ON TABLE "public"."service_catalogs" TO "service_role";
GRANT SELECT ON TABLE "public"."service_catalogs" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."service_catalogs" TO "authenticated";



GRANT ALL ON TABLE "public"."services" TO "service_role";
GRANT SELECT ON TABLE "public"."services" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."services" TO "authenticated";



GRANT ALL ON TABLE "public"."site_announcements" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."site_announcements" TO "authenticated";



GRANT ALL ON TABLE "public"."site_content" TO "service_role";
GRANT SELECT,UPDATE ON TABLE "public"."site_content" TO "authenticated";



GRANT SELECT("key") ON TABLE "public"."site_content" TO "anon";



GRANT SELECT("published_payload") ON TABLE "public"."site_content" TO "anon";



GRANT SELECT("published_at") ON TABLE "public"."site_content" TO "anon";



GRANT ALL ON TABLE "public"."specialist_availability_exceptions" TO "service_role";
GRANT SELECT ON TABLE "public"."specialist_availability_exceptions" TO "authenticated";



GRANT ALL ON TABLE "public"."specialist_availability_rules" TO "service_role";
GRANT SELECT ON TABLE "public"."specialist_availability_rules" TO "authenticated";



GRANT ALL ON TABLE "public"."specialist_profile_drafts" TO "service_role";
GRANT SELECT ON TABLE "public"."specialist_profile_drafts" TO "authenticated";



GRANT ALL ON TABLE "public"."specialist_public_profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."specialist_public_profiles" TO "anon";
GRANT SELECT ON TABLE "public"."specialist_public_profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."specialist_services" TO "service_role";
GRANT SELECT ON TABLE "public"."specialist_services" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."specialist_services" TO "authenticated";



GRANT ALL ON TABLE "public"."specialist_slug_redirects" TO "service_role";
GRANT SELECT ON TABLE "public"."specialist_slug_redirects" TO "anon";
GRANT SELECT ON TABLE "public"."specialist_slug_redirects" TO "authenticated";



GRANT ALL ON TABLE "public"."specialist_time_off" TO "service_role";
GRANT SELECT ON TABLE "public"."specialist_time_off" TO "authenticated";



GRANT ALL ON TABLE "public"."specialists" TO "service_role";
GRANT SELECT ON TABLE "public"."specialists" TO "authenticated";



GRANT SELECT("id") ON TABLE "public"."specialists" TO "anon";



GRANT SELECT("active") ON TABLE "public"."specialists" TO "anon";



GRANT SELECT("public_slug") ON TABLE "public"."specialists" TO "anon";



GRANT SELECT("professional_title") ON TABLE "public"."specialists" TO "anon";



GRANT SELECT("joined_at") ON TABLE "public"."specialists" TO "anon";



GRANT ALL ON TABLE "public"."stripe_events" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "service_role";
GRANT SELECT ON TABLE "public"."user_roles" TO "authenticated";



GRANT ALL ON TABLE "public"."visit_closures" TO "service_role";



GRANT ALL ON TABLE "public"."visit_intakes" TO "service_role";
GRANT SELECT ON TABLE "public"."visit_intakes" TO "authenticated";



GRANT ALL ON TABLE "public"."workshops" TO "service_role";
GRANT SELECT ON TABLE "public"."workshops" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."workshops" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";





































-- ---------------------------------------------------------------------
-- Outside the app's schemas (not in pg_dump's schema dump above): the
-- account trigger, files, the live channel and the scheduled jobs.
-- ---------------------------------------------------------------------

-- A new account gets its profile (and, invited as a specialist, its
-- specialist row).
CREATE TRIGGER "create_profile_after_auth_user_insert"
AFTER INSERT ON "auth"."users"
FOR EACH ROW EXECUTE FUNCTION "private"."handle_new_auth_user"();

-- Files: room photos (public) and specialists' profile photos (private,
-- published ones readable by anyone).
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES
  ('room-media', 'room-media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('specialist-profile-media', 'specialist-profile-media', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT ("id") DO NOTHING;

CREATE POLICY "Admins can read room media objects" ON "storage"."objects"
FOR SELECT TO "authenticated"
USING ("bucket_id" = 'room-media' AND "public"."has_role"('admin'::"public"."app_role"));

CREATE POLICY "Admins can upload room media" ON "storage"."objects"
FOR INSERT TO "authenticated"
WITH CHECK ("bucket_id" = 'room-media' AND "public"."has_role"('admin'::"public"."app_role"));

CREATE POLICY "Admins can update room media" ON "storage"."objects"
FOR UPDATE TO "authenticated"
USING ("bucket_id" = 'room-media' AND "public"."has_role"('admin'::"public"."app_role"))
WITH CHECK ("bucket_id" = 'room-media' AND "public"."has_role"('admin'::"public"."app_role"));

CREATE POLICY "Admins can delete room media" ON "storage"."objects"
FOR DELETE TO "authenticated"
USING ("bucket_id" = 'room-media' AND "public"."has_role"('admin'::"public"."app_role"));

CREATE POLICY "Anyone can read published specialist media" ON "storage"."objects"
FOR SELECT TO "anon"
USING ("bucket_id" = 'specialist-profile-media' AND "private"."can_read_published_specialist_media"("name"));

CREATE POLICY "Signed-in users can read permitted specialist media" ON "storage"."objects"
FOR SELECT TO "authenticated"
USING (
  "bucket_id" = 'specialist-profile-media'
  AND ("private"."can_read_published_specialist_media"("name") OR "private"."can_manage_specialist_media"("name"))
);

CREATE POLICY "Specialists and admins can upload specialist media" ON "storage"."objects"
FOR INSERT TO "authenticated"
WITH CHECK ("bucket_id" = 'specialist-profile-media' AND "private"."can_manage_specialist_media"("name"));

CREATE POLICY "Specialists and admins can update specialist media" ON "storage"."objects"
FOR UPDATE TO "authenticated"
USING ("bucket_id" = 'specialist-profile-media' AND "private"."can_manage_specialist_media"("name"))
WITH CHECK ("bucket_id" = 'specialist-profile-media' AND "private"."can_manage_specialist_media"("name"));

CREATE POLICY "Specialists and admins can delete specialist media" ON "storage"."objects"
FOR DELETE TO "authenticated"
USING ("bucket_id" = 'specialist-profile-media' AND "private"."can_manage_specialist_media"("name"));

-- The live channel: each person hears only their own (notifications).
CREATE POLICY "Hear own channel" ON "realtime"."messages"
FOR SELECT TO "authenticated"
USING (
  "extension" = 'broadcast'
  AND (SELECT "realtime"."topic"()) = 'user:' || (SELECT "auth"."uid"())::text
);

-- Scheduled jobs. Those that call the site read its address and the
-- shared secret from the vault (site_url, cron_secret), set per
-- environment outside the migrations (scripts/db/set-secrets.sql).
SELECT "cron"."schedule"('cancel-unpaid-visits', '*/5 * * * *', 'SELECT private.cancel_overdue_payments()');
SELECT "cron"."schedule"('payment-emails', '*/15 * * * *', 'SELECT private.request_payment_emails()');
SELECT "cron"."schedule"('forget-untied-intakes', '17 * * * *', 'SELECT private.forget_untied_intakes()');
SELECT "cron"."schedule"('apply-data-retention', '30 2 * * *', 'SELECT private.apply_retention()');
SELECT "cron"."schedule"('notify-visits-to-close', '*/15 * * * *', 'SELECT private.notify_visits_to_close()');
SELECT "cron"."schedule"('closing-emails', '0 6 * * *', 'SELECT private.request_closing_emails()');

-- ---------------------------------------------------------------------
-- The rows the app needs to start: the centre's settings and its public
-- profile (filled in from the admin's Ustawienia), and the site's content
-- the CMS edits (the home page, the rooms page).
-- ---------------------------------------------------------------------
INSERT INTO "public"."center_settings" ("id", "business_name") VALUES (1, 'Kolor Sensu')
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "public"."center_public_profile" ("id", "display_name", "published") VALUES (1, 'Kolor Sensu', false)
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "public"."site_content" ("key", "draft_payload", "published_payload", "published_at")
VALUES
  ('home',
    '{"heading": "Kolor Sensu", "body": "Centrum Psychoterapii. Treść strony głównej w przygotowaniu.", "buttonLabel": null}',
    '{"heading": "Kolor Sensu", "body": "Centrum Psychoterapii. Treść strony głównej w przygotowaniu.", "buttonLabel": null}',
    now()),
  ('rooms',
    '{"showAmenitiesSection": true, "showLocationDetails": true}',
    '{"showAmenitiesSection": true, "showLocationDetails": true}',
    now())
ON CONFLICT ("key") DO NOTHING;
