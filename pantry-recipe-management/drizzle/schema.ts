import {
  check,
  date,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const cookingLevelEnum = pgEnum("cooking_level", ["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
export const recipeSourceEnum = pgEnum("recipe_source", ["MANUAL", "WEB_RETRIEVED"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  cookingLevel: cookingLevelEnum("cooking_level").default("BEGINNER").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export const categories = pgTable(
  "categories",
  {
    catId: serial("cat_id").primaryKey(),
    label: varchar("label", { length: 120 }).notNull().unique(),
    shelfLifeDays: integer("shelf_life_days").notNull().default(0),
  },
  table => ({
    shelfLifeCk: check("categories_shelf_life_ck", sql`${table.shelfLifeDays} >= 0`),
  })
);

export const ingredients = pgTable(
  "ingredients",
  {
    ingredientId: serial("ingredient_id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull().unique(),
    defaultUnit: varchar("default_unit", { length: 32 }).notNull(),
    catId: integer("cat_id")
      .notNull()
      .references(() => categories.catId),
  },
  table => ({
    categoryIdx: index("ingredients_category_idx").on(table.catId),
  })
);

export const purchaseLog = pgTable(
  "purchase_log",
  {
    purchaseId: serial("purchase_id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.ingredientId),
    purchaseDate: timestamp("purchase_date", { withTimezone: true }).defaultNow().notNull(),
    quantityPurchased: decimal("quantity_purchased", { precision: 14, scale: 3 }).notNull(),
    unit: varchar("unit", { length: 32 }).notNull(),
    totalPrice: decimal("total_price", { precision: 14, scale: 2 }).notNull().default("0"),
    supplierName: varchar("supplier_name", { length: 160 }),
  },
  table => ({
    userDateIdx: index("purchase_log_user_date_idx").on(table.userId, table.purchaseDate),
    quantityCk: check("purchase_log_quantity_ck", sql`${table.quantityPurchased} > 0`),
    priceCk: check("purchase_log_price_ck", sql`${table.totalPrice} >= 0`),
  })
);

export const pantryItems = pgTable(
  "pantry_items",
  {
    itemId: serial("item_id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.ingredientId),
    purchaseId: integer("purchase_id").references(() => purchaseLog.purchaseId),
    quantity: decimal("quantity", { precision: 14, scale: 3 }).notNull(),
    unit: varchar("unit", { length: 32 }).notNull(),
    expiryDate: date("expiry_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    userExpiryIdx: index("pantry_items_user_expiry_idx").on(table.userId, table.expiryDate),
    userIngredientIdx: index("pantry_items_user_ingredient_idx").on(table.userId, table.ingredientId),
    quantityCk: check("pantry_items_quantity_ck", sql`${table.quantity} > 0`),
  })
);

export const recipes = pgTable(
  "recipes",
  {
    recipeId: serial("recipe_id").primaryKey(),
    name: varchar("name", { length: 240 }).notNull(),
    steps: text("steps").notNull(),
    cookTimeMin: integer("cook_time_min").notNull(),
    difficultyLevel: cookingLevelEnum("difficulty_level").notNull().default("BEGINNER"),
    utensilCount: integer("utensil_count").notNull().default(0),
    source: recipeSourceEnum("source").notNull().default("MANUAL"),
    sourceUrl: varchar("source_url", { length: 1000 }),
    rating: decimal("rating", { precision: 3, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    sourceIdx: index("recipes_source_idx").on(table.source),
    timeIdx: index("recipes_cook_time_idx").on(table.cookTimeMin),
    timeCk: check("recipes_time_ck", sql`${table.cookTimeMin} > 0`),
  })
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    riId: serial("ri_id").primaryKey(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.recipeId, { onDelete: "cascade" }),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.ingredientId),
    quantityRequired: decimal("quantity_required", { precision: 14, scale: 3 }).notNull(),
    unit: varchar("unit", { length: 32 }).notNull(),
  },
  table => ({
    recipeIngredientUnique: uniqueIndex("recipe_ingredient_unique").on(table.recipeId, table.ingredientId),
    recipeIdx: index("recipe_ingredients_recipe_idx").on(table.recipeId),
    quantityCk: check("recipe_ingredients_quantity_ck", sql`${table.quantityRequired} > 0`),
  })
);

export const cookingLog = pgTable(
  "cooking_log",
  {
    cookId: serial("cook_id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.recipeId),
    cookedAt: timestamp("cooked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    userDateIdx: index("cooking_log_user_date_idx").on(table.userId, table.cookedAt),
  })
);

export const dietaryTags = pgTable(
  "dietary_tags",
  {
    tagId: serial("tag_id").primaryKey(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.recipeId, { onDelete: "cascade" }),
    label: varchar("label", { length: 100 }).notNull(),
  },
  table => ({
    recipeTagIdx: index("dietary_tags_recipe_idx").on(table.recipeId),
  })
);

export const wasteLog = pgTable(
  "waste_log",
  {
    wasteId: serial("waste_id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.ingredientId),
    quantityWasted: decimal("quantity_wasted", { precision: 14, scale: 3 }).notNull(),
    unit: varchar("unit", { length: 32 }).notNull(),
    expiredOn: date("expired_on").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    userDateIdx: index("waste_log_user_date_idx").on(table.userId, table.expiredOn),
    quantityCk: check("waste_log_quantity_ck", sql`${table.quantityWasted} > 0`),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PantryItem = typeof pantryItems.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type WasteLog = typeof wasteLog.$inferSelect;
export type PurchaseLog = typeof purchaseLog.$inferSelect;
