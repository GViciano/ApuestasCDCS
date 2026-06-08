-- Ejecuta en Supabase > SQL Editor

create table profiles (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  display_name text,
  password_hash text not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  match_id text not null,
  home_goals int not null,
  away_goals int not null,
  scorer text,
  minute text,
  created_at timestamptz default now(),
  unique(user_id, match_id)
);

create table results (
  id uuid primary key default gen_random_uuid(),
  match_id text unique not null,
  home_goals int not null,
  away_goals int not null,
  scorer text,
  minute text,
  updated_at timestamptz default now()
);

-- Partidos eliminatorios creados por el admin
create table ko_matches (
  id text primary key,           -- ej: 'R32_1', 'QF_1', 'SF_1', 'F_1'
  round text not null,           -- 'R32', 'QF', 'SF', 'F', '3rd'
  round_label text not null,     -- 'Dieciseisavos', 'Cuartos', 'Semifinal', 'Final', '3er puesto'
  home text not null,
  away text not null,
  match_date timestamptz,
  created_at timestamptz default now()
);

create table config (
  key text primary key,
  value jsonb not null
);

insert into config (key, value) values ('points', '{"exact":3,"sign":1,"scorer":2,"minute":1,"qualifier":2,"semifinal":3,"finalist":4,"champion":6}');
insert into profiles (username, display_name, password_hash, is_admin) values ('admin', 'Admin', 'YWRtaW4xMjM=', true);

alter table profiles disable row level security;
alter table bets disable row level security;
alter table results disable row level security;
alter table config disable row level security;
alter table ko_matches disable row level security;

-- MIGRACION (si ya tenías la BD):
-- ALTER TABLE bets ALTER COLUMN minute TYPE text USING minute::text;
-- ALTER TABLE results ALTER COLUMN minute TYPE text USING minute::text;
-- CREATE TABLE ko_matches (
--   id text primary key, round text not null, round_label text not null,
--   home text not null, away text not null, match_date timestamptz,
--   created_at timestamptz default now()
-- );
-- ALTER TABLE ko_matches DISABLE ROW LEVEL SECURITY;

-- Predicciones de clasificados y campeón
-- prediction_type: 'group_qualifier', 'semifinal', 'finalist', 'champion'
-- value: nombre del equipo
-- extra: grupo (solo para group_qualifier, ej: 'A')
create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  prediction_type text not null,
  extra text,           -- grupo para group_qualifier
  value text not null,  -- equipo predicho
  created_at timestamptz default now(),
  unique(user_id, prediction_type, extra, value)
);
alter table predictions disable row level security;

-- MIGRACION (si ya tienes la BD):
-- CREATE TABLE predictions (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid references profiles(id) on delete cascade,
--   prediction_type text not null,
--   extra text,
--   value text not null,
--   created_at timestamptz default now(),
--   unique(user_id, prediction_type, extra, value)
-- );
-- ALTER TABLE predictions DISABLE ROW LEVEL SECURITY;

-- Clasificados reales por grupo (los introduce el admin)
create table group_qualifiers (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,   -- 'A', 'B', etc.
  team text not null,
  position int not null,    -- 1 o 2
  created_at timestamptz default now(),
  unique(group_id, team),
  unique(group_id, position)
);
alter table group_qualifiers disable row level security;

-- MIGRACION:
-- CREATE TABLE group_qualifiers (
--   id uuid primary key default gen_random_uuid(),
--   group_id text not null, team text not null, position int not null,
--   created_at timestamptz default now(),
--   unique(group_id, team), unique(group_id, position)
-- );
-- ALTER TABLE group_qualifiers DISABLE ROW LEVEL SECURITY;

-- Resultados reales de predicciones (semifinales, finalistas, campeón)
-- type: 'semifinal', 'finalist', 'champion'
create table prediction_results (
  id uuid primary key default gen_random_uuid(),
  prediction_type text unique not null,
  teams jsonb not null,  -- array of team names
  updated_at timestamptz default now()
);
alter table prediction_results disable row level security;

-- MIGRACION:
-- CREATE TABLE prediction_results (
--   id uuid primary key default gen_random_uuid(),
--   prediction_type text unique not null,
--   teams jsonb not null,
--   updated_at timestamptz default now()
-- );
-- ALTER TABLE prediction_results DISABLE ROW LEVEL SECURITY;
