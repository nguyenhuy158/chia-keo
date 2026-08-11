CREATE TABLE `game_collaborators` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `game_collaborators_game_id_idx` ON `game_collaborators` (`game_id`);--> statement-breakpoint
CREATE INDEX `game_collaborators_user_id_idx` ON `game_collaborators` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `game_collaborators_game_user_idx` ON `game_collaborators` (`game_id`,`user_id`);