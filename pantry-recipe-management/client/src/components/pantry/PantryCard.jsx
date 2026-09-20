import React, { useState } from 'react';
import { Plus, Minus, Trash2, Calendar, AlertOctagon } from 'lucide-react';
import { ExpiryPill } from './ExpiryPill';

export const PantryCard = ({ item, onUpdateQuantity, onRemove }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleIncrement = async () => {
    const step = (item.unit === 'g' || item.unit === 'ml') ? 50 : 1;
    setIsUpdating(true);
    await onUpdateQuantity(item.item_id, item.quantity + step);
    setIsUpdating(false);
  };

  const handleDecrement = async () => {
    const step = (item.unit === 'g' || item.unit === 'ml') ? 50 : 1;
    if (item.quantity <= step) {
      if (window.confirm(`Remove ${item.name} from pantry?`)) {
        await onRemove(item.item_id, false);
      }
      return;
    }
    setIsUpdating(true);
    await onUpdateQuantity(item.item_id, item.quantity - step);
    setIsUpdating(false);
  };

  const isExpired = item.expiryInfo?.status === 'expired';
  const isExpiringSoon = item.expiryInfo?.status === 'expiring_soon';

  return (
    <div
      className={`group relative bg-white rounded-2xl p-5 border transition-all duration-200 hover:shadow-md ${
        isExpired
          ? 'border-rose-200/90 bg-rose-50/20'
          : isExpiringSoon
          ? 'border-amber-200/80'
          : 'border-slate-100 hover:border-slate-200'
      }`}
    >
      {/* Top row: category & expiry pill */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
          {item.category}
        </span>
        <ExpiryPill expiryInfo={item.expiryInfo} />
      </div>

      {/* Ingredient Name & Stock Quantity */}
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
          {item.name}
        </h3>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {item.quantity}
          </span>
          <span className="text-sm font-semibold text-slate-400">
            {item.unit}
          </span>
        </div>
      </div>

      {/* Bottom Controls: Quick +/- & Remove action */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        
        {/* Quantity Stepper */}
        <div className="flex items-center bg-slate-50 border border-slate-200/70 rounded-xl p-0.5">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={isUpdating}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs transition-all active:scale-95 disabled:opacity-50"
            title="Decrease quantity"
            aria-label={`Decrease ${item.name} quantity`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          
          <span className="px-2 text-xs font-bold text-slate-700 select-none">
            qty
          </span>

          <button
            type="button"
            onClick={handleIncrement}
            disabled={isUpdating}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs transition-all active:scale-95 disabled:opacity-50"
            title="Increase quantity"
            aria-label={`Increase ${item.name} quantity`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expiry / Remove Actions */}
        <div className="flex items-center gap-1">
          {isExpired && (
            <button
              type="button"
              onClick={() => onRemove(item.item_id, true)}
              className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 transition-colors flex items-center gap-1"
              title="Record to Waste Log"
            >
              <AlertOctagon className="w-3 h-3 text-rose-600" />
              <span>Log Waste</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onRemove(item.item_id, false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Delete item"
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
