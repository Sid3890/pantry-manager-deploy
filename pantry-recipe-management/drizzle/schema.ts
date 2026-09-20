import {
  date,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  check,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  cookingLevel: mysqlEnum("cooking_level", ["BEGINNER", "INTERMEDIATE", "ADVANCED"])
    .default("BEGINNER")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const categories = mysqlTable("categories", {
  catId: int("cat_id").autoincrement().primaryKey(),
  label: varchar("label", { length: 120 }).notNull().unique(),
  shelfLifeDays: int("shelf_life_days").notNull().default(0),
}, table => ({ shelfLifeCk: check("categories_shelf_life_ck", sql`${table.shelfLifeDays} >= 0`) }));

export const ingredients = mysqlTable(
  "ingredients",
  {
    ingredientId: int("ingredient_id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull().unique(),
    defaultUnit: varchar("default_unit", { length: 32 }).notNull(),
    catId: int("cat_id")
      .notNull()
      .references(() => categories.catId),
  },
  table => ({ categoryIdx: index("ingredients_category_idx").on(table.catId) })
);

export const suppliers = mysqlTable("suppliers", {
  supId: int("sup_id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  contact: varchar("contact", { length: 320 }),
});

export const purchaseLog = mysqlTable(
  "purchase_log",
  {
    purchaseId: int("purchase_id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ingredientId: int("ingredient_id")
      .notNull()
      .references(() => ingredients.ingredientId),
    supId: int("sup_id").references(() => suppliers.supId),
    purchaseDate: timestamp("purchase_date").defaultNow().notNull(),
    quantityPurchased: decimal("quantity_purchased", { precision: 14, scale: 3 }).notNull(),
    unit: varchar("unit", { length: 32 }).notNull(),
    totalPrice: decimal("total_price", { precision: 14, scale: 2 }).notNull().default("0"),
  },
  table => ({
    userDateIdx: index("purchase_log_user_date_idx").on(table.userId, table.purchaseDate),
    quantityCk: check("purchase_log_quantity_ck", sql`${table.quantityPurchased} > 0`),
    priceCk: check("purchase_log_price_ck", sql`${table.totalPrice} >= 0`),
  })
);

export const pantryItems = mysqlTable(
  "pantry_items",
  {
    itemId: int("item_id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ingredientId: int("ingredient_id")
      .notNull()
      .references(() => ingredients.ingredientId),
    purchaseId: int("purchase_id").references(() => purchaseLog.purchaseId),
    quantity: decimal("quantity", { precision: 14, scale: 3 }).notNull(),
    unit: varchar("unit", { length: 32 }).notNull(),
    expiryDate: date("expiry_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    userExpiryIdx: index("pantry_items_user_expiry_idx").on(table.userId, table.expiryDate),
    userIngredientIdx: index("pantry_items_user_ingredient_idx").on(table.userId, table.ingredientId),
    quantityCk: check("pantry_items_quantity_ck", sql`${table.quantity} > 0`),
  })
);

export const recipes = mysqlTable(
  "recipes",
  {
    recipeId: int("recipe_id").autoincrement().primaryKey(),
    name: varchar("name", { length: 240 }).notNull(),
    steps: text("steps").notNull(),
    cookTimeMin: int("cook_time_min").notNull(),
    difficultyLevel: mysqlEnum("difficulty_level", ["BEGINNER", "INTERMEDIATE", "ADVANCED"])
      .notNull()
      .default("BEGINNER"),
    utensilCount: int("utensil_count").notNull().default(0),
    source: mysqlEnum("source", ["MANUAL", "WEB_RETRIEVED"]).notNull().default("MANUAL"),
    sourceUrl: varchar("source_url", { length: 1000 }),
    rating: decimal("rating", { precision: 3, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    sourceIdx: index("recipes_source_idx").on(table.source),
    timeIdx: index("recipes_cook_time_idx").on(table.cookTimeMin),
    timeCk: check("recipes_time_ck", sql`${table.cookTimeMin} > 0`),
  })
);

export const recipeIngredients = mysqlTable(
  "recipe_ingredients",
  {
    riId: int("ri_id").autoincrement().primaryKey(),
    recipeId: int("recipe_id")
      .notNull()
      .references(() => recipes.recipeId, { onDelete: "cascade" }),
    ingredientId: int("ingredient_id")
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

export const cookingLog = mysqlTable(
  "cooking_log",
  {
    cookId: int("cook_id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: int("recipe_id")
      .notNull()
      .references(() => recipes.recipeId),
    cookedAt: timestamp("cooked_at").defaultNow().notNull(),
  },
  table => ({ userDateIdx: index("cooking_log_user_date_idx").on(table.userId, table.cookedAt) })
);

export const dietaryTags = mysqlTable(
  "dietary_tags",
  {
    tagId: int("tag_id").autoincrement().primaryKey(),
    recipeId: int("recipe_id")
      .notNull()
      .references(() => recipes.recipeId, { onDelete: "cascade" }),
    label: varchar("label", { length: 100 }).notNull(),
  },
  table => ({ recipeTagIdx: index("dietary_tags_recipe_idx").on(table.recipeId) })
);

export const wasteLog = mysqlTable(
  "waste_log",
  {
    wasteId: int("waste_id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ingredientId: int("ingredient_id")
      .notNull()
      .references(() => ingredients.ingredientId),
    quantityWasted: decimal("quantity_wasted", { precision: 14, scale: 3 }).notNull(),
    unit: varchar("unit", { length: 32 }).notNull(),
    expiredOn: date("expired_on").notNull(),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
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
