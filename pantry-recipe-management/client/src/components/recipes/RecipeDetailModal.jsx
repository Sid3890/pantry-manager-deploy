import React, { useState } from 'react';
import { X, Clock, UtensilsCrossed, Star, CheckCircle2, AlertCircle, Sparkles, ChefHat, Database, Check } from 'lucide-react';
import { RecipeSourceBadge, AvailabilityBadge, CookingLevelChip } from '../common/Badge';

export const RecipeDetailModal = ({ recipe, isOpen, onClose, onCook }) => {
  const [completedSteps, setCompletedSteps] = useState({});
  const [isCooking, setIsCooking] = useState(false);

  if (!isOpen || !recipe) return null;

  const availability = recipe.availability;
  const isReady = availability?.isFullyAvailable || availability?.percentage === 100;
  const isAiFallback = recipe.source === 'WEB_RETRIEVED';

  const toggleStep = (index) => {
    setCompletedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleCook = async () => {
    if (!isReady) return;
    setIsCooking(true);
    try {
      await onCook(recipe.recipe_id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCooking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full my-auto shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-modal-title"
      >
        
        {/* Sticky Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4 bg-white z-10 shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <RecipeSourceBadge source={recipe.source} isFallback={isAiFallback} />
              <AvailabilityBadge availability={availability} />
            </div>
            <h2 id="recipe-modal-title" className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              {recipe.name}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {recipe.tagline}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cook Time</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>{recipe.cook_time_min} mins</span>
              </div>
            </div>

            <div className="border-x border-slate-200/80">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Skill Level</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {recipe.difficulty_level}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Utensils</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5 flex items-center justify-center gap-1">
                <UtensilsCrossed className="w-3.5 h-3.5 text-slate-600" />
                <span>{recipe.utensil_count} pan{recipe.utensil_count > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* AI Fallback Details (if applicable) */}
          {isAiFallback && recipe.ai_adaptation && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-indigo-800">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>AI Fallback Recipe Adaptation</span>
              </div>
              <p className="text-indigo-800/90 leading-relaxed">
                <strong className="font-semibold">Web Source:</strong> {recipe.source_attribution}
              </p>
              <p className="text-indigo-800/90 leading-relaxed">
                <strong className="font-semibold">Scaling Rule:</strong> {recipe.ai_adaptation.scaling_note}
              </p>
              <div className="pt-1.5 border-t border-indigo-200/60 flex items-center gap-1 text-[11px] font-semibold text-indigo-700">
                <Check className="w-3 h-3 text-indigo-600" />
                <span>{recipe.ai_adaptation.validation_message}</span>
              </div>
            </div>
          )}

          {/* Ingredients Availability Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Ingredients ({recipe.ingredients.length})
              </h3>
              <span className="text-xs text-slate-400">
                Pantry inventory check
              </span>
            </div>

            <div className="space-y-2">
              {availability?.ingredientStatuses?.map((ing, idx) => {
                const isAvailable = ing.is_available;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isAvailable
                        ? 'bg-emerald-50/40 border-emerald-200/80 text-slate-800'
                        : 'bg-amber-50/60 border-amber-200/90 text-amber-950'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isAvailable ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        {isAvailable ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <span className="text-sm font-bold">{ing.name}</span>
                        <div className="text-xs text-slate-500">
                          Recipe requires: <strong className="text-slate-700">{ing.quantity_required} {ing.unit}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        isAvailable
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {isAvailable
                          ? `In Stock: ${ing.available_in_pantry} ${ing.unit}`
                          : `Missing (Have: ${ing.available_in_pantry} ${ing.unit})`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step-by-Step Cooking Guide with Interactive Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Cooking Instructions
              </h3>
              <span className="text-xs text-slate-400">
                Tap steps to track progress
              </span>
            </div>

            <ol className="space-y-2.5">
              {recipe.steps.map((step, idx) => {
                const isChecked = completedSteps[idx];
                return (
                  <li
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-slate-100/80 border-slate-200 text-slate-400 line-through'
                        : 'bg-white border-slate-100 hover:border-slate-200 text-slate-800'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                      isChecked
                        ? 'bg-slate-300 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-sm leading-relaxed pt-0.5">
                      {step}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

        </div>

        {/* Fixed Footer: Single Clear "Cook This" Action */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-slate-500">
            {isReady ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                All ingredients verified in stock
              </span>
            ) : (
              <span className="text-amber-800 font-semibold flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Missing {availability?.missingIngredients?.length || 1} required ingredient
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!isReady || isCooking}
            onClick={handleCook}
            className={`px-6 py-3 rounded-2xl text-sm font-extrabold shadow-md transition-all flex items-center gap-2 cursor-pointer ${
              isReady
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 active:scale-98'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>{isCooking ? 'Deducting Stock...' : 'Cook This Recipe'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
