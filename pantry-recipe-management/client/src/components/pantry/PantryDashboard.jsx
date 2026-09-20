import React, { useState } from 'react';
import { Plus, Search, Filter, AlertTriangle, Sparkles, CheckCircle2, Clock, AlertOctagon, PackageCheck } from 'lucide-react';
import { usePantry } from '../../context/PantryContext';
import { PantryCard } from './PantryCard';
import { AddItemModal } from './AddItemModal';
import { CardSkeleton } from '../common/Skeleton';
import { CATEGORIES } from '../../services/mockData';

export const PantryDashboard = ({ onNavigateToCook }) => {
  const { pantryItems, loading, stats, addItem, updateQuantity, removeItem } = usePantry();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'FRESH' | 'EXPIRING' | 'EXPIRED'

  // Filtered pantry list
  const filteredItems = pantryItems.filter(item => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = 
      statusFilter === 'ALL' ? true :
      statusFilter === 'FRESH' ? item.expiryInfo?.status === 'fresh' :
      statusFilter === 'EXPIRING' ? item.expiryInfo?.status === 'expiring_soon' :
      statusFilter === 'EXPIRED' ? item.expiryInfo?.status === 'expired' : true;

    return matchesCategory && matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* Top Banner: Greeting & Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Kitchen Pantry
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Current live stock tracked in Oracle database. Updated automatically when you cook.
          </p>
        </div>

        {/* Prominent Quick Add CTA */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Pantry Item</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Items */}
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-white border-slate-900 shadow-sm ring-1 ring-slate-900'
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Stock</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-1">Unique ingredients</div>
        </button>

        {/* Fresh Items */}
        <button
          type="button"
          onClick={() => setStatusFilter('FRESH')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all ${
            statusFilter === 'FRESH'
              ? 'bg-emerald-50/70 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fresh</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-900">{stats.fresh}</div>
          <div className="text-[11px] text-emerald-600/80 mt-1">&gt; 3 days shelf life</div>
        </button>

        {/* Expiring Soon */}
        <button
          type="button"
          onClick={() => setStatusFilter('EXPIRING')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all ${
            statusFilter === 'EXPIRING'
              ? 'bg-amber-50/70 border-amber-500 shadow-sm ring-1 ring-amber-500'
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Expiring Soon</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-900">{stats.expiringSoon}</div>
          <div className="text-[11px] text-amber-700/80 mt-1">Within 1–3 days</div>
        </button>

        {/* Expired */}
        <button
          type="button"
          onClick={() => setStatusFilter('EXPIRED')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all ${
            statusFilter === 'EXPIRED'
              ? 'bg-rose-50/70 border-rose-500 shadow-sm ring-1 ring-rose-500'
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            <span>Expired</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-900">{stats.expired}</div>
          <div className="text-[11px] text-rose-600/80 mt-1">Needs action</div>
        </button>

      </div>

      {/* Expiry Action Alert Banner */}
      {stats.expiringSoon > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                You have {stats.expiringSoon} ingredient{stats.expiringSoon > 1 ? 's' : ''} nearing expiration!
              </h4>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Cook a meal now to rescue these ingredients before they are logged to waste.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToCook}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Find Recipes for Expiring Items</span>
          </button>
        </div>
      )}

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ingredients (e.g. Bread, Paneer)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Category Filter Pills (Scrollable horizontally on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Categories
          </button>

          {CATEGORIES.map(cat => (
            <button
              key={cat.cat_id}
              onClick={() => setSelectedCategory(cat.label)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.label
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

      </div>

      {/* Pantry Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <PackageCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No pantry items found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'ALL'
              ? 'Try adjusting your search query or filter criteria.'
              : 'Your pantry is currently empty. Add your kitchen ingredients to get instant recipe recommendations!'}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Ingredient</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <PantryCard
              key={item.item_id}
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
            />
          ))}
        </div>
      )}

      {/* Floating Action Button for Mobile */}
      <div className="sm:hidden fixed bottom-20 right-5 z-30">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-13 h-13 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-600/40 active:scale-95 transition-transform"
          aria-label="Add item"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addItem}
      />

    </div>
  );
};
