CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_key TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  payment_bank_id TEXT NOT NULL DEFAULT '',
  payment_account_no TEXT NOT NULL DEFAULT '',
  payment_account_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_seed TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL,
  category_id TEXT NOT NULL DEFAULT 'other',
  payer_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (payer_id) REFERENCES participants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expense_splits (
  expense_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (expense_id, participant_id),
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_games_owner_user_id ON games(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_participants_game_id ON participants(game_id);
CREATE INDEX IF NOT EXISTS idx_expenses_game_id ON expenses(game_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_participant_id ON expense_splits(participant_id);

