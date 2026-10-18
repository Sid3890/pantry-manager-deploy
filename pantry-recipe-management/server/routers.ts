import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addPantryItem,
  createRecipe,
  cookRecipe,
  expirePantry,
  findStoredRecipeCandidates,
  getDashboard,
  getPantry,
  getPantrySnapshot,
  getRecipeDetails,
  getWasteSummary,
  listCategories,
  listIngredients,
  listRecipes,
  listSuppliers,
  getCookingHistory,
  recordPurchase,
  removePantryItem,
  updatePantryItem,
} from "./db";
import { recommendFromWeb } from "./recipePipeline";
import { COOKIE_NAME } from "@shared/const";

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

  suppliers: router({
    list: protectedProcedure.query(() => listSuppliers()),
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
    remove: protectedProcedure.input(z.object({ itemId: z.number().int().positive() })).mutation(({ ctx, input }) => removePantryItem(ctx.user.id, input.itemId)),
    expire: protectedProcedure.input(z.object({ asOf: dateInput }).optional()).mutation(({ ctx, input }) => expirePantry(ctx.user.id, input?.asOf ? new Date(`${input.asOf}T23:59:59.999Z`) : new Date())),
  }),

  purchases: router({
    record: protectedProcedure.input(z.object({
      ingredientId: z.number().int().positive(),
      supId: z.number().int().positive().optional(),
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
      const stored = await findStoredRecipeCandidates(ctx.user.id, { maxTime: input.maxTime, difficulty: input.cookingLevel });
      const excludeIds = new Set(input.excludeRecipeIds ?? []);

      // Shuffle DB results so users see variety, then separate by availability tier
      const shuffled = stored.filter(r => !excludeIds.has(r.recipeId));
      const fullyAvailable = shuffled.filter(r => r.availabilityPercent === 100);
      const almostAvailable = shuffled.filter(r => r.availabilityPercent >= 50 && r.availabilityPercent < 100);

      // Fisher-Yates shuffle for DB results
      const shuffleArr = <T>(a: T[]): T[] => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
      const dbCandidates = [...shuffleArr(fullyAvailable).slice(0, 6), ...shuffleArr(almostAvailable).slice(0, 4)];

      // If we have 5+ fully-available DB recipes, return them directly without hitting the web
      if (fullyAvailable.length >= 5) {
        return { source: "DATABASE" as const, candidates: dbCandidates, storedRecipeId: null };
      }

      // Otherwise, supplement with web-retrieved recipes
      const dbPantry = await getPantrySnapshot(ctx.user.id);
      const pantry = dbPantry.length > 0 ? dbPantry : (input.pantryItems?.map((p, idx) => ({
        ingredientId: p.ingredientId ?? (idx + 1),
        ingredientName: p.ingredientName,
        unit: p.unit,
        quantity: p.quantity,
        nearestExpiry: null,
      })) ?? []);

      // Skip web search if pantry is empty — no point searching
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

      // Merge DB + web candidates into unified response
      return {
        source: "MIXED" as const,
        candidates: dbCandidates,
        webCandidates: web.validCandidates ?? [],
        webInvalid: web.invalidCandidates ?? [],
        storedRecipeIds: web.storedRecipeIds ?? [],
      };
    }),
    cook: protectedProcedure.input(z.object({ recipeId: z.number().int().positive() })).mutation(({ ctx, input }) => cookRecipe(ctx.user.id, input.recipeId)),
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
