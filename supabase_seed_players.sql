-- Seed de jugadores LaLiga 26/27
-- Basado en plantillas 25/26 + fichajes conocidos. Revisar dorsales cuando se publiquen oficialmente.
-- Ejecutar en Supabase SQL Editor

DELETE FROM liga_players;

INSERT INTO liga_players (team, name) VALUES
-- Athletic Club
('Athletic Club','Unai Simón'),('Athletic Club','Iago Herrerín'),('Athletic Club','Jokin Ezquieta'),
('Athletic Club','Jesús Areso'),('Athletic Club','Dani Vivian'),('Athletic Club','Yeray Álvarez'),
('Athletic Club','Íñigo Martínez'),('Athletic Club','Mikel Balenziaga'),('Athletic Club','Robert Navarro'),
('Athletic Club','Oscar Mingueza'),('Athletic Club','Mikel Vesga'),('Athletic Club','Unai Vencedor'),
('Athletic Club','Oihan Sancet'),('Athletic Club','Ander Herrera'),('Athletic Club','Jauregizar'),
('Athletic Club','Iñaki Williams'),('Athletic Club','Nico Williams'),('Athletic Club','Berenguer'),
('Athletic Club','Gorka Guruzeta'),('Athletic Club','Sancet'),('Athletic Club','Adama Boiro'),
-- Atlético de Madrid
('Atlético de Madrid','Jan Oblak'),('Atlético de Madrid','Antonio Sivera'),('Atlético de Madrid','Juan Musso'),
('Atlético de Madrid','Nahuel Molina'),('Atlético de Madrid','José Giménez'),('Atlético de Madrid','Clement Lenglet'),
('Atlético de Madrid','Robin Le Normand'),('Atlético de Madrid','Axel Witsel'),('Atlético de Madrid','Reinildo'),
('Atlético de Madrid','Marcos Llorente'),('Atlético de Madrid','Rodrigo de Paul'),('Atlético de Madrid','Koke'),
('Atlético de Madrid','Saúl Ñíguez'),('Atlético de Madrid','Pablo Barrios'),('Atlético de Madrid','Conor Gallagher'),
('Atlético de Madrid','Antoine Griezmann'),('Atlético de Madrid','Ángel Correa'),('Atlético de Madrid','Julián Álvarez'),
('Atlético de Madrid','Samuel Lino'),('Atlético de Madrid','Alexander Sørloth'),('Atlético de Madrid','Giuliano Simeone'),
-- Celta de Vigo
('Celta de Vigo','Guaita'),('Celta de Vigo','Iván Villar'),('Celta de Vigo','Mingueza'),
('Celta de Vigo','Carl Starfelt'),('Celta de Vigo','Óscar Mingueza'),('Celta de Vigo','Javier Manquillo'),
('Celta de Vigo','Renato Tapia'),('Celta de Vigo','Fran Beltrán'),('Celta de Vigo','Carles Pérez'),
('Celta de Vigo','Iago Aspas'),('Celta de Vigo','Williot Swedberg'),('Celta de Vigo','Jonathan Bamba'),
('Celta de Vigo','Borja Iglesias'),('Celta de Vigo','Hugo Álvarez'),('Celta de Vigo','Anastasios Douvikas'),
-- Deportivo de La Coruña
('Deportivo de La Coruña','Helton Leite'),('Deportivo de La Coruña','Caballero'),('Deportivo de La Coruña','Quique González'),
('Deportivo de La Coruña','Jaime Sánchez'),('Deportivo de La Coruña','Pablo Brea'),('Deportivo de La Coruña','William Baeten'),
('Deportivo de La Coruña','Lucas Pérez'),('Deportivo de La Coruña','Yeremay'),('Deportivo de La Coruña','Barbero'),
('Deportivo de La Coruña','José Ángel'),('Deportivo de La Coruña','Mario García'),('Deportivo de La Coruña','Rayco'),
('Deportivo de La Coruña','Miku'),('Deportivo de La Coruña','Claudio Beauvue'),
-- Espanyol
('Espanyol','Joan García'),('Espanyol','Diego López'),('Espanyol','Bernardo Espinosa'),
('Espanyol','Leandro Cabrera'),('Espanyol','Javi Puado'),('Espanyol','Aleix Vidal'),
('Espanyol','Óscar Gil'),('Espanyol','Edu Expósito'),('Espanyol','Sergi Darder'),
('Espanyol','Brian Olivan'),('Espanyol','Carlos Romero'),('Espanyol','Pol Lozano'),
('Espanyol','Luka Romero'),('Espanyol','Keidi Bare'),('Espanyol','Marash Kumbulla'),
('Espanyol','Braithwaite'),('Espanyol','Jofre Carreras'),
-- FC Barcelona
('FC Barcelona','Iñaki Peña'),('FC Barcelona','Marc-André ter Stegen'),('FC Barcelona','Wojciech Szczesny'),
('FC Barcelona','Pau Cubarsí'),('FC Barcelona','Eric García'),('FC Barcelona','Ronald Araújo'),
('FC Barcelona','Alejandro Balde'),('FC Barcelona','Jules Koundé'),('FC Barcelona','Andreas Christensen'),
('FC Barcelona','Iñigo Martínez'),('FC Barcelona','Gavi'),('FC Barcelona','Pedri'),
('FC Barcelona','Frenkie de Jong'),('FC Barcelona','Marc Casadó'),('FC Barcelona','Dani Olmo'),
('FC Barcelona','Fermín López'),('FC Barcelona','Lamine Yamal'),('FC Barcelona','Raphinha'),
('FC Barcelona','Robert Lewandowski'),('FC Barcelona','Ansu Fati'),('FC Barcelona','Vitor Roque'),
-- Getafe
('Getafe','David Soria'),('Getafe','Isi Palazón'),('Getafe','Djene Dakonam'),
('Getafe','Gastón Álvarez'),('Getafe','Jorge Cuenca'),('Getafe','Vitolo'),
('Getafe','Mauro Arambarri'),('Getafe','Carles Alena'),('Getafe','Yellu Santiago'),
('Getafe','Borja Mayoral'),('Getafe','Enes Ünal'),('Getafe','Mason Greenwood'),
('Getafe','Omar Alderete'),('Getafe','Domingos Quina'),
-- Las Palmas
('Las Palmas','Álvaro Valles'),('Las Palmas','Cillessen'),('Las Palmas','Mika Mármol'),
('Las Palmas','Álex Suárez'),('Las Palmas','Sebastián Cáceres'),('Las Palmas','Jese Rodriguez'),
('Las Palmas','Sandro Ramírez'),('Las Palmas','Fabio Silva'),('Las Palmas','Alberto Moleiro'),
('Las Palmas','Kirian Rodríguez'),('Las Palmas','Sergi Cardona'),
('Las Palmas','Marc Cardona'),('Las Palmas','Munir El Haddadi'),
-- Leganés
('Leganés','Marko Dmitrovic'),('Leganés','Andrés Caro'),('Leganés','Sergio González'),
('Leganés','Jonathan Silva'),('Leganés','Altimira'),('Leganés','Óscar Rodríguez'),
('Leganés','Renato Tapia'),('Leganés','Youssef En-Nesyri'),('Leganés','Ante Budimir'),
('Leganés','Bryan Gil'),('Leganés','Dani Raba'),('Leganés','Cucho Hernández'),
-- Málaga CF
('Málaga CF','Alfonso Herrero'),('Málaga CF','Rubén Yáñez'),('Málaga CF','Pablo Penín'),
('Málaga CF','Brandon Thomas'),('Málaga CF','Juande'),('Málaga CF','Víctor García'),
('Málaga CF','Kevin'),('Málaga CF','Paulino'),('Málaga CF','Dani Lorenzo'),
('Málaga CF','Genaro'),('Málaga CF','Ramón'),('Málaga CF','Yanis Rahmani'),
('Málaga CF','Larrubia'),('Málaga CF','Kevin Medina'),('Málaga CF','Roberto'),
-- Osasuna
('Osasuna','Sergio Herrera'),('Osasuna','Juan Pérez'),('Osasuna','David García'),
('Osasuna','Aridane Hernández'),('Osasuna','Nacho Vidal'),('Osasuna','Juan Cruz'),
('Osasuna','Lucas Torró'),('Osasuna','Darko Brasanac'),('Osasuna','Moncayola'),
('Osasuna','Rubén García'),('Osasuna','Ante Budimir'),('Osasuna','Bryan Zaragoza'),
('Osasuna','Kike García'),('Osasuna','Pablo Ibáñez'),('Osasuna','Cyle Larin'),
-- Racing de Santander
('Racing de Santander','Dani Martín'),('Racing de Santander','Iván Martínez'),
('Racing de Santander','Raúl García'),('Racing de Santander','Javi Díez'),
('Racing de Santander','Unai Elgezabal'),('Racing de Santander','Carlos Martínez'),
('Racing de Santander','Íñigo Vicente'),('Racing de Santander','Manu García'),
('Racing de Santander','Borja Valle'),('Racing de Santander','Andrés Martín'),
('Racing de Santander','Andrés Ríos'),('Racing de Santander','Christian Rivera'),
('Racing de Santander','Carlos Dotor'),('Racing de Santander','Álvaro García'),
-- Rayo Vallecano
('Rayo Vallecano','Stole Dimitrievski'),('Rayo Vallecano','Florian Lejeune'),
('Rayo Vallecano','Alejandro Catena'),('Rayo Vallecano','Fran García'),
('Rayo Vallecano','Iván Balliu'),('Rayo Vallecano','Oscar Trejo'),
('Rayo Vallecano','Unai López'),('Rayo Vallecano','Álvaro García'),
('Rayo Vallecano','Pathé Ciss'),('Rayo Vallecano','Randy Nteka'),
('Rayo Vallecano','Raúl de Tomás'),('Rayo Vallecano','Sergio Camello'),
('Rayo Vallecano','Santi Comesaña'),('Rayo Vallecano','Jorge de Frutos'),
-- Real Betis
('Real Betis','Rui Silva'),('Real Betis','Adrián'),('Real Betis','Héctor Bellerín'),
('Real Betis','Marc Bartra'),('Real Betis','Nabil Fekir'),('Real Betis','Guido Rodríguez'),
('Real Betis','Sergio Canales'),('Real Betis','Isco'),('Real Betis','Ayoze Pérez'),
('Real Betis','Juanmi'),('Real Betis','Borja Iglesias'),('Real Betis','Pablo Fornals'),
('Real Betis','Antony'),('Real Betis','Johnny Cardoso'),('Real Betis','Jesé'),
-- Real Madrid
('Real Madrid','Thibaut Courtois'),('Real Madrid','Andriy Lunin'),('Real Madrid','Kepa Arrizabalaga'),
('Real Madrid','Dani Carvajal'),('Real Madrid','Éder Militão'),('Real Madrid','Antonio Rüdiger'),
('Real Madrid','David Alaba'),('Real Madrid','Ferland Mendy'),('Real Madrid','Fran García'),
('Real Madrid','Aurélien Tchouaméni'),('Real Madrid','Eduardo Camavinga'),('Real Madrid','Federico Valverde'),
('Real Madrid','Luka Modrić'),('Real Madrid','Jude Bellingham'),('Real Madrid','Brahim Díaz'),
('Real Madrid','Rodrygo'),('Real Madrid','Vinícius Jr.'),('Real Madrid','Kylian Mbappé'),
('Real Madrid','Endrick'),('Real Madrid','Dean Huijsen'),('Real Madrid','Raúl Asencio'),
-- Real Sociedad
('Real Sociedad','Alex Remiro'),('Real Sociedad','Andoni Zubiaurre'),('Real Sociedad','Aihen Muñoz'),
('Real Sociedad','Aritz Elustondo'),('Real Sociedad','Igor Zubeldia'),('Real Sociedad','Jon Pacheco'),
('Real Sociedad','Kieran Tierney'),('Real Sociedad','Brais Méndez'),('Real Sociedad','Mikel Merino'),
('Real Sociedad','Beñat Turrientes'),('Real Sociedad','Mikel Oyarzabal'),('Real Sociedad','Carlos Fernández'),
('Real Sociedad','Mohamed-Ali Cho'),('Real Sociedad','Takefusa Kubo'),('Real Sociedad','Ander Barrenetxea'),
('Real Sociedad','Sheraldo Becker'),
-- Sevilla
('Sevilla','Orjan Nyland'),('Sevilla','Álvaro Fernández'),('Sevilla','Marcos Acuña'),
('Sevilla','Gonzalo Montiel'),('Sevilla','Loïc Badé'),('Sevilla','Marko Dmitrovic'),
('Sevilla','Nemanja Gudelj'),('Sevilla','Suso'),('Sevilla','Lucas Ocampos'),
('Sevilla','Dodi Lukébakio'),('Sevilla','Isaac Romero'),('Sevilla','Saúl Ñíguez'),
('Sevilla','Joan Jordán'),('Sevilla','Chidera Ejuke'),('Sevilla','Juanlu Sánchez'),
-- Valencia
('Valencia','Giorgi Mamardashvili'),('Valencia','Jasper Cillessen'),('Valencia','Mouctar Diakhaby'),
('Valencia','Dimitri Foulquier'),('Valencia','José Luis Gayà'),('Valencia','Hugo Duro'),
('Valencia','Thierry Correia'),('Valencia','Diego López'),('Valencia','Cristhian Stuani'),
('Valencia','Pepelu'),('Valencia','Javi Guerra'),('Valencia','Sergi Canós'),
('Valencia','Rafa Mir'),('Valencia','Justin Kluivert'),('Valencia','Umar Sadiq'),
-- Elche
('Elche','Edgar Badía'),('Elche','Kiko Casilla'),('Elche','Gonzalo Verdú'),
('Elche','Enzo Roco'),('Elche','Josan'),('Elche','Pere Milla'),
('Elche','Fidel Chaves'),('Elche','Raúl Guti'),('Elche','Tete Morente'),
('Elche','Lucas Boyé'),('Elche','Benedetto'),('Elche','Mascarell'),
('Elche','Bigas'),('Elche','Helibelton Palacios'),
-- Villarreal
('Villarreal','Filip Jorgensen'),('Villarreal','Sergio Asenjo'),('Villarreal','Juan Foyth'),
('Villarreal','Raúl Albiol'),('Villarreal','Pau Torres'),('Villarreal','Alfonso Pedraza'),
('Villarreal','Étienne Capoue'),('Villarreal','Dani Parejo'),('Villarreal','Yeremy Pino'),
('Villarreal','Samu Chukwueze'),('Villarreal','Gerard Moreno'),('Villarreal','Arnaut Danjuma'),
('Villarreal','Paco Alcácer'),('Villarreal','Álex Baena'),('Villarreal','Ilias Akhomach');

NOTIFY pgrst, 'reload schema';
