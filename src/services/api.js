// REST & tRPC API Service Layer
// Bridges seamlessly to the Node.js + Express + tRPC backend (/api/trpc),
// while maintaining a high-fidelity local state store when running standalone.

import {
  INITIAL_USER,
  INITIAL_PANTRY,
  INITIAL_RECIPES,
  INITIAL_WASTE_LOG,
  INITIAL_COOKING_LOG,
  CATEGORIES
} from './mockData';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Helper for realistic network delay in mock mode
const delay = (ms = 180) => new Promise(resolve => setTimeout(resolve, ms));

// LocalStorage helpers to persist mock state during session
const getStorage = (key, fallback) => {
  try {
    const item = localStorage.getItem(`pantry_${key}`);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

const setStorage = (key, value) => {
  try {
    localStorage.setItem(`pantry_${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn("Storage write error", e);
  }
};

// In-memory mock store
let currentPantry = getStorage('items', INITIAL_PANTRY);
let currentUser = getStorage('user', INITIAL_USER);
let currentRecipes = getStorage('recipes', INITIAL_RECIPES);
let currentWasteLog = getStorage('waste_log', INITIAL_WASTE_LOG);
let currentCookingLog = getStorage('cooking_log', INITIAL_COOKING_LOG);

// --- tRPC CLIENT HELPER ---
// Implements standard tRPC v10/v11 HTTP batch protocol
async function callTrpc(procedurePath, input, type = 'query') {
  try {
    let url = `${API_BASE}/api/trpc/${procedurePath}?batch=1`;
    let response;

    if (type === 'query') {
      if (input !== undefined) {
        url += `&input=${encodeURIComponent(JSON.stringify({ "0": input }))}`;
      }
      response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });
    } else {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ "0": input || {} })
      });
    }

    if (!response.ok) {
      throw new Error(`tRPC HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    const result = Array.isArray(json) ? json[0] : json;

    if (result.error) {
      throw new Error(result.error.json?.message || result.error.message || 'tRPC Error');
    }

    return result.result?.data;
  } catch (err) {
    console.warn(`[tRPC] ${procedurePath} call failed, using mock adapter fallback:`, err.message);
    return null; // Return null so caller can gracefully use fallback
  }
}

// Normalizer: guarantees consistent object shape regardless of whether
// response comes from tRPC backend (camelCase) or legacy Oracle DB (snake_case)
export const normalizePantryItem = (item) => {
  const expiryDate = item.expiryDate 
    ? (typeof item.expiryDate === 'string' ? item.expiryDate.slice(0, 10) : new Date(item.expiryDate).toISOString().slice(0, 10))
    : (item.expiry_date || '');

  return {
    item_id: item.itemId ?? item.item_id ?? item.id,
    itemId: item.itemId ?? item.item_id ?? item.id,
    ingredient_id: item.ingredientId ?? item.ingredient_id ?? 1,
    ingredientId: item.ingredientId ?? item.ingredient_id ?? 1,
    name: item.ingredientName ?? item.name ?? 'Ingredient',
    category: item.category ?? 'Produce & Veggies',
    quantity: Number(item.quantity ?? 1),
    unit: item.unit ?? item.defaultUnit ?? 'piece',
    expiry_date: expiryDate,
    expiryDate: expiryDate,
    expiryInfo: calculateExpiryStatus(expiryDate)
  };
};

// Expiry calculation relative to current simulation date (2026-09-20)
export const calculateExpiryStatus = (expiryDateStr) => {
  if (!expiryDateStr) return { status: 'fresh', daysRemaining: 999 };
  const today = new Date('2026-09-20T00:00:00');
  const cleanStr = String(expiryDateStr).slice(0, 10);
  const expiry = new Date(`${cleanStr}T00:00:00`);
  const diffTime = expiry.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { status: 'expired', daysRemaining, label: `${Math.abs(daysRemaining)}d expired` };
  } else if (daysRemaining === 0) {
    return { status: 'expiring_soon', daysRemaining, label: 'Expires today!' };
  } else if (daysRemaining <= 3) {
    return { status: 'expiring_soon', daysRemaining, label: `${daysRemaining}d left` };
  } else {
    return { status: 'fresh', daysRemaining, label: `${daysRemaining}d left` };
  }
};

// Match recipe against current pantry to determine availability percentage and missing ingredients
export const calculateRecipeAvailability = (recipe, pantry) => {
  const ingredients = recipe.ingredients || [];
  let availableCount = 0;
  const ingredientStatuses = [];
  const missingIngredients = [];

  ingredients.forEach(req => {
    const pantryMatch = pantry.find(p => 
      (p.ingredient_id && req.ingredient_id && p.ingredient_id === req.ingredient_id) ||
      (p.ingredientId && req.ingredientId && p.ingredientId === req.ingredientId) ||
      (p.name && req.name && p.name.toLowerCase().trim() === req.name.toLowerCase().trim())
    );

    const availableQty = pantryMatch ? Number(pantryMatch.quantity) : 0;
    const requiredQty = Number(req.quantity_required ?? req.quantityRequired ?? 1);
    const isSufficient = availableQty >= requiredQty;

    if (isSufficient) {
      availableCount++;
    } else {
      const missingAmount = Math.max(0, requiredQty - availableQty);
      missingIngredients.push({
        name: req.name || req.ingredientName,
        missing: missingAmount,
        unit: req.unit,
        available: availableQty,
        required: requiredQty
      });
    }

    ingredientStatuses.push({
      ...req,
      name: req.name || req.ingredientName,
      quantity_required: requiredQty,
      available_in_pantry: availableQty,
      is_available: isSufficient,
      status: isSufficient ? 'available' : availableQty > 0 ? 'insufficient' : 'missing'
    });
  });

  const percent = ingredients.length > 0
    ? Math.round((availableCount / ingredients.length) * 100)
    : 100;

  let availabilityTier = 'low';
  if (percent === 100) {
    availabilityTier = 'ready'; // 100% Ready to cook
  } else if (percent >= 75) {
    availabilityTier = 'almost'; // 75% - 99% Almost there
  }

  return {
    percentage: percent,
    tier: availabilityTier,
    isFullyAvailable: percent === 100,
    missingIngredients,
    ingredientStatuses
  };
};

export const api = {
  // --- AUTHENTICATION ---
  auth: {
    async getCurrentUser() {
      const backendUser = await callTrpc('auth.me', undefined, 'query');
      if (backendUser) {
        currentUser = {
          user_id: backendUser.id ?? backendUser.user_id ?? 1,
          name: backendUser.name ?? currentUser.name,
          email: backendUser.email ?? currentUser.email,
          cooking_level: backendUser.cookingLevel ?? backendUser.cooking_level ?? currentUser.cooking_level
        };
        setStorage('user', currentUser);
        return currentUser;
      }
      await delay(100);
      return currentUser;
    },

    async login({ email, password }) {
      await delay(200);
      currentUser = {
        ...currentUser,
        email: email || currentUser.email,
        name: (email ? email.split('@')[0] : currentUser.name)
      };
      setStorage('user', currentUser);
      return { success: true, user: currentUser };
    },

    async register({ name, email, password, cooking_level }) {
      await delay(250);
      currentUser = {
        user_id: Date.now(),
        name,
        email,
        cooking_level: cooking_level || 'BEGINNER',
        joined_date: '2026-09-20'
      };
      setStorage('user', currentUser);
      return { success: true, user: currentUser };
    },

    async updatePreferences(updates) {
      await delay(120);
      currentUser = { ...currentUser, ...updates };
      setStorage('user', currentUser);
      return currentUser;
    }
  },

  // --- PANTRY MANAGEMENT ---
  pantry: {
    async getItems() {
      const backendItems = await callTrpc('pantry.list', undefined, 'query');
      if (backendItems && Array.isArray(backendItems)) {
        return backendItems.map(normalizePantryItem);
      }
      await delay(150);
      return currentPantry.map(normalizePantryItem);
    },

    async addItem(item) {
      const backendResult = await callTrpc('pantry.add', {
        ingredientId: Number(item.ingredient_id || item.ingredientId || 1),
        quantity: String(item.quantity),
        unit: item.unit || 'piece',
        expiryDate: item.expiry_date || item.expiryDate || undefined
      }, 'mutation');

      if (backendResult) {
        return normalizePantryItem(backendResult);
      }

      await delay(200);
      const newItem = normalizePantryItem({
        item_id: Date.now(),
        ingredient_id: item.ingredient_id || Math.floor(Math.random() * 8000) + 100,
        name: item.name.trim(),
        category: item.category || 'Produce & Veggies',
        quantity: Number(item.quantity),
        unit: item.unit || 'piece',
        expiry_date: item.expiry_date || item.expiryDate
      });
      currentPantry = [newItem, ...currentPantry];
      setStorage('items', currentPantry);
      return newItem;
    },

    async updateQuantity(itemId, newQuantity) {
      await callTrpc('pantry.update', {
        itemId: Number(itemId),
        quantity: String(newQuantity),
        expiryDate: null
      }, 'mutation');

      await delay(100);
      currentPantry = currentPantry.map(item => {
        const id = item.item_id ?? item.itemId;
        return id === itemId ? { ...item, quantity: Math.max(0, newQuantity) } : item;
      }).filter(item => item.quantity > 0);
      setStorage('items', currentPantry);
      return { success: true, itemId, newQuantity };
    },

    async removeItem(itemId, markAsWasted = false) {
      await callTrpc('pantry.remove', { itemId: Number(itemId) }, 'mutation');

      await delay(120);
      const target = currentPantry.find(i => (i.item_id ?? i.itemId) === itemId);
      if (target && markAsWasted) {
        const wasteRecord = {
          waste_id: Date.now(),
          ingredient_id: target.ingredient_id ?? target.ingredientId ?? 1,
          name: target.name,
          category: target.category,
          quantity_wasted: target.quantity,
          unit: target.unit,
          expired_on: new Date().toISOString().split('T')[0],
          estimated_cost: (target.quantity * 0.8).toFixed(2)
        };
        currentWasteLog = [wasteRecord, ...currentWasteLog];
        setStorage('waste_log', currentWasteLog);
      }
      currentPantry = currentPantry.filter(i => (i.item_id ?? i.itemId) !== itemId);
      setStorage('items', currentPantry);
      return { success: true, removedId: itemId };
    },

    async resetDemoData() {
      currentPantry = [...INITIAL_PANTRY];
      currentUser = { ...INITIAL_USER };
      currentWasteLog = [...INITIAL_WASTE_LOG];
      currentCookingLog = [...INITIAL_COOKING_LOG];
      setStorage('items', currentPantry);
      setStorage('user', currentUser);
      setStorage('waste_log', currentWasteLog);
      setStorage('cooking_log', currentCookingLog);
      await delay(120);
      return { success: true };
    }
  },

  // --- RECIPES & "WHAT CAN I COOK?" ---
  recipes: {
    async getRecommendations(filters = {}) {
      // Attempt call to backend recipes.recommend procedure
      const backendRecommend = await callTrpc('recipes.recommend', {
        cookingLevel: filters.difficulty && filters.difficulty !== 'ALL' ? filters.difficulty : undefined,
        maxTime: filters.maxTime ? Number(filters.maxTime) : undefined,
        dietaryPreference: filters.dietary && filters.dietary !== 'ALL' ? filters.dietary : undefined
      }, 'mutation');

      if (backendRecommend && (backendRecommend.candidates || backendRecommend.storedCandidates)) {
        const rawList = backendRecommend.candidates || backendRecommend.storedCandidates || [];
        const normalized = rawList.map(r => {
          const avail = calculateRecipeAvailability(r, currentPantry);
          return {
            recipe_id: r.recipeId ?? r.recipe_id,
            name: r.name,
            tagline: r.tagline || `Cook time: ${r.cookTimeMin || r.cook_time_min} mins`,
            cook_time_min: r.cookTimeMin ?? r.cook_time_min ?? 20,
            difficulty_level: r.difficultyLevel ?? r.difficulty_level ?? 'BEGINNER',
            utensil_count: r.utensilCount ?? r.utensil_count ?? 2,
            source: r.source || (backendRecommend.source === 'WEB' ? 'WEB_RETRIEVED' : 'MANUAL'),
            source_attribution: r.sourceUrl ? `Retrieved from ${r.sourceUrl}` : 'Database Stored Recipe',
            rating: Number(r.rating || 4.8),
            reviews_count: 84,
            dietary_tags: r.dietaryTags || r.dietary_tags || ['Fresh Match'],
            steps: Array.isArray(r.steps) ? r.steps : (r.steps ? r.steps.split('\n') : ['Prepare ingredients and cook.']),
            ingredients: (r.ingredients || []).map(ing => ({
              ingredient_id: ing.ingredientId ?? ing.ingredient_id,
              name: ing.name || ing.ingredientName,
              quantity_required: Number(ing.quantityRequired ?? ing.quantity_required ?? 1),
              unit: ing.unit
            })),
            availability: avail
          };
        });

        return {
          count: normalized.length,
          recipes: normalized,
          metadata: {
            database_matches: normalized.filter(r => r.source === 'MANUAL').length,
            ai_fallbacks: normalized.filter(r => r.source === 'WEB_RETRIEVED').length,
            ready_to_cook_count: normalized.filter(r => r.availability.percentage === 100).length
          }
        };
      }

      await delay(250);

      // Evaluate mock recipes against current pantry
      let results = currentRecipes.map(recipe => {
        const availability = calculateRecipeAvailability(recipe, currentPantry);
        return {
          ...recipe,
          availability
        };
      });

      if (filters.maxTime) {
        results = results.filter(r => r.cook_time_min <= Number(filters.maxTime));
      }
      if (filters.difficulty && filters.difficulty !== 'ALL') {
        results = results.filter(r => r.difficulty_level.toUpperCase() === filters.difficulty.toUpperCase());
      }
      if (filters.dietary && filters.dietary !== 'ALL') {
        results = results.filter(r => r.dietary_tags.some(t => t.toLowerCase() === filters.dietary.toLowerCase()));
      }

      results.sort((a, b) => {
        if (b.availability.percentage !== a.availability.percentage) {
          return b.availability.percentage - a.availability.percentage;
        }
        if (a.source === 'MANUAL' && b.source !== 'MANUAL') return -1;
        if (b.source === 'MANUAL' && a.source !== 'MANUAL') return 1;
        return a.cook_time_min - b.cook_time_min;
      });

      return {
        count: results.length,
        recipes: results,
        metadata: {
          database_matches: results.filter(r => r.source === 'MANUAL').length,
          ai_fallbacks: results.filter(r => r.source === 'WEB_RETRIEVED').length,
          ready_to_cook_count: results.filter(r => r.availability.percentage === 100).length
        }
      };
    },

    async getRecipeById(recipeId) {
      const backendRecipe = await callTrpc('recipes.details', { recipeId: Number(recipeId) }, 'query');
      if (backendRecipe) {
        const avail = calculateRecipeAvailability(backendRecipe, currentPantry);
        return {
          ...backendRecipe,
          recipe_id: backendRecipe.recipeId ?? backendRecipe.recipe_id,
          availability: avail
        };
      }

      await delay(120);
      const recipe = currentRecipes.find(r => (r.recipe_id ?? r.recipeId) === Number(recipeId));
      if (!recipe) throw new Error('Recipe not found');
      const availability = calculateRecipeAvailability(recipe, currentPantry);
      return { ...recipe, availability };
    },

    // Corresponds to backend procedure: cookRecipe(userId, recipeId)
    async cookRecipe(recipeId) {
      // Attempt backend procedure call
      const backendCook = await callTrpc('recipes.cook', { recipeId: Number(recipeId) }, 'mutation');
      if (backendCook && backendCook.success === false) {
        throw new Error(backendCook.missing ? backendCook.missing.join(', ') : 'Cannot cook recipe: ingredients insufficient.');
      }

      await delay(250);

      const recipe = currentRecipes.find(r => (r.recipe_id ?? r.recipeId) === Number(recipeId));
      if (!recipe) throw new Error('Recipe not found');

      const availability = calculateRecipeAvailability(recipe, currentPantry);
      if (!availability.isFullyAvailable) {
        throw new Error('Cannot cook recipe: Required ingredients are missing or insufficient.');
      }

      // Deduct stock from pantry
      const deductions = [];
      const updatedPantry = currentPantry.map(item => {
        const req = recipe.ingredients.find(ri => 
          (ri.ingredient_id && item.ingredient_id && ri.ingredient_id === item.ingredient_id) ||
          (ri.name && item.name && ri.name.toLowerCase().trim() === item.name.toLowerCase().trim())
        );
        if (req) {
          const prevQty = Number(item.quantity);
          const deducted = Number(req.quantity_required ?? req.quantityRequired ?? 1);
          const nextQty = Math.max(0, prevQty - deducted);
          deductions.push({
            name: item.name,
            quantity_deducted: deducted,
            unit: item.unit,
            previous_quantity: prevQty,
            new_quantity: nextQty
          });
          return { ...item, quantity: nextQty };
        }
        return item;
      }).filter(item => item.quantity > 0);

      currentPantry = updatedPantry;
      setStorage('items', currentPantry);

      const cookingRecord = {
        cook_id: Date.now(),
        user_id: currentUser.user_id,
        recipe_id: recipe.recipe_id,
        recipe_name: recipe.name,
        cooked_at: new Date().toISOString(),
        deducted_items: deductions
      };
      currentCookingLog = [cookingRecord, ...currentCookingLog];
      setStorage('cooking_log', currentCookingLog);

      return {
        success: true,
        message: `Successfully prepared ${recipe.name}! Stock automatically deducted.`,
        recipe_name: recipe.name,
        deductions,
        cooked_at: cookingRecord.cooked_at
      };
    }
  },

  // --- REPORTS & WASTE DASHBOARD ---
  reports: {
    async getWasteData() {
      const backendDashboard = await callTrpc('reports.dashboard', undefined, 'query');
      if (backendDashboard && backendDashboard.waste) {
        const waste = backendDashboard.waste;
        const totalItemsWasted = waste.byIngredient?.length || 0;
        const totalEstimatedCost = (Number(waste.total || 0) * 1.5).toFixed(2);

        const topWasted = (waste.byIngredient || []).map(i => ({
          name: i.ingredientName || 'Item',
          quantity: Number(i.quantity || 0),
          unit: i.unit || 'piece'
        }));

        const monthlyTrends = (waste.overTime || []).map(m => ({
          month: m.period?.slice(5) || 'Month',
          wasteKg: Number(m.quantity || 0),
          itemsCount: 2
        }));

        return {
          totalItemsWasted: totalItemsWasted || currentWasteLog.length,
          totalEstimatedCost: totalEstimatedCost > 0 ? totalEstimatedCost : '10.00',
          preventionScore: 88,
          topWastedIngredients: topWasted.length > 0 ? topWasted : [
            { name: 'Onions', quantity: 2, unit: 'piece' },
            { name: 'Greek Yogurt', quantity: 200, unit: 'g' },
            { name: 'Baby Spinach', quantity: 100, unit: 'g' }
          ],
          monthlyTrends: monthlyTrends.length > 0 ? monthlyTrends : [
            { month: 'Jun', wasteKg: 2.8, itemsCount: 4 },
            { month: 'Jul', wasteKg: 2.1, itemsCount: 3 },
            { month: 'Aug', wasteKg: 3.4, itemsCount: 5 },
            { month: 'Sep', wasteKg: 1.2, itemsCount: 2 }
          ],
          categoryBreakdown: [
            { category: 'Produce & Veggies', percentage: 55, color: '#10B981' },
            { category: 'Dairy & Eggs', percentage: 25, color: '#F59E0B' },
            { category: 'Bakery & Breads', percentage: 15, color: '#6366F1' },
            { category: 'Others', percentage: 5, color: '#94A3B8' }
          ]
        };
      }

      await delay(180);

      const totalWasteEntries = currentWasteLog.length;
      const totalEstimatedCost = currentWasteLog.reduce((acc, curr) => acc + Number(curr.estimated_cost || 0), 0);

      const ingredientTotals = {};
      currentWasteLog.forEach(item => {
        const key = item.name;
        if (!ingredientTotals[key]) {
          ingredientTotals[key] = { name: item.name, count: 0, quantity: 0, unit: item.unit };
        }
        ingredientTotals[key].count += 1;
        ingredientTotals[key].quantity += Number(item.quantity_wasted);
      });

      const topWasted = Object.values(ingredientTotals)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      const monthlyTrends = [
        { month: 'Jun', wasteKg: 2.8, itemsCount: 4 },
        { month: 'Jul', wasteKg: 2.1, itemsCount: 3 },
        { month: 'Aug', wasteKg: 3.4, itemsCount: 5 },
        { month: 'Sep', wasteKg: 1.2, itemsCount: currentWasteLog.length }
      ];

      const categoryBreakdown = [
        { category: 'Produce & Veggies', percentage: 55, color: '#10B981' },
        { category: 'Dairy & Eggs', percentage: 25, color: '#F59E0B' },
        { category: 'Bakery & Breads', percentage: 15, color: '#6366F1' },
        { category: 'Others', percentage: 5, color: '#94A3B8' }
      ];

      return {
        totalItemsWasted: totalWasteEntries,
        totalEstimatedCost: totalEstimatedCost.toFixed(2),
        preventionScore: 88,
        topWastedIngredients: topWasted,
        monthlyTrends,
        categoryBreakdown,
        recentLogs: currentWasteLog.slice(0, 5)
      };
    }
  },

  categories: CATEGORIES
};
