import React, { useEffect, useState } from 'react';
import { X, Plus, Pencil, AlertCircle } from 'lucide-react';
import { CATEGORIES } from '../../services/mockData';
import { INGREDIENT_CATALOG, findCanonicalIngredient } from '../../services/ingredientCatalog';

const defaultForm = { 
  ingredient_id: '', 
  name: '', 
  category: CATEGORIES[1].label, 
  quantity: '1', 
  unit: 'piece', 
  expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) 
};

export const AddItemModal = ({ isOpen, onClose, onSubmit, editingItem = null }) => {
  const [form, setForm] = useState(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingItem) {
      const canonical = findCanonicalIngredient(editingItem.name);
      setForm({ 
        ingredient_id: String(canonical?.ingredient_id || editingItem.ingredient_id || ''), 
        name: canonical?.name || editingItem.name, 
        category: canonical?.category || editingItem.category, 
        quantity: String(editingItem.quantity), 
        unit: editingItem.unit, 
        expiry_date: editingItem.expiry_date 
      });
    } else {
      setForm(defaultForm);
    }
    setError('');
  }, [editingItem, isOpen]);

  if (!isOpen) return null;
  const isEditing = Boolean(editingItem);
  const isCustom = form.ingredient_id === 'custom';
  const setField = (key, value) => {
    setError('');
    setForm(previous => ({ ...previous, [key]: value }));
  };

  const handleIngredientChange = event => {
    const value = event.target.value;
    setError('');
    if (value === 'custom') {
      setForm(previous => ({ ...previous, ingredient_id: 'custom', name: '' }));
      return;
    }
    const selected = INGREDIENT_CATALOG.find(item => String(item.ingredient_id) === value);
    if (selected) {
      setForm(previous => ({ 
        ...previous, 
        ingredient_id: String(selected.ingredient_id), 
        name: selected.name, 
        category: selected.category, 
        unit: selected.unit 
      }));
    }
  };

  const handleCategoryChange = event => {
    const category = event.target.value;
    const selected = CATEGORIES.find(item => item.label === category);
    const expiry = new Date(); 
    expiry.setDate(expiry.getDate() + (selected?.shelf_life_days || 7));
    setForm(previous => ({ ...previous, category, expiry_date: expiry.toISOString().slice(0, 10) }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    const finalName = form.name.trim();
    if (!finalName) {
      setError('Please select or enter an ingredient name.');
      return;
    }
    const numQty = Number(form.quantity);
    if (!numQty || numQty <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (!form.expiry_date) {
      setError('Please provide an expiry date.');
      return;
    }

    const canonical = findCanonicalIngredient(finalName);
    setIsSubmitting(true);
    try {
      await onSubmit({ 
        ...form, 
        ingredient_id: canonical?.ingredient_id || (form.ingredient_id === 'custom' ? undefined : Number(form.ingredient_id) || undefined), 
        name: canonical?.name || finalName, 
        category: canonical?.category || form.category, 
        unit: form.unit, 
        quantity: numQty, 
        ...(isEditing ? { item_id: editingItem.item_id } : {}) 
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save item');
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#20251F]/50 backdrop-blur-xs animate-fade-in" 
      role="dialog" 
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#E6E8E1] max-h-[92vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E6E8E1] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E5F0E7] text-[#287A52] flex items-center justify-center">
              {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#20251F]">
                {isEditing ? 'Edit Pantry Item' : 'Add Pantry Item'}
              </h2>
              <p className="text-[11px] text-[#6B726A]">
                {isEditing ? 'Update stock quantity or shelf life' : 'Record new ingredient in kitchen inventory'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-[#6B726A] hover:text-[#20251F] rounded-xl hover:bg-[#F1F2ED] transition-colors cursor-pointer" 
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-[#D9534F] text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-[#20251F]">
          
          {/* Ingredient Selector */}
          <div>
            <label className="block uppercase tracking-wider text-[11px] text-[#6B726A] mb-1">
              Ingredient Name <span className="text-[#D9534F]">*</span>
            </label>
            <select 
              required 
              value={form.ingredient_id} 
              onChange={handleIngredientChange} 
              className="w-full px-4 py-2.5 rounded-2xl border border-[#E6E8E1] text-sm bg-white text-[#20251F] focus:outline-none focus:ring-2 focus:ring-[#287A52]/20 focus:border-[#287A52] cursor-pointer"
            >
              <option value="" disabled>Select an ingredient from catalog</option>
              {CATEGORIES.map(category => (
                <optgroup key={category.cat_id} label={`${category.icon} ${category.label}`}>
                  {INGREDIENT_CATALOG.filter(item => item.category === category.label).map(item => (
                    <option key={item.ingredient_id} value={item.ingredient_id}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="custom">Other / Custom ingredient</option>
            </select>
          </div>

          {/* Custom Name input if custom */}
          {isCustom && (
            <div>
              <label className="block uppercase tracking-wider text-[11px] text-[#6B726A] mb-1">
                Custom Name <span className="text-[#D9534F]">*</span>
              </label>
              <input 
                required 
                autoFocus 
                value={form.name} 
                onChange={e => setField('name', e.target.value)} 
                placeholder="e.g. Fresh Basil or Dragon fruit" 
                className="w-full px-4 py-2.5 rounded-2xl border border-[#E6E8E1] text-sm text-[#20251F] focus:outline-none focus:ring-2 focus:ring-[#287A52]/20 focus:border-[#287A52]" 
              />
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block uppercase tracking-wider text-[11px] text-[#6B726A] mb-1">
              Category <span className="text-[#D9534F]">*</span>
            </label>
            <select 
              value={form.category} 
              onChange={handleCategoryChange} 
              className="w-full px-4 py-2.5 rounded-2xl border border-[#E6E8E1] text-sm bg-white text-[#20251F] focus:outline-none focus:ring-2 focus:ring-[#287A52]/20 focus:border-[#287A52] cursor-pointer"
            >
              {CATEGORIES.map(category => (
                <option key={category.cat_id} value={category.label}>
                  {category.icon} {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Unit Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block uppercase tracking-wider text-[11px] text-[#6B726A] mb-1">
                Quantity <span className="text-[#D9534F]">*</span>
              </label>
              <input 
                type="number" 
                min="0.1" 
                step="any" 
                required 
                value={form.quantity} 
                onChange={e => setField('quantity', e.target.value)} 
                className="w-full px-4 py-2.5 rounded-2xl border border-[#E6E8E1] text-sm text-[#20251F] focus:outline-none focus:ring-2 focus:ring-[#287A52]/20 focus:border-[#287A52]" 
              />
            </div>

            <div>
              <label className="block uppercase tracking-wider text-[11px] text-[#6B726A] mb-1">
                Unit <span className="text-[#D9534F]">*</span>
              </label>
              <select 
                value={form.unit} 
                onChange={e => setField('unit', e.target.value)} 
                className="w-full px-4 py-2.5 rounded-2xl border border-[#E6E8E1] text-sm bg-white text-[#20251F] focus:outline-none focus:ring-2 focus:ring-[#287A52]/20 focus:border-[#287A52] cursor-pointer"
              >
                <option value="piece">pieces</option>
                <option value="g">grams (g)</option>
                <option value="kg">kilograms (kg)</option>
                <option value="ml">milliliters (ml)</option>
                <option value="packet">packet / can</option>
                <option value="tbsp">tbsp</option>
                <option value="cup">cup</option>
              </select>
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block uppercase tracking-wider text-[11px] text-[#6B726A] mb-1">
              Expiry Date <span className="text-[#D9534F]">*</span>
            </label>
            <input 
              type="date" 
              required 
              value={form.expiry_date} 
              onChange={e => setField('expiry_date', e.target.value)} 
              className="w-full px-4 py-2.5 rounded-2xl border border-[#E6E8E1] text-sm text-[#20251F] focus:outline-none focus:ring-2 focus:ring-[#287A52]/20 focus:border-[#287A52] cursor-pointer" 
            />
          </div>

          {/* Form Actions: Cancel & Submit buttons */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-[#20251F] bg-[#F8F8F4] border border-[#E6E8E1] hover:bg-[#F1F2ED] transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#287A52] hover:bg-[#1f6342] active:scale-[.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#287A52]/20"
            >
              {isEditing ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add to Inventory'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
