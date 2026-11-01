import { and, asc, desc, eq, gte, lte, SQL, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  categories,
  cookingLog,
  dietaryTags,
  ingredients,
  InsertUser,
  pantryItems,
  purchaseLog,
  recipeIngredients,
  recipes,
  suppliers,
  users,
  wasteLog,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

export async function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[Database] Critical: DATABASE_URL is not configured in production environment.");
    }
    return null;
  }

  if (!_db) {
    try {
      // Connect to PostgreSQL (Supabase pooler / direct)
      // SSL mode is enabled by default for cloud hosts (Supabase requires SSL)
      const isLocal = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

      try {
        const parsed = new URL(databaseUrl.replace(/^postgresql:\/\//i, "http://"));
        console.log(`[Database] Initializing PostgreSQL connection to host='${parsed.hostname}', port='${parsed.port || 5432}', db='${parsed.pathname.replace(/^\//, '')}', ssl=${!isLocal}`);
      } catch {}

      _client = postgres(databaseUrl, {
        max: process.env.NODE_ENV === "production" ? 10 : 5,
        idle_timeout: 20,
        connect_timeout: 15,
        ssl: isLocal ? false : "require",
        prepare: false, // Recommended for Supabase transaction pooler (port 6543)
      });
      _db = drizzle(_client);
      // Synchronize primary key sequences asynchronously on connection
      syncDatabaseSequences().catch(err => console.warn('[Database] Initial sequence sync warning:', err));
    } catch (error) {
      console.error("[Database] Failed to connect to PostgreSQL:", error);
      _db = null;
      throw error;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod", "cookingLevel", "passwordHash"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] as never;
      updateSet[field] = user[field];
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  } else {
    values.lastSignedIn = new Date();
    updateSet.lastSignedIn = values.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  // PostgreSQL upsert: ON CONFLICT (openId) DO UPDATE
  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  return result[0];
}

export async function createUserWithPassword(input: {
  name: string;
  email: string;
  passwordHash: string;
  cookingLevel?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");

  const normalizedEmail = input.email.toLowerCase().trim();
  const openId = `local:${normalizedEmail}`;

  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const result = await db
    .insert(users)
    .values({
      openId,
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash: input.passwordHash,
      loginMethod: "local",
      cookingLevel: input.cookingLevel || "BEGINNER",
      role: "user",
    })
    .returning();

  return result[0];
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.label));
}

export async function listIngredients(search?: string) {
  const db = await getDb();
  if (!db) return [];
  const query = db
    .select({
      ingredientId: ingredients.ingredientId,
      name: ingredients.name,
      defaultUnit: ingredients.defaultUnit,
      catId: ingredients.catId,
      category: categories.label,
    })
    .from(ingredients)
    .innerJoin(categories, eq(ingredients.catId, categories.catId));

  if (search?.trim()) {
    // ILIKE is native in PostgreSQL and case-insensitive
    return query
      .where(sql`lower(${ingredients.name}) LIKE ${`%${search.trim().toLowerCase()}%`}`)
      .orderBy(asc(ingredients.name));
  }
  return query.orderBy(asc(ingredients.name));
}

export async function getOrCreateIngredient(name: string, defaultUnit: string, categoryLabel = "Other") {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const normalized = name.trim();
  const existing = await db.select().from(ingredients).where(eq(ingredients.name, normalized)).limit(1);
  if (existing[0]) return existing[0];

  let category = await db.select().from(categories).where(eq(categories.label, categoryLabel)).limit(1);
  if (!category[0]) {
    const createdCat = await db
      .insert(categories)
      .values({ label: categoryLabel, shelfLifeDays: 0 })
      .returning();
    category = createdCat;
  }
  if (!category[0]) throw new Error("Unable to create ingredient category");

  const created = await db
    .insert(ingredients)
    .values({ name: normalized, defaultUnit, catId: category[0].catId })
    .returning();
  if (!created[0]) throw new Error("Unable to create ingredient");
  return created[0];
}

export async function getPantry(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      itemId: pantryItems.itemId,
      userId: pantryItems.userId,
      ingredientId: pantryItems.ingredientId,
      ingredientName: ingredients.name,
      defaultUnit: ingredients.defaultUnit,
      purchaseId: pantryItems.purchaseId,
      quantity: pantryItems.quantity,
      unit: pantryItems.unit,
      expiryDate: pantryItems.expiryDate,
      createdAt: pantryItems.createdAt,
    })
    .from(pantryItems)
    .innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.ingredientId))
    .where(eq(pantryItems.userId, userId))
    .orderBy(asc(pantryItems.expiryDate), asc(ingredients.name));
}

