CREATE TABLE `categories` (
	`cat_id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(120) NOT NULL,
	`shelf_life_days` int NOT NULL DEFAULT 0,
	CONSTRAINT `categories_cat_id` PRIMARY KEY(`cat_id`),
	CONSTRAINT `categories_label_unique` UNIQUE(`label`)
);
--> statement-breakpoint
CREATE TABLE `cooking_log` (
	`cook_id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`recipe_id` int NOT NULL,
	`cooked_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cooking_log_cook_id` PRIMARY KEY(`cook_id`)
);
--> statement-breakpoint
CREATE TABLE `dietary_tags` (
	`tag_id` int AUTO_INCREMENT NOT NULL,
	`recipe_id` int NOT NULL,
	`label` varchar(100) NOT NULL,
	CONSTRAINT `dietary_tags_tag_id` PRIMARY KEY(`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `ingredients` (
	`ingredient_id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`default_unit` varchar(32) NOT NULL,
	`cat_id` int NOT NULL,
	CONSTRAINT `ingredients_ingredient_id` PRIMARY KEY(`ingredient_id`),
	CONSTRAINT `ingredients_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `pantry_items` (
	`item_id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`ingredient_id` int NOT NULL,
	`purchase_id` int,
	`quantity` decimal(14,3) NOT NULL,
	`unit` varchar(32) NOT NULL,
	`expiry_date` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pantry_items_item_id` PRIMARY KEY(`item_id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_log` (
	`purchase_id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`ingredient_id` int NOT NULL,
	`sup_id` int,
	`purchase_date` timestamp NOT NULL DEFAULT (now()),
	`quantity_purchased` decimal(14,3) NOT NULL,
	`unit` varchar(32) NOT NULL,
	`total_price` decimal(14,2) NOT NULL DEFAULT '0',
	CONSTRAINT `purchase_log_purchase_id` PRIMARY KEY(`purchase_id`)
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`ri_id` int AUTO_INCREMENT NOT NULL,
	`recipe_id` int NOT NULL,
	`ingredient_id` int NOT NULL,
	`quantity_required` decimal(14,3) NOT NULL,
	`unit` varchar(32) NOT NULL,
	CONSTRAINT `recipe_ingredients_ri_id` PRIMARY KEY(`ri_id`),
	CONSTRAINT `recipe_ingredient_unique` UNIQUE(`recipe_id`,`ingredient_id`)
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`recipe_id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(240) NOT NULL,
	`steps` text NOT NULL,
	`cook_time_min` int NOT NULL,
	`difficulty_level` enum('BEGINNER','INTERMEDIATE','ADVANCED') NOT NULL DEFAULT 'BEGINNER',
	`utensil_count` int NOT NULL DEFAULT 0,
	`source` enum('MANUAL','WEB_RETRIEVED') NOT NULL DEFAULT 'MANUAL',
	`source_url` varchar(1000),
	`rating` decimal(3,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recipes_recipe_id` PRIMARY KEY(`recipe_id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`sup_id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`contact` varchar(320),
	CONSTRAINT `suppliers_sup_id` PRIMARY KEY(`sup_id`)
);
--> statement-breakpoint
CREATE TABLE `waste_log` (
	`waste_id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`ingredient_id` int NOT NULL,
	`quantity_wasted` decimal(14,3) NOT NULL,
	`unit` varchar(32) NOT NULL,
	`expired_on` date NOT NULL,
	`recorded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waste_log_waste_id` PRIMARY KEY(`waste_id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `cooking_level` enum('BEGINNER','INTERMEDIATE','ADVANCED') DEFAULT 'BEGINNER' NOT NULL;--> statement-breakpoint
ALTER TABLE `cooking_log` ADD CONSTRAINT `cooking_log_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cooking_log` ADD CONSTRAINT `cooking_log_recipe_id_recipes_recipe_id_fk` FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`recipe_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dietary_tags` ADD CONSTRAINT `dietary_tags_recipe_id_recipes_recipe_id_fk` FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`recipe_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ingredients` ADD CONSTRAINT `ingredients_cat_id_categories_cat_id_fk` FOREIGN KEY (`cat_id`) REFERENCES `categories`(`cat_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pantry_items` ADD CONSTRAINT `pantry_items_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pantry_items` ADD CONSTRAINT `pantry_items_ingredient_id_ingredients_ingredient_id_fk` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`ingredient_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pantry_items` ADD CONSTRAINT `pantry_items_purchase_id_purchase_log_purchase_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchase_log`(`purchase_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_log` ADD CONSTRAINT `purchase_log_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_log` ADD CONSTRAINT `purchase_log_ingredient_id_ingredients_ingredient_id_fk` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`ingredient_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_log` ADD CONSTRAINT `purchase_log_sup_id_suppliers_sup_id_fk` FOREIGN KEY (`sup_id`) REFERENCES `suppliers`(`sup_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recipe_ingredients` ADD CONSTRAINT `recipe_ingredients_recipe_id_recipes_recipe_id_fk` FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`recipe_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recipe_ingredients` ADD CONSTRAINT `recipe_ingredients_ingredient_id_ingredients_ingredient_id_fk` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`ingredient_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `waste_log` ADD CONSTRAINT `waste_log_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `waste_log` ADD CONSTRAINT `waste_log_ingredient_id_ingredients_ingredient_id_fk` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`ingredient_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cooking_log_user_date_idx` ON `cooking_log` (`user_id`,`cooked_at`);--> statement-breakpoint
CREATE INDEX `dietary_tags_recipe_idx` ON `dietary_tags` (`recipe_id`);--> statement-breakpoint
CREATE INDEX `ingredients_category_idx` ON `ingredients` (`cat_id`);--> statement-breakpoint
CREATE INDEX `pantry_items_user_expiry_idx` ON `pantry_items` (`user_id`,`expiry_date`);--> statement-breakpoint
CREATE INDEX `pantry_items_user_ingredient_idx` ON `pantry_items` (`user_id`,`ingredient_id`);--> statement-breakpoint
CREATE INDEX `purchase_log_user_date_idx` ON `purchase_log` (`user_id`,`purchase_date`);--> statement-breakpoint
CREATE INDEX `recipe_ingredients_recipe_idx` ON `recipe_ingredients` (`recipe_id`);--> statement-breakpoint
CREATE INDEX `recipes_source_idx` ON `recipes` (`source`);--> statement-breakpoint
CREATE INDEX `recipes_cook_time_idx` ON `recipes` (`cook_time_min`);--> statement-breakpoint
CREATE INDEX `waste_log_user_date_idx` ON `waste_log` (`user_id`,`expired_on`);