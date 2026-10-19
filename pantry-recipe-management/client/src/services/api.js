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
        url += `&input=${encodeURIComponent(JSON.stringify({ "0": { json: input } }))}`;
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
        body: JSON.stringify({ "0": { json: input || {} } })
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

    const resData = result.result?.data;
    return resData && typeof resData === 'object' && 'json' in resData ? resData.json : resData;
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

// Expiry calculation relative to current date (matches backend rules)
export const calculateExpiryStatus = (expiryDateStr) => {
  if (!expiryDateStr) return { status: 'fresh', daysRemaining: 999 };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cleanStr = String(expiryDateStr).slice(0, 10);
  const parts = cleanStr.split('-');
  const expiry = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const diffTime = expiry.getTime() - today.getTime();
  const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

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
          name: backendUser.name ?? currentUser?.name ?? 'User',
          email: backendUser.email ?? currentUser?.email ?? '',
          cooking_level: backendUser.cookingLevel ?? backendUser.cooking_level ?? currentUser?.cooking_level ?? 'BEGINNER'
        };
        setStorage('user', currentUser);
        return currentUser;
      }
      return currentUser;
    },

    async login({ email, password }) {
      // Try backend first (if configured with Google OAuth, this won't apply)
      // Fall back to localStorage-based auth
      await delay(200);
      const users = getStorage('registered_users', []);
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) throw new Error('Invalid email or password. Please check your credentials or create an account.');
      const sessionUser = {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        cooking_level: user.cooking_level || 'BEGINNER'
      };
      currentUser = sessionUser;
      setStorage('user', sessionUser);
      return { user: sessionUser };
    },

    async register({ name, email, password, cooking_level }) {
      await delay(200);
      const users = getStorage('registered_users', []);
      if (users.some(u => u.email === email)) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
      const newUser = {
        user_id: Date.now(),
        name,
        email,
        password,
        cooking_level: cooking_level || 'BEGINNER',
        joined_date: new Date().toISOString().slice(0, 10)
      };
      users.push(newUser);
      setStorage('registered_users', users);
      const sessionUser = {
        user_id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        cooking_level: newUser.cooking_level
      };
      currentUser = sessionUser;
      setStorage('user', sessionUser);
      return { user: sessionUser };
    },

    async logout() {
      await callTrpc('auth.logout', {}, 'mutation');
      currentUser = null;
      setStorage('user', null);
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
      if (backendItems && Array.isArray(backendItems) && backendItems.length > 0) {
        currentPantry = backendItems.map(normalizePantryItem);
        setStorage('items', currentPantry);
        return currentPantry;
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

      const newItem = normalizePantryItem(backendResult || {
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
        // Prevent duplicate waste logging for the exact same stock item
        const alreadyLogged = currentWasteLog.some(w => w.itemId === itemId || (w.ingredient_id === (target.ingredient_id ?? target.ingredientId) && w.expired_on === (target.expiry_date || new Date().toISOString().split('T')[0])));
        if (!alreadyLogged) {
          const wasteRecord = {
            waste_id: Date.now(),
            itemId: itemId,
            ingredient_id: target.ingredient_id ?? target.ingredientId ?? 1,
            name: target.name,
            category: target.category,
            quantity_wasted: target.quantity,
            unit: target.unit,
            expired_on: target.expiry_date || new Date().toISOString().split('T')[0],
            estimated_cost: Number((target.quantity * 0.8).toFixed(2))
          };
          currentWasteLog = [wasteRecord, ...currentWasteLog];
          setStorage('waste_log', currentWasteLog);
        }
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
      // Track previously-seen recipes to pass as exclusions
      const seenRecipeIds = getStorage('seen_recipe_ids', []);
      const seenUrls = getStorage('seen_urls', []);
      const activePantry = filters.pantryItems?.length ? filters.pantryItems : currentPantry;

      // Attempt call to backend recipes.recommend procedure
      const backendRecommend = await callTrpc('recipes.recommend', {
        cookingLevel: filters.cookingLevel || (filters.difficulty && filters.difficulty !== 'ALL' ? filters.difficulty : undefined),
        maxTime: filters.maxTime ? Number(filters.maxTime) : undefined,
        dietaryPreference: filters.dietary && filters.dietary !== 'ALL' ? filters.dietary : undefined,
        excludeRecipeIds: seenRecipeIds.slice(-30),
        excludeUrls: seenUrls.slice(-30),
        pantryItems: (activePantry || []).map(item => ({
          ingredientId: item.ingredientId ?? item.ingredient_id,
          ingredientName: item.ingredientName ?? item.name,
          unit: item.unit || 'piece',
          quantity: item.quantity,
        })),
      }, 'mutation');

      if (backendRecommend) {
        const allCandidates = [];

        // Normalize DB candidates
        const dbCandidates = backendRecommend.candidates || [];
        for (const r of dbCandidates) {
          const avail = calculateRecipeAvailability(r, activePantry);
          allCandidates.push({
            recipe_id: r.recipeId ?? r.recipe_id,
            name: r.name,
            tagline: r.tagline || `Cook time: ${r.cookTimeMin || r.cook_time_min} mins`,
            cook_time_min: r.cookTimeMin ?? r.cook_time_min ?? 20,
            difficulty_level: r.difficultyLevel ?? r.difficulty_level ?? 'BEGINNER',
            utensil_count: r.utensilCount ?? r.utensil_count ?? 2,
            source: r.source || 'MANUAL',
            source_attribution: r.sourceUrl ? `Retrieved from ${new URL(r.sourceUrl).hostname}` : 'Database Stored Recipe',
            rating: Number(r.rating || 4.5),
            reviews_count: 0,
            dietary_tags: r.dietaryTags || r.dietary_tags || [],
            steps: Array.isArray(r.steps) ? r.steps : (r.steps ? r.steps.split('\n') : ['Prepare ingredients and cook.']),
            ingredients: (r.ingredients || []).map(ing => ({
              ingredient_id: ing.ingredientId ?? ing.ingredient_id,
              name: ing.name || ing.ingredientName,
              quantity_required: Number(ing.quantityRequired ?? ing.quantity_required ?? 1),
              unit: ing.unit,
              is_available: ing.isAvailable ?? true,
            })),
            availability: avail,
          });
        }

        // Normalize web-retrieved valid candidates
        const webCandidates = backendRecommend.webCandidates || [];
        for (const wc of webCandidates) {
          const c = wc.candidate || wc;
          const avail = {
            percentage: 100,
            tier: 'ready',
            isFullyAvailable: true,
            missingIngredients: [],
            ingredientStatuses: (c.ingredients || []).map(ing => ({
              name: ing.name,
              quantity_required: ing.quantity,
              available_in_pantry: ing.quantity,
              is_available: true,
              status: 'available',
            })),
          };
          allCandidates.push({
            recipe_id: `web-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: c.name,
            tagline: `Cook time: ${c.cookTimeMin} mins • Web Retrieved`,
            cook_time_min: c.cookTimeMin ?? 20,
            difficulty_level: c.difficultyLevel ?? 'INTERMEDIATE',
            utensil_count: 2,
            source: 'WEB_RETRIEVED',
            source_attribution: c.url ? `Retrieved from ${new URL(c.url).hostname}` : 'Web Recipe',
            source_url: c.url,
            rating: Number(c.rating || 4.3),
            reviews_count: 0,
            dietary_tags: c.dietaryTags || [],
            steps: c.steps ? (typeof c.steps === 'string' ? c.steps.split('\n') : c.steps) : ['Follow recipe instructions.'],
            ingredients: (c.ingredients || []).map(ing => ({
              name: ing.name,
              quantity_required: Number(ing.quantity ?? 1),
              unit: ing.unit,
              is_available: true,
              status: 'available',
            })),
            availability: avail,
          });
        }

        // Normalize web invalid candidates (partially matching)
        const webInvalid = backendRecommend.webInvalid || [];
        for (const wi of webInvalid) {
          const c = wi.candidate || wi;
          const missingNames = wi.missing || [];
          const totalIng = c.ingredients?.length || 1;
          const missingCount = missingNames.length;
          const pct = Math.round(((totalIng - missingCount) / totalIng) * 100);
          allCandidates.push({
            recipe_id: `web-partial-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: c.name,
            tagline: `Cook time: ${c.cookTimeMin} mins • ${missingCount} ingredient${missingCount > 1 ? 's' : ''} missing`,
            cook_time_min: c.cookTimeMin ?? 20,
            difficulty_level: c.difficultyLevel ?? 'INTERMEDIATE',
            utensil_count: 2,
            source: 'WEB_RETRIEVED',
            source_attribution: c.url ? `Retrieved from ${new URL(c.url).hostname}` : 'Web Recipe',
            source_url: c.url,
            rating: Number(c.rating || 4.0),
            reviews_count: 0,
            dietary_tags: c.dietaryTags || [],
            steps: c.steps ? (typeof c.steps === 'string' ? c.steps.split('\n') : c.steps) : ['Follow recipe instructions.'],
            ingredients: (c.ingredients || []).map(ing => ({
              name: ing.name,
              quantity_required: Number(ing.quantity ?? 1),
              unit: ing.unit,
              is_available: !missingNames.includes(ing.name),
              status: missingNames.includes(ing.name) ? 'missing' : 'available',
            })),
            availability: {
              percentage: pct,
              tier: pct >= 75 ? 'almost' : 'low',
              isFullyAvailable: false,
              missingIngredients: missingNames.map(n => ({ name: n })),
              ingredientStatuses: [],
            },
          });
        }

        // Update stored recipes registry so cookRecipe can find them
        allCandidates.forEach(cand => {
          if (!currentRecipes.some(r => (r.recipe_id ?? r.recipeId) === cand.recipe_id)) {
            currentRecipes.push(cand);
          }
        });
        setStorage('recipes', currentRecipes);

        // Update seen recipes for next call
        const newIds = allCandidates.filter(r => typeof r.recipe_id === 'number').map(r => r.recipe_id);
        const newUrls = allCandidates.filter(r => r.source_url).map(r => r.source_url);
        setStorage('seen_recipe_ids', [...seenRecipeIds, ...newIds].slice(-50));
        setStorage('seen_urls', [...seenUrls, ...newUrls].slice(-50));

        return {
          count: allCandidates.length,
          recipes: allCandidates,
          metadata: {
            source: backendRecommend.source,
            database_matches: allCandidates.filter(r => r.source === 'MANUAL').length,
            ai_fallbacks: allCandidates.filter(r => r.source === 'WEB_RETRIEVED').length,
            ready_to_cook_count: allCandidates.filter(r => r.availability?.percentage === 100).length,
          }
        };
      }

      // Backend is unreachable — show an informative empty state, NOT stale mock data
      return {
        count: 0,
        recipes: [],
        metadata: {
          database_matches: 0,
          ai_fallbacks: 0,
          ready_to_cook_count: 0,
          error: 'Could not connect to the recipe engine. Please ensure the backend server is running.',
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
      // Re-verify availability immediately before cooking
      const recipe = currentRecipes.find(r => (r.recipe_id ?? r.recipeId) === Number(recipeId) || String(r.recipe_id ?? r.recipeId) === String(recipeId));
      if (!recipe) throw new Error('Recipe not found');

      const availability = calculateRecipeAvailability(recipe, currentPantry);
      if (!availability.isFullyAvailable) {
        const missingNames = availability.missingIngredients.map(m => m.name).join(', ');
        throw new Error(`Cannot cook recipe: Required ingredients are insufficient (${missingNames}).`);
      }

      // Attempt backend procedure call
      if (typeof recipeId === 'number') {
        const backendCook = await callTrpc('recipes.cook', { recipeId: Number(recipeId) }, 'mutation');
        if (backendCook && backendCook.success === false) {
          throw new Error(backendCook.missing ? backendCook.missing.join(', ') : 'Cannot cook recipe: ingredients insufficient in database.');
        }
      }

      await delay(200);

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
        user_id: currentUser?.user_id ?? 1,
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
      if (backendDashboard && backendDashboard.waste && backendDashboard.waste.byIngredient?.length) {
        const waste = backendDashboard.waste;
        const totalItemsWasted = waste.byIngredient.length;
        const totalEstimatedCost = (Number(waste.total || 0) * 1.5).toFixed(2);

        const topWasted = waste.byIngredient.map(i => ({
          name: i.ingredientName || 'Item',
          quantity: Number(i.quantity || 0),
          unit: i.unit || 'piece'
        }));

        const monthlyTrends = (waste.overTime || []).map(m => ({
          month: m.period?.slice(5) || 'Month',
          wasteKg: Number(m.quantity || 0),
          itemsCount: 1
        }));

        // Calculate genuine rescue efficiency: (Cooked recipes / (Cooked + Wasted)) * 100
        const cookedCount = backendDashboard.recentCooking?.length || currentCookingLog.length;
        const wastedCount = totalItemsWasted || currentWasteLog.length;
        const totalEvents = cookedCount + wastedCount;
        const preventionScore = totalEvents > 0 ? Math.round((cookedCount / totalEvents) * 100) : 100;

        return {
          totalItemsWasted,
          totalEstimatedCost,
          preventionScore,
          topWastedIngredients: topWasted,
          monthlyTrends,
          categoryBreakdown: [
            { category: 'Produce & Veggies', percentage: 60, color: '#10B981' },
            { category: 'Dairy & Eggs', percentage: 25, color: '#F59E0B' },
            { category: 'Bakery & Breads', percentage: 10, color: '#6366F1' },
            { category: 'Others', percentage: 5, color: '#94A3B8' }
          ],
          recentLogs: []
        };
      }

      await delay(150);

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

      // Dynamically calculate rescue efficiency: cooked items / (cooked items + wasted items)
      const cookedCount = currentCookingLog.length;
      const totalEvents = cookedCount + totalWasteEntries;
      const preventionScore = totalEvents > 0 ? Math.round((cookedCount / totalEvents) * 100) : 100;

      // Group waste by month from actual recorded logs
      const monthMap = {};
      currentWasteLog.forEach(item => {
        const m = item.expired_on ? item.expired_on.slice(0, 7) : new Date().toISOString().slice(0, 7);
        if (!monthMap[m]) monthMap[m] = { wasteKg: 0, itemsCount: 0 };
        monthMap[m].itemsCount += 1;
        monthMap[m].wasteKg += Number((Number(item.quantity_wasted) / (item.unit === 'g' ? 1000 : 1)).toFixed(2));
      });

      const monthlyTrends = Object.entries(monthMap).map(([period, data]) => ({
        month: period.slice(5),
        wasteKg: Number(data.wasteKg.toFixed(2)),
        itemsCount: data.itemsCount
      }));

      // Calculate category breakdown from actual waste logs
      const catTotals = {};
      currentWasteLog.forEach(item => {
        const cat = item.category || 'Produce & Veggies';
        catTotals[cat] = (catTotals[cat] || 0) + 1;
      });
      const catKeys = Object.keys(catTotals);
      const categoryBreakdown = catKeys.length > 0 ? catKeys.map((cat, i) => ({
        category: cat,
        percentage: Math.round((catTotals[cat] / totalWasteEntries) * 100),
        color: ['#10B981', '#F59E0B', '#6366F1', '#94A3B8'][i % 4]
      })) : [
        { category: 'Produce & Veggies', percentage: 100, color: '#10B981' }
      ];

      return {
        totalItemsWasted: totalWasteEntries,
        totalEstimatedCost: totalEstimatedCost.toFixed(2),
        preventionScore,
        topWastedIngredients: topWasted,
        monthlyTrends: monthlyTrends.length > 0 ? monthlyTrends : [{ month: 'Current', wasteKg: 0, itemsCount: 0 }],
        categoryBreakdown,
        recentLogs: currentWasteLog.slice(0, 5)
      };
    }
  },

  categories: CATEGORIES
};
