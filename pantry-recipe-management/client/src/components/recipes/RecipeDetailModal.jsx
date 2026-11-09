import React, { useState } from 'react';
import { X, Clock, UtensilsCrossed, CheckCircle2, AlertCircle, Sparkles, ChefHat, Check, ShoppingCart } from 'lucide-react';
import { RecipeSourceBadge, AvailabilityBadge } from '../common/Badge';
import { ensureClientRichSteps } from '../../services/api';

export const RecipeDetailModal = ({ recipe, isOpen, onClose, onCook }) => {
  const [completedSteps, setCompletedSteps] = useState({});
  const [isCooking, setIsCooking] = useState(false);
  const [activeTab, setActiveTab] = useState('steps'); // 'steps' | 'ingredients' | 'all'

  if (!isOpen || !recipe) return null;

  const availability = recipe.availability;
  const isReady = availability?.isFullyAvailable || availability?.percentage === 100;
  const isAiFallback = recipe.source === 'WEB_RETRIEVED';
  const processedSteps = ensureClientRichSteps(recipe);

  // Compute robust list of ingredients, checking availability.ingredientStatuses, then falling back to recipe.ingredients
  const ingredientList = (availability?.ingredientStatuses && availability.ingredientStatuses.length > 0)
    ? availability.ingredientStatuses
    : (recipe.ingredients || []).map(ing => {
        const missingMatch = availability?.missingIngredients?.find(
          m => m.name && ing.name && m.name.toLowerCase().trim() === ing.name.toLowerCase().trim()
        );
        const isAvail = ing.is_available ?? (!missingMatch);
        const qtyReq = Number(ing.quantity_required ?? ing.quantityRequired ?? ing.quantity ?? 1);
        const availQty = ing.available_in_pantry ?? (missingMatch ? (missingMatch.available ?? 0) : (isAvail ? qtyReq : 0));
        return {
          name: ing.name || ing.ingredientName,
          quantity_required: qtyReq,
          unit: ing.unit || 'piece',
          available_in_pantry: availQty,
          is_available: isAvail,
          status: ing.status || (isAvail ? 'available' : 'missing'),
        };
      });

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

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('steps')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'steps'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5 text-[#287A52]" />
              <span>Step-by-Step ({processedSteps.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ingredients')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'ingredients'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#287A52]" />
              <span>Ingredients ({recipe.ingredients?.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All Details</span>
            </button>
          </div>

          {/* Tab 1: Step-by-Step Cooking Guide (with Detailed Missing Ingredients Panel) */}
          {(activeTab === 'steps' || activeTab === 'all') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-[#287A52]" />
                  <span>Cooking Instructions</span>
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {Object.values(completedSteps).filter(Boolean).length}/{processedSteps.length} complete &middot; Tap step to track
                </span>
              </div>

              {/* Missing Ingredients Detail Panel (prominently shown when step-by-step is open) */}
              {availability?.missingIngredients?.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                        Missing Ingredients &mdash; Action Required
                      </span>
                    </div>
                    <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
                      {availability.missingIngredients.length} item{availability.missingIngredients.length > 1 ? 's' : ''} missing
                    </span>
                  </div>

                  <p className="text-xs text-amber-800/90 mb-3 leading-relaxed">
                    Here is the exact shortfall for each required item before you start cooking:
                  </p>

                  <div className="space-y-2">
                    {availability.missingIngredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/95 rounded-xl p-3 border border-amber-200/80 shadow-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <span className="text-sm font-bold text-slate-900">{ing.name}</span>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>Have in Pantry: <strong className="text-slate-700">{ing.available ?? 0} {ing.unit || 'piece'}</strong></span>
                              <span>&bull;</span>
                              <span>Recipe Needs: <strong className="text-slate-700">{ing.required ?? 1} {ing.unit || 'piece'}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <span className="text-xs font-extrabold text-amber-900 bg-amber-100 border border-amber-300/80 px-2.5 py-1 rounded-xl">
                            Need +{ing.missing ?? 1} {ing.unit || 'piece'} more
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ol className="space-y-3">
                {processedSteps.map((rawStep, idx) => {
                  const isChecked = completedSteps[idx];
                  const cleanStep = rawStep.replace(/^(?:Step\s*\d+[:\.\-]?|\d+[\.\)])\s*/i, '').trim();
                  const phaseMatch = cleanStep.match(/^([^:()]+(?:\s*\([^)]*\))?):\s*(.*)$/);
                  const stepPhase = phaseMatch ? phaseMatch[1].trim() : (idx === 0 ? 'Prepare & Prep' : idx === processedSteps.length - 1 ? 'Finish & Serve' : 'Cook & Sauté');
                  const stepBody = phaseMatch ? phaseMatch[2].trim() : cleanStep;

                  return (
                    <li
                      key={idx}
                      onClick={() => toggleStep(idx)}
                      className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-slate-100/80 border-slate-200 text-slate-400 line-through'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-800 shadow-xs'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                        isChecked
                          ? 'bg-slate-300 text-white'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {isChecked ? <Check className="w-4 h-4" /> : idx + 1}
                      </span>
                      <div className="text-sm leading-relaxed flex-1 pt-0.5">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1.5 border border-emerald-200/60">
                          {stepPhase}
                        </span>
                        <p className="text-slate-800 leading-relaxed text-sm">
                          {stepBody}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Chef's Technique Note */}
              <div className="mt-4 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-slate-700 flex items-start gap-3">
                <ChefHat className="w-5 h-5 text-[#287A52] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-800">Chef's Technique Tip</h4>
                  <p className="mt-0.5 leading-relaxed text-[11px] text-slate-600">
                    Cook on moderate heat for consistent results and to preserve texture. Taste and adjust salt or seasoning during the simmering phase before final plating.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Ingredients Checklist */}
          {(activeTab === 'ingredients' || activeTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-[#287A52]" />
                  <span>Ingredients ({ingredientList.length || recipe.ingredients?.length || 0})</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Pantry inventory check
                </span>
              </div>

              <div className="space-y-2">
                {ingredientList.map((ing, idx) => {
                  const isAvailable = ing.is_available;
                  const shortfall = Math.max(0, (ing.quantity_required || 0) - (ing.available_in_pantry || 0));
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
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isAvailable ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {isAvailable ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <span className="text-sm font-bold">{ing.name}</span>
                          <div className="text-xs text-slate-500">
                            Required: <strong className="text-slate-700">{ing.quantity_required} {ing.unit}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-0.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}>
                          {isAvailable
                            ? `In Stock: ${ing.available_in_pantry} ${ing.unit}`
                            : `Need +${shortfall} ${ing.unit} more`}
                        </span>
                        {!isAvailable && (
                          <span className="text-[10px] text-slate-500">
                            In pantry: {ing.available_in_pantry} {ing.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
