import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PantryProvider, usePantry } from './context/PantryContext';
import { Navbar } from './components/common/Navbar';
import { Toast } from './components/common/Toast';
import { AuthScreen } from './components/auth/AuthScreen';
import { PantryDashboard } from './components/pantry/PantryDashboard';
import { WhatCanICook } from './components/recipes/WhatCanICook';
import { RecipeDetailModal } from './components/recipes/RecipeDetailModal';
import { CookingConfirmationModal } from './components/recipes/CookingConfirmationModal';
import { WasteReports } from './components/reports/WasteReports';
import { Database, Sparkles, CheckCircle2 } from 'lucide-react';

const MainAppContent = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { cookRecipe, cookingResult, clearCookingResult, toast, showToast } = usePantry();
  
  const [currentTab, setCurrentTab] = useState('pantry'); // 'pantry' | 'cook' | 'reports'
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Loading Pantry System...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500 selection:text-white pb-20 md:pb-8">
      {/* Top / Mobile Responsive Navbar */}
      <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Screen Content */}
      <main className="flex-1">
        {currentTab === 'pantry' && (
          <PantryDashboard onNavigateToCook={() => setCurrentTab('cook')} />
        )}
        {currentTab === 'cook' && (
          <WhatCanICook onSelectRecipe={(recipe) => setSelectedRecipe(recipe)} />
        )}
        {currentTab === 'reports' && (
          <WasteReports onNavigateToCook={() => setCurrentTab('cook')} />
        )}
      </main>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        isOpen={Boolean(selectedRecipe)}
        onClose={() => setSelectedRecipe(null)}
        onCook={async (recipeId) => {
          await cookRecipe(recipeId);
        }}
      />

      {/* Cooking Confirmation / Stock Deduction Modal */}
      <CookingConfirmationModal
        result={cookingResult}
        onClose={clearCookingResult}
        onNavigateToPantry={() => setCurrentTab('pantry')}
      />

      {/* Global Toast Notification */}
      <Toast toast={toast} onClose={() => showToast(null)} />

      {/* Footer System Status */}
      <footer className="mt-auto border-t border-slate-200/70 bg-white/60 py-4 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span className="font-semibold text-slate-600">Oracle Relational DB + Express REST</span>
            <span className="text-slate-300">•</span>
            <span>Mock Client Adapter Active (Zero-Rewrite Backend Ready)</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-slate-500">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>SQL Match (Primary)</span>
            </span>
            <span className="text-slate-300">/</span>
            <span className="flex items-center gap-1 text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>AI Web Fallback</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <PantryProvider>
        <MainAppContent />
      </PantryProvider>
    </AuthProvider>
  );
}
