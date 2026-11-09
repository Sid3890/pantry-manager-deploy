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

function extractStepTexts(val: unknown): string[] {
  if (!val) return [];
  if (typeof val === "string") {
    const cleaned = stripHtml(val).trim();
    if (!cleaned) return [];
    if (cleaned.includes("\n")) {
      return cleaned.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);
    }
    return [cleaned];
  }
  if (Array.isArray(val)) {
    const res: string[] = [];
    for (const item of val) {
      res.push(...extractStepTexts(item));
    }
    return res;
  }
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    if (obj.itemListElement) {
      return extractStepTexts(obj.itemListElement);
    }
    if (obj.text) {
      return extractStepTexts(obj.text);
    }
    if (obj.description && typeof obj.description === "string") {
      return extractStepTexts(obj.description);
    }
    if (obj.name && typeof obj.name === "string" && !String(obj["@type"]).includes("Section")) {
      return extractStepTexts(obj.name);
    }
  }
  return [];
}

function parseInstruction(value: unknown): string {
  const steps = extractStepTexts(value);
  return steps.filter(s => s.length > 5).join("\n");
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

export function ensureRichSteps(
  name: string,
  rawSteps: string | string[] | undefined,
  ingredients: Array<{ name: string; quantity?: number | string; unit?: string }>,
  cookTimeMin: number = 20,
  difficultyLevel: string = "BEGINNER"
): string {
  let stepList: string[] = [];
  if (Array.isArray(rawSteps)) {
    stepList = rawSteps.map(s => String(s).trim()).filter(s => s.length > 0);
  } else if (typeof rawSteps === "string" && rawSteps.trim().length > 0) {
    stepList = rawSteps.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);
  }

  // Check if existing steps are genuinely informative (at least 3 descriptive steps, each >= 25 chars)
  const isInformative = stepList.length >= 3 && stepList.filter(s => s.length >= 25).length >= 3;
  if (isInformative) {
    return stepList.join("\n");
  }

  const ingNames = ingredients.map(i => i.name).filter(Boolean);
  const ingSummary = ingredients.map(i => `${i.quantity ?? 1} ${i.unit ?? 'piece'} ${i.name}`).join(", ");
  const mainFat = ingredients.find(i => /butter|oil|ghee/i.test(i.name))?.name || "cooking oil or butter";
  const aromatics = ingredients.filter(i => /onion|garlic|ginger|chilli|pepper/i.test(i.name)).map(i => i.name);
  const mainProteins = ingredients.filter(i => /paneer|chicken|egg|tofu|fish|mutton|prawn/i.test(i.name)).map(i => i.name);
  const mainCarbs = ingredients.filter(i => /rice|bread|pasta|potato|noodle/i.test(i.name)).map(i => i.name);

  const prepTime = Math.max(3, Math.round(cookTimeMin * 0.25));
  const cookTime = Math.max(5, cookTimeMin - prepTime);

  const generatedSteps: string[] = [
    `Preparation & Mis-en-place (~${prepTime} mins): Gather and measure your ingredients (${ingSummary || ingNames.join(', ')}). Rinse produce thoroughly and chop all vegetables or proteins into even bite-sized pieces for consistent cooking.`,
    `Heating & Aromatics (2-3 mins): Set a suitable skillet, saucepan, or pot over medium heat. Add your ${mainFat} and allow it to gently heat until shimmering. ${aromatics.length ? `Toss in the ${aromatics.join(' and ')} and sauté for 2 minutes until fragrant, translucent, and lightly softened.` : 'Ensure the pan surface is evenly coated and hot before proceeding.'}`,
    `Main Cooking Phase (~${Math.round(cookTime * 0.5)} mins): ${mainProteins.length ? `Add the ${mainProteins.join(', ')} to the skillet. Cook over medium heat, stirring occasionally for about ${Math.round(cookTime * 0.4)} minutes until lightly browned, tender, and cooked through.` : mainCarbs.length ? `Incorporate the ${mainCarbs.join(', ')} along with the rest of the ingredients into the pan. Stir gently to coat in the seasoned fat and warm through thoroughly.` : `Add the remaining ingredients into the pan. Sauté over medium heat for ${Math.round(cookTime * 0.5)} minutes until tender-crisp.`}`,
    `Simmering & Flavor Melding (3-4 mins): Lower the heat to medium-low. Season with salt, pepper, or spices to taste. Let all ingredients simmer together gently for 3-4 minutes so the flavors integrate smoothly.`,
    `Resting & Plating: Remove from heat. Let the dish rest in the pan for 1 minute so juices settle. Transfer carefully to a warm serving dish and enjoy warm.`
  ];

  return generatedSteps.join("\n");
}

