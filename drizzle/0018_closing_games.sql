ALTER TABLE `games` ADD `closed_at` text;--> statement-breakpoint
ALTER TABLE `games` ADD `close_mode` text DEFAULT '' NOT NULL;
