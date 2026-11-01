import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { categories, ingredients, recipes, recipeIngredients, users, pantryItems } from "../drizzle/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is required to run seed.");
  process.exit(1);
}

const isLocal = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
const client = postgres(databaseUrl, { ssl: isLocal ? false : "require" });
const db = drizzle(client);

async function seed() {
  console.log("Seeding initial PantryWise data to PostgreSQL...");

  // 1. Categories
  console.log("- Seeding categories...");
  await db.insert(categories).values([
    { catId: 1, label: "Dairy & Eggs", shelfLifeDays: 10 },
    { catId: 2, label: "Produce & Veggies", shelfLifeDays: 7 },
    { catId: 3, label: "Bakery & Breads", shelfLifeDays: 5 },
    { catId: 4, label: "Grains & Pasta", shelfLifeDays: 180 },
    { catId: 5, label: "Oils & Spices", shelfLifeDays: 365 },
    { catId: 6, label: "Proteins & Meats", shelfLifeDays: 5 },
  ]).onConflictDoNothing();

  // 2. Ingredients
  console.log("- Seeding ingredients...");
  await db.insert(ingredients).values([
    { ingredientId: 1, name: "Bread", defaultUnit: "piece", catId: 3 },
    { ingredientId: 2, name: "Paneer", defaultUnit: "g", catId: 1 },
    { ingredientId: 3, name: "Onions", defaultUnit: "piece", catId: 2 },
    { ingredientId: 4, name: "Eggs", defaultUnit: "piece", catId: 1 },
    { ingredientId: 5, name: "Tomatoes", defaultUnit: "piece", catId: 2 },
    { ingredientId: 6, name: "Butter", defaultUnit: "g", catId: 1 },
    { ingredientId: 7, name: "Basmati Rice", defaultUnit: "g", catId: 4 },
    { ingredientId: 8, name: "Chicken Breast", defaultUnit: "g", catId: 6 },
    { ingredientId: 9, name: "Milk", defaultUnit: "ml", catId: 1 },
    { ingredientId: 10, name: "Garlic", defaultUnit: "clove", catId: 2 },
    { ingredientId: 11, name: "Ginger", defaultUnit: "g", catId: 2 },
    { ingredientId: 12, name: "Potatoes", defaultUnit: "piece", catId: 2 },
    { ingredientId: 13, name: "Olive Oil", defaultUnit: "ml", catId: 5 },
    { ingredientId: 14, name: "Salt", defaultUnit: "g", catId: 5 },
    { ingredientId: 15, name: "Turmeric Powder", defaultUnit: "tsp", catId: 5 },
    { ingredientId: 16, name: "Chili Powder", defaultUnit: "tsp", catId: 5 },
  ]).onConflictDoNothing();

  // 3. Recipes
  console.log("- Seeding recipes...");
  await db.insert(recipes).values([
    {
      recipeId: 201,
      name: "Crispy Paneer Toast",
      steps: "1. In a small bowl, crumble the paneer.\n2. Dice onion and mix into paneer with salt.\n3. Butter bread and add paneer filling.\n4. Toast in skillet until golden crisp.",
      cookTimeMin: 15,
      difficultyLevel: "BEGINNER",
      utensilCount: 2,
      source: "MANUAL",
      rating: "4.90",
    },
    {
      recipeId: 202,
      name: "Golden Egg Bhurji on Toast",
      steps: "1. Whisk eggs with a pinch of salt.\n2. Saute diced onions in butter.\n3. Add whisked eggs and cook softly.\n4. Serve warm over toasted bread.",
      cookTimeMin: 12,
      difficultyLevel: "BEGINNER",
      utensilCount: 2,
      source: "MANUAL",
      rating: "4.80",
    },
    {
      recipeId: 203,
      name: "Aromatic Garlic Butter Rice",
      steps: "1. Heat butter in a skillet.\n2. Saute minced garlic until fragrant.\n3. Add rice and stir gently until heated through.",
      cookTimeMin: 10,
      difficultyLevel: "BEGINNER",
      utensilCount: 1,
      source: "MANUAL",
      rating: "4.60",
    },
  ]).onConflictDoNothing();

  // 4. Recipe Ingredients
  console.log("- Seeding recipe ingredients...");
  await db.insert(recipeIngredients).values([
    { recipeId: 201, ingredientId: 1, quantityRequired: "2.000", unit: "piece" },
    { recipeId: 201, ingredientId: 2, quantityRequired: "100.000", unit: "g" },
    { recipeId: 201, ingredientId: 3, quantityRequired: "1.000", unit: "piece" },
    { recipeId: 201, ingredientId: 6, quantityRequired: "10.000", unit: "g" },
    { recipeId: 202, ingredientId: 4, quantityRequired: "2.000", unit: "piece" },
    { recipeId: 202, ingredientId: 3, quantityRequired: "1.000", unit: "piece" },
    { recipeId: 202, ingredientId: 1, quantityRequired: "2.000", unit: "piece" },
    { recipeId: 202, ingredientId: 6, quantityRequired: "10.000", unit: "g" },
    { recipeId: 203, ingredientId: 7, quantityRequired: "200.000", unit: "g" },
    { recipeId: 203, ingredientId: 6, quantityRequired: "15.000", unit: "g" },
    { recipeId: 203, ingredientId: 10, quantityRequired: "3.000", unit: "clove" },
  ]).onConflictDoNothing();

  console.log("✓ Seed completed successfully!");
  await client.end();
}

seed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});

