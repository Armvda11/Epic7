-- Enrichir la table users avec des colonnes de jeu
ALTER TABLE users ADD COLUMN username VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN level INT NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN gold INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN diamonds INT NOT NULL DEFAULT 0;

-- Créer la table des héros
CREATE TABLE heroes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    element VARCHAR(20) NOT NULL,
    base_attack INT NOT NULL,
    base_defense INT NOT NULL,
    base_speed INT NOT NULL,
    CONSTRAINT valid_element CHECK (element IN ('Fire', 'Water', 'Wind', 'Dark'))
);