export async function getPantrySnapshot(userId: number) {
  try {
    const db = await getDb();
    if (!db) return [];
    return await db
      .select({
        ingredientId: pantryItems.ingredientId,
        ingredientName: ingredients.name,
        unit: pantryItems.unit,
        quantity: sql<string>`sum(${pantryItems.quantity})`,
        nearestExpiry: sql<string | null>`min(${pantryItems.expiryDate})`,
      })
      .from(pantryItems)
      .innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.ingredientId))
      .where(eq(pantryItems.userId, userId))
      .groupBy(pantryItems.ingredientId, ingredients.name, pantryItems.unit)
      .orderBy(asc(ingredients.name));
  } catch (error) {
    console.warn("[getPantrySnapshot] Database query failed, returning empty:", error);
    return [];
  }
}

export async function addPantryItem(input: {
  userId: number;
  ingredientId: number;
  quantity: string;
  unit: string;
  expiryDate?: Date;
  purchaseId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const result = await db
    .insert(pantryItems)
    .values({
      userId: input.userId,
      ingredientId: input.ingredientId,
      quantity: input.quantity,
      unit: input.unit,
      expiryDate: input.expiryDate ? input.expiryDate.toISOString().slice(0, 10) : undefined,
      purchaseId: input.purchaseId,
    })
    .returning({ itemId: pantryItems.itemId });
  return Number(result[0].itemId);
}

export async function updatePantryItem(
  userId: number,
  itemId: number,
  input: { quantity?: string; unit?: string; expiryDate?: Date | null }
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const updateData: Record<string, unknown> = {};
  if (input.quantity !== undefined) updateData.quantity = input.quantity;
  if (input.unit !== undefined) updateData.unit = input.unit;
  if (input.expiryDate !== undefined) {
    updateData.expiryDate = input.expiryDate ? input.expiryDate.toISOString().slice(0, 10) : null;
  }
  await db
    .update(pantryItems)
    .set(updateData)
    .where(and(eq(pantryItems.itemId, itemId), eq(pantryItems.userId, userId)));
  return getPantry(userId);
}

export async function removePantryItem(userId: number, itemId: number, markAsWasted = false) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db.transaction(async tx => {
    const existing = await tx
      .select()
      .from(pantryItems)
      .where(and(eq(pantryItems.itemId, itemId), eq(pantryItems.userId, userId)))
      .limit(1);
    if (!existing[0]) return { success: true } as const;

    if (markAsWasted) {
      await tx.insert(wasteLog).values({
        userId,
        ingredientId: existing[0].ingredientId,
        quantityWasted: existing[0].quantity,
        unit: existing[0].unit,
        expiredOn: existing[0].expiryDate ?? new Date().toISOString().slice(0, 10),
      });
    }
    await tx.delete(pantryItems).where(eq(pantryItems.itemId, itemId));
    return { success: true } as const;
  });
}

export async function listSuppliers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(suppliers).orderBy(asc(suppliers.name));
}

