import React from 'react';

// 1. Waste Over Time Chart (Simple, sleek SVG Bar Chart)
export const WasteOverTimeChart = ({ data = [] }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.wasteKg), 4);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Waste Over Time</h3>
          <p className="text-xs text-slate-400">Monthly total discarded food weight (kg)</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          Last 4 Months
        </span>
      </div>

      <div className="pt-6 pb-2">
        <div className="h-44 flex items-end justify-between gap-3 sm:gap-6 px-2">
          {data.map((item, idx) => {
            const heightPercent = Math.round((item.wasteKg / maxVal) * 100);
            const isLatest = idx === data.length - 1;

            return (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="text-[11px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {item.wasteKg} kg
                </div>
                
                <div className="w-full bg-slate-100 rounded-2xl h-36 flex items-end p-1">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-xl transition-all duration-500 ${
                      isLatest
                        ? 'bg-emerald-500 group-hover:bg-emerald-600'
                        : 'bg-slate-300 group-hover:bg-slate-400'
                    }`}
                  ></div>
                </div>

                <div className="text-xs font-semibold text-slate-500">
                  {item.month}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 2. Most Wasted Ingredients (Horizontal ranking bars)
export const MostWastedChart = ({ ingredients = [] }) => {
  const maxQty = ingredients.length > 0 ? Math.max(...ingredients.map(i => i.quantity), 1) : 1;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Most-Wasted Ingredients</h3>
          <p className="text-xs text-slate-400">Ingredients logged to waste most frequently</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
          Ranked
        </span>
      </div>

      <div className="space-y-3.5 pt-2">
        {ingredients.map((item, idx) => {
          const widthPercent = Math.min(100, Math.round((item.quantity / maxQty) * 100));

          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-800 flex items-center gap-2">
                  <span className="w-4 text-slate-400 font-bold">{idx + 1}.</span>
                  <span>{item.name}</span>
                </span>
                <span className="text-slate-500">
                  {item.quantity} {item.unit}
                </span>
              </div>

              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${widthPercent}%` }}
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 3. Category Breakdown (Proportional distribution)
export const WasteCategoryChart = ({ categories = [] }) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Waste by Food Category</h3>
          <p className="text-xs text-slate-400">Proportional loss breakdown</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          Breakdown
        </span>
      </div>

      <div className="space-y-4 pt-2">
        {/* Stacked Proportional Bar */}
        <div className="w-full h-4 rounded-full overflow-hidden flex shadow-inner">
          {categories.map((c, i) => (
            <div
              key={i}
              style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
              title={`${c.category}: ${c.percentage}%`}
              className="h-full transition-all hover:opacity-90"
            ></div>
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          {categories.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: c.color }}
              ></span>
              <span className="text-slate-600 font-medium truncate">{c.category}</span>
              <span className="ml-auto font-bold text-slate-800">{c.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
