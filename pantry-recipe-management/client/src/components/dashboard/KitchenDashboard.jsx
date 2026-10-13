import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertOctagon, 
  Package, 
  LayoutGrid, 
  Table as TableIcon,
  ChevronRight,
  Filter,
  X,
  AlertTriangle,
  Pencil,
  Trash2,
  Minus
} from 'lucide-react';
import { usePantry } from '../../context/PantryContext';
import { PantryCard } from '../pantry/PantryCard';
import { AddItemModal } from '../pantry/AddItemModal';
import { CardSkeleton } from '../common/Skeleton';
import { CATEGORIES } from '../../services/mockData';
import { ExpiryPill } from '../pantry/ExpiryPill';

export const KitchenDashboard = ({ onNavigateToCook, onNavigateToPantry }) => {
  const { 
    pantryItems, 
    loading, 
    stats, 
    addItem, 
    updateItem, 
    updateQuantity, 
    removeItem 
  } = usePantry();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'FRESH' | 'EXPIRING' | 'EXPIRED'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Filter pantry items
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

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingItem(null);
  };

  const handleFormSubmit = async (formData) => {
    if (editingItem) {
      await updateItem(editingItem.item_id, formData);
    } else {
      await addItem(formData);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* 1. Header with Primary & Secondary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#20251F] tracking-tight">
            Kitchen Dashboard
          </h1>
          <p className="text-sm text-[#6B726A] mt-1 leading-relaxed">
            Your pantry, recipes, and freshness — all in one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateToCook}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-[#E6E8E1] hover:border-[#287A52]/50 hover:bg-[#F8F8F4] text-[#20251F] text-sm font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#287A52]" />
            <span>Find Recipes</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#287A52] hover:bg-[#1f6342] text-white text-sm font-bold shadow-md shadow-[#287A52]/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Pantry Item</span>
          </button>
        </div>
      </div>

      {/* 2. Summary Statistic Cards (4 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Stock */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'ALL' ? 'ALL' : 'ALL')}
          className={`p-5 rounded-3xl border text-left transition-all cursor-pointer bg-white ${
            statusFilter === 'ALL'
              ? 'border-[#20251F] shadow-sm ring-1 ring-[#20251F]'
              : 'border-[#E6E8E1] hover:border-[#20251F]/30 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6B726A] uppercase tracking-wider">
              Total Stock
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F8F8F4] text-[#20251F] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#20251F]">
            {stats.total}
          </div>
          <div className="text-xs text-[#6B726A] mt-1 font-medium">
            Unique ingredients
          </div>
        </button>

        {/* Fresh */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'FRESH' ? 'ALL' : 'FRESH')}
          className={`p-5 rounded-3xl border text-left transition-all cursor-pointer bg-white ${
            statusFilter === 'FRESH'
              ? 'bg-[#E5F0E7]/60 border-[#287A52] shadow-sm ring-1 ring-[#287A52]'
              : 'border-[#E6E8E1] hover:border-[#287A52]/40 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#287A52] uppercase tracking-wider flex items-center gap-1">
              Fresh
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E5F0E7] text-[#287A52] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#287A52]">
            {stats.fresh}
          </div>
          <div className="text-xs text-[#287A52]/80 mt-1 font-medium">
            &gt; 3 days shelf life
          </div>
        </button>

        {/* Expiring Soon */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'EXPIRING' ? 'ALL' : 'EXPIRING')}
          className={`p-5 rounded-3xl border text-left transition-all cursor-pointer bg-white ${
            statusFilter === 'EXPIRING'
              ? 'bg-amber-50/70 border-[#E6A23C] shadow-sm ring-1 ring-[#E6A23C]'
              : 'border-[#E6E8E1] hover:border-[#E6A23C]/50 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#E6A23C] uppercase tracking-wider">
              Expiring Soon
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#E6A23C] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#E6A23C]">
            {stats.expiringSoon}
          </div>
          <div className="text-xs text-[#E6A23C]/90 mt-1 font-medium">
            Within 1–3 days
          </div>
        </button>

        {/* Expired */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
          className={`p-5 rounded-3xl border text-left transition-all cursor-pointer bg-white ${
            statusFilter === 'EXPIRED'
              ? 'bg-rose-50/70 border-[#D9534F] shadow-sm ring-1 ring-[#D9534F]'
              : 'border-[#E6E8E1] hover:border-[#D9534F]/50 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#D9534F] uppercase tracking-wider">
              Expired
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#D9534F] flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#D9534F]">
            {stats.expired}
          </div>
          <div className="text-xs text-[#D9534F]/90 mt-1 font-medium">
            Needs action
          </div>
        </button>

      </div>

      {/* 3. Expiry Alert Panel */}
      {stats.expiringSoon > 0 ? (
        <div className="p-5 sm:p-6 rounded-3xl bg-amber-50/80 border border-[#E6A23C]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#E6A23C] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#E6A23C]/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#20251F]">
                Items expiring soon
              </h3>
              <p className="text-xs sm:text-sm text-[#6B726A] mt-0.5">
                You have <strong className="text-[#20251F]">{stats.expiringSoon} ingredients</strong> nearing expiration. Use them soon to reduce food waste.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToCook}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#20251F] hover:bg-[#287A52] text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E6A23C]" />
            <span>Find Recipes for Expiring Items</span>
          </button>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-3xl bg-[#E5F0E7]/60 border border-[#287A52]/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#287A52] shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-[#20251F]">
              All items are fresh! You currently have zero upcoming expirations within the next 3 days.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToCook}
            className="text-xs font-bold text-[#287A52] hover:underline shrink-0"
          >
            Cook anyway →
          </button>
        </div>
      )}

      {/* 4. Kitchen Pantry Preview */}
      <div className="bg-white rounded-3xl border border-[#E6E8E1] p-5 sm:p-7 shadow-xs space-y-6">
        
        {/* Section Header & View Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#20251F] tracking-tight">
              Kitchen Pantry
            </h2>
            <p className="text-xs sm:text-sm text-[#6B726A] mt-0.5">
              Current live stock tracked in database. Updated automatically when you cook.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher: Grid vs Table */}
            <div className="flex items-center bg-[#F8F8F4] border border-[#E6E8E1] rounded-2xl p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'bg-white text-[#287A52] shadow-xs' 
                    : 'text-[#6B726A] hover:text-[#20251F]'
                }`}
                title="Grid card view"
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'table' 
                    ? 'bg-white text-[#287A52] shadow-xs' 
                    : 'text-[#6B726A] hover:text-[#20251F]'
                }`}
                title="Table list view"
                aria-label="Table view"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#E5F0E7] text-[#287A52] hover:bg-[#287A52] hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B726A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ingredients (e.g. Milk, Onions, Bread)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-[#E6E8E1] bg-[#F8F8F4] text-sm text-[#20251F] placeholder-[#6B726A] focus:outline-none focus:ring-2 focus:ring-[#287A52]/20 focus:border-[#287A52] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#6B726A] hover:text-[#20251F]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-[#287A52] text-white shadow-xs'
                  : 'bg-[#F8F8F4] text-[#6B726A] hover:text-[#20251F] hover:bg-[#F1F2ED]'
              }`}
            >
              All Categories ({pantryItems.length})
            </button>
            {CATEGORIES.map(category => {
              const count = pantryItems.filter(i => i.category === category.label).length;
              return (
                <button
                  key={category.cat_id}
                  type="button"
                  onClick={() => setSelectedCategory(category.label)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === category.label
                      ? 'bg-[#287A52] text-white shadow-xs'
                      : 'bg-[#F8F8F4] text-[#6B726A] hover:text-[#20251F] hover:bg-[#F1F2ED]'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.label}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 rounded-full ${
                      selectedCategory === category.label ? 'bg-white/20' : 'bg-[#E6E8E1]'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inventory Content Display */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-[#F8F8F4] border border-dashed border-[#E6E8E1]">
            <Package className="w-12 h-12 text-[#6B726A] mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-bold text-[#20251F]">
              {pantryItems.length === 0 
                ? 'Your pantry is empty.' 
                : 'No ingredients found matching your search.'}
            </h3>
            <p className="text-xs text-[#6B726A] max-w-sm mx-auto mt-1">
              {pantryItems.length === 0 
                ? 'Add your first ingredient to get started with recipe recommendations and freshness tracking.'
                : 'Try adjusting your filters or search query to find ingredients.'}
            </p>
            {pantryItems.length === 0 ? (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#287A52] text-white text-xs font-bold shadow-xs hover:bg-[#1f6342] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Ingredient</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); setStatusFilter('ALL'); }}
                className="mt-4 text-xs font-bold text-[#287A52] hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {filteredItems.map(item => (
              <PantryCard
                key={item.item_id}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
                onEdit={handleEdit}
              />
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto rounded-2xl border border-[#E6E8E1]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F8F4] border-b border-[#E6E8E1] text-[#6B726A] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Ingredient</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Freshness</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E8E1]">
                {filteredItems.map(item => (
                  <tr key={item.item_id} className="hover:bg-[#F8F8F4]/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#20251F]">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4 text-[#6B726A]">
                      {item.category}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#20251F]">
                      <div className="inline-flex items-center gap-2 bg-[#F8F8F4] px-2.5 py-1 rounded-xl border border-[#E6E8E1]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.item_id, Math.max(0, item.quantity - (item.unit === 'g' ? 50 : 1)))}
                          className="hover:text-[#D9534F] p-0.5"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span>{item.quantity} {item.unit}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.item_id, item.quantity + (item.unit === 'g' ? 50 : 1))}
                          className="hover:text-[#287A52] p-0.5"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <ExpiryPill expiryInfo={item.expiryInfo} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-[#6B726A] hover:text-[#287A52] hover:bg-[#E5F0E7] rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Remove ${item.name} from pantry?`)) {
                              removeItem(item.item_id, false);
                            }
                          }}
                          className="p-1.5 text-[#6B726A] hover:text-[#D9534F] hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Add / Edit Pantry Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
        editingItem={editingItem}
      />

    </div>
  );
};
