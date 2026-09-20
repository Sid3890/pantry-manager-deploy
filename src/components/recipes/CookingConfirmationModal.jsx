import React from 'react';
import { CheckCircle2, ArrowRight, Refrigerator, Sparkles, Database, Check } from 'lucide-react';

export const CookingConfirmationModal = ({ result, onClose, onNavigateToPantry }) => {
  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center relative overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cook-success-title"
      >
        
        {/* Celebration Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-50">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h2 id="cook-success-title" className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Cooked to Perfection!
        </h2>
        
        <p className="mt-1 text-sm text-slate-500 font-medium">
          {result.recipe_name} has been prepared and logged to Oracle cooking history.
        </p>

        {/* Automatic Stock Deduction Card */}
        <div className="mt-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200/60 text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Pantry Stock Deductions</span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-700 normal-case font-semibold">
              <Database className="w-3 h-3" />
              <span>Oracle Synchronized</span>
            </span>
          </div>

          <div className="space-y-2">
            {result.deductions?.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1">
                <span className="font-bold text-slate-800">{d.name}</span>
                
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-rose-600">
                    -{d.quantity_deducted} {d.unit}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="font-medium text-slate-600">
                    {d.new_quantity} {d.unit} left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Action Buttons */}
        <div className="mt-6 space-y-2">
          <button
            onClick={() => {
              onClose();
              onNavigateToPantry();
            }}
            className="w-full py-3 px-4 rounded-2xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Refrigerator className="w-4 h-4" />
            <span>View Updated Pantry</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-2xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cook Another Dish
          </button>
        </div>

      </div>
    </div>
  );
};
