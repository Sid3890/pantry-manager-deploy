import React, { useState } from 'react';
import { X, Plus, Calendar, Tag, Layers, Check } from 'lucide-react';
import { CATEGORIES } from '../../services/mockData';

export const AddItemModal = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[1].label); // Produce default
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('piece');

  // Default expiry date: 7 days from simulation date (2026-09-20) -> 2026-09-27
  const [expiryDate, setExpiryDate] = useState('2026-09-27');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCategoryChange = (e) => {
    const selectedCat = CATEGORIES.find(c => c.label === e.target.value);
    setCategory(e.target.value);
    if (selectedCat) {
      // Auto-set expiry date based on shelf life
      const baseDate = new Date('2026-09-20');
      baseDate.setDate(baseDate.getDate() + selectedCat.shelf_life_days);
      setExpiryDate(baseDate.toISOString().split('T')[0]);

      // Set default reasonable unit
      if (selectedCat.label.includes('Grains') || selectedCat.label.includes('Dairy')) {
        setUnit('g');
        setQuantity('250');
      } else if (selectedCat.label.includes('Oils')) {
        setUnit('ml');
        setQuantity('250');
      } else {
        setUnit('piece');
        setQuantity('2');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        name: name.trim(),
        category,
        quantity: Number(quantity),
        unit,
        expiry_date: expiryDate
      });
      // Reset form
      setName('');
      setQuantity('1');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-item-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <h2 id="add-item-title" className="text-lg font-bold text-slate-900">
              Add Pantry Item
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Ingredient Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Ingredient Name
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Greek Yogurt, Bell Peppers..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={handleCategoryChange}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white transition-all"
            >
              {CATEGORIES.map(c => (
                <option key={c.cat_id} value={c.label}>
                  {c.icon} {c.label} ({c.shelf_life_days}d shelf life)
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Unit (Inline) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Quantity
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white transition-all"
              >
                <option value="piece">pieces (count)</option>
                <option value="g">grams (g)</option>
                <option value="kg">kilograms (kg)</option>
                <option value="ml">milliliters (ml)</option>
                <option value="packet">packet / can</option>
              </select>
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Expiry Date
            </label>
            <input
              type="date"
              required
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-2xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving to Pantry...' : 'Add to Inventory'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
