import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { PantryProvider, usePantry } from '../context/PantryContext';
import { Sidebar } from '../components/layout/Sidebar';
import { TopHeader } from '../components/layout/TopHeader';
import { Toast } from '../components/common/Toast';
import { AuthScreen } from '../components/auth/AuthScreen';
import { KitchenDashboard } from '../components/dashboard/KitchenDashboard';
import { MyPantryView } from '../components/pantry/MyPantryView';
import { WhatCanICook } from '../components/recipes/WhatCanICook';
import { RecipeDetailModal } from '../components/recipes/RecipeDetailModal';
import { CookingConfirmationModal } from '../components/recipes/CookingConfirmationModal';
import { WasteReports } from '../components/reports/WasteReports';
import { LayoutDashboard, Package, Sparkles, BarChart3 } from 'lucide-react';

function PantryAppMain() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { cookRecipe, cookingResult, clearCookingResult, toast, showToast, stats } = usePantry();
  
  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard' | 'pantry' | 'cook' | 'reports'
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F8F4] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#287A52] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-[#6B726A] uppercase tracking-wider">
            Loading PantryWise System...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const mobileNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pantry', label: 'Pantry', icon: Package, badge: stats.total },
    { id: 'cook', label: 'Cook', icon: Sparkles },
    { id: 'reports', label: 'Reports', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-[#F8F8F4] flex selection:bg-[#287A52] selection:text-white">
      
      {/* 1. Left Fixed / Sticky Sidebar (Desktop & Tablet Drawer) */}
      <Sidebar 
        currentTab={currentTab} 
        onSelectTab={setCurrentTab} 
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        
        {/* Sticky Top Header with user section */}
        <TopHeader 
          currentTab={currentTab}
          onOpenMobile={() => setIsMobileMenuOpen(true)}
        />

        {/* View Switcher Content */}
        <main className="flex-1">
          {currentTab === 'dashboard' && (
            <KitchenDashboard 
              onNavigateToCook={() => setCurrentTab('cook')} 
              onNavigateToPantry={() => setCurrentTab('pantry')}
            />
          )}

          {currentTab === 'pantry' && (
            <MyPantryView 
              onNavigateToCook={() => setCurrentTab('cook')} 
            />
          )}

          {currentTab === 'cook' && (
            <WhatCanICook 
              onSelectRecipe={(recipe) => setSelectedRecipe(recipe)} 
            />
          )}

          {currentTab === 'reports' && (
            <WasteReports 
              onNavigateToCook={() => setCurrentTab('cook')} 
            />
          )}
        </main>
      </div>

      {/* 3. Mobile Bottom Navigation Bar (Non-overlapping & Spaced) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E6E8E1] px-3 py-2 flex items-center justify-around shadow-lg">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl text-xs font-bold transition-all relative cursor-pointer ${
                isActive
                  ? 'text-[#287A52]'
                  : 'text-[#6B726A] hover:text-[#20251F]'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${
                isActive ? 'bg-[#E5F0E7] text-[#287A52]' : ''
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] leading-tight">{item.label}</span>
              {item.badge > 0 && !isActive && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#287A52] ring-2 ring-white"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        isOpen={Boolean(selectedRecipe)}
        onClose={() => setSelectedRecipe(null)}
        onCook={async (recipeId) => {
          await cookRecipe(recipeId);
        }}
      />

      {/* 5. Cooking Confirmation Modal with stock deduction feedback */}
      <CookingConfirmationModal
        result={cookingResult}
        onClose={clearCookingResult}
        onNavigateToPantry={() => setCurrentTab('pantry')}
      />

      {/* 6. Global Notification Toast */}
      <Toast toast={toast} onClose={() => showToast(null)} />

    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <PantryProvider>
        <PantryAppMain />
      </PantryProvider>
    </AuthProvider>
  );
}
