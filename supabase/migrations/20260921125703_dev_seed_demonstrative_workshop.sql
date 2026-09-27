-- One demonstrative DEV-only workshop, published directly (mirroring how
-- Home content and the two specialist public profiles were seeded+published
-- in earlier phases) so the /warsztaty public pipeline is provably working
-- end-to-end in DEV, not just architecturally present. Content is
-- deliberately generic placeholder copy -- the exact example from the task
-- brief -- not a real scheduled event. No professional/clinical claims are
-- made beyond the neutral placeholder bios the two specialist accounts
-- already carry.
INSERT INTO public.workshops (
  slug,
  title,
  short_description,
  long_description,
  specialist_id,
  location_id,
  room_id,
  modality,
  starts_at,
  ends_at,
  price_minor,
  currency_code,
  capacity,
  registration_enabled,
  status
)
SELECT
  'jak-radzic-sobie-ze-stresem',
  'Jak radzić sobie ze stresem',
  'Warsztat wprowadzający techniki radzenia sobie ze stresem w życiu codziennym.',
  'To jest treść placeholder wykorzystywana do weryfikacji domeny warsztatów (DEV). Warsztat grupowy prowadzony stacjonarnie, obejmujący podstawowe techniki regulacji stresu.',
  specialists.id,
  locations.id,
  rooms.id,
  'in_person',
  timestamptz '2026-10-15 17:00:00+02',
  timestamptz '2026-10-15 19:00:00+02',
  15000,
  'PLN',
  12,
  false,
  'published'
FROM public.specialists
JOIN public.specialist_public_profiles
  ON specialist_public_profiles.specialist_id = specialists.id
JOIN public.locations ON locations.slug = 'siedziba-glowna'
JOIN public.rooms ON rooms.slug = 'gabinet-zielony' AND rooms.location_id = locations.id
WHERE specialists.public_slug = 'specialist-49fba7c70a9a'
  AND specialist_public_profiles.publication_status = 'published';