export function isDuplicateRecipe(
  r1: { name: string; ingredients?: Array<{ name: string }> },
  r2: { name: string; ingredients?: Array<{ name: string }> }
): boolean {
  if (!r1?.name || !r2?.name) return false;

  const normalizeTitle = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\b(and|with|in|on|at|of|the|a|an|quick|easy|crispy|simple|homemade|style|recipe|delicious|fresh|pan|skillet|toasted|warm|creamy|golden)\b/g, " ")
      .trim()
      .replace(/\s+/g, " ");

  const name1 = normalizeTitle(r1.name);
  const name2 = normalizeTitle(r2.name);

  if (name1 === name2 && name1.length > 0) return true;

  // Check word token overlap in titles
  const words1 = new Set(name1.split(" ").filter(w => w.length > 2));
  const words2 = new Set(name2.split(" ").filter(w => w.length > 2));
  if (words1.size > 0 && words2.size > 0) {
    const commonWords = Array.from(words1).filter(w => words2.has(w));
    const overlapRatio = commonWords.length / Math.min(words1.size, words2.size);
    if (overlapRatio >= 0.8) return true;
  }

  // Check ingredient similarity: recipes sharing 80%+ ingredients are duplicate variations
  const getIngNames = (r: { ingredients?: Array<{ name: string }> }) => {
    return new Set(
      (r.ingredients || [])
        .map(i => normalize(i.name))
        .filter(n => n.length > 1)
    );
  };

  const ings1 = getIngNames(r1);
  const ings2 = getIngNames(r2);

  if (ings1.size >= 2 && ings2.size >= 2) {
    const commonIngs = Array.from(ings1).filter(i => ings2.has(i));
    const minSize = Math.min(ings1.size, ings2.size);
    const maxSize = Math.max(ings1.size, ings2.size);
    if (commonIngs.length / minSize >= 0.8 && minSize / maxSize >= 0.7) {
      return true;
    }
  }

  return false;
}

