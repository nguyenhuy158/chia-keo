ALTER TABLE `expenses` ADD `sequence` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `expenses` SET `sequence` = `rowid`;