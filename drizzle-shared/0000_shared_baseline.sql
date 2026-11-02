CREATE TABLE "chiakeo_account" (`id` text PRIMARY KEY NOT NULL, `account_id` text NOT NULL, `provider_id` text NOT NULL, `user_id` text NOT NULL, `access_token` text, `refresh_token` text, `id_token` text, `access_token_expires_at` integer, `refresh_token_expires_at` integer, `scope` text, `password` text, `created_at` integer NOT NULL, `updated_at` integer NOT NULL, FOREIGN KEY (`user_id`) REFERENCES "chiakeo_user"(`id`) ON UPDATE no action ON DELETE cascade);
--> statement-breakpoint
CREATE TABLE "chiakeo_contacts" (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`bank_id` text DEFAULT '' NOT NULL,
	`account_no` text DEFAULT '' NOT NULL,
	`account_name` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES "chiakeo_user"(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "chiakeo_expense_splits" (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`amount` integer NOT NULL,
	`weight` integer,
	FOREIGN KEY (`expense_id`) REFERENCES "chiakeo_expenses"(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES "chiakeo_participants"(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "chiakeo_expense_templates" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL,
  category_id TEXT NOT NULL DEFAULT 'other',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES "chiakeo_users"(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE "chiakeo_expenses" (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`payer_participant_id` text NOT NULL,
	`kind` text DEFAULT 'expense' NOT NULL,
	`title` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`split_mode` text DEFAULT 'equal' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL, `sequence` integer DEFAULT 0 NOT NULL, `category` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES "chiakeo_games"(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payer_participant_id`) REFERENCES "chiakeo_participants"(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "chiakeo_game_collaborators" (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`user_id` text,
	`invited_email` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES "chiakeo_games"(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES "chiakeo_user"(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "chiakeo_game_events" (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	`undone_at` text,
	FOREIGN KEY (`game_id`) REFERENCES "chiakeo_games"(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "chiakeo_game_photos" (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`expense_id` text,
	`caption` text DEFAULT '' NOT NULL,
	`mime_type` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`data` text NOT NULL,
	`thumb_data` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES "chiakeo_games"(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`expense_id`) REFERENCES "chiakeo_expenses"(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE "chiakeo_games" (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`settlement_mode` text DEFAULT 'p2p' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL, `settlement_host_id` text DEFAULT '' NOT NULL, `deleted_at` text, `closed_at` text, `close_mode` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES "chiakeo_user"(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "chiakeo_legacy_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chiakeo_mcp_tokens" (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`token_prefix` text NOT NULL,
	`scopes` text NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text,
	`expires_at` text,
	`revoked_at` text,
	FOREIGN KEY (`user_id`) REFERENCES "chiakeo_user"(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "chiakeo_participants" (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL, `sequence` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES "chiakeo_games"(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "chiakeo_payment_profiles" (id TEXT PRIMARY KEY NOT NULL, participant_id TEXT NOT NULL, bank_id TEXT DEFAULT '' NOT NULL, account_no TEXT DEFAULT '' NOT NULL, account_name TEXT DEFAULT '' NOT NULL, qr_type TEXT DEFAULT 'vietqr' NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (participant_id) REFERENCES "chiakeo_participants"(id) ON UPDATE no action ON DELETE cascade);
--> statement-breakpoint
CREATE TABLE "chiakeo_receipts" (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (game_id) REFERENCES "chiakeo_games"(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES "chiakeo_participants"(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE "chiakeo_session" (`id` text PRIMARY KEY NOT NULL, `expires_at` integer NOT NULL, `token` text NOT NULL, `created_at` integer NOT NULL, `updated_at` integer NOT NULL, `ip_address` text, `user_agent` text, `user_id` text NOT NULL, FOREIGN KEY (`user_id`) REFERENCES "chiakeo_user"(`id`) ON UPDATE no action ON DELETE cascade);
--> statement-breakpoint
CREATE TABLE "chiakeo_sessions" (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES "chiakeo_users"(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE "chiakeo_share_links" (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`token` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text,
	FOREIGN KEY (`game_id`) REFERENCES "chiakeo_games"(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "chiakeo_shuttle_entries" (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`kind` text NOT NULL,
	`delta` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES "chiakeo_user"(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "chiakeo_user" (`id` text PRIMARY KEY NOT NULL, `name` text NOT NULL, `email` text NOT NULL, `email_verified` integer DEFAULT false NOT NULL, `image` text, `created_at` integer NOT NULL, `updated_at` integer NOT NULL, `username` text, `display_username` text);
--> statement-breakpoint
CREATE TABLE "chiakeo_user_preferences" (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES "chiakeo_user"(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "chiakeo_users" (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_key TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
, display_name TEXT NOT NULL DEFAULT '');
--> statement-breakpoint
CREATE TABLE "chiakeo_verification" (`id` text PRIMARY KEY NOT NULL, `identifier` text NOT NULL, `value` text NOT NULL, `expires_at` integer NOT NULL, `created_at` integer, `updated_at` integer);
--> statement-breakpoint
CREATE INDEX "chiakeo_account_user_id_idx" ON "chiakeo_account" (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX "chiakeo_contacts_owner_name_key_idx" ON "chiakeo_contacts" (`owner_user_id`,`name_key`);
--> statement-breakpoint
CREATE INDEX "chiakeo_expense_splits_expense_id_idx" ON "chiakeo_expense_splits" (`expense_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX "chiakeo_expense_splits_expense_participant_idx" ON "chiakeo_expense_splits" (`expense_id`,`participant_id`);
--> statement-breakpoint
CREATE INDEX "chiakeo_expenses_game_id_idx" ON "chiakeo_expenses" (`game_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX "chiakeo_game_collaborators_game_email_idx" ON "chiakeo_game_collaborators" (`game_id`,`invited_email`);
--> statement-breakpoint
CREATE INDEX "chiakeo_game_collaborators_game_id_idx" ON "chiakeo_game_collaborators" (`game_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX "chiakeo_game_collaborators_game_user_idx" ON "chiakeo_game_collaborators" (`game_id`,`user_id`);
--> statement-breakpoint
CREATE INDEX "chiakeo_game_collaborators_invited_email_idx" ON "chiakeo_game_collaborators" (`invited_email`);
--> statement-breakpoint
CREATE INDEX "chiakeo_game_collaborators_user_id_idx" ON "chiakeo_game_collaborators" (`user_id`);
--> statement-breakpoint
CREATE INDEX "chiakeo_game_events_game_id_idx" ON "chiakeo_game_events" (`game_id`);
--> statement-breakpoint
CREATE INDEX "chiakeo_game_photos_expense_id_idx" ON "chiakeo_game_photos" (`expense_id`);
--> statement-breakpoint
CREATE INDEX "chiakeo_game_photos_game_id_idx" ON "chiakeo_game_photos" (`game_id`);
--> statement-breakpoint
CREATE INDEX "chiakeo_games_owner_user_id_idx" ON "chiakeo_games" (`owner_user_id`);
--> statement-breakpoint
CREATE INDEX "chiakeo_idx_expense_templates_user_id" ON "chiakeo_expense_templates"(user_id);
--> statement-breakpoint
CREATE INDEX "chiakeo_idx_receipts_game_id" ON "chiakeo_receipts"(game_id);
--> statement-breakpoint
CREATE INDEX "chiakeo_idx_receipts_participant_id" ON "chiakeo_receipts"(participant_id);
--> statement-breakpoint
CREATE INDEX "chiakeo_idx_sessions_user_id" ON "chiakeo_sessions"(user_id);
--> statement-breakpoint
CREATE UNIQUE INDEX "chiakeo_mcp_tokens_token_hash_unique" ON "chiakeo_mcp_tokens" (`token_hash`);
--> statement-breakpoint
CREATE INDEX "chiakeo_mcp_tokens_user_id_idx" ON "chiakeo_mcp_tokens" (`user_id`);
--> statement-breakpoint
CREATE INDEX "chiakeo_participants_game_id_idx" ON "chiakeo_participants" (`game_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX "chiakeo_payment_profiles_participant_id_idx" ON "chiakeo_payment_profiles" (participant_id);
--> statement-breakpoint
CREATE UNIQUE INDEX "chiakeo_session_token_unique" ON "chiakeo_session" (`token`);
--> statement-breakpoint
CREATE INDEX "chiakeo_session_user_id_idx" ON "chiakeo_session" (`user_id`);
--> statement-breakpoint
CREATE INDEX "chiakeo_share_links_game_id_idx" ON "chiakeo_share_links" (`game_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX "chiakeo_share_links_token_unique" ON "chiakeo_share_links" (`token`);
--> statement-breakpoint
CREATE INDEX "chiakeo_shuttle_entries_owner_id_idx" ON "chiakeo_shuttle_entries" (`owner_user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX "chiakeo_user_email_unique" ON "chiakeo_user" (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX "chiakeo_user_preferences_user_key_idx" ON "chiakeo_user_preferences" (`user_id`,`key`);
--> statement-breakpoint
CREATE UNIQUE INDEX "chiakeo_user_username_unique" ON "chiakeo_user" (`username`);
