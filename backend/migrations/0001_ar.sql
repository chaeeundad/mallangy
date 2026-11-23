CREATE TABLE ar_rooms (
  code TEXT PRIMARY KEY NOT NULL,
  zone_hash TEXT NOT NULL,
  marker_id INTEGER NOT NULL CHECK (marker_id BETWEEN 0 AND 249),
  expires_at INTEGER NOT NULL,
  UNIQUE (zone_hash, marker_id)
);
CREATE INDEX ar_rooms_expiration ON ar_rooms (expires_at);
CREATE TABLE ar_players (
  room_code TEXT NOT NULL REFERENCES ar_rooms(code) ON DELETE CASCADE,
  id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  seat INTEGER NOT NULL CHECK (seat BETWEEN 0 AND 3),
  x REAL NOT NULL,
  z REAL NOT NULL,
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  seen_at INTEGER NOT NULL,
  avatar TEXT,
  jump INTEGER NOT NULL DEFAULT 0 CHECK (jump >= 0),
  PRIMARY KEY (room_code, id),
  UNIQUE (room_code, seat),
  UNIQUE (room_code, token_hash)
);
CREATE TABLE ar_claims (
  room_code TEXT NOT NULL REFERENCES ar_rooms(code) ON DELETE CASCADE,
  star_id TEXT NOT NULL,
  PRIMARY KEY (room_code, star_id)
);
