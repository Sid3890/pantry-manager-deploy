import React from 'react';
import { RotateCcw } from 'lucide-react';

export const RecipeFilters = ({ filters, onChange, onReset }) => {
  const timeOptions = [
    { label: 'Any Time', value: '' },
    { label: '≤ 15 mins', value: '15' },
    { label: '≤ 25 mins', value: '25' },
    { label: '≤ 35 mins', value: '35' }
  ];

  const dietaryOptions = [
    { label: 'All Diets', value: 'ALL' },
    { label: 'Vegetarian', value: 'Vegetarian' },
    { label: 'High Protein', value: 'High Protein' },
    { label: 'Gluten Free', value: 'Gluten Free' }
  ];

  const difficultyOptions = [
    { label: 'Any Level', value: 'ALL' },
    { label: 'Beginner', value: 'BEGINNER' },
    { label: 'Intermediate', value: 'INTERMEDIATE' }
  ];

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Refine Recipe Recommendations
        </h3>
        <button
          onClick={onReset}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Max Cooking Time */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Max Cook Time
          </label>
          <div className="flex flex-wrap gap-1.5">
            {timeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => onChange({ ...filters, maxTime: opt.value })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filters.maxTime === opt.value
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Preferences */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Dietary Requirement
          </label>
          <div className="flex flex-wrap gap-1.5">
            {dietaryOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => onChange({ ...filters, dietary: opt.value })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filters.dietary === opt.value
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Skill / Difficulty Level */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Cooking Difficulty
          </label>
          <div className="flex flex-wrap gap-1.5">
            {difficultyOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => onChange({ ...filters, difficulty: opt.value })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filters.difficulty === opt.value
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
