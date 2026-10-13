import React from 'react';
import { Menu, RotateCcw, LogOut, Utensils, ChefHat } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePantry } from '../../context/PantryContext';
import { CookingLevelChip } from '../common/Badge';

export const TopHeader = ({ currentTab, onOpenMobile }) => {
  const { currentUser, logout } = useAuth();
  const { resetDemoData } = usePantry();

  const getTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return { title: 'Kitchen Dashboard', subtitle: 'Pantry overview, recipes & freshness' };
      case 'pantry':
        return { title: 'My Pantry', subtitle: 'Live inventory tracked in real time' };
      case 'cook':
        return { title: 'What Can I Cook?', subtitle: 'Recipe recommendations from your stock' };
      case 'reports':
        return { title: 'Waste & Reports', subtitle: 'Kitchen analytics & food waste prevention' };
      default:
        return { title: 'PantryWise', subtitle: 'Smart Kitchen' };
    }
  };

  const { title } = getTitle();

  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of your kitchen?')) {
      logout();
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#E6E8E1] px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobile}
            className="p-2 rounded-xl text-[#20251F] hover:bg-[#F1F2ED] md:hidden cursor-pointer"
            aria-label="Open kitchen menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-lg font-bold text-[#20251F] tracking-tight">
              {title}
            </h2>
          </div>
        </div>

        {/* Right: User Section & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser && (
            <div className="flex items-center gap-2.5 bg-[#F8F8F4] border border-[#E6E8E1] pl-2 pr-3 py-1.5 rounded-2xl text-xs">
              <div className="w-7 h-7 rounded-full bg-[#E5F0E7] text-[#287A52] flex items-center justify-center font-bold text-xs ring-1 ring-[#287A52]/20">
                {initials}
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-[#20251F]">{currentUser.name}</span>
              </div>
              <span className="text-[#E6E8E1] hidden sm:inline">|</span>
              <CookingLevelChip level={currentUser.cooking_level} />
            </div>
          )}

          {/* Reset Demo Data Button */}
          <button
            type="button"
            onClick={resetDemoData}
            className="p-2 rounded-xl text-[#6B726A] hover:text-[#20251F] hover:bg-[#F1F2ED] transition-colors cursor-pointer"
            title="Reset sample pantry & log data"
            aria-label="Reset sample data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl text-[#6B726A] hover:text-[#D9534F] hover:bg-rose-50 transition-colors cursor-pointer"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
