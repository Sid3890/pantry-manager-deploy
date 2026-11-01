ALTER TABLE `categories` ADD CONSTRAINT `categories_shelf_life_ck` CHECK (`categories`.`shelf_life_days` >= 0);--> statement-breakpoint
ALTER TABLE `pantry_items` ADD CONSTRAINT `pantry_items_quantity_ck` CHECK (`pantry_items`.`quantity` > 0);--> statement-breakpoint
ALTER TABLE `purchase_log` ADD CONSTRAINT `purchase_log_quantity_ck` CHECK (`purchase_log`.`quantity_purchased` > 0);--> statement-breakpoint
ALTER TABLE `purchase_log` ADD CONSTRAINT `purchase_log_price_ck` CHECK (`purchase_log`.`total_price` >= 0);--> statement-breakpoint
ALTER TABLE `recipe_ingredients` ADD CONSTRAINT `recipe_ingredients_quantity_ck` CHECK (`recipe_ingredients`.`quantity_required` > 0);--> statement-breakpoint
ALTER TABLE `recipes` ADD CONSTRAINT `recipes_time_ck` CHECK (`recipes`.`cook_time_min` > 0);--> statement-breakpoint
ALTER TABLE `waste_log` ADD CONSTRAINT `waste_log_quantity_ck` CHECK (`waste_log`.`quantity_wasted` > 0);