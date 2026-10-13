import { invokeLLM } from "./_core/llm";
import { getOrCreateIngredient, getPantrySnapshot, createRecipe } from "./db";

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

async function searchPublishedRecipes(query: string): Promise<PublishedRecipeCandidate[]> {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${query} recipe`)}`;
  const response = await fetch(searchUrl, { headers: { "user-agent": "PantryRecipeManagement/1.0" } });
  if (!response.ok) return [];
  const html = await response.text();
  const links = Array.from(html.matchAll(/<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))
    .slice(0, 6)
    .map(match => ({ url: match[1], title: stripHtml(match[2]) }));
  const candidates: PublishedRecipeCandidate[] = [];
  for (const link of links) {
    try {
      const page = await fetch(link.url, { headers: { "user-agent": "PantryRecipeManagement/1.0" } });
      if (!page.ok) continue;
      const recipe = parseRecipeJsonLd(await page.text(), link.url);
      if (recipe) candidates.push(recipe);
    } catch {
      continue;
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
  };
  if (aliases[cleaned]) return aliases[cleaned];
  if (cleaned.length > 4 && cleaned.endsWith("ies")) return `${cleaned.slice(0, -3)}y`;
  if (cleaned.length > 4 && cleaned.endsWith("s") && !cleaned.endsWith("ss")) return cleaned.slice(0, -1);
  return cleaned;
}

export function calculateAdaptation(candidate: PublishedRecipeCandidate, pantry: PantrySnapshot) {
  const pantryByName = new Map(pantry.map(item => [normalize(item.ingredientName), { ...item, quantity: Number(item.quantity) }]));
  const mapped = candidate.ingredients.map(item => ({ ...item, pantry: pantryByName.get(normalize(item.name)) }));
  const missing = mapped.filter(item => !item.pantry || item.pantry.quantity <= 0);
  if (missing.length) return { valid: false as const, reason: "Essential ingredients are missing.", missing: missing.map(item => item.name), ingredients: candidate.ingredients };
  const factors = mapped.map(item => item.pantry!.unit === item.unit ? item.pantry!.quantity / item.quantity : 0);
  const scaleFactor = Math.min(1, ...factors);
  if (!Number.isFinite(scaleFactor) || scaleFactor <= 0) return { valid: false as const, reason: "Ingredient units are incompatible with the canonical pantry units.", missing: [], ingredients: candidate.ingredients };
  const ingredients = mapped.map(item => {
    const scaled = item.quantity * scaleFactor;
    const countable = ["piece", "pieces", "egg", "eggs", "unit", "units"].includes(item.unit.toLowerCase());
    const quantity = countable ? Math.floor(scaled) : Number(scaled.toFixed(3));
    return { ...item, quantity };
  });
  const invalid = ingredients.filter(item => item.quantity <= 0 || !item.pantry || item.quantity > item.pantry.quantity + 0.000001);
  if (invalid.length) return { valid: false as const, reason: "Proportional scaling would create an unusable quantity or exceed pantry stock.", missing: invalid.map(item => item.name), ingredients };
  return { valid: true as const, scaleFactor, missing: [], ingredients };
}

export async function recommendFromWeb(input: {
  userId: number;
  pantry: PantrySnapshot;
  cookingLevel?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  maxTime?: number;
  dietaryPreference?: string;
}) {
  const ingredientQuery = input.pantry.map(item => item.ingredientName).slice(0, 8).join(" ");
  if (!ingredientQuery) return { candidates: [], selected: null, storedRecipeId: null };
  const candidates = await searchPublishedRecipes(`${input.dietaryPreference ?? ""} ${ingredientQuery}`.trim());
  const timeFiltered = input.maxTime !== undefined ? candidates.filter(candidate => candidate.cookTimeMin <= input.maxTime!) : candidates;
  if (!timeFiltered.length) return { candidates: [], selected: null, storedRecipeId: null };

  let selectedIndex = 0;
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You select among real published recipe candidates. Never invent a recipe or ingredient. Return only valid JSON." },
        { role: "user", content: JSON.stringify({ pantry: input.pantry, preferences: { cookingLevel: input.cookingLevel, maxTime: input.maxTime, dietaryPreference: input.dietaryPreference }, candidates: timeFiltered.map((candidate, index) => ({ index, name: candidate.name, url: candidate.url, ingredients: candidate.ingredients, cookTimeMin: candidate.cookTimeMin, difficultyLevel: candidate.difficultyLevel, rating: candidate.rating, dietaryTags: candidate.dietaryTags })) }) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "recipe_selection",
          strict: true,
          schema: {
            type: "object",
            properties: { selectedIndex: { type: "integer" }, rationale: { type: "string" }, canScale: { type: "boolean" } },
            required: ["selectedIndex", "rationale", "canScale"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = response.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : null;
    if (parsed && Number.isInteger(parsed.selectedIndex) && parsed.selectedIndex >= 0 && parsed.selectedIndex < timeFiltered.length) selectedIndex = parsed.selectedIndex;
  } catch {
    // Deterministic fallback still only chooses one real retrieved candidate.
  }

  const candidate = timeFiltered[selectedIndex];
  const validation = calculateAdaptation(candidate, input.pantry);
  if (!validation.valid) return { candidates: timeFiltered, selected: { candidate, ...validation }, storedRecipeId: null };

  const ingredientRows = [];
  for (const item of validation.ingredients) {
    const existing = input.pantry.find(pantryItem => normalize(pantryItem.ingredientName) === normalize(item.name));
    const ingredient = existing ? { ingredientId: existing.ingredientId } : await getOrCreateIngredient(item.name, item.unit);
    ingredientRows.push({ ingredientId: ingredient.ingredientId, quantityRequired: item.quantity.toFixed(3), unit: item.unit });
  }
  const storedRecipeId = await createRecipe({
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
  return { candidates: timeFiltered, selected: { candidate, ...validation }, storedRecipeId };
}
