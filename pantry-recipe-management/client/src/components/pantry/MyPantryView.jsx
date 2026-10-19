import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Sparkles, 
  Package, 
  LayoutGrid, 
  Table as TableIcon,
  Filter,
  X,
  Pencil,
  Trash2,
  Minus,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertOctagon
} from 'lucide-react';
import { usePantry } from '../../context/PantryContext';
import { PantryCard } from './PantryCard';
import { AddItemModal } from './AddItemModal';
import { CardSkeleton } from '../common/Skeleton';
import { CATEGORIES } from '../../services/mockData';
import { ExpiryPill } from './ExpiryPill';

export const MyPantryView = ({ onNavigateToCook }) => {
  const { 
    pantryItems, 
    loading, 
    stats, 
    addItem, 
    updateItem, 
    updateQuantity, 
    removeItem,
    clearPantry 
  } = usePantry();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('expiry'); // 'expiry' | 'name' | 'quantity'
  const [viewMode, setViewMode] = useState('grid');

  // Filter & sort
  let filteredItems = pantryItems.filter(item => {
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

  filteredItems.sort((a, b) => {
    if (sortBy === 'expiry') {
      const aDays = a.expiryInfo?.daysRemaining ?? 999;
      const bDays = b.expiryInfo?.daysRemaining ?? 999;
      return aDays - bDays;
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'quantity') {
      return b.quantity - a.quantity;
    }
    return 0;
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
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#20251F] tracking-tight">
            My Pantry Inventory
          </h1>
          <p className="text-sm text-[#6B726A] mt-1 leading-relaxed">
            Manage your kitchen stock, track expiry dates, and keep your ingredients fresh.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateToCook}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-[#E6E8E1] hover:border-[#287A52]/50 hover:bg-[#F8F8F4] text-[#20251F] text-sm font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#287A52]" />
            <span>Cook from Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#287A52] hover:bg-[#1f6342] text-white text-sm font-bold shadow-md shadow-[#287A52]/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Pantry Item</span>
          </button>

          {pantryItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Are you sure you want to clear all ${pantryItems.length} items from your pantry? This cannot be undone.`)) {
                  clearPantry();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-[#D9534F] text-xs font-bold active:scale-[0.98] transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Pantry</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E6E8E1] pb-3">
        {[
          { id: 'ALL', label: 'All Items', count: stats.total },
          { id: 'FRESH', label: 'Fresh', count: stats.fresh, color: 'text-[#287A52]' },
          { id: 'EXPIRING', label: 'Expiring Soon', count: stats.expiringSoon, color: 'text-[#E6A23C]' },
          { id: 'EXPIRED', label: 'Expired', count: stats.expired, color: 'text-[#D9534F]' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === tab.id
                ? 'bg-[#20251F] text-white shadow-xs'
                : 'bg-white border border-[#E6E8E1] text-[#6B726A] hover:text-[#20251F]'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 rounded-full text-[10px] ${
              statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-[#F1F2ED] text-[#20251F]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Filter & Inventory Container */}
      <div className="bg-white rounded-3xl border border-[#E6E8E1] p-5 sm:p-7 shadow-xs space-y-6">
        
        {/* Search, Sort, View Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B726A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pantry ingredients..."
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

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#F8F8F4] border border-[#E6E8E1] px-3 py-2 rounded-2xl text-xs font-semibold text-[#20251F]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#6B726A]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="expiry">Sort: Expiry Date</option>
                <option value="name">Sort: Name (A-Z)</option>
                <option value="quantity">Sort: Quantity</option>
              </select>
            </div>

            {/* View Switcher */}
            <div className="flex items-center bg-[#F8F8F4] border border-[#E6E8E1] rounded-2xl p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'bg-white text-[#287A52] shadow-xs' 
                    : 'text-[#6B726A] hover:text-[#20251F]'
                }`}
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
                aria-label="Table view"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
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

        {/* Inventory List / Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-14 px-4 rounded-3xl bg-[#F8F8F4] border border-dashed border-[#E6E8E1]">
            <Package className="w-12 h-12 text-[#6B726A] mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-bold text-[#20251F]">
              No pantry items found
            </h3>
            <p className="text-xs text-[#6B726A] max-w-sm mx-auto mt-1">
              Try adjusting your search criteria or category filter.
            </p>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); setStatusFilter('ALL'); }}
              className="mt-4 text-xs font-bold text-[#287A52] hover:underline"
            >
              Clear all filters
            </button>
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
          <div className="overflow-x-auto rounded-2xl border border-[#E6E8E1]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F8F4] border-b border-[#E6E8E1] text-[#6B726A] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Ingredient</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Stock Quantity</th>
                  <th className="py-3 px-4">Shelf Life / Expiry</th>
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
                          title="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span>{item.quantity} {item.unit}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.item_id, item.quantity + (item.unit === 'g' ? 50 : 1))}
                          className="hover:text-[#287A52] p-0.5"
                          title="Increase"
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

      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
        editingItem={editingItem}
      />

    </div>
  );
};
