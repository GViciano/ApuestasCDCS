-- Tabla de equipos gestionable por admin
CREATE TABLE IF NOT EXISTS liga_teams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE liga_teams DISABLE ROW LEVEL SECURITY;

-- Seed con los 20 equipos de LaLiga 26/27
INSERT INTO liga_teams (name) VALUES
  ('Athletic Club'),('Atlético de Madrid'),('Celta de Vigo'),
  ('Deportivo de La Coruña'),('Elche'),('Espanyol'),('FC Barcelona'),
  ('Getafe'),('Las Palmas'),('Leganés'),('Málaga CF'),('Osasuna'),
  ('Racing de Santander'),('Rayo Vallecano'),('Real Betis'),('Real Madrid'),
  ('Real Sociedad'),('Sevilla'),('Valencia'),('Villarreal')
ON CONFLICT (name) DO NOTHING;

NOTIFY pgrst, 'reload schema';
