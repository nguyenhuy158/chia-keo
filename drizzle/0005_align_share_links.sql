-- share_links was the last table still on the pre-drizzle shape: primary key was
-- share_token (NOT NULL), while the app writes id / token / enabled and never writes
-- share_token — so POST /api/games/:id/share-links returned 500 on production.
-- Also drops the unused `permission` and `updated_at` columns.
-- Nothing references share_links, so a plain park / drop / recreate is enough.
PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
-- Only columns that exist in both shapes are selected, so this also runs on a database
-- created straight from 0000 (which has no share_token column at all).
CREATE TABLE `share_links_bak` AS SELECT
	`id`,
	`game_id`,
	`token`,
	`enabled`,
	`created_at`,
	`expires_at`
	FROM `share_links`;--> statement-breakpoint
DROP TABLE `share_links`;--> statement-breakpoint
CREATE TABLE `share_links` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`token` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `share_links` SELECT * FROM `share_links_bak`;--> statement-breakpoint
DROP TABLE `share_links_bak`;--> statement-breakpoint
CREATE UNIQUE INDEX `share_links_token_unique` ON `share_links` (`token`);--> statement-breakpoint
CREATE INDEX `share_links_game_id_idx` ON `share_links` (`game_id`);
