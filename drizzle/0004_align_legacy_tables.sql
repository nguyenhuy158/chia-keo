-- Rebuild 4 tables that still had the pre-drizzle hand-written shape in prod.
-- Deltas fixed:
--   games:          drop share_token (NOT NULL UNIQUE, never written by the app) and
--                   payment_* columns; FK owner_user_id now -> user(id), not users(id).
--   participants:   drop avatar_seed / sort_order; updated_at now NOT NULL.
--   expenses:       drop payer_id (NOT NULL, never written) and category_id;
--                   payer_participant_id now NOT NULL; updated_at now NOT NULL.
--   expense_splits: primary key moves from (expense_id, participant_id) to id.
--
-- Shape of this migration is dictated by two SQLite rules:
--   * ALTER TABLE ... RENAME re-validates the whole schema, and game_photos / share_links
--     point at these tables, so the usual __new_x + rename dance dies mid-swap with
--     "no such table: main.expenses". Tables are therefore recreated under their final
--     names and the data is parked in FK-free *_bak tables.
--   * DROP TABLE also re-validates, so no dangling FK reference may exist between
--     statements: each DROP is immediately followed by its CREATE, innermost child first.
--
-- No-op in effect on databases already created from 0000 (same columns are copied).
PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `games_bak` AS SELECT `id`, `owner_user_id`, `code`, `name`, `settlement_mode`, `created_at`, `updated_at` FROM `games`;--> statement-breakpoint
CREATE TABLE `participants_bak` AS SELECT `id`, `game_id`, `name`, `created_at`, COALESCE(`updated_at`, `created_at`) AS `updated_at` FROM `participants`;--> statement-breakpoint
CREATE TABLE `expenses_bak` AS SELECT `id`, `game_id`, `payer_participant_id`, `kind`, `title`, `amount`, `note`, `split_mode`, `created_at`, COALESCE(`updated_at`, `created_at`) AS `updated_at` FROM `expenses`;--> statement-breakpoint
CREATE TABLE `expense_splits_bak` AS SELECT `id`, `expense_id`, `participant_id`, `amount`, `weight` FROM `expense_splits`;--> statement-breakpoint
-- DROP TABLE fires ON DELETE CASCADE on children, so share_links / game_photos /
-- payment_profiles get emptied even though those tables themselves are untouched.
-- Park their rows and put them back at the end.
CREATE TABLE `share_links_bak` AS SELECT * FROM `share_links`;--> statement-breakpoint
CREATE TABLE `game_photos_bak` AS SELECT * FROM `game_photos`;--> statement-breakpoint
CREATE TABLE `payment_profiles_bak` AS SELECT * FROM `payment_profiles`;--> statement-breakpoint
DROP TABLE `expense_splits`;--> statement-breakpoint
CREATE TABLE `expense_splits` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`amount` integer NOT NULL,
	`weight` integer,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
DROP TABLE `expenses`;--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`payer_participant_id` text NOT NULL,
	`kind` text DEFAULT 'expense' NOT NULL,
	`title` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`split_mode` text DEFAULT 'equal' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payer_participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
DROP TABLE `participants`;--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
DROP TABLE `games`;--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`settlement_mode` text DEFAULT 'p2p' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `games` SELECT * FROM `games_bak`;--> statement-breakpoint
INSERT INTO `participants` SELECT * FROM `participants_bak`;--> statement-breakpoint
INSERT INTO `expenses` SELECT * FROM `expenses_bak`;--> statement-breakpoint
INSERT INTO `expense_splits` SELECT * FROM `expense_splits_bak`;--> statement-breakpoint
INSERT INTO `share_links` SELECT * FROM `share_links_bak`;--> statement-breakpoint
INSERT INTO `game_photos` SELECT * FROM `game_photos_bak`;--> statement-breakpoint
INSERT INTO `payment_profiles` SELECT * FROM `payment_profiles_bak`;--> statement-breakpoint
DROP TABLE `share_links_bak`;--> statement-breakpoint
DROP TABLE `game_photos_bak`;--> statement-breakpoint
DROP TABLE `payment_profiles_bak`;--> statement-breakpoint
DROP TABLE `games_bak`;--> statement-breakpoint
DROP TABLE `participants_bak`;--> statement-breakpoint
DROP TABLE `expenses_bak`;--> statement-breakpoint
DROP TABLE `expense_splits_bak`;--> statement-breakpoint
CREATE INDEX `games_owner_user_id_idx` ON `games` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `participants_game_id_idx` ON `participants` (`game_id`);--> statement-breakpoint
CREATE INDEX `expenses_game_id_idx` ON `expenses` (`game_id`);--> statement-breakpoint
CREATE INDEX `expense_splits_expense_id_idx` ON `expense_splits` (`expense_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `expense_splits_expense_participant_idx` ON `expense_splits` (`expense_id`,`participant_id`);
