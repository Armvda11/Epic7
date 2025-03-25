-- === UTILISATEURS : énergie + suivi de dernière mise à jour ===
ALTER TABLE users
ADD COLUMN energy INTEGER DEFAULT 100,
ADD COLUMN last_energy_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- === TABLE DES HEROS POSSEDES PAR LES UTILISATEURS ===
CREATE TABLE player_heroes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hero_id INTEGER NOT NULL REFERENCES heroes(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    UNIQUE(user_id, hero_id)
);

-- === TABLE DES EQUIPEMENTS DISPONIBLES ===
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('weapon', 'armor', 'boots', 'necklace')),
    rarity VARCHAR(10) NOT NULL DEFAULT 'Normal' CHECK (rarity IN ('Normal', 'Rare', 'Epic', 'Legendary')),
    attack_bonus INTEGER DEFAULT 0,
    defense_bonus INTEGER DEFAULT 0,
    speed_bonus INTEGER DEFAULT 0
);

-- === EQUIPEMENTS ÉQUIPÉS SUR HÉROS POSSEDÉS ===
CREATE TABLE equipped_items (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    player_hero_id INTEGER NOT NULL REFERENCES player_heroes(id) ON DELETE CASCADE,
    UNIQUE(equipment_id), -- un équipement ne peut être équipé qu’à un seul héros
    UNIQUE(player_hero_id, equipment_id)
);

-- === TABLE DES GUILDES ===
CREATE TABLE guilds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- === MEMBRES DES GUILDES ===
CREATE TABLE guild_membership (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guild_id INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('leader', 'officer', 'member')),
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    UNIQUE(user_id, guild_id)
);

-- === CONTRAINTE : un seul leader par guilde ===
CREATE UNIQUE INDEX unique_leader_per_guild 
ON guild_membership(guild_id)
WHERE role = 'leader';

-- === TABLE DES INVOCATIONS DE HÉROS ===
CREATE TABLE summons (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hero_id INTEGER NOT NULL REFERENCES heroes(id),
    summon_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE
);

-- === AJOUT DE LA RARETÉ SUR LES HÉROS ===
ALTER TABLE heroes
ADD COLUMN rarity VARCHAR(10) NOT NULL DEFAULT 'Rare' CHECK (rarity IN ('Normal', 'Rare', 'Epic', 'Legendary'));
