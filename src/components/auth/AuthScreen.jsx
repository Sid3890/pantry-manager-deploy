import React, { useState } from 'react';
import { Utensils, ArrowRight, ShieldCheck, Sparkles, ChefHat } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CookingLevelChip } from '../common/Badge';

export const AuthScreen = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('Alex Rivera');
  const [email, setEmail] = useState('alex.rivera@kitchen.io');
  const [password, setPassword] = useState('pantrypass123');
  const [cookingLevel, setCookingLevel] = useState('BEGINNER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Please enter your name.');
        await register({ name, email, password, cooking_level: cookingLevel });
      } else {
        await login({ email, password });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (level = 'BEGINNER') => {
    setCookingLevel(level);
    login({ email: `demo.${level.toLowerCase()}@kitchen.io`, password: 'demo' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        
        {/* Brand Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 mb-4 transition-transform hover:scale-105">
          <Utensils className="w-7 h-7" />
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Pantry & Recipe Manager
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
          Know what you have, discover what you can cook right now, and prevent food waste.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
          
          {/* Mode Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                !isRegister ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                isRegister ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maya Lin"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="chef@kitchen.io"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Cooking Level Selector (Required: Friendly icon-based chips, NOT a dropdown) */}
            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Your Cooking Experience
              </label>
              <p className="text-xs text-slate-400 mb-2.5">
                Helps match recipes that fit your kitchen skill level.
              </p>
              
              <div className="grid grid-cols-1 gap-2">
                <CookingLevelChip
                  level="BEGINNER"
                  interactive
                  selected={cookingLevel === 'BEGINNER'}
                  onClick={() => setCookingLevel('BEGINNER')}
                />
                <CookingLevelChip
                  level="INTERMEDIATE"
                  interactive
                  selected={cookingLevel === 'INTERMEDIATE'}
                  onClick={() => setCookingLevel('INTERMEDIATE')}
                />
                <CookingLevelChip
                  level="ADVANCED"
                  interactive
                  selected={cookingLevel === 'ADVANCED'}
                  onClick={() => setCookingLevel('ADVANCED')}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <span>{loading ? 'Connecting...' : isRegister ? 'Start Cooking Smarter' : 'Sign In to Kitchen'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Login Preset */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-400 block mb-2.5">Or try a 1-click test profile:</span>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => handleQuickDemo('BEGINNER')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                🍳 Beginner Cook
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('INTERMEDIATE')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                🔪 Intermediate
              </button>
            </div>
          </div>

        </div>

        <p className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Synchronized with Oracle Relational Database & AI Fallback Engine</span>
        </p>
      </div>
    </div>
  );
};
