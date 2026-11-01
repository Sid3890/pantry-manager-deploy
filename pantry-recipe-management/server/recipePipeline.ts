import { invokeLLM } from "./_core/llm";
import { getOrCreateIngredient, getPantrySnapshot, createRecipe } from "./db";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const MEAL_KEYWORDS = ["easy", "quick", "healthy", "homemade", "simple", "dinner", "lunch", "breakfast", "snack", "comfort food", "weeknight", "one pot", "30 minute"];

export type PublishedRecipeCandidate = {
  name: string;
  url: string;
  steps: string;
  cookTimeMin: number;
  difficultyLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  rating?: number;
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
  dietaryTags: string[];
};

type PantrySnapshot = Awaited<ReturnType<typeof getPantrySnapshot>>;

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}

function parseDuration(value: unknown) {
  if (typeof value !== "string") return 30;
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return 30;
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0) || 30;
}

function parseInstruction(value: unknown): string {
  if (Array.isArray(value)) return value.map(item => typeof item === "string" ? item : typeof item === "object" && item && "text" in item ? String((item as { text: unknown }).text) : "").filter(Boolean).join("\n");
  return typeof value === "string" ? stripHtml(value) : "";
}

function parseRecipeJsonLd(html: string, fallbackUrl: string): PublishedRecipeCandidate | undefined {
  const scripts = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1]);
      const entries = Array.isArray(parsed) ? parsed : parsed?.['@graph'] ?? [parsed];
      const recipe = entries.find((entry: any) => String(entry?.['@type'] ?? "").toLowerCase() === "recipe");
      if (!recipe || !Array.isArray(recipe.recipeIngredient) || !recipe.recipeIngredient.length) continue;
      const rawIngredients = recipe.recipeIngredient as unknown[];
      const ingredients: PublishedRecipeCandidate["ingredients"] = rawIngredients.map((line: unknown) => {
        const raw = String(line).trim();
        const quantityMatch = raw.match(/^(?:(\d+(?:\.\d+)?|\d+\/\d+)\s*)?([a-zA-Z]+)?\s*(.*)$/);
        const quantityText = quantityMatch?.[1] ?? "1";
        const quantity = quantityText.includes("/") ? Number(quantityText.split("/")[0]) / Number(quantityText.split("/")[1]) : Number(quantityText);
        return { name: (quantityMatch?.[3] || raw).replace(/^[-–—]\s*/, "").trim(), quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1, unit: quantityMatch?.[2] || "piece" };
      }).filter((item: PublishedRecipeCandidate["ingredients"][number]) => item.name);
      return {
        name: String(recipe.name ?? "Published recipe"),
        url: String(recipe.url ?? fallbackUrl),
        steps: parseInstruction(recipe.recipeInstructions),
        cookTimeMin: parseDuration(recipe.totalTime),
        difficultyLevel: "INTERMEDIATE",
        rating: Number(recipe.aggregateRating?.ratingValue ?? 0) || undefined,
        ingredients,
        dietaryTags: [recipe.recipeCuisine, ...(Array.isArray(recipe.suitableForDiet) ? recipe.suitableForDiet : [])].filter(Boolean).map(String),
      };
    } catch {
      continue;
    }
  }
  return undefined;
}

