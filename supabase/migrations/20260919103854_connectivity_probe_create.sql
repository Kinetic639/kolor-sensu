create table public._codex_connectivity_probe (
  id integer primary key
);

revoke all on table public._codex_connectivity_probe from anon, authenticated;

comment on table public._codex_connectivity_probe is
  'Disposable repository migration connectivity probe; removed by the next forward migration.';
