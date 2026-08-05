-- Tabla para logos de equipos
CREATE TABLE IF NOT EXISTS liga_team_logos (
  team text PRIMARY KEY,
  svg text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE liga_team_logos DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
