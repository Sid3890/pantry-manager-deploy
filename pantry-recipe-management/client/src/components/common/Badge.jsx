import React from 'react';
import { Database, Sparkles, CheckCircle2, AlertCircle, Clock, ChefHat } from 'lucide-react';

export const RecipeSourceBadge = ({ source, isFallback = false, attribution }) => {
  if (source === 'MANUAL' || !isFallback) {
    return (
      <span 
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs"
        title="SQL matched directly against your Oracle pantry inventory"
      >
        <Database className="w-3.5 h-3.5 text-emerald-600" />
        <span>Verified Pantry Match</span>
      </span>
    );
  }

  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs"
      title="Retrieved from real web sources and scaled proportionally by AI fallback logic"
    >
      <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
      <span>AI Suggested Fallback</span>
    </span>
  );
};

export const AvailabilityBadge = ({ availability }) => {
  if (!availability) return null;
  const { percentage, tier, missingIngredients } = availability;

  if (tier === 'ready' || percentage === 100) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Ready to Cook (100%)</span>
      </span>
    );
  }

  if (tier === 'almost' || (percentage >= 75 && percentage < 100)) {
    const missingName = missingIngredients?.[0]?.name || '1 item';
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs" title={`Missing: ${missingName}`}>
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Almost there • Missing {missingName}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
      <span>{percentage}% in stock</span>
    </span>
  );
};

export const CookingLevelChip = ({ level, selected, onClick, interactive = false }) => {
  const meta = {
    BEGINNER: { label: 'Beginner', icon: '🍳', desc: 'Simple & quick' },
    INTERMEDIATE: { label: 'Intermediate', icon: '🔪', desc: 'Balanced variety' },
    ADVANCED: { label: 'Advanced', icon: '👨‍🍳', desc: 'Chefy & complex' }
  }[level] || { label: level, icon: '🍳', desc: '' };

  const isSelected = Boolean(selected);

  if (!interactive) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
        <span>{meta.icon}</span>
        <span>{meta.label}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all duration-150 text-left ${
        isSelected
          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <span className="text-xl">{meta.icon}</span>
      <div>
        <div className="text-xs font-bold leading-tight">{meta.label}</div>
        <div className="text-[11px] text-slate-500 font-normal">{meta.desc}</div>
      </div>
    </button>
  );
};
