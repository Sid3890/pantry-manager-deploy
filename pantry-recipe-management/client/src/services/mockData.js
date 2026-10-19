// Mock seed data matching Oracle Relational Database Schema & System Master Document

export const INITIAL_USER = null;

export const CATEGORIES = [
  { cat_id: 1, label: "Dairy & Eggs", icon: "🥛", shelf_life_days: 10 },
  { cat_id: 2, label: "Produce & Veggies", icon: "🥦", shelf_life_days: 7 },
  { cat_id: 3, label: "Bakery & Breads", icon: "🍞", shelf_life_days: 5 },
  { cat_id: 4, label: "Grains & Pasta", icon: "🌾", shelf_life_days: 180 },
  { cat_id: 5, label: "Oils & Spices", icon: "🧂", shelf_life_days: 365 },
  { cat_id: 6, label: "Proteins & Meats", icon: "🍗", shelf_life_days: 5 }
];

export const INITIAL_PANTRY = [
  {
    item_id: 101,
    ingredient_id: 1,
    name: "Bread",
    category: "Bakery & Breads",
    quantity: 4,
    unit: "piece",
    expiry_date: "2026-09-22", // Expiring soon (2 days left)
    purchase_date: "2026-09-17"
  },
  {
    item_id: 102,
    ingredient_id: 2,
    name: "Paneer",
    category: "Dairy & Eggs",
    quantity: 250,
    unit: "g",
    expiry_date: "2026-09-21", // Expiring tomorrow!
    purchase_date: "2026-09-15"
  },
  {
    item_id: 103,
    ingredient_id: 3,
    name: "Onions",
    category: "Produce & Veggies",
    quantity: 3,
    unit: "piece",
    expiry_date: "2026-10-04", // Fresh
    purchase_date: "2026-09-14"
  },
  {
    item_id: 104,
    ingredient_id: 4,
    name: "Eggs",
    category: "Dairy & Eggs",
    quantity: 6,
    unit: "piece",
    expiry_date: "2026-09-23", // Expiring soon (3 days left)
    purchase_date: "2026-09-16"
  },
  {
    item_id: 105,
    ingredient_id: 5,
    name: "Basmati Rice",
    category: "Grains & Pasta",
    quantity: 500,
    unit: "g",
    expiry_date: "2026-12-31", // Fresh
    purchase_date: "2026-09-01"
  },
  {
    item_id: 106,
    ingredient_id: 6,
    name: "Butter",
    category: "Dairy & Eggs",
    quantity: 50,
    unit: "g",
    expiry_date: "2026-10-15", // Fresh
    purchase_date: "2026-09-10"
  },
  {
    item_id: 107,
    ingredient_id: 7,
    name: "Tomatoes",
    category: "Produce & Veggies",
    quantity: 2,
    unit: "piece",
    expiry_date: "2026-09-20", // Expiring TODAY
    purchase_date: "2026-09-16"
  },
  {
    item_id: 108,
    ingredient_id: 8,
    name: "Baby Spinach",
    category: "Produce & Veggies",
    quantity: 100,
    unit: "g",
    expiry_date: "2026-09-17", // EXPIRED (3 days ago)
    purchase_date: "2026-09-11"
  },
  {
    item_id: 109,
    ingredient_id: 9,
    name: "Olive Oil",
    category: "Oils & Spices",
    quantity: 200,
    unit: "ml",
    expiry_date: "2027-04-10", // Fresh
    purchase_date: "2026-08-20"
  }
];

