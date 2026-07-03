ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS share_links (
  share_token TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expense_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL,
  category_id TEXT NOT NULL DEFAULT 'other',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_share_links_game_id ON share_links(game_id);
CREATE INDEX IF NOT EXISTS idx_expense_templates_user_id ON expense_templates(user_id);
