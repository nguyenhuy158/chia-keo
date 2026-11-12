CREATE TABLE `chiakeo_share_previews` (
	`game_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `chiakeo_games`(`id`) ON UPDATE no action ON DELETE cascade
);
