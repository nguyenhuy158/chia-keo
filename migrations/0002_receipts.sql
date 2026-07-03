CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_receipts_game_id ON receipts(game_id);
CREATE INDEX IF NOT EXISTS idx_receipts_participant_id ON receipts(participant_id);
