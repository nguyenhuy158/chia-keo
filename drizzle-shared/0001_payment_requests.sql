CREATE TABLE `chiakeo_payment_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`code` text NOT NULL,
	`receiver_participant_id` text NOT NULL,
	`receiver_account_no` text NOT NULL,
	`items_json` text NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`paid_amount` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`checked_at` text NOT NULL,
	`paid_at` text,
	FOREIGN KEY (`game_id`) REFERENCES `chiakeo_games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chiakeo_payment_requests_code_unique` ON `chiakeo_payment_requests` (`code`);--> statement-breakpoint
CREATE INDEX `chiakeo_payment_requests_game_id_idx` ON `chiakeo_payment_requests` (`game_id`);--> statement-breakpoint
CREATE TABLE `chiakeo_payment_transactions` (
	`bank_txn_id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `chiakeo_payment_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chiakeo_payment_transactions_request_id_idx` ON `chiakeo_payment_transactions` (`request_id`);