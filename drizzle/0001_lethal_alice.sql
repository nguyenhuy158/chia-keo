ALTER TABLE `expense_splits` ADD `weight` integer;--> statement-breakpoint
ALTER TABLE `expenses` ADD `kind` text DEFAULT 'expense' NOT NULL;--> statement-breakpoint
ALTER TABLE `expenses` ADD `split_mode` text DEFAULT 'equal' NOT NULL;