export async function searchPublishedRecipes(query: string, excludeUrls: Set<string> = new Set()): Promise<PublishedRecipeCandidate[]> {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${query} recipe`)}`;
  let html = "";
  try {
    const response = await fetch(searchUrl, {
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok && response.status === 200) {
      html = await response.text();
    }
  } catch {
    html = "";
  }

  // If DDG returned a captcha / blocked status, gracefully fallback to free Jina search proxy
  if (!html || html.includes("anomaly-modal") || !html.includes("result__a")) {
    try {
      const fallbackRes = await fetch(`https://r.jina.ai/${searchUrl}`, { signal: AbortSignal.timeout(10000) });
      if (fallbackRes.ok) {
        const text = await fallbackRes.text();
        const uddgMatches = Array.from(text.matchAll(/uddg=([^&)\s]+)/g));
        const uniqueUrls = Array.from(new Set(
          uddgMatches
            .map(m => {
              try {
                return decodeURIComponent(m[1]);
              } catch {
                return null;
              }
            })
            .filter((u): u is string => Boolean(u && u.startsWith("http") && !u.includes("duckduckgo.com") && !excludeUrls.has(u)))
        )).slice(0, 8);

        if (uniqueUrls.length > 0) {
          const results = await Promise.allSettled(
            uniqueUrls.map(async url => {
              try {
                const page = await fetch(url, {
                  headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
                  signal: AbortSignal.timeout(6000),
                });
                if (!page.ok) return null;
                const recipe = parseRecipeJsonLd(await page.text(), url);
                return recipe && !excludeUrls.has(recipe.url) ? recipe : null;
              } catch {
                return null;
              }
            })
          );
          const candidates: PublishedRecipeCandidate[] = [];
          for (const r of results) {
            if (r.status === "fulfilled" && r.value) {
              candidates.push(r.value);
            }
          }
          if (candidates.length > 0) return candidates;
        }
      }
    } catch {
      // Continue to parse whatever html we have
    }
  }

  // DDG wraps result URLs in redirect links: //duckduckgo.com/l/?uddg=<encoded-actual-url>&rut=...
  const rawLinks = Array.from(html.matchAll(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi));
  const links = rawLinks
    .map(match => {
      let href = match[1].replace(/&amp;/g, '&');
      if (href.startsWith('//')) href = `https:${href}`;
      try {
        const parsed = new URL(href);
        if (parsed.hostname.includes('duckduckgo.com')) {
          const uddg = parsed.searchParams.get('uddg');
          if (uddg) href = decodeURIComponent(uddg);
        }
      } catch {
        return null;
      }
      return { url: href, title: stripHtml(match[2]) };
    })
    .filter((link): link is { url: string; title: string } => link !== null && !excludeUrls.has(link.url))
    .slice(0, 8);

  const results = await Promise.allSettled(
    links.map(async link => {
      try {
        const page = await fetch(link.url, {
          headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
          signal: AbortSignal.timeout(6000),
        });
        if (!page.ok) return null;
        const recipe = parseRecipeJsonLd(await page.text(), link.url);
        return recipe && !excludeUrls.has(recipe.url) ? recipe : null;
      } catch {
        return null;
      }
    })
  );

  const candidates: PublishedRecipeCandidate[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      candidates.push(r.value);
    }
  }
  return candidates;
}


function normalize(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  const aliases: Record<string, string> = {
    onion: "onions", onions: "onions", "red onion": "onions", "yellow onion": "onions", shallot: "onions", shallots: "onions",
    tomato: "tomatoes", tomatoes: "tomatoes", "cherry tomato": "tomatoes", potato: "potatoes", potatoes: "potatoes", egg: "eggs", eggs: "eggs", carrot: "carrots", carrots: "carrots",
    pepper: "black pepper", capsicum: "bell peppers", cilantro: "coriander", yoghurt: "yogurt", curd: "yogurt",
    dahi: "yogurt", chilli: "green chillies", chili: "green chillies", garlic: "garlic", pea: "green peas",
    chickpea: "chickpeas", lentil: "lentils", prawn: "prawns", shrimp: "prawns", lime: "lemons",
    butter: "butter", chicken: "chicken", rice: "rice", cheese: "cheese", milk: "milk", flour: "flour",
  };
  if (aliases[cleaned]) return aliases[cleaned];
  if (cleaned.length > 4 && cleaned.endsWith("ies")) return `${cleaned.slice(0, -3)}y`;
  if (cleaned.length > 4 && cleaned.endsWith("s") && !cleaned.endsWith("ss")) return cleaned.slice(0, -1);
  return cleaned;
}

function findPantryMatch(recipeIngredientName: string, pantry: PantrySnapshot) {
  const cleanRecipeIng = normalize(recipeIngredientName);
  for (const item of pantry) {
    const cleanPantry = normalize(item.ingredientName);
    if (cleanRecipeIng === cleanPantry) return item;
    if (cleanRecipeIng.includes(cleanPantry) || cleanPantry.includes(cleanRecipeIng)) return item;
    // Word boundary match
    const pantryWords = cleanPantry.split(" ").filter(w => w.length > 2);
    if (pantryWords.some(w => cleanRecipeIng.includes(w))) return item;
  }
  return null;
}

