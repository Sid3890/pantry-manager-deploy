import React from 'react';
import { Clock, UtensilsCrossed, Star, ArrowRight, Sparkles, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
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
          ? 'border-[#287A52]/30 hover:border-[#287A52] hover:shadow-[#287A52]/5'
          : 'border-[#E6E8E1] hover:border-[#287A52]/30'
      }`}
    >
      <div>
        
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <RecipeSourceBadge source={recipe.source} isFallback={isAiFallback} />
          <AvailabilityBadge availability={availability} />
        </div>

        {/* Recipe Title & Tagline */}
        <h3 className="text-lg font-bold text-[#20251F] group-hover:text-[#287A52] transition-colors leading-snug">
          {recipe.name}
        </h3>
        
        <p className="mt-1 text-xs text-[#6B726A] line-clamp-2 leading-relaxed">
          {recipe.tagline}
        </p>

        {/* AI Fallback Explanation Banner */}
        {isAiFallback && recipe.ai_adaptation && (
          <div className="mt-3 p-3 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-[11px] text-indigo-900">
            <div className="flex items-center justify-between gap-2 font-bold text-indigo-800">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>{recipe.source_attribution}</span>
              </span>
              {recipe.source_url && (
                <a 
                  href={recipe.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline flex items-center gap-0.5 text-indigo-600 font-normal"
                >
                  <span>Link</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
            <p className="mt-1 text-indigo-700/90 leading-tight">
              {recipe.ai_adaptation.scaling_note}
            </p>
          </div>
        )}

        {/* Missing Ingredient Warning */}
        {isAlmost && availability.missingIngredients?.length > 0 && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200/70 text-xs text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="truncate">
              <span className="font-bold">Missing: </span>
              <span>
                {availability.missingIngredients.map(m => `${m.missing} ${m.unit} ${m.name}`).join(', ')}
              </span>
            </div>
          </div>
        )}

        {/* Metadata Chips: Time, Difficulty, Utensils */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#6B726A]">
          <span className="inline-flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5 text-[#287A52]" />
            <span>{recipe.cook_time_min}m</span>
          </span>

          <span className="text-[#E6E8E1]">•</span>

          <span className="inline-flex items-center gap-1 font-medium">
            <UtensilsCrossed className="w-3.5 h-3.5 text-[#6B726A]" />
            <span>{recipe.utensil_count} utensil{recipe.utensil_count > 1 ? 's' : ''}</span>
          </span>

          <span className="text-[#E6E8E1]">•</span>

          <span className="inline-flex items-center gap-1 font-bold text-[#20251F]">
            <Star className="w-3.5 h-3.5 fill-[#E6A23C] text-[#E6A23C]" />
            <span>{recipe.rating}</span>
            <span className="text-[#6B726A] font-normal">({recipe.reviews_count})</span>
          </span>
        </div>

        {/* Dietary Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recipe.dietary_tags.map(tag => (
            <span key={tag} className="px-2.5 py-0.5 rounded-lg bg-[#F8F8F4] border border-[#E6E8E1] text-[11px] font-medium text-[#6B726A]">
              {tag}
            </span>
          ))}
        </div>

      </div>

      {/* Action CTA */}
      <div className="mt-6 pt-4 border-t border-[#E6E8E1] flex items-center justify-between">
        <div className="text-xs text-[#6B726A] font-medium">
          {recipe.ingredients.length} required ingredients
        </div>

        <button
          type="button"
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            isReady
              ? 'bg-[#287A52] text-white group-hover:bg-[#1f6342] shadow-xs'
              : 'bg-[#F8F8F4] border border-[#E6E8E1] text-[#20251F] group-hover:bg-[#E5F0E7] group-hover:text-[#287A52]'
          }`}
        >
          <span>{isReady ? 'Ready to Cook' : 'View Recipe'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
