-- ============================================================
-- MENTOR APP  —  Supabase Schema
-- Jalankan seluruh file ini di Supabase → SQL Editor
-- ============================================================

-- ── TABEL ───────────────────────────────────────────────────

create table if not exists groups (
  group_id    text primary key,
  group_name  text,
  description text,
  is_active   text,
  created_at  text,
  updated_at  text
);

create table if not exists members (
  member_id  text primary key,
  group_id   text,
  name       text,
  instrument text,
  jabatan    text,
  angkatan   text,
  status     text,
  joined_at  text,
  notes      text,
  created_at text,
  updated_at text
);

create table if not exists sessions (
  session_id   text primary key,
  group_id     text,
  session_date text,
  title        text,
  notes        text,
  created_by   text,
  created_at   text,
  status       text
);

create table if not exists attendance (
  attendance_id text primary key,
  group_id      text,
  session_id    text,
  member_id     text,
  status        text,
  note          text,
  recorded_at   text
);

create table if not exists stats_history (
  stat_id        text primary key,
  group_id       text,
  session_id     text,
  member_id      text,
  session_date   text,
  loyalitas      numeric,
  skill          numeric,
  kreativitas    numeric,
  attitude       numeric,
  synergy        numeric,
  evaluator_note text,
  recorded_at    text
);

-- ── INDEX untuk query umum ────────────────────────────────────

create index if not exists idx_members_group     on members     (group_id);
create index if not exists idx_sessions_group    on sessions    (group_id);
create index if not exists idx_attendance_session on attendance (session_id);
create index if not exists idx_attendance_member  on attendance (member_id);
create index if not exists idx_stats_member       on stats_history (member_id);
create index if not exists idx_stats_session      on stats_history (session_id);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
-- Mode public: anon + authenticated bisa baca/tulis tanpa login.

alter table groups        enable row level security;
alter table members       enable row level security;
alter table sessions      enable row level security;
alter table attendance    enable row level security;
alter table stats_history enable row level security;

-- Policy public (anon + authenticated) agar app bisa dipakai tanpa login.
-- WARNING: semua orang dengan URL app dapat baca/tulis data.

drop policy if exists "authenticated read groups" on groups;
drop policy if exists "authenticated write groups" on groups;
drop policy if exists "authenticated read members" on members;
drop policy if exists "authenticated write members" on members;
drop policy if exists "authenticated read sessions" on sessions;
drop policy if exists "authenticated write sessions" on sessions;
drop policy if exists "authenticated read attendance" on attendance;
drop policy if exists "authenticated write attendance" on attendance;
drop policy if exists "authenticated read stats_history" on stats_history;
drop policy if exists "authenticated write stats_history" on stats_history;
drop policy if exists "public groups all" on groups;
drop policy if exists "public members all" on members;
drop policy if exists "public sessions all" on sessions;
drop policy if exists "public attendance all" on attendance;
drop policy if exists "public stats_history all" on stats_history;

create policy "public groups all"
  on groups for all using (true) with check (true);
create policy "public members all"
  on members for all using (true) with check (true);
create policy "public sessions all"
  on sessions for all using (true) with check (true);
create policy "public attendance all"
  on attendance for all using (true) with check (true);
create policy "public stats_history all"
  on stats_history for all using (true) with check (true);

-- ── REALTIME ─────────────────────────────────────────────────
-- Aktifkan Realtime untuk semua tabel

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'groups'
  ) then
    alter publication supabase_realtime add table public.groups;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'members'
  ) then
    alter publication supabase_realtime add table public.members;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'sessions'
  ) then
    alter publication supabase_realtime add table public.sessions;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'attendance'
  ) then
    alter publication supabase_realtime add table public.attendance;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'stats_history'
  ) then
    alter publication supabase_realtime add table public.stats_history;
  end if;
end $$;