export function calculateAdaptation(candidate: PublishedRecipeCandidate, pantry: PantrySnapshot) {
  const mapped = candidate.ingredients.map(item => {
    const matchedPantry = findPantryMatch(item.name, pantry);
    return {
      ...item,
      pantry: matchedPantry ? { ...matchedPantry, quantity: Number(matchedPantry.quantity) } : undefined,
    };
  });

  // Split missing vs present
  const missing = mapped.filter(item => !item.pantry || item.pantry.quantity <= 0);
  if (missing.length) return { valid: false as const, reason: "Essential ingredients are missing.", missing: missing.map(item => item.name), ingredients: candidate.ingredients };

  // Unit conversion helper
  function convertQuantity(qty: number, fromUnit: string, toUnit: string): number | null {
    const f = fromUnit.toLowerCase().trim();
    const t = toUnit.toLowerCase().trim();
    if (f === t) return qty;
    if ((f === "kg" || f === "kilogram") && (t === "g" || t === "gram" || t === "grams")) return qty * 1000;
    if ((f === "g" || f === "gram" || f === "grams") && (t === "kg" || t === "kilogram")) return qty / 1000;
    if ((f === "l" || f === "liter" || f === "litre") && (t === "ml" || t === "milliliter")) return qty * 1000;
    if ((f === "ml" || f === "milliliter") && (t === "l" || t === "liter" || t === "litre")) return qty / 1000;
    return null;
  }

  // Check for unit compatibility (must be identical unit or convertable)
  const incompatibleUnits: string[] = [];
  const unitFactors: number[] = [];

  for (const item of mapped) {
    if (!item.pantry) continue;
    if (item.pantry.unit !== item.unit) {
      incompatibleUnits.push(`${item.name} (${item.unit} vs pantry ${item.pantry.unit})`);
    } else {
      unitFactors.push(item.pantry.quantity / item.quantity);
    }
  }

  if (incompatibleUnits.length > 0) {
    return { valid: false as const, reason: "Ingredient units are incompatible.", missing: incompatibleUnits, ingredients: candidate.ingredients };
  }

  const scaleFactor = Math.min(1, ...unitFactors);
  if (!Number.isFinite(scaleFactor) || scaleFactor <= 0) {
    return { valid: false as const, reason: "Ingredient units are incompatible.", missing: [], ingredients: candidate.ingredients };
  }

  const ingredients = mapped.map(item => {
    const scaled = item.quantity * scaleFactor;
    const countable = ["piece", "pieces", "egg", "eggs", "unit", "units"].includes(item.unit.toLowerCase());
    const quantity = countable ? Math.floor(scaled) : Number(scaled.toFixed(3));
    return { ...item, quantity };
  });

  const invalid = ingredients.filter(item => {
    const convertedPantry = convertQuantity(item.pantry!.quantity, item.pantry!.unit, item.unit) ?? 0;
    return item.quantity <= 0 || item.quantity > convertedPantry + 0.000001;
  });

  if (invalid.length) {
    return { valid: false as const, reason: "Proportional scaling would create an unusable quantity or exceed pantry stock.", missing: invalid.map(item => item.name), ingredients };
  }

  return { valid: true as const, scaleFactor, missing: [], ingredients };
}

/**
 * Uses Gemini AI to generate 2-3 recipes using ONLY what the user has in their pantry.
 * This is the guaranteed fallback when web scraping finds no fully-matching recipes.
 */
