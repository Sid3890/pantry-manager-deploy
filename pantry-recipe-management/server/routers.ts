import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import {
  addPantryItem,
  createRecipe,
  createUserWithPassword,
  cookRecipe,
  expirePantry,
  findStoredRecipeCandidates,
  getDashboard,
  getPantry,
  getPantrySnapshot,
  getOrCreateIngredient,
  getRecipeDetails,
  getUserByEmail,
  getUserByOpenId,
  getWasteSummary,
  listCategories,
  listIngredients,
  listRecipes,
  getCookingHistory,
  recordPurchase,
  removePantryItem,
  updatePantryItem,
  upsertUser,
} from "./db";
import { recommendFromWeb, generateRecipesWithAI } from "./recipePipeline";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const difficulty = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional();
const toDate = (value?: string) => value ? new Date(`${value}T00:00:00.000Z`) : undefined;

function ensurePositive(value: string, label: string) {
  if (Number(value) <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: `${label} must be greater than zero` });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure.input(z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email address"),
      password: z.string().min(4, "Password must be at least 4 characters"),
      cookingLevel: difficulty.default("BEGINNER"),
    })).mutation(async ({ ctx, input }) => {
      const passwordHash = await bcrypt.hash(input.password, 10);
      try {
        const user = await createUserWithPassword({
          name: input.name,
          email: input.email,
          passwordHash,
          cookingLevel: input.cookingLevel,
        });

        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || input.name, expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return {
          user_id: user.id,
          name: user.name,
          email: user.email,
          cooking_level: user.cookingLevel,
        };
      } catch (err: any) {
        throw new TRPCError({
          code: "CONFLICT",
          message: err.message || "An account with this email already exists",
        });
      }
    }),
    login: publicProcedure.input(z.object({
      email: z.string().email("Invalid email address"),
      password: z.string().min(1, "Password is required"),
    })).mutation(async ({ ctx, input }) => {
      const user = await getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const isMatch = await bcrypt.compare(input.password, user.passwordHash);
      if (!isMatch) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      await upsertUser({ openId: user.openId, lastSignedIn: new Date() });
      const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "", expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return {
        user_id: user.id,
        name: user.name,
        email: user.email,
        cooking_level: user.cookingLevel,
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  categories: router({
    list: protectedProcedure.query(() => listCategories()),
  }),

  ingredients: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional() }).optional()).query(({ input }) => listIngredients(input?.search)),
  }),

  pantry: router({
    list: protectedProcedure.query(({ ctx }) => getPantry(ctx.user.id)),
    snapshot: protectedProcedure.query(({ ctx }) => getPantrySnapshot(ctx.user.id)),
    add: protectedProcedure.input(z.object({
      ingredientId: z.number().int().positive(),
      quantity: z.string().refine(value => Number(value) > 0, "Quantity must be greater than zero"),
      unit: z.string().min(1).max(32),
      expiryDate: dateInput,
      purchaseId: z.number().int().positive().optional(),
    })).mutation(({ ctx, input }) => addPantryItem({ ...input, userId: ctx.user.id, expiryDate: toDate(input.expiryDate) })),
    update: protectedProcedure.input(z.object({
      itemId: z.number().int().positive(),
      quantity: z.string().refine(value => Number(value) > 0, "Quantity must be greater than zero").optional(),
      unit: z.string().min(1).max(32).optional(),
      expiryDate: dateInput.nullable(),
    })).mutation(({ ctx, input }) => updatePantryItem(ctx.user.id, input.itemId, { quantity: input.quantity, unit: input.unit, expiryDate: input.expiryDate === null ? null : toDate(input.expiryDate) })),
    remove: protectedProcedure.input(z.object({
      itemId: z.number().int().positive(),
      markAsWasted: z.boolean().optional(),
    })).mutation(({ ctx, input }) => removePantryItem(ctx.user.id, input.itemId, Boolean(input.markAsWasted))),
    expire: protectedProcedure.input(z.object({ asOf: dateInput }).optional()).mutation(({ ctx, input }) => expirePantry(ctx.user.id, input?.asOf ? new Date(`${input.asOf}T23:59:59.999Z`) : new Date())),
  }),

  purchases: router({
    record: protectedProcedure.input(z.object({
      ingredientId: z.number().int().positive(),
      supplierName: z.string().max(160).optional(),
      quantityPurchased: z.string().refine(value => Number(value) > 0, "Purchased quantity must be greater than zero"),
      unit: z.string().min(1).max(32),
      totalPrice: z.string().refine(value => Number(value) >= 0, "Total price cannot be negative"),
      expiryDate: dateInput,
    })).mutation(({ ctx, input }) => recordPurchase({ ...input, userId: ctx.user.id, expiryDate: toDate(input.expiryDate) })),
  }),

  recipes: router({
    list: protectedProcedure.input(z.object({ maxTime: z.number().int().positive().optional(), difficulty: difficulty.optional(), tag: z.string().min(1).optional() }).optional()).query(({ input }) => listRecipes(input)),
    details: protectedProcedure.input(z.object({ recipeId: z.number().int().positive() })).query(({ input }) => getRecipeDetails(input.recipeId)),
    create: protectedProcedure.input(z.object({
      name: z.string().min(2).max(240),
      steps: z.string().min(1),
      cookTimeMin: z.number().int().positive(),
      difficultyLevel: difficulty,
      utensilCount: z.number().int().min(0).max(100),
      source: z.enum(["MANUAL", "WEB_RETRIEVED"]).default("MANUAL"),
      sourceUrl: z.string().url().optional(),
      rating: z.string().optional(),
      ingredients: z.array(z.object({ ingredientId: z.number().int().positive(), quantityRequired: z.string().refine(value => Number(value) > 0), unit: z.string().min(1).max(32) })).min(1),
      dietaryTags: z.array(z.string().min(1).max(100)).max(20).optional(),
    })).mutation(({ input }) => createRecipe(input)),
    recommend: protectedProcedure.input(z.object({
      cookingLevel: difficulty.optional(),
      maxTime: z.number().int().positive().optional(),
      dietaryPreference: z.string().max(100).optional(),
      excludeRecipeIds: z.array(z.number().int()).max(50).optional(),
      excludeUrls: z.array(z.string()).max(50).optional(),
      pantryItems: z.array(z.object({
        ingredientId: z.number().int().optional(),
        ingredientName: z.string(),
        unit: z.string().default("piece"),
        quantity: z.union([z.string(), z.number()]).transform(v => String(v)),
      })).optional(),
    })).mutation(async ({ ctx, input }) => {
      // Build pantry: DB first, fall back to client-submitted pantryItems
      const dbPantryEarly = await getPantrySnapshot(ctx.user.id);
      const pantry = dbPantryEarly.length > 0
        ? dbPantryEarly
        : (input.pantryItems?.map((p, idx) => ({
            ingredientId: p.ingredientId ?? (idx + 1),
            ingredientName: p.ingredientName,
            unit: p.unit,
            quantity: p.quantity,
            nearestExpiry: null,
          })) ?? []);

      const stored = await findStoredRecipeCandidates(
        ctx.user.id,
        {
          maxTime: input.maxTime,
          difficulty: input.cookingLevel,
          tag: input.dietaryPreference && input.dietaryPreference !== "ALL" ? input.dietaryPreference : undefined,
        },
        pantry
      );
      const excludeIds = new Set(input.excludeRecipeIds ?? []);

      // If user has excluded recipes from prior views, filter; if all would be filtered out, keep all
      let filteredStored = stored.filter(r => !excludeIds.has(r.recipeId));
      if (filteredStored.length === 0 && stored.length > 0) {
        filteredStored = stored;
      }

      const fullyAvailable = filteredStored.filter(r => r.availabilityPercent === 100);
      const almostAvailable = filteredStored.filter(r => r.availabilityPercent >= 50 && r.availabilityPercent < 100);
      const otherRecipes = filteredStored.filter(r => r.availabilityPercent < 50);

      // Fisher-Yates shuffle for DB results
      const shuffleArr = <T>(a: T[]): T[] => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
      const dbCandidates = [
        ...shuffleArr(fullyAvailable),
        ...shuffleArr(almostAvailable),
        ...shuffleArr(otherRecipes)
      ].slice(0, 10);

      // If we have 5+ fully-available DB recipes, return them directly without hitting the web
      if (fullyAvailable.length >= 5) {
        return { source: "DATABASE" as const, candidates: dbCandidates, storedRecipeId: null };
      }

      // Skip web+AI search if pantry is empty
      if (pantry.length === 0) {
        return { source: "DATABASE" as const, candidates: dbCandidates, storedRecipeId: null };
      }

      const existingUrls = stored.filter(r => r.sourceUrl).map(r => r.sourceUrl!);
      const web = await recommendFromWeb({
        userId: ctx.user.id,
        pantry,
        cookingLevel: input.cookingLevel,
        maxTime: input.maxTime,
        dietaryPreference: input.dietaryPreference,
        excludeUrls: [...(input.excludeUrls ?? []), ...existingUrls],
      });

      // Merge DB + web/AI candidates into unified response
      return {
        source: "MIXED" as const,
        candidates: dbCandidates,
        webCandidates: web.validCandidates ?? [],
        webInvalid: web.invalidCandidates ?? [],
        storedRecipeIds: web.storedRecipeIds ?? [],
      };
    }),
    cook: protectedProcedure.input(z.object({ recipeId: z.number().int().positive() })).mutation(({ ctx, input }) => cookRecipe(ctx.user.id, input.recipeId)),

    // cookFromWeb: Called when a user cooks an AI-generated or web-retrieved recipe (no DB id yet).
    // It first persists the recipe to the database, then deducts pantry stock.
    cookFromWeb: protectedProcedure.input(z.object({
      name: z.string().min(2).max(240),
      steps: z.string().min(1),
      cookTimeMin: z.number().int().positive(),
      difficultyLevel: difficulty,
      source: z.enum(["MANUAL", "WEB_RETRIEVED"]).default("WEB_RETRIEVED"),
      sourceUrl: z.string().optional(),
      rating: z.string().optional(),
      dietaryTags: z.array(z.string().min(1).max(100)).max(20).optional(),
      ingredients: z.array(z.object({
        name: z.string().min(1).max(200),
        quantity: z.number().positive(),
        unit: z.string().min(1).max(32),
      })).min(1),
    })).mutation(async ({ ctx, input }) => {
      // 1. Resolve or create each ingredient in the DB
      const ingredientRows: Array<{ ingredientId: number; quantityRequired: string; unit: string }> = [];
      for (const ing of input.ingredients) {
        const dbIng = await getOrCreateIngredient(ing.name, ing.unit);
        ingredientRows.push({
          ingredientId: dbIng.ingredientId,
          quantityRequired: ing.quantity.toFixed(3),
          unit: ing.unit,
        });
      }

      // 2. Persist recipe to DB (deduplicates on sourceUrl if provided)
      const recipeId = await createRecipe({
        name: input.name,
        steps: input.steps,
        cookTimeMin: input.cookTimeMin,
        difficultyLevel: input.difficultyLevel,
        utensilCount: 0,
        source: input.source,
        sourceUrl: input.sourceUrl,
        rating: input.rating,
        ingredients: ingredientRows,
        dietaryTags: input.dietaryTags,
      });

      // 3. Deduct pantry stock (same as regular cookRecipe)
      return cookRecipe(ctx.user.id, recipeId);
    }),
  }),

  cooking: router({
    history: protectedProcedure.input(z.object({ limit: z.number().int().positive().max(100).optional() }).optional()).query(({ ctx, input }) => getCookingHistory(ctx.user.id, input?.limit ?? 30)),
  }),

  reports: router({
    waste: protectedProcedure.input(z.object({ from: dateInput, to: dateInput }).optional()).query(({ ctx, input }) => getWasteSummary(ctx.user.id, input?.from, input?.to)),
    dashboard: protectedProcedure.query(({ ctx }) => getDashboard(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
