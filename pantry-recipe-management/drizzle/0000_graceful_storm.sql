CREATE TYPE "public"."cooking_level" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED');--> statement-breakpoint
CREATE TYPE "public"."recipe_source" AS ENUM('MANUAL', 'WEB_RETRIEVED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "categories" (
	"cat_id" serial PRIMARY KEY NOT NULL,
	"label" varchar(120) NOT NULL,
	"shelf_life_days" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_label_unique" UNIQUE("label"),
	CONSTRAINT "categories_shelf_life_ck" CHECK ("categories"."shelf_life_days" >= 0)
);
--> statement-breakpoint
CREATE TABLE "cooking_log" (
	"cook_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"recipe_id" integer NOT NULL,
	"cooked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dietary_tags" (
	"tag_id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"label" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"ingredient_id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"default_unit" varchar(32) NOT NULL,
	"cat_id" integer NOT NULL,
	CONSTRAINT "ingredients_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pantry_items" (
	"item_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"purchase_id" integer,
	"quantity" numeric(14, 3) NOT NULL,
	"unit" varchar(32) NOT NULL,
	"expiry_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pantry_items_quantity_ck" CHECK ("pantry_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "purchase_log" (
	"purchase_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"sup_id" integer,
	"purchase_date" timestamp with time zone DEFAULT now() NOT NULL,
	"quantity_purchased" numeric(14, 3) NOT NULL,
	"unit" varchar(32) NOT NULL,
	"total_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	CONSTRAINT "purchase_log_quantity_ck" CHECK ("purchase_log"."quantity_purchased" > 0),
	CONSTRAINT "purchase_log_price_ck" CHECK ("purchase_log"."total_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"ri_id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"quantity_required" numeric(14, 3) NOT NULL,
	"unit" varchar(32) NOT NULL,
	CONSTRAINT "recipe_ingredients_quantity_ck" CHECK ("recipe_ingredients"."quantity_required" > 0)
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"recipe_id" serial PRIMARY KEY NOT NULL,
	"name" varchar(240) NOT NULL,
	"steps" text NOT NULL,
	"cook_time_min" integer NOT NULL,
	"difficulty_level" "cooking_level" DEFAULT 'BEGINNER' NOT NULL,
	"utensil_count" integer DEFAULT 0 NOT NULL,
	"source" "recipe_source" DEFAULT 'MANUAL' NOT NULL,
	"source_url" varchar(1000),
	"rating" numeric(3, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipes_time_ck" CHECK ("recipes"."cook_time_min" > 0)
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"sup_id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"contact" varchar(320)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"cooking_level" "cooking_level" DEFAULT 'BEGINNER' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waste_log" (
	"waste_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"quantity_wasted" numeric(14, 3) NOT NULL,
	"unit" varchar(32) NOT NULL,
	"expired_on" date NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waste_log_quantity_ck" CHECK ("waste_log"."quantity_wasted" > 0)
);
--> statement-breakpoint
ALTER TABLE "cooking_log" ADD CONSTRAINT "cooking_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cooking_log" ADD CONSTRAINT "cooking_log_recipe_id_recipes_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("recipe_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dietary_tags" ADD CONSTRAINT "dietary_tags_recipe_id_recipes_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("recipe_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_cat_id_categories_cat_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."categories"("cat_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_ingredient_id_ingredients_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("ingredient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_purchase_id_purchase_log_purchase_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchase_log"("purchase_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_log" ADD CONSTRAINT "purchase_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_log" ADD CONSTRAINT "purchase_log_ingredient_id_ingredients_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("ingredient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_log" ADD CONSTRAINT "purchase_log_sup_id_suppliers_sup_id_fk" FOREIGN KEY ("sup_id") REFERENCES "public"."suppliers"("sup_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("recipe_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_ingredients_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("ingredient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_log" ADD CONSTRAINT "waste_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_log" ADD CONSTRAINT "waste_log_ingredient_id_ingredients_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("ingredient_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cooking_log_user_date_idx" ON "cooking_log" USING btree ("user_id","cooked_at");--> statement-breakpoint
CREATE INDEX "dietary_tags_recipe_idx" ON "dietary_tags" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "ingredients_category_idx" ON "ingredients" USING btree ("cat_id");--> statement-breakpoint
CREATE INDEX "pantry_items_user_expiry_idx" ON "pantry_items" USING btree ("user_id","expiry_date");--> statement-breakpoint
CREATE INDEX "pantry_items_user_ingredient_idx" ON "pantry_items" USING btree ("user_id","ingredient_id");--> statement-breakpoint
CREATE INDEX "purchase_log_user_date_idx" ON "purchase_log" USING btree ("user_id","purchase_date");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_ingredient_unique" ON "recipe_ingredients" USING btree ("recipe_id","ingredient_id");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_recipe_idx" ON "recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipes_source_idx" ON "recipes" USING btree ("source");--> statement-breakpoint
CREATE INDEX "recipes_cook_time_idx" ON "recipes" USING btree ("cook_time_min");--> statement-breakpoint
CREATE INDEX "waste_log_user_date_idx" ON "waste_log" USING btree ("user_id","expired_on");