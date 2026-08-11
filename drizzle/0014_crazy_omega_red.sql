PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_game_collaborators` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`user_id` text,
	`invited_email` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_game_collaborators`("id", "game_id", "user_id", "invited_email", "created_at") SELECT "id", "game_id", "user_id", '', "created_at" FROM `game_collaborators`;--> statement-breakpoint
DROP TABLE `game_collaborators`;--> statement-breakpoint
ALTER TABLE `__new_game_collaborators` RENAME TO `game_collaborators`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `game_collaborators_game_id_idx` ON `game_collaborators` (`game_id`);--> statement-breakpoint
CREATE INDEX `game_collaborators_user_id_idx` ON `game_collaborators` (`user_id`);--> statement-breakpoint
CREATE INDEX `game_collaborators_invited_email_idx` ON `game_collaborators` (`invited_email`);--> statement-breakpoint
CREATE UNIQUE INDEX `game_collaborators_game_user_idx` ON `game_collaborators` (`game_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `game_collaborators_game_email_idx` ON `game_collaborators` (`game_id`,`invited_email`);