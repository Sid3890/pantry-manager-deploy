import { describe, expect, it } from "vitest";
import { calculateAdaptation, type PublishedRecipeCandidate } from "./recipePipeline";

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