export async function recordPurchase(input: {
  userId: number;
  ingredientId: number;
  supId?: number;
  quantityPurchased: string;
  unit: string;
  totalPrice: string;
  expiryDate?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db.transaction(async tx => {
    const purchase = await tx
      .insert(purchaseLog)
      .values({
        userId: input.userId,
        ingredientId: input.ingredientId,
        supId: input.supId,
        quantityPurchased: input.quantityPurchased,
        unit: input.unit,
        totalPrice: input.totalPrice,
      })
      .returning({ purchaseId: purchaseLog.purchaseId });
    const purchaseId = Number(purchase[0].purchaseId);
    await tx.insert(pantryItems).values({
      userId: input.userId,
      ingredientId: input.ingredientId,
      purchaseId,
      quantity: input.quantityPurchased,
      unit: input.unit,
      expiryDate: input.expiryDate ? input.expiryDate.toISOString().slice(0, 10) : undefined,
    });
    return { purchaseId };
  });
}

export type RecipeDetails = {
  recipeId: number;
  name: string;
  steps: string;
  cookTimeMin: number;
  difficultyLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  utensilCount: number;
  source: "MANUAL" | "WEB_RETRIEVED";
  sourceUrl: string | null;
  rating: string | null;
  createdAt: Date;
  ingredients: Array<{ ingredientId: number; name: string; quantityRequired: string; unit: string }>;
  dietaryTags: string[];
};

export async function getRecipeDetails(recipeId: number): Promise<RecipeDetails | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const recipe = await db.select().from(recipes).where(eq(recipes.recipeId, recipeId)).limit(1);
  if (!recipe[0]) return undefined;
  const [recipeRows, tags] = await Promise.all([
    db
      .select({
        ingredientId: recipeIngredients.ingredientId,
        name: ingredients.name,
        quantityRequired: recipeIngredients.quantityRequired,
        unit: recipeIngredients.unit,
      })
      .from(recipeIngredients)
      .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.ingredientId))
      .where(eq(recipeIngredients.recipeId, recipeId))
      .orderBy(asc(ingredients.name)),
    db
      .select({ label: dietaryTags.label })
      .from(dietaryTags)
      .where(eq(dietaryTags.recipeId, recipeId))
      .orderBy(asc(dietaryTags.label)),
  ]);
  return { ...recipe[0], ingredients: recipeRows, dietaryTags: tags.map(tag => tag.label) };
}

export async function listRecipes(filters?: {
  maxTime?: number;
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  tag?: string;
}) {
  try {
    const db = await getDb();
    if (!db) return [];
    const conditions = [];
    if (filters?.maxTime !== undefined) conditions.push(lte(recipes.cookTimeMin, filters.maxTime));
    if (filters?.difficulty) conditions.push(eq(recipes.difficultyLevel, filters.difficulty));
    const base = await db
      .select()
      .from(recipes)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(recipes.name));
    const detailed = await Promise.all(base.map(recipe => getRecipeDetails(recipe.recipeId)));
    const filtered = detailed.filter((recipe): recipe is RecipeDetails => Boolean(recipe));
    if (!filters?.tag || filters.tag.toUpperCase() === "ALL") return filtered;
    const tagUpper = filters.tag.trim().toUpperCase();
    return filtered.filter(recipe => {
      const hasTag = recipe.dietaryTags.some(t => t.toUpperCase() === tagUpper || t.toUpperCase().includes(tagUpper));
      if (hasTag) return true;

      // Safe ingredient fallback for Vegetarian filter
      if (tagUpper === "VEGETARIAN") {
        const nonVegKeywords = ["chicken", "meat", "beef", "pork", "fish", "prawn", "shrimp", "mutton", "egg", "eggs"];
        const hasNonVeg = recipe.ingredients.some(ing => {
          const name = ing.name.toLowerCase();
          return nonVegKeywords.some(kw => name.includes(kw));
        });
        return !hasNonVeg;
      }
      return false;
    });
  } catch (error) {
    console.warn("[listRecipes] Database query failed, returning empty:", error);
    return [];
  }
}