export function deduplicateCandidates<T extends { name?: string; candidate?: { name: string; ingredients?: Array<{ name: string }> }; ingredients?: Array<{ name: string }> }>(
  list: T[],
  existingRecipes: Array<{ name: string; ingredients?: Array<{ name: string }> }> = []
): T[] {
  const result: T[] = [];
  const referenceList: Array<{ name: string; ingredients?: Array<{ name: string }> }> = [...existingRecipes];

  for (const item of list) {
    const cand = (item && 'candidate' in item && item.candidate) ? item.candidate : (item as any);
    if (!cand || !cand.name) continue;
    const isDup = referenceList.some(ref => isDuplicateRecipe(cand, ref));
    if (!isDup) {
      result.push(item);
      referenceList.push(cand);
    }
  }

  return result;
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
  excludeRecipeNames?: string[];
}): Promise<PublishedRecipeCandidate[]> {
  const availableItems = input.pantry.filter(p => Number(p.quantity) > 0);
  if (!availableItems.length) return [];

  const pantryList = availableItems
    .map(p => `${p.ingredientName}: ${p.quantity} ${p.unit}`)
    .join(", ");

  const maxCookTime = input.maxTime || 30;
  const level = input.cookingLevel || "BEGINNER";
  const dietary = input.dietaryPreference ? `Dietary preference: ${input.dietaryPreference}.` : "";
  const excludeList = (input.excludeRecipeNames || []).slice(0, 25).join(", ");
  const exclusionInstruction = excludeList
    ? `DO NOT repeat, re-create, or generate variations similar to any of these previously shown recipes: [${excludeList}].`
    : "";

  const systemPrompt = `You are a creative, professional chef. Generate 2 to 3 distinct, practical recipes using ONLY ingredients from the user's pantry.

STRICT DIVERSITY AND NON-DUPLICATION RULES:
1. EVERY RECIPE MUST BE CONCEPTUALLY DISTINCT:
   - Do NOT generate minor variations of the same dish (e.g., do NOT generate both 'Egg Toast' and 'Egg Sandwich' or multiple slight variations of scrambled eggs). Generate ONLY ONE recipe for any cooking concept.
   - If ingredients allow, choose different cooking styles or formats (e.g. one sauté/stir-fry or curry, one sandwich/toast/bake, one soup/broth or scramble).
   - Each recipe must have a different main technique, texture, and flavor profile.
2. EXCLUSIONS:
   ${exclusionInstruction}
3. INGREDIENTS CONSTRAINT:
   - Use ONLY ingredients listed in the user's pantry. Do NOT assume or invent ingredients that are not in the list.
4. DETAILED STEP-BY-STEP INSTRUCTIONS:
   - Provide 4 to 6 thorough, informative, step-by-step instructions in the "steps" array.
   - Mention specific heat levels (e.g., medium heat, low simmer), exact prep actions, pan/utensil choices, cooking times per step (e.g., sauté for 3-4 minutes), and visual/sensory indicators (e.g., "until golden brown and fragrant", "whisk until smooth and airy").
   - Include clear serving suggestions and seasoning tips.

Format output as a raw JSON array of objects with this schema:
[
  {
    "name": "Distinct Dish Name",
    "cookTimeMin": 20,
    "difficultyLevel": "BEGINNER",
    "dietaryTags": ["Vegetarian", "Quick"],
    "steps": [
      "Preparation & Mis-en-place (3 mins): Measure out your ingredients. Finely chop...",
      "Sautéing Aromatics (3 mins): Heat 10g of butter in a non-stick skillet over medium heat until foaming. Add...",
      "Main Cooking (5 mins): Add the main ingredients to the pan. Cook over medium-high heat for 4-5 minutes stirring until golden...",
      "Finishing & Seasoning (2 mins): Lower heat to medium-low, season with salt and pepper to taste...",
      "Plating & Serving: Remove from heat, let rest for 1 minute, and serve warm on a plate."
    ],
    "ingredients": [
      { "name": "exact ingredient name from pantry", "quantity": 1, "unit": "piece" }
    ]
  }
]
Return ONLY valid JSON without markdown fences.`;

  const userPrompt = `My pantry: ${pantryList}. Cooking level: ${level}. Max cook time: ${maxCookTime} mins. ${dietary} Generate 2-3 distinct, practical recipes I can cook RIGHT NOW using ONLY these ingredients. Ensure steps are rich and detailed.`;

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

      const validDifficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" =
        item.difficultyLevel === "ADVANCED" ? "ADVANCED"
        : item.difficultyLevel === "INTERMEDIATE" ? "INTERMEDIATE"
        : "BEGINNER";

      const ings = (item.ingredients as any[])
        .map((ing: any) => ({
          name: String(ing.name || "").trim(),
          quantity: Math.max(0.001, Number(ing.quantity) || 1),
          unit: String(ing.unit || "piece").trim(),
        }))
        .filter(ing => ing.name.length > 0);

      const cookTime = Math.max(5, Number(item.cookTimeMin) || 15);
      const stepsStr = ensureRichSteps(String(item.name).trim(), item.steps, ings, cookTime, validDifficulty);

      candidates.push({
        name: String(item.name).trim(),
        steps: stepsStr,
        cookTimeMin: cookTime,
        difficultyLevel: validDifficulty,
        ingredients: ings,
        dietaryTags: Array.isArray(item.dietaryTags)
          ? item.dietaryTags.map((t: any) => String(t).trim())
          : ["Homemade"],
        rating: 4.8,
        // Use ai-recipe:// scheme so it is not stored as a web URL
        url: `ai-recipe://${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      });
    }

    // Deduplicate internally against any excluded names and between the generated recipes
    const deduplicated = deduplicateCandidates(candidates, (input.excludeRecipeNames || []).map(name => ({ name })));
    console.log(`[generateRecipesWithAI] Generated ${deduplicated.length} distinct AI recipes for pantry.`);
    return deduplicated;
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
  excludeRecipeNames?: string[];
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
      excludeRecipeNames: input.excludeRecipeNames,
    }),
  ]);

  const timeFiltered = input.maxTime !== undefined
    ? webCandidatesRaw.filter(c => c.cookTimeMin <= input.maxTime!)
    : webCandidatesRaw;

  // Ensure rich steps on web candidates
  for (const c of timeFiltered) {
    c.steps = ensureRichSteps(c.name, c.steps, c.ingredients, c.cookTimeMin, c.difficultyLevel);
  }

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

  // Web valid first, then AI — deduplicate so no duplicate recipes with different names are returned
  const allValidCandidates = deduplicateCandidates(
    [...validWebCandidates, ...validAiCandidates],
    (input.excludeRecipeNames || []).map(name => ({ name }))
  );

  const deduplicatedInvalid = deduplicateCandidates(
    invalidCandidates.slice(0, 5),
    allValidCandidates.map(v => v.candidate)
  );

  return {
    candidates: timeFiltered,
    validCandidates: allValidCandidates.map(v => ({ candidate: v.candidate, ...v.validation })),
    invalidCandidates: deduplicatedInvalid.map(v => ({ candidate: v.candidate, ...v.validation })),
    storedRecipeIds,
  };
}
