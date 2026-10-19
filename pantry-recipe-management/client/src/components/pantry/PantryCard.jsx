import React, { useState } from 'react';
import { Plus, Minus, Trash2, Pencil, AlertOctagon } from 'lucide-react';
import { ExpiryPill } from './ExpiryPill';

export const PantryCard = ({ item, onUpdateQuantity, onRemove, onEdit }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

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
        setIsRemoving(true); await onRemove(item.item_id, false);
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
      className={`group relative bg-white rounded-3xl p-5 border transition-all duration-200 hover:shadow-md ${isRemoving ? 'opacity-0 scale-95 -translate-y-1 pointer-events-none' : ''} ${
        isExpired
          ? 'border-rose-200/90 bg-rose-50/20'
          : isExpiringSoon
          ? 'border-[#E6A23C]/50'
          : 'border-[#E6E8E1] hover:border-[#287A52]/30'
      }`}
    >
      {/* Top row: category & expiry pill */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[11px] font-bold text-[#6B726A] uppercase tracking-wider truncate">
          {item.category}
        </span>
        <ExpiryPill expiryInfo={item.expiryInfo} />
      </div>

      {/* Ingredient Name & Stock Quantity */}
      <div className="mb-4">
        <h3 className="text-base font-extrabold text-[#20251F] group-hover:text-[#287A52] transition-colors">
          {item.name}
        </h3>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-[#20251F] tracking-tight">
            {item.quantity}
          </span>
          <span className="text-xs font-bold text-[#6B726A]">
            {item.unit}
          </span>
        </div>
      </div>

      {/* Bottom Controls: Quick +/- & Actions */}
      <div className="pt-3 border-t border-[#E6E8E1] flex items-center justify-between">
        
        {/* Quantity Stepper */}
        <div className="flex items-center bg-[#F8F8F4] border border-[#E6E8E1] rounded-xl p-0.5">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={isUpdating}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6B726A] hover:bg-white hover:text-[#D9534F] hover:shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Decrease quantity"
            aria-label={`Decrease ${item.name} quantity`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          
          <span className="px-2 text-xs font-bold text-[#20251F] select-none">
            qty
          </span>

          <button
            type="button"
            onClick={handleIncrement}
            disabled={isUpdating}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6B726A] hover:bg-white hover:text-[#287A52] hover:shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
              className="px-2 py-1 rounded-xl text-[11px] font-bold text-[#D9534F] bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
              title="Record to Waste Log"
            >
              <AlertOctagon className="w-3 h-3 text-[#D9534F]" />
              <span>Log Waste</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-xl text-[#6B726A] hover:text-[#287A52] hover:bg-[#E5F0E7] transition-all active:scale-90 cursor-pointer"
            title="Edit item"
            aria-label={`Edit ${item.name}`}
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => { if (window.confirm(`Remove "${item.name}" from your pantry?`)) { setIsRemoving(true); onRemove(item.item_id, false); } }}
            className="p-1.5 rounded-xl text-[#6B726A] hover:text-[#D9534F] hover:bg-rose-50 transition-all active:scale-90 cursor-pointer"
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
