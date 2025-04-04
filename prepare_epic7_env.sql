-- Exécuté dans la base postgres
-- Lancement : psql -U postgres -d postgres -f prepare_epic7_env.sql

-- 1. Créer la base principale si elle n'existe pas
SELECT 'CREATE DATABASE epic7'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'epic7'
)\gexec

-- 2. Créer l'utilisateur principal s'il n'existe pas
DO
$do$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_roles WHERE rolname = 'epic7_user'
    ) THEN
        CREATE ROLE epic7_user LOGIN PASSWORD 'password';
    END IF;
END
$do$;

-- 3. Connexion à la base epic7
\c epic7

-- 4. Droits d'accès de base
GRANT CONNECT ON DATABASE epic7 TO epic7_user;
GRANT USAGE ON SCHEMA public TO epic7_user;

-- 5. Créer la table users (structure de départ avant Flyway)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- 6. Droits sur la table
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO epic7_user;

-- 7. (Facultatif) Ajouter un utilisateur de base pour les tests initiaux
INSERT INTO users (email, password)
VALUES ('hermas@example.com', 'dummyhashedpassword')
ON CONFLICT DO NOTHING;
