import React, { useEffect, useState } from 'react';
import { X, Plus, Pencil } from 'lucide-react';
import { CATEGORIES } from '../../services/mockData';
import { INGREDIENT_CATALOG, findCanonicalIngredient } from '../../services/ingredientCatalog';

const defaultForm = { ingredient_id: '', name: '', category: CATEGORIES[1].label, quantity: '1', unit: 'piece', expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) };

export const AddItemModal = ({ isOpen, onClose, onSubmit, editingItem = null }) => {
  const [form, setForm] = useState(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      const canonical = findCanonicalIngredient(editingItem.name);
      setForm({ ingredient_id: String(canonical?.ingredient_id || editingItem.ingredient_id || ''), name: canonical?.name || editingItem.name, category: canonical?.category || editingItem.category, quantity: String(editingItem.quantity), unit: editingItem.unit, expiry_date: editingItem.expiry_date });
    } else setForm(defaultForm);
  }, [editingItem, isOpen]);

  if (!isOpen) return null;
  const isEditing = Boolean(editingItem);
  const isCustom = form.ingredient_id === 'custom';
  const setField = (key, value) => setForm(previous => ({ ...previous, [key]: value }));

  const handleIngredientChange = event => {
    const value = event.target.value;
    if (value === 'custom') {
      setForm(previous => ({ ...previous, ingredient_id: 'custom', name: '' }));
      return;
    }
    const selected = INGREDIENT_CATALOG.find(item => String(item.ingredient_id) === value);
    if (selected) setForm(previous => ({ ...previous, ingredient_id: String(selected.ingredient_id), name: selected.name, category: selected.category, unit: selected.unit }));
  };

  const handleCategoryChange = event => {
    const category = event.target.value;
    const selected = CATEGORIES.find(item => item.label === category);
    const expiry = new Date(); expiry.setDate(expiry.getDate() + (selected?.shelf_life_days || 7));
    setForm(previous => ({ ...previous, category, expiry_date: expiry.toISOString().slice(0, 10) }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (!form.name.trim() || Number(form.quantity) <= 0) return;
    const canonical = findCanonicalIngredient(form.name);
    setIsSubmitting(true);
    try {
      await onSubmit({ ...form, ingredient_id: canonical?.ingredient_id || (form.ingredient_id === 'custom' ? undefined : Number(form.ingredient_id) || undefined), name: canonical?.name || form.name.trim(), category: canonical?.category || form.category, unit: form.unit, quantity: Number(form.quantity), ...(isEditing ? { item_id: editingItem.item_id } : {}) });
      onClose();
    } finally { setIsSubmitting(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in" role="dialog" aria-modal="true">
    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">{isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}</div><h2 className="text-lg font-bold text-slate-900">{isEditing ? 'Edit Pantry Item' : 'Add Pantry Item'}</h2></div>
        <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors" aria-label="Close dialog"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Choose Ingredient
          <select required value={form.ingredient_id} onChange={handleIngredientChange} className="mt-1.5 w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
            <option value="" disabled>Select an ingredient</option>
            {CATEGORIES.map(category => <optgroup key={category.cat_id} label={`${category.icon} ${category.label}`}>{INGREDIENT_CATALOG.filter(item => item.category === category.label).map(item => <option key={item.ingredient_id} value={item.ingredient_id}>{item.name}</option>)}</optgroup>)}
            <option value="custom">Other / custom ingredient</option>
          </select>
        </label>
        {isCustom && <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Custom Ingredient Name<input required autoFocus value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Dragon fruit" className="mt-1.5 w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" /></label>}
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Category<select value={form.category} onChange={handleCategoryChange} className="mt-1.5 w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm bg-white">{CATEGORIES.map(category => <option key={category.cat_id} value={category.label}>{category.icon} {category.label}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Quantity<input type="number" min="0.1" step="any" required value={form.quantity} onChange={e => setField('quantity', e.target.value)} className="mt-1.5 w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm" /></label><label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Unit<select value={form.unit} onChange={e => setField('unit', e.target.value)} className="mt-1.5 w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm bg-white"><option value="piece">pieces</option><option value="g">grams</option><option value="kg">kilograms</option><option value="ml">milliliters</option><option value="packet">packet / can</option></select></label></div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Expiry Date<input type="date" required value={form.expiry_date} onChange={e => setField('expiry_date', e.target.value)} className="mt-1.5 w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm" /></label>
        <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-2xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2">{isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}<span>{isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add to Inventory'}</span></button>
      </form>
    </div>
  </div>;
};
