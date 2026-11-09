import { clearAllQueryCaches } from '../lib/queryClient';
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
    if (procedurePath.startsWith('auth.')) {
      throw err;
    }
    console.warn(`[tRPC] ${procedurePath} call failed, using mock adapter fallback:`, err.message);
    return null; // Return null so caller can gracefully use fallback
  }
}

// Normalizer: guarantees consistent object shape regardless of whether
// response comes from tRPC backend (camelCase) or legacy Oracle DB (snake_case)
export const normalizePantryItem = (item) => {
  if (!item || typeof item !== 'object') {
    return {
      item_id: Date.now(),
      itemId: Date.now(),
      ingredient_id: 1,
      ingredientId: 1,
      name: 'Ingredient',
      category: 'Produce & Veggies',
      quantity: 1,
      unit: 'piece',
      expiry_date: '',
      expiryDate: '',
      expiryInfo: calculateExpiryStatus('')
    };
  }

  const expiryDate = item.expiryDate 
    ? (typeof item.expiryDate === 'string' ? item.expiryDate.slice(0, 10) : new Date(item.expiryDate).toISOString().slice(0, 10))
    : (item.expiry_date || '');

  const resolvedName = item.ingredientName || item.ingredient_name || item.name || 'Ingredient';

  return {
    item_id: item.itemId ?? item.item_id ?? item.id,
    itemId: item.itemId ?? item.item_id ?? item.id,
    ingredient_id: item.ingredientId ?? item.ingredient_id ?? 1,
    ingredientId: item.ingredientId ?? item.ingredient_id ?? 1,
    name: resolvedName,
    category: item.category ?? 'Produce & Veggies',
    quantity: Number(item.quantity ?? 1),
    unit: item.unit ?? item.defaultUnit ?? 'piece',
    expiry_date: expiryDate,
    expiryDate: expiryDate,
    expiryInfo: calculateExpiryStatus(expiryDate)
  };
};

export const ensureClientRichSteps = (recipe) => {
  let steps = [];
  if (Array.isArray(recipe.steps)) {
    steps = recipe.steps.map(s => String(s).trim()).filter(Boolean);
  } else if (typeof recipe.steps === 'string' && recipe.steps.trim()) {
    steps = recipe.steps.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  }

  if (steps.length >= 3 && steps.every(s => s.length >= 20)) {
    return steps;
  }

  const ingNames = (recipe.ingredients || []).map(i => i.name || i.ingredientName).filter(Boolean);
  const cookTime = Number(recipe.cook_time_min || recipe.cookTimeMin || 20);
  const prepTime = Math.max(3, Math.round(cookTime * 0.25));
  const mainTime = Math.max(5, cookTime - prepTime);

  return [
    `Preparation & Mis-en-place (~${prepTime} mins): Gather all required ingredients (${ingNames.slice(0, 5).join(', ')}). Rinse thoroughly and chop ingredients to uniform sizes for balanced cooking.`,
    `Heating & Aromatics (2-3 mins): Place a pan or skillet over medium heat. Add a dash of oil or butter until shimmering, then add any aromatics (like onions or garlic) and cook until fragrant and translucent.`,
    `Main Cooking (~${Math.round(mainTime * 0.6)} mins): Add remaining ingredients to the skillet. Sauté over medium heat, stirring regularly until tender, nicely browned, and cooked through.`,
    `Seasoning & Simmer (2-3 mins): Lower heat slightly. Season to taste with salt, pepper, and herbs or spices. Allow flavors to meld together smoothly.`,
    `Finishing & Serving: Remove from heat. Let the dish rest for 1 minute before plating warm. Garnish as desired and enjoy!`
  ];
};

