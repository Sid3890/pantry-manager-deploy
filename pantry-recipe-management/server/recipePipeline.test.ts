import { describe, expect, it } from "vitest";
import {
  calculateAdaptation,
  type PublishedRecipeCandidate,
  isDuplicateRecipe,
  deduplicateCandidates,
  ensureRichSteps,
} from "./recipePipeline";

const pantry = [
  { ingredientId: 1, ingredientName: "Rice", unit: "g", quantity: "300", nearestExpiry: null },
  { ingredientId: 2, ingredientName: "Paneer", unit: "g", quantity: "150", nearestExpiry: null },
  { ingredientId: 3, ingredientName: "Onion", unit: "piece", quantity: "1", nearestExpiry: null },
] as const;

const candidate: PublishedRecipeCandidate = {
  name: "Paneer Rice",
  url: "https://example.com/paneer-rice",
  steps: "Cook the rice and combine.",
  cookTimeMin: 20,
  difficultyLevel: "BEGINNER",
  rating: 4.7,
  dietaryTags: [],
  ingredients: [
    { name: "Rice", quantity: 500, unit: "g" },
    { name: "Paneer", quantity: 250, unit: "g" },
    { name: "Onion", quantity: 2, unit: "piece" },
  ],
};

describe("recipe quantity validation", () => {
  it("uses the most restrictive factor and floors countable ingredients", () => {
    const result = calculateAdaptation(candidate, pantry);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.scaleFactor).toBe(0.5);
    expect(result.ingredients.map(item => item.quantity)).toEqual([250, 125, 1]);
  });

  it("rejects a recipe with a missing essential ingredient instead of fabricating a substitute", () => {
    const result = calculateAdaptation({ ...candidate, ingredients: [...candidate.ingredients, { name: "Cream", quantity: 200, unit: "ml" }] }, pantry);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.missing).toContain("Cream");
  });

  it("rejects incompatible units rather than treating them as available", () => {
    const result = calculateAdaptation({ ...candidate, ingredients: [{ ...candidate.ingredients[0], unit: "kg" }, ...candidate.ingredients.slice(1)] }, pantry);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.reason).toMatch(/units/i);
  });
});

describe("recipe deduplication", () => {
  it("detects duplicate recipes that have different names but identical/near-identical ingredients", () => {
    const r1 = {
      name: "Crispy Egg Toast",
      ingredients: [
        { name: "Bread" },
        { name: "Eggs" },
        { name: "Butter" },
      ],
    };
    const r2 = {
      name: "Egg and Toast Sandwich",
      ingredients: [
        { name: "Bread" },
        { name: "Eggs" },
        { name: "Butter" },
      ],
    };

    expect(isDuplicateRecipe(r1, r2)).toBe(true);
  });

  it("does not falsely flag genuinely distinct recipes as duplicates", () => {
    const r1 = {
      name: "Garlic Butter Rice",
      ingredients: [
        { name: "Rice" },
        { name: "Garlic" },
        { name: "Butter" },
      ],
    };
    const r2 = {
      name: "Fried Paneer",
      ingredients: [
        { name: "Paneer" },
        { name: "Oil" },
      ],
    };

    expect(isDuplicateRecipe(r1, r2)).toBe(false);
  });

  it("filters out duplicates from candidate lists", () => {
    const candidates = [
      { name: "Cheesy Toast", ingredients: [{ name: "Bread" }, { name: "Cheese" }] },
      { name: "Crispy Cheese on Bread", ingredients: [{ name: "Bread" }, { name: "Cheese" }] },
      { name: "Garlic Rice", ingredients: [{ name: "Rice" }, { name: "Garlic" }] },
    ];

    const deduplicated = deduplicateCandidates(candidates);
    expect(deduplicated).toHaveLength(2);
    expect(deduplicated.map(d => d.name)).toEqual(["Cheesy Toast", "Garlic Rice"]);
  });
});

describe("rich step generation", () => {
  it("enriches recipes that have sparse or missing steps into comprehensive multi-step guides", () => {
    const sparseSteps = "Cook the ingredients.";
    const ingredients = [
      { name: "Eggs", quantity: 2, unit: "piece" },
      { name: "Butter", quantity: 10, unit: "g" },
      { name: "Bread", quantity: 2, unit: "piece" },
    ];

    const enriched = ensureRichSteps("Egg Toast", sparseSteps, ingredients, 15, "BEGINNER");
    const stepLines = enriched.split("\n");

    expect(stepLines.length).toBeGreaterThanOrEqual(4);
    expect(enriched).toMatch(/Preparation|Prep/i);
    expect(enriched).toMatch(/Heat/i);
    expect(enriched).toMatch(/Plating|Serve/i);
  });

  it("preserves already detailed, comprehensive steps", () => {
    const detailed = [
      "Preparation & Mis-en-place (5 mins): Finely dice the onions and crumble the paneer.",
      "Heating Skillet (3 mins): Melt butter in a wide pan over medium heat.",
      "Sautéing (5 mins): Add paneer and cook until golden brown on all sides.",
      "Plating & Serving: Dish onto warm plates and serve hot.",
    ].join("\n");

    const result = ensureRichSteps("Paneer Sauté", detailed, [{ name: "Paneer" }], 15);
    expect(result).toBe(detailed);
  });
});
