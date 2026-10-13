import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, SlidersHorizontal, ChevronDown, ChevronUp, Database, CheckCircle2, ChefHat } from 'lucide-react';
import { api } from '../../services/api';
import { usePantry } from '../../context/PantryContext';
import { RecipeCard } from './RecipeCard';
import { RecipeFilters } from './RecipeFilters';
import { RecipeCardSkeleton } from '../common/Skeleton';
import { CookingLevelChip } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';

export const WhatCanICook = ({ onSelectRecipe }) => {
  const { pantryItems } = usePantry();
  const { currentUser, updateCookingLevel } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasTriggeredSearch, setHasTriggeredSearch] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false); // Collapsed by default!
  const [meta, setMeta] = useState({ database_matches: 0, ai_fallbacks: 0, ready_to_cook_count: 0 });
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL'); // 'ALL' | 'READY' | 'ALMOST'
  const [cookingLevel, setCookingLevel] = useState(currentUser?.cooking_level || 'BEGINNER');

  const [filters, setFilters] = useState({
    maxTime: '',
    dietary: 'ALL',
    difficulty: 'ALL'
  });

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setHasTriggeredSearch(true);
    try {
      const res = await api.recipes.getRecommendations({ ...filters, cookingLevel });
      setRecipes(res.recipes);
      setMeta(res.metadata || {});
    } catch (err) {
      console.error('Error fetching recommendations', err);
    } finally {
      setLoading(false);
    }
  }, [filters, cookingLevel]);

  // Initial load on first render
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleResetFilters = () => {
    setFilters({ maxTime: '', dietary: 'ALL', difficulty: 'ALL' });
  };

  const hasActiveFilters = Boolean(filters.maxTime || filters.dietary !== 'ALL' || filters.difficulty !== 'ALL');

  // Filter recommendations by availability tab
  const displayedRecipes = recipes.filter(r => {
    if (availabilityFilter === 'READY') {
      return r.availability?.percentage === 100;
    }
    if (availabilityFilter === 'ALMOST') {
      return r.availability?.percentage >= 75 && r.availability?.percentage < 100;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* Hero Section with Single Prominent CTA */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#287A52] via-[#216b46] to-[#1a5537] p-8 sm:p-12 text-white shadow-xl shadow-[#287A52]/15">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-emerald-100 mb-4 border border-white/20">
            <Database className="w-3.5 h-3.5" />
            <span>Database Recipe Search + Real Web Fallback</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            What Can I Cook Right Now?
          </h1>
          
          <p className="mt-2 text-emerald-100/90 text-sm sm:text-base leading-relaxed">
            Instantly matches your current {pantryItems.length} pantry ingredients against verified recipes. If none match completely, recipes are retrieved and scaled to your exact pantry quantities.
          </p>

          {/* Prominent Action CTA Button */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={fetchRecommendations}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-white text-[#287A52] text-sm font-extrabold shadow-lg shadow-black/10 hover:bg-[#F8F8F4] active:scale-98 transition-all disabled:opacity-75 cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 text-[#287A52] ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Evaluating Pantry Stock...' : 'Find What I Can Cook'}</span>
            </button>

            {/* Collapsed Filter Toggle Button */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="inline-flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isFilterOpen ? 'Hide Filters' : 'Filter by Time & Diet'}</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#E6A23C]"></span>
              )}
              {isFilterOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-white/15">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 mb-2">Cooking experience level</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-xl">
              {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map(level => (
                <CookingLevelChip key={level} level={level} interactive selected={cookingLevel === level} onClick={async () => { setCookingLevel(level); await updateCookingLevel(level); }} />
              ))}
            </div>
          </div>
        </div>

        {/* Decorative subtle background icon */}
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 text-white pointer-events-none select-none">
          <ChefHat className="w-72 h-72" />
        </div>
      </div>

      {/* Summary of currently available pantry ingredients */}
      <div className="bg-white p-5 rounded-3xl border border-[#E6E8E1] space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#20251F]">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#287A52]" />
            <span>Currently Available In Your Pantry ({pantryItems.length} ingredients)</span>
          </span>
          <span className="text-[11px] text-[#6B726A] font-normal">Used to match recipes below</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {pantryItems.length === 0 ? (
            <span className="text-xs text-[#6B726A] italic">No ingredients in pantry yet.</span>
          ) : (
            pantryItems.map(item => (
              <span key={item.item_id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#F8F8F4] border border-[#E6E8E1] text-xs font-semibold text-[#20251F]">
                <span>{item.name}</span>
                <span className="text-[10px] text-[#6B726A]">({item.quantity} {item.unit})</span>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Collapsible Filters Bar (Collapsed by default for 3-second simplicity) */}
      {isFilterOpen && (
        <RecipeFilters
          filters={filters}
          onChange={setFilters}
          onReset={handleResetFilters}
        />
      )}

      {/* Recommendation Results Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold text-slate-900">
            Recommended Dishes
          </h2>
          
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800 font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {meta.ready_to_cook_count} Ready to Cook
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100/70 text-indigo-800 font-semibold">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              {meta.ai_fallbacks} AI Web Fallback
            </span>
          </div>
        </div>

        {/* Availability Filter Segment */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl self-start sm:self-auto text-xs font-semibold">
          <button
            onClick={() => setAvailabilityFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              availabilityFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Results ({recipes.length})
          </button>
          <button
            onClick={() => setAvailabilityFilter('READY')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              availabilityFilter === 'READY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ready Now (100%)
          </button>
          <button
            onClick={() => setAvailabilityFilter('ALMOST')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              availabilityFilter === 'ALMOST'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Almost There
          </button>
        </div>
      </div>

      {/* Recipe Cards Feed */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <RecipeCardSkeleton />
          <RecipeCardSkeleton />
          <RecipeCardSkeleton />
        </div>
      ) : displayedRecipes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <ChefHat className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No matching recipes found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try loosening your cooking time or dietary filters, or add more items to your pantry.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedRecipes.map(recipe => (
            <RecipeCard
              key={recipe.recipe_id}
              recipe={recipe}
              onSelect={onSelectRecipe}
            />
          ))}
        </div>
      )}

    </div>
  );
};
