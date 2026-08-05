CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`bank_id` text DEFAULT '' NOT NULL,
	`account_no` text DEFAULT '' NOT NULL,
	`account_name` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_owner_name_key_idx` ON `contacts` (`owner_user_id`,`name_key`);