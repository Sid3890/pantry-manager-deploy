import React, { useState, useEffect } from 'react';
import { Trash2, DollarSign, Sparkles, RefreshCw, CheckCircle2, CalendarDays } from 'lucide-react';
import { api } from '../../services/api';
import { WasteOverTimeChart, MostWastedChart, WasteCategoryChart } from './MiniCharts';

export const WasteReports = ({ onNavigateToCook }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
      try {
        setLoading(true);
        const data = await api.reports.getWasteData();
        setReportData(data);
      } catch (err) {
        console.error('Failed to load waste analytics', err);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading || !reportData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-xl w-1/4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-28 bg-slate-100 rounded-2xl"></div>
          <div className="h-28 bg-slate-100 rounded-2xl"></div>
          <div className="h-28 bg-slate-100 rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-100 rounded-3xl"></div>
          <div className="h-64 bg-slate-100 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#20251F] tracking-tight">
            Waste & Prevention Reports
          </h1>
          <p className="text-sm text-[#6B726A] mt-1 leading-relaxed">
            Live overview of discarded ingredients, financial impact, and food waste prevention score.
          </p>
        </div>
        <button 
          type="button" 
          onClick={fetchReport} 
          disabled={loading} 
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-[#E6E8E1] text-xs font-bold text-[#20251F] hover:border-[#287A52]/50 hover:bg-[#F8F8F4] transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Waste Logged */}
        <div className="bg-white rounded-3xl p-6 border border-[#E6E8E1] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B726A] uppercase tracking-wider">
              Total Waste Logged
            </span>
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-[#D9534F] flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-[#20251F]">
            {reportData.totalItemsWasted} <span className="text-sm font-semibold text-[#6B726A]">items</span>
          </div>
          <p className="text-xs text-[#6B726A] mt-1">
            Logged from pantry actions
          </p>
        </div>

        {/* Estimated Value Lost */}
        <div className="bg-white rounded-3xl p-6 border border-[#E6E8E1] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B726A] uppercase tracking-wider">
              Estimated Value Lost
            </span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-[#E6A23C] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-[#20251F]">
            ${reportData.totalEstimatedCost}
          </div>
          <p className="text-xs text-[#6B726A] mt-1">
            Cost of discarded ingredients
          </p>
        </div>

        {/* Waste Prevention Rate */}
        <div className="bg-white rounded-3xl p-6 border border-[#E6E8E1] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#287A52] uppercase tracking-wider">
              Rescue Efficiency
            </span>
            <div className="w-9 h-9 rounded-2xl bg-[#E5F0E7] text-[#287A52] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-[#287A52]">
            {reportData.preventionScore}%
          </div>
          <p className="text-xs text-[#287A52]/80 mt-1">
            Ingredients cooked before expiration
          </p>
        </div>

      </div>

      {/* Actionable Prevention Banner */}
      <div className="bg-[#E5F0E7]/70 border border-[#287A52]/20 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#287A52] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#20251F]">
              Kitchen Waste Prevention Tip
            </h3>
            <p className="text-xs text-[#6B726A] mt-0.5 max-w-xl leading-relaxed">
              Vegetables and Dairy represent over 80% of historical waste. Check recipes utilizing near-expiry items to keep your prevention score high.
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToCook}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#287A52] hover:bg-[#1f6342] text-white text-xs font-bold shadow-xs active:scale-95 transition-all whitespace-nowrap cursor-pointer shrink-0"
        >
          <span>Find Recipes for Expiring Items</span>
        </button>
      </div>

      {/* 2-3 Simple Visual Charts (Not a dense data table!) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Waste Over Time */}
        <WasteOverTimeChart data={reportData.monthlyTrends} />

        {/* Chart 2: Most-Wasted Ingredients */}
        <MostWastedChart ingredients={reportData.topWastedIngredients} />

      </div>

      {/* Chart 3: Category Breakdown */}
      <div className="max-w-2xl">
        <WasteCategoryChart categories={reportData.categoryBreakdown} />
      </div>

      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-4"><div><h3 className="text-sm font-bold text-slate-900">Recent waste log</h3><p className="text-xs text-slate-400 mt-1">Items removed as expired or intentionally discarded.</p></div><CalendarDays className="w-5 h-5 text-slate-400" /></div>
        {reportData.recentLogs?.length ? <div className="divide-y divide-slate-100">{reportData.recentLogs.map(item => <div key={item.waste_id} className="py-3 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-800">{item.name}</p><p className="text-xs text-slate-400">{item.expired_on} · {item.category}</p></div><div className="text-right"><p className="text-sm font-bold text-rose-700">{item.quantity_wasted} {item.unit}</p><p className="text-xs text-slate-400">${Number(item.estimated_cost || 0).toFixed(2)}</p></div></div>)}</div> : <p className="py-6 text-sm text-emerald-700 bg-emerald-50 rounded-2xl text-center">No waste has been logged. Great work.</p>}
      </section>

    </div>
  );
};
