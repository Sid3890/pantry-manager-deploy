import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, calculateExpiryStatus } from '../services/api';

const PantryContext = createContext();

export const PantryProvider = ({ children }) => {
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cookingResult, setCookingResult] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  }, []);

  const loadPantry = useCallback(async () => {
    try {
      setLoading(true);
      const items = await api.pantry.getItems();
      // Enrich with calculated expiry details
      const enriched = items.map(item => ({
        ...item,
        expiryInfo: calculateExpiryStatus(item.expiry_date)
      }));
      setPantryItems(enriched);
    } catch (err) {
      console.error('Failed to load pantry', err);
      showToast('Could not load pantry items', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPantry();
  }, [loadPantry]);

  const addItem = async (itemData) => {
    try {
      const added = await api.pantry.addItem(itemData);
      showToast(`Added ${added.name} (${added.quantity} ${added.unit}) to pantry`);
      await loadPantry();
      return added;
    } catch (err) {
      showToast('Failed to add item', 'error');
      throw err;
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    try {
      await api.pantry.updateQuantity(itemId, newQuantity);
      await loadPantry();
    } catch (err) {
      showToast('Failed to update quantity', 'error');
    }
  };

  const removeItem = async (itemId, markAsWasted = false) => {
    try {
      await api.pantry.removeItem(itemId, markAsWasted);
      showToast(markAsWasted ? 'Item logged to Waste Log' : 'Item removed from pantry', markAsWasted ? 'warning' : 'info');
      await loadPantry();
    } catch (err) {
      showToast('Failed to remove item', 'error');
    }
  };

  const cookRecipe = async (recipeId) => {
    try {
      const result = await api.recipes.cookRecipe(recipeId);
      setCookingResult(result);
      showToast(`Cooked ${result.recipe_name}! Stock deducted.`);
      await loadPantry();
      return result;
    } catch (err) {
      showToast(err.message || 'Error executing cook transaction', 'error');
      throw err;
    }
  };

  const clearCookingResult = () => {
    setCookingResult(null);
  };

  const resetDemoData = async () => {
    await api.pantry.resetDemoData();
    showToast('Pantry reset to default sample inventory', 'info');
    await loadPantry();
  };

  // Pantry summary stats
  const stats = React.useMemo(() => {
    const total = pantryItems.length;
    const fresh = pantryItems.filter(i => i.expiryInfo.status === 'fresh').length;
    const expiringSoon = pantryItems.filter(i => i.expiryInfo.status === 'expiring_soon').length;
    const expired = pantryItems.filter(i => i.expiryInfo.status === 'expired').length;
    return { total, fresh, expiringSoon, expired };
  }, [pantryItems]);

  return (
    <PantryContext.Provider
      value={{
        pantryItems,
        loading,
        stats,
        loadPantry,
        addItem,
        updateQuantity,
        removeItem,
        cookRecipe,
        cookingResult,
        clearCookingResult,
        resetDemoData,
        toast,
        showToast
      }}
    >
      {children}
    </PantryContext.Provider>
  );
};

export const usePantry = () => useContext(PantryContext);
