-- Thornwick Vale guild ledger.
-- Reference tables (races, classes, spells, monsters, magic_items) use SRD 5.1 material.
-- Everything else is original.

CREATE TABLE races (
  id    INTEGER PRIMARY KEY,
  name  TEXT    NOT NULL UNIQUE,
  size  TEXT    NOT NULL,
  speed INTEGER NOT NULL            -- walking speed in feet
);

CREATE TABLE classes (
  id                   INTEGER PRIMARY KEY,
  name                 TEXT    NOT NULL UNIQUE,
  hit_die              INTEGER NOT NULL,   -- 6, 8, 10 or 12
  primary_ability      TEXT    NOT NULL,
  spellcasting_ability TEXT                -- NULL for classes that don't cast spells
);

CREATE TABLE towns (
  id         INTEGER PRIMARY KEY,
  name       TEXT    NOT NULL UNIQUE,
  region     TEXT    NOT NULL,
  population INTEGER NOT NULL
);

CREATE TABLE parties (
  id           INTEGER PRIMARY KEY,
  name         TEXT    NOT NULL UNIQUE,
  founded_year INTEGER NOT NULL,
  home_town_id INTEGER NOT NULL REFERENCES towns(id)
);

CREATE TABLE adventurers (
  id           INTEGER PRIMARY KEY,
  name         TEXT    NOT NULL,
  race_id      INTEGER NOT NULL REFERENCES races(id),
  class_id     INTEGER NOT NULL REFERENCES classes(id),
  level        INTEGER NOT NULL CHECK (level BETWEEN 1 AND 20),
  hp_max       INTEGER NOT NULL,
  gold         INTEGER NOT NULL DEFAULT 0,
  alignment    TEXT    NOT NULL,
  home_town_id INTEGER NOT NULL REFERENCES towns(id),
  party_id     INTEGER REFERENCES parties(id),      -- NULL: not in a party
  mentor_id    INTEGER REFERENCES adventurers(id)   -- NULL: self-taught
);

CREATE TABLE spells (
  id            INTEGER PRIMARY KEY,
  name          TEXT    NOT NULL UNIQUE,
  level         INTEGER NOT NULL,     -- 0 = cantrip
  school        TEXT    NOT NULL,
  casting_time  TEXT    NOT NULL,
  range         TEXT    NOT NULL,
  concentration INTEGER NOT NULL,     -- 1 = requires concentration
  ritual        INTEGER NOT NULL      -- 1 = can be cast as a ritual
);

-- Which classes have each spell on their spell list.
CREATE TABLE class_spells (
  class_id INTEGER NOT NULL REFERENCES classes(id),
  spell_id INTEGER NOT NULL REFERENCES spells(id),
  PRIMARY KEY (class_id, spell_id)
);

-- Spells each adventurer knows or has prepared.
CREATE TABLE adventurer_spells (
  adventurer_id INTEGER NOT NULL REFERENCES adventurers(id),
  spell_id      INTEGER NOT NULL REFERENCES spells(id),
  PRIMARY KEY (adventurer_id, spell_id)
);

CREATE TABLE monsters (
  id               INTEGER PRIMARY KEY,
  name             TEXT    NOT NULL UNIQUE,
  size             TEXT    NOT NULL,
  type             TEXT    NOT NULL,
  alignment        TEXT    NOT NULL,
  armor_class      INTEGER NOT NULL,
  hit_points       INTEGER NOT NULL,
  challenge_rating REAL    NOT NULL,   -- 0.125, 0.25 and 0.5 for 1/8, 1/4, 1/2
  xp               INTEGER NOT NULL
);

CREATE TABLE magic_items (
  id                  INTEGER PRIMARY KEY,
  name                TEXT    NOT NULL UNIQUE,
  category            TEXT    NOT NULL,
  rarity              TEXT    NOT NULL,   -- common, uncommon, rare, very rare, legendary
  requires_attunement INTEGER NOT NULL    -- 1 = yes
);

CREATE TABLE inventory (
  adventurer_id INTEGER NOT NULL REFERENCES adventurers(id),
  item_id       INTEGER NOT NULL REFERENCES magic_items(id),
  quantity      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (adventurer_id, item_id)
);

CREATE TABLE quests (
  id           INTEGER PRIMARY KEY,
  name         TEXT    NOT NULL,
  town_id      INTEGER NOT NULL REFERENCES towns(id),
  party_id     INTEGER REFERENCES parties(id),   -- NULL: nobody has taken it yet
  reward_gold  INTEGER NOT NULL,
  status       TEXT    NOT NULL CHECK (status IN ('open', 'in_progress', 'completed', 'failed')),
  posted_on    TEXT    NOT NULL,                 -- ISO date, YYYY-MM-DD
  completed_on TEXT                              -- NULL unless completed
);

CREATE TABLE encounters (
  id         INTEGER PRIMARY KEY,
  quest_id   INTEGER NOT NULL REFERENCES quests(id),
  monster_id INTEGER NOT NULL REFERENCES monsters(id),
  quantity   INTEGER NOT NULL,
  defeated   INTEGER NOT NULL      -- 1 = the party won this fight
);