export const deduplicateClientRecipes = (recipes) => {
  const result = [];
  const normalizeTitle = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\b(and|with|in|on|at|of|the|a|an|quick|easy|crispy|simple|homemade|style|recipe|delicious|fresh|pan|skillet|toasted|warm|creamy|golden)\b/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');

  const getIngSet = (r) => new Set((r.ingredients || []).map(i => String(i.name || i.ingredientName || '').toLowerCase().trim()).filter(Boolean));

  for (const r of recipes) {
    if (!r || !r.name) continue;
    const titleNorm = normalizeTitle(r.name);
    const titleWords = new Set(titleNorm.split(' ').filter(w => w.length > 2));
    const ings = getIngSet(r);

    const isDup = result.some(existing => {
      const existingTitleNorm = normalizeTitle(existing.name);
      if (titleNorm === existingTitleNorm && titleNorm.length > 0) return true;

      const existingTitleWords = new Set(existingTitleNorm.split(' ').filter(w => w.length > 2));
      if (titleWords.size > 0 && existingTitleWords.size > 0) {
        const commonWords = Array.from(titleWords).filter(w => existingTitleWords.has(w));
        if (commonWords.length / Math.min(titleWords.size, existingTitleWords.size) >= 0.8) return true;
      }

      const existingIngs = getIngSet(existing);
      if (ings.size >= 2 && existingIngs.size >= 2) {
        const common = Array.from(ings).filter(i => existingIngs.has(i));
        const minSize = Math.min(ings.size, existingIngs.size);
        const maxSize = Math.max(ings.size, existingIngs.size);
        if (common.length / minSize >= 0.8 && minSize / maxSize >= 0.7) {
          return true;
        }
      }
      return false;
    });

    if (!isDup) {
      result.push(r);
    }
  }

  return result;
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
      const backendUser = await callTrpc('auth.login', { email, password }, 'mutation');
      if (backendUser) {
        currentUser = {
          user_id: backendUser.user_id || backendUser.id,
          name: backendUser.name,
          email: backendUser.email,
          cooking_level: backendUser.cooking_level || backendUser.cookingLevel || 'BEGINNER'
        };
        setStorage('user', currentUser);
        return { user: currentUser };
      }
      throw new Error('Invalid email or password. Please check your credentials or create an account.');
    },

    async register({ name, email, password, cooking_level }) {
      const backendUser = await callTrpc('auth.register', {
        name,
        email,
        password,
        cookingLevel: cooking_level || 'BEGINNER'
      }, 'mutation');

      if (backendUser) {
        currentUser = {
          user_id: backendUser.user_id || backendUser.id,
          name: backendUser.name,
          email: backendUser.email,
          cooking_level: backendUser.cooking_level || backendUser.cookingLevel || 'BEGINNER'
        };
        setStorage('user', currentUser);
        return { user: currentUser };
      }
      throw new Error('Registration failed. Please check the provided information.');
    },

    async logout() {
      await callTrpc('auth.logout', {}, 'mutation');
      currentUser = null;
      currentPantry = [];
      currentCookingLog = [];
      currentWasteLog = [];
      setStorage('user', null);
      setStorage('items', []);
      setStorage('cooking_log', []);
      setStorage('waste_log', []);
      clearAllQueryCaches();
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
      const ingredientIdNum = item.ingredient_id && !isNaN(Number(item.ingredient_id))
        ? Number(item.ingredient_id)
        : (item.ingredientId && !isNaN(Number(item.ingredientId)) ? Number(item.ingredientId) : undefined);

      const backendResult = await callTrpc('pantry.add', {
        ingredientId: ingredientIdNum,
        name: item.name?.trim(),
        category: item.category,
        quantity: String(item.quantity),
        unit: item.unit || 'piece',
        expiryDate: item.expiry_date || item.expiryDate || undefined
      }, 'mutation');

      const isObj = backendResult && typeof backendResult === 'object';
      const resolvedId = typeof backendResult === 'number'
        ? backendResult
        : (isObj ? (backendResult.itemId ?? backendResult.item_id ?? Date.now()) : Date.now());

      const newItem = normalizePantryItem({
        ...(isObj ? backendResult : {}),
        item_id: resolvedId,
        itemId: resolvedId,
        ingredient_id: (isObj && backendResult.ingredientId) || ingredientIdNum || Math.floor(Math.random() * 8000) + 100,
        name: (isObj && (backendResult.ingredientName || backendResult.name)) || item.name?.trim() || 'Ingredient',
        category: (isObj && backendResult.category) || item.category || 'Produce & Veggies',
        quantity: Number((isObj && backendResult.quantity) || item.quantity || 1),
        unit: (isObj && (backendResult.unit || backendResult.defaultUnit)) || item.unit || 'piece',
        expiry_date: (isObj && (backendResult.expiryDate || backendResult.expiry_date)) || item.expiry_date || item.expiryDate || ''
      });
      currentPantry = [newItem, ...currentPantry];
      setStorage('items', currentPantry);
      return newItem;
    },

    async updateItem(itemId, updates) {
      if (updates.quantity !== undefined || updates.unit !== undefined || updates.expiry_date !== undefined || updates.expiryDate !== undefined) {
        await callTrpc('pantry.update', {
          itemId: Number(itemId),
          quantity: updates.quantity !== undefined ? String(updates.quantity) : undefined,
          unit: updates.unit || undefined,
          expiryDate: updates.expiry_date ?? updates.expiryDate ?? null
        }, 'mutation');
      }

      await delay(100);
      currentPantry = currentPantry.map(item => {
        const id = item.item_id ?? item.itemId;
        return id === itemId ? {
          ...item,
          ...updates,
          quantity: updates.quantity !== undefined ? Math.max(0, Number(updates.quantity)) : item.quantity,
          expiry_date: updates.expiry_date ?? updates.expiryDate ?? item.expiry_date,
          expiryDate: updates.expiry_date ?? updates.expiryDate ?? item.expiryDate
        } : item;
      }).filter(item => item.quantity > 0);
      setStorage('items', currentPantry);
      return { success: true, itemId, updates };
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
      await callTrpc('pantry.remove', { itemId: Number(itemId), markAsWasted: Boolean(markAsWasted) }, 'mutation');

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
      const seenRecipeNames = getStorage('seen_recipe_names', []);
      const seenUrls = getStorage('seen_urls', []);
      const activePantry = filters.pantryItems?.length ? filters.pantryItems : currentPantry;

      // Attempt call to backend recipes.recommend procedure
      const backendRecommend = await callTrpc('recipes.recommend', {
        cookingLevel: filters.cookingLevel || (filters.difficulty && filters.difficulty !== 'ALL' ? filters.difficulty : undefined),
        maxTime: filters.maxTime ? Number(filters.maxTime) : undefined,
        dietaryPreference: filters.dietary && filters.dietary !== 'ALL' ? filters.dietary : undefined,
        excludeRecipeIds: seenRecipeIds.slice(-30),
        excludeRecipeNames: seenRecipeNames.slice(-50),
        excludeUrls: seenUrls.slice(-30),
        pantryItems: (activePantry || []).map(item => ({
          ingredientId: item.ingredientId ?? item.ingredient_id,
          ingredientName: item.ingredientName ?? item.name,
          unit: item.unit || 'piece',
          quantity: item.quantity,
        })),
      }, 'mutation');

      if (backendRecommend) {
        const rawCandidates = [];

        // Normalize DB candidates
        const dbCandidates = backendRecommend.candidates || [];
        for (const r of dbCandidates) {
          const avail = calculateRecipeAvailability(r, activePantry);
          rawCandidates.push({
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
            steps: ensureClientRichSteps(r),
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

        // Normalize web-retrieved and AI-generated valid candidates
        const webCandidates = backendRecommend.webCandidates || [];
        for (const wc of webCandidates) {
          const c = wc.candidate || wc;
          const isAiGenerated = c.url && String(c.url).startsWith('ai-recipe://');
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
          // For AI recipes: use the ai-recipe:// URL as the recipe_id so cookRecipe knows it's AI
          const recipeIdStr = isAiGenerated
            ? (c.url || `ai-recipe://${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
            : `web-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          rawCandidates.push({
            recipe_id: recipeIdStr,
            name: c.name,
            tagline: isAiGenerated
              ? `Cook time: ${c.cookTimeMin} mins • AI Generated`
              : `Cook time: ${c.cookTimeMin} mins • Web Retrieved`,
            cook_time_min: c.cookTimeMin ?? 20,
            difficulty_level: c.difficultyLevel ?? 'BEGINNER',
            utensil_count: 2,
            source: isAiGenerated ? 'AI_GENERATED' : 'WEB_RETRIEVED',
            source_attribution: isAiGenerated ? 'AI Generated Recipe' : (c.url && !String(c.url).startsWith('ai-recipe://') ? `Retrieved from ${new URL(c.url).hostname}` : 'Web Recipe'),
            source_url: isAiGenerated ? undefined : c.url,
            rating: Number(c.rating || (isAiGenerated ? 4.8 : 4.3)),
            reviews_count: 0,
            dietary_tags: c.dietaryTags || [],
            steps: ensureClientRichSteps(c),
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
          const rawMissing = wi.missing || [];
          const missingNames = rawMissing.map(m => String(m).toLowerCase().trim());
          const rawIngredients = c.ingredients || [];
          const totalIng = rawIngredients.length || 1;
          const missingCount = missingNames.length;
          const pct = Math.max(0, Math.round(((totalIng - missingCount) / totalIng) * 100));

          const ingredientStatuses = rawIngredients.map(ing => {
            const ingNameLower = String(ing.name || '').toLowerCase().trim();
            const isMissing = missingNames.some(m => m === ingNameLower || ingNameLower.includes(m) || m.includes(ingNameLower));
            const qtyReq = Number(ing.quantity ?? 1);
            return {
              name: ing.name,
              quantity_required: qtyReq,
              unit: ing.unit || 'piece',
              available_in_pantry: isMissing ? 0 : qtyReq,
              is_available: !isMissing,
              status: isMissing ? 'missing' : 'available',
            };
          });

          const missingIngredients = rawIngredients
            .filter(ing => {
              const ingNameLower = String(ing.name || '').toLowerCase().trim();
              return missingNames.some(m => m === ingNameLower || ingNameLower.includes(m) || m.includes(ingNameLower));
            })
            .map(ing => ({
              name: ing.name,
              missing: Number(ing.quantity ?? 1),
              unit: ing.unit || 'piece',
              available: 0,
              required: Number(ing.quantity ?? 1),
            }));

          if (missingIngredients.length === 0 && rawMissing.length > 0) {
            rawMissing.forEach(n => {
              missingIngredients.push({
                name: String(n),
                missing: 1,
                unit: 'piece',
                available: 0,
                required: 1,
              });
            });
          }

          rawCandidates.push({
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
            steps: ensureClientRichSteps(c),
            ingredients: ingredientStatuses,
            availability: {
              percentage: pct,
              tier: pct >= 75 ? 'almost' : 'low',
              isFullyAvailable: false,
              missingIngredients,
              ingredientStatuses,
            },
          });
        }

        // Deduplicate recipes to remove duplicate recipes with different names
        const allCandidates = deduplicateClientRecipes(rawCandidates);

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
        const newNames = allCandidates.map(r => r.name);
        setStorage('seen_recipe_ids', [...seenRecipeIds, ...newIds].slice(-50));
        setStorage('seen_urls', [...seenUrls, ...newUrls].slice(-50));
        setStorage('seen_recipe_names', [...seenRecipeNames, ...newNames].slice(-60));

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

      // If backend was unreachable or returned empty, gracefully match against local recipes store
      const localCandidates = (currentRecipes || []).map(r => {
        const avail = calculateRecipeAvailability(r, activePantry);
        return {
          ...r,
          availability: avail,
          steps: ensureClientRichSteps(r),
        };
      });

      const uniqueLocal = deduplicateClientRecipes(localCandidates);

      return {
        count: uniqueLocal.length,
        recipes: uniqueLocal,
        metadata: {
          source: 'LOCAL_STORE',
          database_matches: uniqueLocal.length,
          ai_fallbacks: 0,
          ready_to_cook_count: uniqueLocal.filter(r => r.availability?.percentage === 100).length,
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
        // DB recipe — call the standard cook endpoint
        const backendCook = await callTrpc('recipes.cook', { recipeId: Number(recipeId) }, 'mutation');
        if (backendCook && backendCook.success === false) {
          throw new Error(backendCook.missing ? backendCook.missing.join(', ') : 'Cannot cook recipe: ingredients insufficient in database.');
        }
      } else {
        // AI or web-retrieved recipe (string id like "web-..." or "ai-recipe://...")
        // Persist the recipe to DB and deduct pantry stock via the cookFromWeb endpoint
        const stepsStr = Array.isArray(recipe.steps) ? recipe.steps.join('\n') : (recipe.steps || 'Follow recipe instructions.');
        const ingredients = (recipe.ingredients || []).map(ing => ({
          name: String(ing.name || '').trim(),
          quantity: Number(ing.quantity_required ?? ing.quantityRequired ?? 1),
          unit: String(ing.unit || 'piece').trim(),
        })).filter(ing => ing.name.length > 0 && ing.quantity > 0);

        if (ingredients.length > 0) {
          const isAiRecipe = String(recipeId).startsWith('ai-recipe://');
          const backendCook = await callTrpc('recipes.cookFromWeb', {
            name: recipe.name,
            steps: stepsStr,
            cookTimeMin: Number(recipe.cook_time_min ?? recipe.cookTimeMin ?? 15),
            difficultyLevel: (recipe.difficulty_level || recipe.difficultyLevel || 'BEGINNER'),
            source: 'WEB_RETRIEVED',
            sourceUrl: isAiRecipe ? undefined : (recipe.source_url || undefined),
            rating: recipe.rating ? String(recipe.rating) : undefined,
            dietaryTags: recipe.dietary_tags || recipe.dietaryTags || [],
            ingredients,
          }, 'mutation');

          if (backendCook && backendCook.success === false) {
            throw new Error(backendCook.missing ? backendCook.missing.join(', ') : 'Cannot cook recipe: ingredients insufficient in database.');
          }
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