export async function createRecipe(input: {
  name: string;
  steps: string;
  cookTimeMin: number;
  difficultyLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  utensilCount: number;
  source: "MANUAL" | "WEB_RETRIEVED";
  sourceUrl?: string;
  rating?: string;
  ingredients: Array<{ ingredientId: number; quantityRequired: string; unit: string }>;
  dietaryTags?: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  if (input.sourceUrl) {
    const existing = await db
      .select({ recipeId: recipes.recipeId })
      .from(recipes)
      .where(eq(recipes.sourceUrl, input.sourceUrl))
      .limit(1);
    if (existing[0]?.recipeId) {
      return existing[0].recipeId;
    }
  }
  return db.transaction(async tx => {
    const inserted = await tx
      .insert(recipes)
      .values({
        name: input.name,
        steps: input.steps,
        cookTimeMin: input.cookTimeMin,
        difficultyLevel: input.difficultyLevel,
        utensilCount: input.utensilCount,
        source: input.source,
        sourceUrl: input.sourceUrl,
        rating: input.rating,
      })
      .returning({ recipeId: recipes.recipeId });
    const recipeId = Number(inserted[0].recipeId);
    if (input.ingredients.length) {
      await tx.insert(recipeIngredients).values(input.ingredients.map(ingredient => ({ ...ingredient, recipeId })));
    }
    if (input.dietaryTags?.length) {
      await tx.insert(dietaryTags).values(input.dietaryTags.map(label => ({ recipeId, label })));
    }
    return recipeId;
  });
}

export async function findStoredRecipeCandidates(
  userId: number,
  filters: { maxTime?: number; difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"; tag?: string },
  customPantry?: Array<{ ingredientId?: number; ingredientName: string; unit: string; quantity: string | number; nearestExpiry?: string | null }>
) {
  try {
    const [pantry, recipeList] = await Promise.all([
      customPantry && customPantry.length > 0 ? Promise.resolve(customPantry) : getPantrySnapshot(userId),
      listRecipes(filters),
    ]);

    // Build lookup maps that check both ingredient id+unit AND name+unit
    const availableByIngredientId = new Map<string, number>();
    const availableByName = new Map<string, number>();
    for (const item of pantry) {
      const unitKey = (item.unit || "piece").toLowerCase().trim();
      const qty = Number(item.quantity) || 0;
      if (item.ingredientId) {
        const idKey = `${item.ingredientId}:${unitKey}`;
        availableByIngredientId.set(idKey, (availableByIngredientId.get(idKey) || 0) + qty);
      }
      const nameKey = `${item.ingredientName.toLowerCase().trim()}:${unitKey}`;
      availableByName.set(nameKey, (availableByName.get(nameKey) || 0) + qty);
    }

    return recipeList
      .map(recipe => {
        const ingredientResults = recipe.ingredients.map(ingredient => {
          const unitKey = ingredient.unit.toLowerCase().trim();
          const idKey = `${ingredient.ingredientId}:${unitKey}`;
          const nameKey = `${ingredient.name.toLowerCase().trim()}:${unitKey}`;
          const available = availableByIngredientId.get(idKey) ?? availableByName.get(nameKey) ?? 0;
          const required = Number(ingredient.quantityRequired);
          return { ...ingredient, available, isAvailable: available >= required };
        });
        const availableCount = ingredientResults.filter(item => item.isAvailable).length;
        const availabilityPercent = ingredientResults.length
          ? Math.round((availableCount / ingredientResults.length) * 100)
          : 0;
        return {
          ...recipe,
          availabilityPercent,
          availabilityStatus:
            availabilityPercent === 100
              ? "FULLY_AVAILABLE"
              : availabilityPercent >= 75
              ? "ALMOST_AVAILABLE"
              : "LOW_AVAILABILITY",
          missingIngredients: ingredientResults
            .filter(item => !item.isAvailable)
            .map(item => ({
              name: item.name,
              required: item.quantityRequired,
              available: item.available,
              unit: item.unit,
            })),
          ingredients: ingredientResults,
        };
      })
      .sort(
        (a, b) =>
          b.availabilityPercent - a.availabilityPercent ||
          Number(b.rating ?? 0) - Number(a.rating ?? 0) ||
          a.cookTimeMin - b.cookTimeMin
      );
  } catch (error) {
    console.warn("[findStoredRecipeCandidates] Database query failed, returning empty:", error);
    return [];
  }
}

export async function cookRecipe(userId: number, recipeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db.transaction(async tx => {
    const recipe = await tx.select().from(recipes).where(eq(recipes.recipeId, recipeId)).limit(1);
    if (!recipe[0]) throw new Error("Recipe not found");
    const required = await tx
      .select({
        ingredientId: recipeIngredients.ingredientId,
        quantityRequired: recipeIngredients.quantityRequired,
        unit: recipeIngredients.unit,
        name: ingredients.name,
      })
      .from(recipeIngredients)
      .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.ingredientId))
      .where(eq(recipeIngredients.recipeId, recipeId));

    const pantry = await tx
      .select()
      .from(pantryItems)
      .where(eq(pantryItems.userId, userId))
      .orderBy(asc(pantryItems.expiryDate), asc(pantryItems.itemId));

    const missing: string[] = [];
    for (const item of required) {
      const available = pantry
        .filter(row => row.ingredientId === item.ingredientId)
        .reduce((sum, row) => sum + Number(row.quantity), 0);
      if (available < Number(item.quantityRequired))
        missing.push(`${item.name} requires ${item.quantityRequired} ${item.unit}, available ${available}`);
    }
    if (missing.length) return { success: false as const, missing };

    for (const item of required) {
      let remaining = Number(item.quantityRequired);
      const rows = pantry.filter(row => row.ingredientId === item.ingredientId);
      for (const row of rows) {
        if (remaining <= 0) break;
        const current = Number(row.quantity);
        const deduction = Math.min(current, remaining);
        const next = current - deduction;
        if (next <= 0.000001) await tx.delete(pantryItems).where(eq(pantryItems.itemId, row.itemId));
        else await tx.update(pantryItems).set({ quantity: next.toFixed(3) }).where(eq(pantryItems.itemId, row.itemId));
        remaining -= deduction;
      }
    }
    await tx.insert(cookingLog).values({ userId, recipeId });
    return { success: true as const, recipeId };
  });
}

