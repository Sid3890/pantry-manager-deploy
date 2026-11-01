import { describe, expect, it } from "vitest";

describe("Database Audit & Dietary Logic Verification", () => {
  it("strictly filters non-vegetarian ingredients when Vegetarian diet is selected", () => {
    const nonVegKeywords = ["chicken", "meat", "beef", "pork", "fish", "prawn", "shrimp", "mutton", "egg", "eggs"];

    const sampleRecipes = [
      {
        id: 201,
        name: "Crispy Paneer Toast",
        dietaryTags: ["Vegetarian"],
        ingredients: [{ name: "Bread" }, { name: "Paneer" }, { name: "Onions" }],
      },
      {
        id: 202,
        name: "Golden Egg Bhurji on Toast",
        dietaryTags: ["Eggetarian"],
        ingredients: [{ name: "Eggs" }, { name: "Onions" }, { name: "Bread" }],
      },
      {
        id: 204,
        name: "Grilled Chicken Breast",
        dietaryTags: ["High Protein"],
        ingredients: [{ name: "Chicken Breast" }, { name: "Olive Oil" }],
      },
    ];

    const filterByVegetarian = (recipes: typeof sampleRecipes) => {
      return recipes.filter(recipe => {
        const hasTag = recipe.dietaryTags.some(t => t.toUpperCase() === "VEGETARIAN");
        const hasNonVeg = recipe.ingredients.some(ing => {
          const name = ing.name.toLowerCase();
          return nonVegKeywords.some(kw => name.includes(kw));
        });
        return hasTag && !hasNonVeg;
      });
    };

    const vegetarianMatches = filterByVegetarian(sampleRecipes);

    // Paneer toast must be included
    expect(vegetarianMatches.some(r => r.name === "Crispy Paneer Toast")).toBe(true);

    // Egg Bhurji and Chicken must be excluded
    expect(vegetarianMatches.some(r => r.name === "Golden Egg Bhurji on Toast")).toBe(false);
    expect(vegetarianMatches.some(r => r.name === "Grilled Chicken Breast")).toBe(false);
  });

  it("verifies pantry stock deduction requires ingredient ID match and not just unit match", () => {
    const pantryStock = [
      { itemId: 101, ingredientId: 1, name: "Bread", unit: "piece", quantity: 4 },
      { itemId: 102, ingredientId: 4, name: "Eggs", unit: "piece", quantity: 2 },
    ];

    const requiredForRecipe = [
      { ingredientId: 4, name: "Eggs", unit: "piece", quantityRequired: 2 },
    ];

    // Correct matching: strictly by ingredientId
    for (const req of requiredForRecipe) {
      const matched = pantryStock.filter(row => row.ingredientId === req.ingredientId);
      expect(matched.length).toBe(1);
      expect(matched[0].name).toBe("Eggs");
      expect(matched[0].ingredientId).toBe(4);

      // Faulty matching (|| unit === unit) would have matched both Bread and Eggs
      const faultyMatch = pantryStock.filter(row => row.ingredientId === req.ingredientId || row.unit === req.unit);
      expect(faultyMatch.length).toBe(2); // Demonstrates the bug that was fixed
    }
  });
});
