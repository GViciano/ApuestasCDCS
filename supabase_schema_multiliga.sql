-- Multi-liga schema
-- Ejecutar en Supabase SQL Editor

-- 1. Tabla de ligas
CREATE TABLE IF NOT EXISTS ligas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  codigo text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ligas DISABLE ROW LEVEL SECURITY;

-- 2. Membresías (qué usuarios pertenecen a qué ligas)
CREATE TABLE IF NOT EXISTS liga_memberships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  liga_id uuid REFERENCES ligas(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(user_id, liga_id)
);
ALTER TABLE liga_memberships DISABLE ROW LEVEL SECURITY;

-- 3. Añadir liga_id a las tablas existentes
ALTER TABLE liga_jornadas ADD COLUMN IF NOT EXISTS liga_id uuid REFERENCES ligas(id) ON DELETE CASCADE;
ALTER TABLE liga_bets ADD COLUMN IF NOT EXISTS liga_id uuid REFERENCES ligas(id) ON DELETE CASCADE;

-- liga_partidos ya tiene jornada_id que apunta a liga_jornadas (que tiene liga_id)
-- No hace falta añadir liga_id a liga_partidos directamente

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_liga_jornadas_liga ON liga_jornadas(liga_id);
CREATE INDEX IF NOT EXISTS idx_liga_memberships_user ON liga_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_liga_memberships_liga ON liga_memberships(liga_id);
CREATE INDEX IF NOT EXISTS idx_liga_bets_liga ON liga_bets(liga_id);

-- 5. Config por liga (puntos independientes)
-- Usamos la tabla config existente con key = 'liga_points_{liga_id}'
-- O mejor: añadimos liga_id a config
ALTER TABLE config ADD COLUMN IF NOT EXISTS liga_id uuid REFERENCES ligas(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
