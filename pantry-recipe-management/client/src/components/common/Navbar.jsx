import React from 'react';
import { Utensils, Refrigerator, Sparkles, BarChart3, RotateCcw, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePantry } from '../../context/PantryContext';
import { CookingLevelChip } from './Badge';

export const Navbar = ({ currentTab, onSelectTab }) => {
  const { currentUser, logout, updateCookingLevel } = useAuth();
  const { stats, resetDemoData } = usePantry();

  const navItems = [
    {
      id: 'pantry',
      label: 'My Pantry',
      icon: Refrigerator,
      badge: stats.total > 0 ? stats.total : null,
      alertBadge: stats.expired > 0 || stats.expiringSoon > 0
    },
    {
      id: 'cook',
      label: 'What Can I Cook?',
      icon: Sparkles,
      highlight: true
    },
    {
      id: 'reports',
      label: 'Waste & Reports',
      icon: BarChart3
    }
  ];

  return (
    <>
      {/* Desktop & Tablet Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo / App Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                  PantryWise <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">Smart Kitchen</span>
                </span>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Oracle DB + AI Fallback System</p>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? item.highlight
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive && item.highlight ? 'text-white' : ''}`} />
                    <span>{item.label}</span>
                    {item.badge !== null && (
                      <span className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-slate-100 text-slate-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* User Profile & Demo Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {currentUser && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 pl-2 pr-3 py-1 rounded-2xl text-xs font-medium text-slate-700">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline font-semibold">{currentUser.name}</span>
                  <span className="text-slate-300 hidden sm:inline">|</span>
                  <CookingLevelChip level={currentUser.cooking_level} />
                </div>
              )}

              {/* Reset Data Button */}
              <button
                onClick={resetDemoData}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Reset sample pantry & log data"
                aria-label="Reset demo data"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-xs font-semibold transition-all relative ${
                isActive
                  ? 'text-emerald-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1.5 rounded-xl ${isActive ? 'bg-emerald-100/70 text-emerald-700' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px]">{item.label}</span>
              {item.alertBadge && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white"></span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
};
