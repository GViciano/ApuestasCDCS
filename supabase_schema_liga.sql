-- Liga tables (add to existing Supabase project)

-- Jornadas
CREATE TABLE IF NOT EXISTS liga_jornadas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero integer NOT NULL UNIQUE,
  label text NOT NULL,
  active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE liga_jornadas DISABLE ROW LEVEL SECURITY;

-- Partidos de cada jornada
CREATE TABLE IF NOT EXISTS liga_partidos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  jornada_id uuid REFERENCES liga_jornadas(id) ON DELETE CASCADE,
  home text NOT NULL,
  away text NOT NULL,
  match_date timestamptz,
  home_goals integer,
  away_goals integer,
  scorer text,
  minute text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE liga_partidos DISABLE ROW LEVEL SECURITY;

-- Apuestas
CREATE TABLE IF NOT EXISTS liga_bets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  partido_id uuid REFERENCES liga_partidos(id) ON DELETE CASCADE,
  home_goals integer,
  away_goals integer,
  scorer text,
  minute text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, partido_id)
);
ALTER TABLE liga_bets DISABLE ROW LEVEL SECURITY;

-- Jugadores por equipo
CREATE TABLE IF NOT EXISTS liga_players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team text NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team, name)
);
ALTER TABLE liga_players DISABLE ROW LEVEL SECURITY;

-- Config para puntos
INSERT INTO config (key, value) VALUES
  ('liga_points', '{"exact":3,"diff":2,"sign":1,"scorer":2,"minute":1}')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