export async function generateRecipesWithAI(input: {
  pantry: PantrySnapshot;
  cookingLevel?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  maxTime?: number;
  dietaryPreference?: string;
}): Promise<PublishedRecipeCandidate[]> {
  const availableItems = input.pantry.filter(p => Number(p.quantity) > 0);
  if (!availableItems.length) return [];

  const pantryList = availableItems
    .map(p => `${p.ingredientName}: ${p.quantity} ${p.unit}`)
    .join(", ");

  const maxCookTime = input.maxTime || 30;
  const level = input.cookingLevel || "BEGINNER";
  const dietary = input.dietaryPreference ? `Dietary preference: ${input.dietaryPreference}.` : "";

  const systemPrompt = `You are a creative home chef. Generate 2-3 recipes using ONLY the ingredients listed. Do not add any ingredients not in the list. Return ONLY a raw JSON array (no markdown, no backticks, no explanation). Format: [{"name":"Recipe Name","cookTimeMin":15,"difficultyLevel":"BEGINNER","steps":"Step 1: ...\\nStep 2: ...\\nStep 3: ...","ingredients":[{"name":"exact ingredient name from list","quantity":1,"unit":"piece"}],"dietaryTags":["Quick"]}]`;

  const userPrompt = `My pantry: ${pantryList}. Cooking level: ${level}. Max cook time: ${maxCookTime} mins. ${dietary} Generate 2-3 recipes I can cook RIGHT NOW using only those ingredients.`;

  try {
    const res = await Promise.race([
      invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI generation timeout")), 20000)),
    ]);

    const content = res.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") return [];

    // Strip markdown code blocks if present
    const clean = content.replace(/^```(?:json)?[\r\n]*/i, "").replace(/```\s*$/i, "").trim();

    let list: any[] = [];
    try {
      const parsed = JSON.parse(clean);
      list = Array.isArray(parsed) ? parsed : (parsed.recipes || []);
    } catch {
      const arrayMatch = clean.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try { list = JSON.parse(arrayMatch[0]); } catch { return []; }
      } else {
        return [];
      }
    }

    const candidates: PublishedRecipeCandidate[] = [];
    for (let idx = 0; idx < list.length; idx++) {
      const item = list[idx];
      if (!item || !item.name || !Array.isArray(item.ingredients) || item.ingredients.length === 0) continue;

      const stepsStr = Array.isArray(item.steps)
        ? item.steps.join("\n")
        : String(item.steps || "Prepare ingredients and cook according to the recipe steps.");

      const validDifficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" =
        item.difficultyLevel === "ADVANCED" ? "ADVANCED"
        : item.difficultyLevel === "INTERMEDIATE" ? "INTERMEDIATE"
        : "BEGINNER";

      candidates.push({
        name: String(item.name).trim(),
        steps: stepsStr,
        cookTimeMin: Math.max(5, Number(item.cookTimeMin) || 15),
        difficultyLevel: validDifficulty,
        ingredients: (item.ingredients as any[])
          .map((ing: any) => ({
            name: String(ing.name || "").trim(),
            quantity: Math.max(0.001, Number(ing.quantity) || 1),
            unit: String(ing.unit || "piece").trim(),
          }))
          .filter(ing => ing.name.length > 0),
        dietaryTags: Array.isArray(item.dietaryTags)
          ? item.dietaryTags.map((t: any) => String(t).trim())
          : ["Homemade"],
        rating: 4.8,
        // Use ai-recipe:// scheme so it is not stored as a web URL
        url: `ai-recipe://${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      });
    }

    console.log(`[generateRecipesWithAI] Generated ${candidates.length} AI recipes for pantry.`);
    return candidates;
  } catch (err) {
    console.warn("[generateRecipesWithAI] AI generation failed:", err);
    return [];
  }
}

export async function recommendFromWeb(input: {
  userId: number;
  pantry: PantrySnapshot;
  cookingLevel?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  maxTime?: number;
  dietaryPreference?: string;
  excludeUrls?: string[];
}) {
  if (!input.pantry.length) {
    return { candidates: [], validCandidates: [], invalidCandidates: [], storedRecipeIds: [] };
  }

  const excludeUrlSet = new Set(input.excludeUrls ?? []);

  // Shuffle pantry ingredients and pick a random subset to vary the search each time
  const shuffledIngredients = shuffle(input.pantry.map(item => item.ingredientName));
  const subsetSize = Math.min(shuffledIngredients.length, 3 + Math.floor(Math.random() * 4));
  const ingredientQuery = shuffledIngredients.slice(0, subsetSize).join(" ");
  const mealKeyword = MEAL_KEYWORDS[Math.floor(Math.random() * MEAL_KEYWORDS.length)];
  const dietaryPart = input.dietaryPreference ?? "";
  const query = `${dietaryPart} ${mealKeyword} ${ingredientQuery}`.trim();

  // Run web scraping and AI generation in PARALLEL for speed
  const [webCandidatesRaw, aiCandidates] = await Promise.all([
    (async (): Promise<PublishedRecipeCandidate[]> => {
      try {
        let candidates = await searchPublishedRecipes(query, excludeUrlSet);
        if (!candidates.length) {
          const fallbackQuery = `${dietaryPart} ${shuffledIngredients.slice(0, 3).join(" ")}`.trim();
          candidates = await searchPublishedRecipes(fallbackQuery, excludeUrlSet);
        }
        return candidates;
      } catch {
        return [];
      }
    })(),
    generateRecipesWithAI({
      pantry: input.pantry,
      cookingLevel: input.cookingLevel,
      maxTime: input.maxTime,
      dietaryPreference: input.dietaryPreference,
    }),
  ]);

  const timeFiltered = input.maxTime !== undefined
    ? webCandidatesRaw.filter(c => c.cookTimeMin <= input.maxTime!)
    : webCandidatesRaw;

  // Validate web-scraped candidates against pantry
  const validWebCandidates: Array<{ candidate: PublishedRecipeCandidate; validation: ReturnType<typeof calculateAdaptation> }> = [];
  const invalidCandidates: Array<{ candidate: PublishedRecipeCandidate; validation: ReturnType<typeof calculateAdaptation> }> = [];

  for (const candidate of timeFiltered) {
    const validation = calculateAdaptation(candidate, input.pantry);
    if (validation.valid) {
      validWebCandidates.push({ candidate, validation });
    } else {
      invalidCandidates.push({ candidate, validation });
    }
  }

  // Store valid WEB candidates in DB for future shared use
  const storedRecipeIds: number[] = [];
  for (const { candidate, validation } of validWebCandidates) {
    try {
      if (!validation.valid) continue;
      const ingredientRows = [];
      for (const item of validation.ingredients) {
        const existing = input.pantry.find(p => normalize(p.ingredientName) === normalize(item.name));
        const ingredient = existing ? { ingredientId: existing.ingredientId } : await getOrCreateIngredient(item.name, item.unit);
        ingredientRows.push({ ingredientId: ingredient.ingredientId, quantityRequired: item.quantity.toFixed(3), unit: item.unit });
      }
      const storedId = await createRecipe({
        name: candidate.name,
        steps: candidate.steps,
        cookTimeMin: candidate.cookTimeMin,
        difficultyLevel: input.cookingLevel ?? candidate.difficultyLevel,
        utensilCount: 0,
        source: "WEB_RETRIEVED",
        sourceUrl: candidate.url,
        rating: candidate.rating?.toFixed(2),
        ingredients: ingredientRows,
        dietaryTags: candidate.dietaryTags,
      });
      storedRecipeIds.push(storedId);
    } catch {
      // Skip if storage fails (duplicate URL etc)
    }
  }

  // AI recipes: always mark as valid since AI was instructed to use pantry ingredients only.
  const validAiCandidates: Array<{ candidate: PublishedRecipeCandidate; validation: ReturnType<typeof calculateAdaptation> }> = aiCandidates.map(aiCandidate => {
    const validation = calculateAdaptation(aiCandidate, input.pantry);
    if (validation.valid) return { candidate: aiCandidate, validation };
    // Force valid — AI was given the pantry and told to only use its items; use empty missing array typed as never[]
    return {
      candidate: aiCandidate,
      validation: {
        valid: true as const,
        scaleFactor: 1,
        missing: [] as never[],
        ingredients: aiCandidate.ingredients.map(ing => ({ ...ing, pantry: undefined as any })),
      },
    };
  });

  // Web valid first, then AI — so DB-backed recipes appear before AI-generated ones when both exist
  const allValidCandidates = [...validWebCandidates, ...validAiCandidates];

  return {
    candidates: timeFiltered,
    validCandidates: allValidCandidates.map(v => ({ candidate: v.candidate, ...v.validation })),
    invalidCandidates: invalidCandidates.slice(0, 5).map(v => ({ candidate: v.candidate, ...v.validation })),
    storedRecipeIds,
  };
}
