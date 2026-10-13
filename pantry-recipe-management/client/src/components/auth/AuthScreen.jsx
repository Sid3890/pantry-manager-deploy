import React, { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Utensils, Sparkles, ChefHat } from 'lucide-react';
import { startGoogleLogin } from '../../const';
import { useAuth } from '../../context/AuthContext';

export const AuthScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginAsDemo } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('authError');
    if (authError) {
      setError('Google sign-in could not be completed. You can continue with Demo Kitchen or check credentials.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGoogleLogin = () => {
    setError('');
    setLoading(true);
    startGoogleLogin();
  };

  return (
    <div className="min-h-screen bg-[#F8F8F4] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#287A52] selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-[#287A52] flex items-center justify-center text-white shadow-lg shadow-[#287A52]/25 mb-5 transition-transform hover:scale-105">
          <Utensils className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-[#20251F] tracking-tight">
          PantryWise <span className="text-sm font-semibold bg-[#E5F0E7] text-[#287A52] px-2.5 py-1 rounded-full align-middle ml-1">Smart Kitchen</span>
        </h1>
        <p className="mt-2.5 text-sm text-[#6B726A] max-w-sm mx-auto leading-relaxed">
          Know what you have, discover what you can cook right now, and prevent food waste.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-[#E6E8E1] shadow-xl shadow-[#20251F]/5">
          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-[#D9534F] text-xs font-medium">
              {error}
            </div>
          )}

          <div className="text-center">
            <h2 className="text-lg font-bold text-[#20251F]">Sign in to your kitchen</h2>
            <p className="mt-1.5 text-xs text-[#6B726A]">
              Connect with Google or jump directly into the demo kitchen.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full mt-6 flex items-center justify-center gap-3 py-3 px-4 rounded-2xl text-sm font-bold text-[#20251F] bg-white border border-[#E6E8E1] hover:border-[#287A52]/40 hover:bg-[#F8F8F4] active:scale-[0.99] transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-[#287A52]">G</span>
            <span>{loading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
            <ArrowRight className="w-4 h-4 text-[#6B726A]" />
          </button>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E6E8E1]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-[#6B726A] font-medium">or instant preview</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loginAsDemo()}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-sm font-bold text-white bg-[#287A52] hover:bg-[#1f6342] active:scale-[0.99] transition-all shadow-md shadow-[#287A52]/20 cursor-pointer"
          >
            <ChefHat className="w-4 h-4" />
            <span>Open Demo Kitchen (Instant Access)</span>
          </button>

          <p className="mt-5 text-center text-[11px] text-[#6B726A]">
            Includes sample inventory, real-time recipe matching, and waste reports.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[#6B726A] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#287A52]" />
          <span>Secure session signing & privacy-first storage</span>
        </p>
      </div>
    </div>
  );
};