export const INITIAL_RECIPES = [
  {
    recipe_id: 201,
    name: "Paneer Sandwich",
    tagline: "Crispy toasted sandwich with spiced crushed paneer and onions.",
    cook_time_min: 15,
    difficulty_level: "BEGINNER",
    utensil_count: 2,
    source: "MANUAL", // Primary Oracle DB verified recipe
    source_attribution: "Database Stored Recipe",
    rating: 4.9,
    reviews_count: 142,
    dietary_tags: ["Vegetarian", "Quick Prep", "High Protein"],
    steps: [
      "In a small mixing bowl, gently crumble the fresh paneer.",
      "Finely dice the onion and fold into the paneer with a pinch of salt and pepper.",
      "Butter one side of each bread slice.",
      "Distribute the paneer-onion filling evenly between the slices.",
      "Toast in a hot skillet or sandwich toaster for 3-4 minutes until golden crisp on both sides."
    ],
    ingredients: [
      { ingredient_id: 1, name: "Bread", quantity_required: 2, unit: "piece" },
      { ingredient_id: 2, name: "Paneer", quantity_required: 100, unit: "g" },
      { ingredient_id: 3, name: "Onions", quantity_required: 1, unit: "piece" },
      { ingredient_id: 6, name: "Butter", quantity_required: 10, unit: "g" }
    ]
  },
  {
    recipe_id: 202,
    name: "Golden Egg Bhurji on Toast",
    tagline: "Savory scrambled eggs with sauteed onions and warm toasted bread.",
    cook_time_min: 12,
    difficulty_level: "BEGINNER",
    utensil_count: 2,
    source: "MANUAL", // Primary Oracle DB verified recipe
    source_attribution: "Database Stored Recipe",
    rating: 4.8,
    reviews_count: 98,
    dietary_tags: ["High Protein", "Breakfast Favorite"],
    steps: [
      "Crack 2 eggs into a bowl and whisk lightly with salt.",
      "Heat butter in a non-stick pan over medium heat.",
      "Sauté diced onions until translucent and fragrant (approx. 2 mins).",
      "Pour in whisked eggs, stirring gently to form soft, creamy curds.",
      "Toast bread slices and serve the egg bhurji heaped on top."
    ],
    ingredients: [
      { ingredient_id: 4, name: "Eggs", quantity_required: 2, unit: "piece" },
      { ingredient_id: 3, name: "Onions", quantity_required: 1, unit: "piece" },
      { ingredient_id: 1, name: "Bread", quantity_required: 2, unit: "piece" },
      { ingredient_id: 6, name: "Butter", quantity_required: 10, unit: "g" }
    ]
  },
  {
    recipe_id: 203,
    name: "Fragrant Paneer Rice Skillet",
    tagline: "Aromatic basmati rice tossed with pan-seared paneer cubes and caramelized onions.",
    cook_time_min: 25,
    difficulty_level: "BEGINNER",
    utensil_count: 2,
    source: "WEB_RETRIEVED", // AI Fallback mechanism
    source_attribution: "Discovered via Epicurious — 'Spiced Paneer Rice Bowl'",
    rating: 4.7,
    reviews_count: 64,
    dietary_tags: ["Vegetarian", "Gluten Free", "Comfort Food"],
    ai_adaptation: {
      is_ai_fallback: true,
      original_recipe: "Published Epicurious Recipe (originally 500g Rice, 250g Paneer, 2 Onions)",
      scaling_factor: 0.6,
      scaling_note: "Proportionally scaled to 300g Rice, 150g Paneer, 1 Onion to match your current pantry.",
      oracle_validated: true,
      validation_message: "Verified against Oracle DB inventory limits before recommendation."
    },
    steps: [
      "Rinse basmati rice until water runs clear and cook in salted boiling water until tender.",
      "Cut paneer into bite-sized cubes.",
      "In a wide skillet, heat olive oil and lightly sear paneer cubes until golden edges appear.",
      "Add sliced onions and cook until softened and golden brown.",
      "Fold in the cooked rice gently, season with salt and herbs, and warm through for 2 minutes."
    ],
    ingredients: [
      { ingredient_id: 5, name: "Basmati Rice", quantity_required: 300, unit: "g" },
      { ingredient_id: 2, name: "Paneer", quantity_required: 150, unit: "g" },
      { ingredient_id: 3, name: "Onions", quantity_required: 1, unit: "piece" },
      { ingredient_id: 9, name: "Olive Oil", quantity_required: 15, unit: "ml" }
    ]
  },
  {
    recipe_id: 204,
    name: "Classic Cheese & Tomato Toast",
    tagline: "Warm toasted bread with sliced tomatoes and melted cheddar.",
    cook_time_min: 10,
    difficulty_level: "BEGINNER",
    utensil_count: 1,
    source: "MANUAL", // Primary DB recipe
    source_attribution: "Database Stored Recipe",
    rating: 4.6,
    reviews_count: 85,
    dietary_tags: ["Vegetarian", "Quick Prep"],
    steps: [
      "Slice fresh ripe tomatoes into thin rounds.",
      "Lightly butter 2 slices of bread.",
      "Layer tomatoes and cheddar cheese slices on the bread.",
      "Toast until cheese is completely melted and bubbly."
    ],
    ingredients: [
      { ingredient_id: 1, name: "Bread", quantity_required: 2, unit: "piece" },
      { ingredient_id: 7, name: "Tomatoes", quantity_required: 1, unit: "piece" },
      { ingredient_id: 6, name: "Butter", quantity_required: 10, unit: "g" },
      { ingredient_id: 10, name: "Cheese", quantity_required: 50, unit: "g" } // Missing in user pantry!
    ]
  },
  {
    recipe_id: 205,
    name: "Mediterranean Garlic Tomato Pasta",
    tagline: "Tender penne pasta tossed with fresh chopped tomatoes, olive oil, and herbs.",
    cook_time_min: 20,
    difficulty_level: "INTERMEDIATE",
    utensil_count: 2,
    source: "WEB_RETRIEVED", // AI Fallback mechanism
    source_attribution: "Discovered via BBC Good Food — 'Simple Summer Pomodoro'",
    rating: 4.8,
    reviews_count: 110,
    dietary_tags: ["Vegetarian", "Vegan Friendly"],
    ai_adaptation: {
      is_ai_fallback: true,
      original_recipe: "Published BBC Good Food Recipe",
      scaling_factor: 1.0,
      scaling_note: "Identified as a high-affinity recipe utilizing near-expiry tomatoes.",
      oracle_validated: true,
      validation_message: "Penne pasta requirement checked against pantry inventory."
    },
    steps: [
      "Bring a large pot of salted water to a rolling boil and cook pasta al dente.",
      "In a wide pan, gently warm olive oil and sauté diced onions.",
      "Add diced tomatoes, cooking down until a rustic sauce forms.",
      "Toss drained pasta directly into the tomato reduction.",
      "Garnish with black pepper and serve hot."
    ],
    ingredients: [
      { ingredient_id: 7, name: "Tomatoes", quantity_required: 2, unit: "piece" },
      { ingredient_id: 3, name: "Onions", quantity_required: 1, unit: "piece" },
      { ingredient_id: 9, name: "Olive Oil", quantity_required: 20, unit: "ml" },
      { ingredient_id: 11, name: "Penne Pasta", quantity_required: 200, unit: "g" } // Missing in user pantry!
    ]
  }
];