export async function expirePantry(userId: number, asOf = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const expiryDateStr = asOf.toISOString().slice(0, 10);
  return db.transaction(async tx => {
    const expired = await tx
      .select()
      .from(pantryItems)
      .where(
        and(
          eq(pantryItems.userId, userId),
          lte(pantryItems.expiryDate, expiryDateStr),
          gte(pantryItems.quantity, "0.001")
        )
      );
    for (const row of expired) {
      await tx.insert(wasteLog).values({
        userId,
        ingredientId: row.ingredientId,
        quantityWasted: row.quantity,
        unit: row.unit,
        expiredOn: row.expiryDate ?? expiryDateStr,
      });
      await tx.delete(pantryItems).where(eq(pantryItems.itemId, row.itemId));
    }
    return { expiredCount: expired.length };
  });
}

export async function getCookingHistory(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      cookId: cookingLog.cookId,
      recipeId: cookingLog.recipeId,
      recipeName: recipes.name,
      cookedAt: cookingLog.cookedAt,
    })
    .from(cookingLog)
    .innerJoin(recipes, eq(cookingLog.recipeId, recipes.recipeId))
    .where(eq(cookingLog.userId, userId))
    .orderBy(desc(cookingLog.cookedAt))
    .limit(limit);
}

export async function getWasteSummary(userId: number, from?: string, to?: string) {
  const db = await getDb();
  if (!db) return { total: 0, byIngredient: [], overTime: [] };
  const conditions: SQL[] = [eq(wasteLog.userId, userId)];
  if (from) conditions.push(gte(wasteLog.expiredOn, from.slice(0, 10)));
  if (to) conditions.push(lte(wasteLog.expiredOn, to.slice(0, 10)));

  // PostgreSQL to_char replaces MySQL date_format
  const periodExpr = sql<string>`to_char(${wasteLog.expiredOn}::date, 'YYYY-MM')`;

  const [totals, byIngredient, overTime] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${wasteLog.quantityWasted}), 0)` })
      .from(wasteLog)
      .where(and(...conditions)),
    db
      .select({
        ingredientId: wasteLog.ingredientId,
        ingredientName: ingredients.name,
        unit: wasteLog.unit,
        quantity: sql<string>`sum(${wasteLog.quantityWasted})`,
      })
      .from(wasteLog)
      .innerJoin(ingredients, eq(wasteLog.ingredientId, ingredients.ingredientId))
      .where(and(...conditions))
      .groupBy(wasteLog.ingredientId, ingredients.name, wasteLog.unit)
      .orderBy(desc(sql`sum(${wasteLog.quantityWasted})`)),
    db
      .select({
        period: periodExpr,
        quantity: sql<string>`sum(${wasteLog.quantityWasted})`,
      })
      .from(wasteLog)
      .where(and(...conditions))
      .groupBy(periodExpr)
      .orderBy(asc(periodExpr)),
  ]);
  return { total: Number(totals[0]?.total ?? 0), byIngredient, overTime };
}

export async function getDashboard(userId: number) {
  const [pantry, history, waste] = await Promise.all([
    getPantry(userId),
    getCookingHistory(userId, 5),
    getWasteSummary(userId),
  ]);
  const todayStr = new Date().toISOString().slice(0, 10);
  const expiringSoon = pantry.filter(item => item.expiryDate && item.expiryDate >= todayStr).slice(0, 5);
  return {
    pantryCount: pantry.length,
    totalTrackedQuantity: pantry.reduce((sum, item) => sum + Number(item.quantity), 0),
    expiringSoon,
    recentCooking: history,
    waste,
  };
}

export async function syncDatabaseSequences(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`
      SELECT setval(pg_get_serial_sequence('categories', 'cat_id'), COALESCE((SELECT MAX(cat_id) FROM categories), 1));
      SELECT setval(pg_get_serial_sequence('ingredients', 'ingredient_id'), COALESCE((SELECT MAX(ingredient_id) FROM ingredients), 1));
      SELECT setval(pg_get_serial_sequence('recipes', 'recipe_id'), COALESCE((SELECT MAX(recipe_id) FROM recipes), 1));
      SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));
      SELECT setval(pg_get_serial_sequence('pantry_items', 'item_id'), COALESCE((SELECT MAX(item_id) FROM pantry_items), 1));
      SELECT setval(pg_get_serial_sequence('purchase_log', 'purchase_id'), COALESCE((SELECT MAX(purchase_id) FROM purchase_log), 1));
      SELECT setval(pg_get_serial_sequence('suppliers', 'sup_id'), COALESCE((SELECT MAX(sup_id) FROM suppliers), 1));
      SELECT setval(pg_get_serial_sequence('recipe_ingredients', 'ri_id'), COALESCE((SELECT MAX(ri_id) FROM recipe_ingredients), 1));
      SELECT setval(pg_get_serial_sequence('cooking_log', 'cook_id'), COALESCE((SELECT MAX(cook_id) FROM cooking_log), 1));
      SELECT setval(pg_get_serial_sequence('dietary_tags', 'tag_id'), COALESCE((SELECT MAX(tag_id) FROM dietary_tags), 1));
      SELECT setval(pg_get_serial_sequence('waste_log', 'waste_id'), COALESCE((SELECT MAX(waste_id) FROM waste_log), 1));
    `);
    console.log("[Database] PostgreSQL primary key sequences verified and synchronized with MAX(id).");
  } catch (error) {
    console.warn("[Database] Sequence synchronization warning:", error);
  }
}
