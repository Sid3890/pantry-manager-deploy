import React from 'react';

export const CardSkeleton = () => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="h-4 bg-slate-200 rounded-md w-1/3"></div>
      <div className="h-6 bg-slate-100 rounded-full w-20"></div>
    </div>
    <div className="h-3 bg-slate-100 rounded-md w-1/2 mb-4"></div>
    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
      <div className="h-4 bg-slate-200 rounded-md w-16"></div>
      <div className="h-7 bg-slate-100 rounded-xl w-20"></div>
    </div>
  </div>
);

export const RecipeCardSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs animate-pulse">
    <div className="flex justify-between items-start gap-4 mb-4">
      <div className="space-y-2 flex-1">
        <div className="h-5 bg-slate-200 rounded-md w-2/3"></div>
        <div className="h-3 bg-slate-100 rounded-md w-5/6"></div>
      </div>
      <div className="h-6 bg-slate-100 rounded-full w-24"></div>
    </div>
    <div className="flex gap-2 mb-5">
      <div className="h-5 bg-slate-100 rounded-md w-14"></div>
      <div className="h-5 bg-slate-100 rounded-md w-16"></div>
    </div>
    <div className="h-10 bg-slate-200 rounded-xl w-full"></div>
  </div>
);
