ALTER TABLE ar_rooms ADD COLUMN round INTEGER NOT NULL DEFAULT 0 CHECK (round >= 0);

-- Changing the round and resetting its state must be one SQLite operation.
CREATE TRIGGER ar_rooms_reset_round
AFTER UPDATE OF round ON ar_rooms
WHEN NEW.round = OLD.round + 1
BEGIN
  DELETE FROM ar_claims WHERE room_code = NEW.code;
  UPDATE ar_players
    SET x = -0.75 + seat * 0.5, z = 0, jump = 0
    WHERE room_code = NEW.code;
END;
