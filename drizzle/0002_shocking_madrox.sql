CREATE TABLE `game_photos` (
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
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `game_photos_game_id_idx` ON `game_photos` (`game_id`);--> statement-breakpoint
CREATE INDEX `game_photos_expense_id_idx` ON `game_photos` (`expense_id`);