export const INITIAL_WASTE_LOG = [
  {
    waste_id: 501,
    ingredient_id: 8,
    name: "Baby Spinach",
    category: "Produce & Veggies",
    quantity_wasted: 100,
    unit: "g",
    expired_on: "2026-09-17",
    estimated_cost: 2.20
  },
  {
    waste_id: 502,
    ingredient_id: 12,
    name: "Greek Yogurt",
    category: "Dairy & Eggs",
    quantity_wasted: 200,
    unit: "g",
    expired_on: "2026-09-10",
    estimated_cost: 3.50
  },
  {
    waste_id: 503,
    ingredient_id: 3,
    name: "Onions",
    category: "Produce & Veggies",
    quantity_wasted: 2,
    unit: "piece",
    expired_on: "2026-08-28",
    estimated_cost: 1.00
  },
  {
    waste_id: 504,
    ingredient_id: 7,
    name: "Tomatoes",
    category: "Produce & Veggies",
    quantity_wasted: 3,
    unit: "piece",
    expired_on: "2026-08-15",
    estimated_cost: 1.80
  },
  {
    waste_id: 505,
    ingredient_id: 1,
    name: "Bread",
    category: "Bakery & Breads",
    quantity_wasted: 4,
    unit: "piece",
    expired_on: "2026-08-05",
    estimated_cost: 1.50
  }
];

export const INITIAL_COOKING_LOG = [
  {
    cook_id: 801,
    recipe_id: 201,
    recipe_name: "Paneer Sandwich",
    cooked_at: "2026-09-18T19:30:00Z",
    deducted_items: [
      { name: "Bread", quantity_deducted: 2, unit: "piece" },
      { name: "Paneer", quantity_deducted: 100, unit: "g" },
      { name: "Onions", quantity_deducted: 1, unit: "piece" }
    ]
  }
];
