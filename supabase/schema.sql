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
-- Hanya user yang sudah login (via Supabase Auth) yang bisa akses.
-- Semua data terisolasi per-user di level aplikasi (group_id = milik user tsb).

alter table groups        enable row level security;
alter table members       enable row level security;
alter table sessions      enable row level security;
alter table attendance    enable row level security;
alter table stats_history enable row level security;

-- Policy: user authenticated bisa SELECT / INSERT / UPDATE / DELETE
-- (Kamu bisa perketat lagi nanti dengan: using (auth.uid()::text = created_by))

create policy "authenticated read groups"
  on groups for select using (auth.role() = 'authenticated');
create policy "authenticated write groups"
  on groups for all using (auth.role() = 'authenticated');

create policy "authenticated read members"
  on members for select using (auth.role() = 'authenticated');
create policy "authenticated write members"
  on members for all using (auth.role() = 'authenticated');

create policy "authenticated read sessions"
  on sessions for select using (auth.role() = 'authenticated');
create policy "authenticated write sessions"
  on sessions for all using (auth.role() = 'authenticated');

create policy "authenticated read attendance"
  on attendance for select using (auth.role() = 'authenticated');
create policy "authenticated write attendance"
  on attendance for all using (auth.role() = 'authenticated');

create policy "authenticated read stats_history"
  on stats_history for select using (auth.role() = 'authenticated');
create policy "authenticated write stats_history"
  on stats_history for all using (auth.role() = 'authenticated');

-- ── REALTIME ─────────────────────────────────────────────────
-- Aktifkan Realtime untuk semua tabel

alter publication supabase_realtime add table groups;
alter publication supabase_realtime add table members;
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table attendance;
alter publication supabase_realtime add table stats_history;
