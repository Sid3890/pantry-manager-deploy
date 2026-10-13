import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Sparkles, 
  BarChart3, 
  Utensils, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { usePantry } from '../../context/PantryContext';

export const Sidebar = ({ currentTab, onSelectTab, isMobileOpen, onCloseMobile }) => {
  const { stats } = usePantry();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      description: 'Kitchen overview & status'
    },
    {
      id: 'pantry',
      label: 'My Pantry',
      icon: Package,
      badge: stats.total > 0 ? stats.total : null,
      alertBadge: stats.expired > 0 || stats.expiringSoon > 0,
      description: 'Stock & expiry management'
    },
    {
      id: 'cook',
      label: 'What Can I Cook?',
      icon: Sparkles,
      highlight: true,
      badge: null,
      description: 'Real-time recipe matching'
    },
    {
      id: 'reports',
      label: 'Waste & Reports',
      icon: BarChart3,
      badge: null,
      description: 'Analytics & food savings'
    }
  ];

  const content = (
    <div className="h-full flex flex-col justify-between p-4 sm:p-5 bg-white border-r border-[#E6E8E1] select-none">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#E6E8E1]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#287A52] flex items-center justify-center text-white shadow-md shadow-[#287A52]/20 shrink-0">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-[#20251F]">
                  PantryWise
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#287A52] bg-[#E5F0E7] px-2 py-0.5 rounded-full inline-block mt-0.5">
                Smart Kitchen
              </span>
            </div>
          </div>
          {isMobileOpen && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl text-[#6B726A] hover:bg-[#F1F2ED] md:hidden cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold tracking-wider uppercase text-[#6B726A]/80">
            Kitchen Menu
          </div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-150 cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#E5F0E7] text-[#287A52] shadow-xs'
                      : 'text-[#20251F] hover:bg-[#F8F8F4] hover:text-[#287A52]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-xl ${
                      isActive ? 'bg-[#287A52] text-white' : 'text-[#6B726A]'
                    }`}>
                      <Icon className="w-4 h-4 shrink-0" />
                    </div>
                    <div className="truncate">
                      <div className="truncate">{item.label}</div>
                      <div className={`text-[10px] truncate ${
                        isActive ? 'text-[#287A52]/80 font-normal' : 'text-[#6B726A] font-normal'
                      }`}>
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {item.badge !== null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isActive 
                          ? 'bg-[#287A52] text-white' 
                          : 'bg-[#F1F2ED] text-[#20251F]'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {item.alertBadge && (
                      <span className="w-2 h-2 rounded-full bg-[#E6A23C]" title="Items need attention" />
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Health Card */}
      <div className="mt-6 pt-5 border-t border-[#E6E8E1] space-y-3">
        <div className="p-3.5 rounded-2xl bg-[#F8F8F4] border border-[#E6E8E1]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-[#20251F]">Kitchen Freshness</span>
            <span className="text-xs font-extrabold text-[#287A52]">
              {stats.total > 0 ? Math.round((stats.fresh / stats.total) * 100) : 100}%
            </span>
          </div>
          <div className="w-full bg-[#E6E8E1] h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-[#287A52] h-full transition-all duration-500 rounded-full"
              style={{ width: `${stats.total > 0 ? (stats.fresh / stats.total) * 100 : 100}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#6B726A]">
            <span>{stats.fresh} fresh items</span>
            {stats.expiringSoon > 0 ? (
              <span className="text-[#E6A23C] font-semibold">{stats.expiringSoon} soon</span>
            ) : (
              <span className="text-[#287A52] font-semibold">0 expiring</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-1 text-[11px] text-[#6B726A]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#287A52]" />
            <span>Live Stock Sync</span>
          </span>
          <span className="text-[10px] text-[#6B726A]">v1.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed left) */}
      <aside className="hidden md:block w-64 lg:w-72 shrink-0 h-screen sticky top-0 z-30">
        {content}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-[#20251F]/40 backdrop-blur-xs z-50 md:hidden animate-fade-in"
          onClick={onCloseMobile}
        >
          {/* Drawer content */}
          <div 
            className="w-72 max-w-[85vw] h-full bg-white shadow-2xl relative animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
};
