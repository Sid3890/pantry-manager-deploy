import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api, calculateExpiryStatus } from '../services/api';

const PantryContext = createContext();
export const PantryProvider = ({ children }) => {
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cookingResult, setCookingResult] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => { setToast({ id: Date.now(), message, type }); window.setTimeout(() => setToast(null), 3800); }, []);
  const loadPantry = useCallback(async (showLoading = false) => { try { if (showLoading) setLoading(true); const items = await api.pantry.getItems(); setPantryItems(items.map(item => ({ ...item, expiryInfo: calculateExpiryStatus(item.expiry_date) }))); } catch { showToast('Could not load pantry items', 'error'); } finally { setLoading(false); } }, [showToast]);
  useEffect(() => { loadPantry(true); }, [loadPantry]);
  const addItem = async data => { const added = await api.pantry.addItem(data); setPantryItems(items => [{ ...added, expiryInfo: calculateExpiryStatus(added.expiry_date) }, ...items]); showToast(`Added ${added.name} to pantry`); return added; };
  const updateItem = async (itemId, updates) => { const previous = pantryItems.find(item => item.item_id === itemId); const optimistic = { ...previous, ...updates, quantity: Number(updates.quantity ?? previous.quantity), expiryInfo: calculateExpiryStatus(updates.expiry_date ?? previous.expiry_date) }; setPantryItems(items => items.map(item => item.item_id === itemId ? optimistic : item)); try { await api.pantry.updateItem(itemId, updates); showToast(`${optimistic.name} updated`, 'info'); } catch { setPantryItems(items => items.map(item => item.item_id === itemId ? previous : item)); showToast('Failed to update item', 'error'); } };
  const updateQuantity = async (itemId, quantity) => updateItem(itemId, { quantity });
  const removeItem = async (itemId, markAsWasted = false) => { const previous = pantryItems; setPantryItems(items => items.filter(item => item.item_id !== itemId)); try { await api.pantry.removeItem(itemId, markAsWasted); showToast(markAsWasted ? 'Item logged to waste log' : 'Item removed from pantry', markAsWasted ? 'warning' : 'info'); } catch { setPantryItems(previous); showToast('Failed to remove item', 'error'); } };
  const cookRecipe = async recipeId => { try { const result = await api.recipes.cookRecipe(recipeId); setCookingResult(result); showToast(`Cooked ${result.recipe_name}! Stock deducted.`); await loadPantry(false); return result; } catch (error) { showToast(error.message || 'Could not cook recipe', 'error'); throw error; } };
  const resetDemoData = async () => { await api.pantry.resetDemoData(); showToast('Sample pantry restored', 'info'); await loadPantry(false); };
  const clearPantry = async () => { const previous = pantryItems; setPantryItems([]); try { for (const item of previous) { await api.pantry.removeItem(item.item_id, false); } showToast('Pantry cleared', 'info'); } catch { setPantryItems(previous); showToast('Failed to clear pantry', 'error'); } };
  const stats = useMemo(() => ({ total: pantryItems.length, fresh: pantryItems.filter(i => i.expiryInfo.status === 'fresh').length, expiringSoon: pantryItems.filter(i => i.expiryInfo.status === 'expiring_soon').length, expired: pantryItems.filter(i => i.expiryInfo.status === 'expired').length }), [pantryItems]);
  return <PantryContext.Provider value={{ pantryItems, loading, stats, loadPantry, addItem, updateItem, updateQuantity, removeItem, clearPantry, cookRecipe, cookingResult, clearCookingResult: () => setCookingResult(null), resetDemoData, toast, showToast }}>{children}</PantryContext.Provider>;
};
export const usePantry = () => useContext(PantryContext);
