import React from 'react';
import { Clock, UtensilsCrossed, Star, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { RecipeSourceBadge, AvailabilityBadge } from '../common/Badge';

export const RecipeCard = ({ recipe, onSelect }) => {
  const isAiFallback = recipe.source === 'WEB_RETRIEVED';
  const availability = recipe.availability;
  const isReady = availability?.isFullyAvailable || availability?.percentage === 100;
  const isAlmost = availability?.tier === 'almost' || (availability?.percentage >= 75 && availability?.percentage < 100);

  return (
    <div
      onClick={() => onSelect(recipe)}
      className={`group relative bg-white rounded-3xl p-6 border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-lg ${
        isAiFallback
          ? 'border-indigo-100 hover:border-indigo-300 hover:shadow-indigo-500/5'
          : isReady
          ? 'border-emerald-200/90 hover:border-emerald-400 hover:shadow-emerald-500/5'
          : 'border-slate-100 hover:border-slate-300'
      }`}
    >
      <div>
        
        {/* Top Badges: Source Distinction (DB Verified vs AI Fallback) & Availability */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <RecipeSourceBadge source={recipe.source} isFallback={isAiFallback} />
          <AvailabilityBadge availability={availability} />
        </div>

        {/* Recipe Title & Tagline */}
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
          {recipe.name}
        </h3>
        
        <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {recipe.tagline}
        </p>

        {/* AI Fallback Explanation Banner (Only for AI fallback recipes) */}
        {isAiFallback && recipe.ai_adaptation && (
          <div className="mt-3 p-2.5 rounded-2xl bg-indigo-50/80 border border-indigo-100/80 text-[11px] text-indigo-900">
            <div className="flex items-center gap-1 font-semibold text-indigo-800">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>{recipe.source_attribution}</span>
            </div>
            <p className="mt-0.5 text-indigo-700/90 leading-tight">
              {recipe.ai_adaptation.scaling_note}
            </p>
          </div>
        )}

        {/* Missing Ingredient Warning (For Almost There 75-99%) */}
        {isAlmost && availability.missingIngredients?.length > 0 && (
          <div className="mt-3 p-2.5 rounded-2xl bg-amber-50 border border-amber-200/70 text-xs text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="truncate">
              <span className="font-bold">Missing: </span>
              <span>
                {availability.missingIngredients.map(m => `${m.missing} ${m.unit} ${m.name}`).join(', ')}
              </span>
            </div>
          </div>
        )}

        {/* Metadata Chips: Time, Difficulty, Utensils, Rating */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{recipe.cook_time_min}m</span>
          </span>

          <span className="text-slate-300">•</span>

          <span className="inline-flex items-center gap-1">
            <UtensilsCrossed className="w-3.5 h-3.5 text-slate-400" />
            <span>{recipe.utensil_count} utensil{recipe.utensil_count > 1 ? 's' : ''}</span>
          </span>

          <span className="text-slate-300">•</span>

          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{recipe.rating}</span>
            <span className="text-slate-400 font-normal">({recipe.reviews_count})</span>
          </span>
        </div>

        {/* Dietary Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recipe.dietary_tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-lg bg-slate-100 text-[11px] font-medium text-slate-600">
              {tag}
            </span>
          ))}
        </div>

      </div>

      {/* Action CTA */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="text-xs text-slate-500 font-medium">
          {recipe.ingredients.length} required ingredients
        </div>

        <button
          type="button"
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isReady
              ? 'bg-emerald-600 text-white group-hover:bg-emerald-700 shadow-xs'
              : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
          }`}
        >
          <span>{isReady ? 'Ready to Cook' : 'View Recipe'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
