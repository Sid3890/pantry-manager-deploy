import React, { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Utensils } from 'lucide-react';
import { startGoogleLogin } from '../../const';

export const AuthScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('authError');
    if (authError) {
      setError('Google sign-in could not be completed. Please try again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGoogleLogin = () => {
    setError('');
    setLoading(true);
    startGoogleLogin();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 mb-4 transition-transform hover:scale-105">
          <Utensils className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Pantry & Recipe Manager</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
          Know what you have, discover what you can cook right now, and prevent food waste.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-900">Sign in to your kitchen</h2>
            <p className="mt-2 text-sm text-slate-500">
              Use your Google account to securely access your pantry and saved recipes.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full mt-7 flex items-center justify-center gap-3 py-3 px-4 rounded-2xl text-sm font-bold text-slate-800 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] transition-all shadow-sm disabled:opacity-50"
          >
            <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-base font-bold">G</span>
            <span>{loading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>

          <p className="mt-5 text-center text-xs text-slate-400">
            Your Google password is never shared with PantryManager.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Secure Google authentication with server-side sessions</span>
        </p>
      </div>
    </div>
  );
};
