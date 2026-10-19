import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Utensils, Eye, EyeOff, User, Mail, Lock, ChefHat } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const COOKING_LEVELS = [
  { value: 'BEGINNER', emoji: '🍳', label: 'Beginner' },
  { value: 'INTERMEDIATE', emoji: '🔪', label: 'Intermediate' },
  { value: 'ADVANCED', emoji: '👨‍🍳', label: 'Advanced' },
];

export const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, register } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    cooking_level: 'BEGINNER'
  });

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        if (!form.email.trim()) throw new Error('Please enter your email.');
        if (!form.password) throw new Error('Please enter your password.');
        await login({ email: form.email, password: form.password });
      } else {
        if (!form.name.trim()) throw new Error('Please enter your name.');
        if (!form.email.trim()) throw new Error('Please enter your email.');
        if (form.password.length < 4) throw new Error('Password must be at least 4 characters.');
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          cooking_level: form.cooking_level
        });
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
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

          {/* Tab Switcher */}
          <div className="flex bg-[#F8F8F4] rounded-2xl p-1 mb-6 border border-[#E6E8E1]">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                isLogin
                  ? 'bg-white text-[#287A52] shadow-sm border border-[#E6E8E1]'
                  : 'text-[#6B726A] hover:text-[#20251F]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                !isLogin
                  ? 'bg-white text-[#287A52] shadow-sm border border-[#E6E8E1]'
                  : 'text-[#6B726A] hover:text-[#20251F]'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-[#D9534F] text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name (signup only) */}
            {!isLogin && (
              <div>
                <label htmlFor="auth-name" className="block text-xs font-bold text-[#20251F] mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B726A]" />
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#E6E8E1] bg-[#F8F8F4] text-sm text-[#20251F] placeholder:text-[#A3A89F] focus:outline-none focus:ring-2 focus:ring-[#287A52]/30 focus:border-[#287A52] transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="auth-email" className="block text-xs font-bold text-[#20251F] mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B726A]" />
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#E6E8E1] bg-[#F8F8F4] text-sm text-[#20251F] placeholder:text-[#A3A89F] focus:outline-none focus:ring-2 focus:ring-[#287A52]/30 focus:border-[#287A52] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="auth-password" className="block text-xs font-bold text-[#20251F] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B726A]" />
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-11 py-3 rounded-2xl border border-[#E6E8E1] bg-[#F8F8F4] text-sm text-[#20251F] placeholder:text-[#A3A89F] focus:outline-none focus:ring-2 focus:ring-[#287A52]/30 focus:border-[#287A52] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B726A] hover:text-[#20251F] transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Cooking Level (signup only) */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-[#20251F] mb-2">Cooking Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {COOKING_LEVELS.map(level => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, cooking_level: level.value }))}
                      className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                        form.cooking_level === level.value
                          ? 'bg-[#E5F0E7] border-[#287A52] text-[#287A52] shadow-sm'
                          : 'bg-[#F8F8F4] border-[#E6E8E1] text-[#6B726A] hover:border-[#287A52]/30'
                      }`}
                    >
                      <span className="text-lg">{level.emoji}</span>
                      <span>{level.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl text-sm font-bold text-white bg-[#287A52] hover:bg-[#1f6342] active:scale-[0.99] transition-all shadow-md shadow-[#287A52]/20 cursor-pointer disabled:opacity-60 mt-2"
            >
              <ChefHat className="w-4 h-4" />
              <span>
                {loading
                  ? (isLogin ? 'Signing in...' : 'Creating account...')
                  : (isLogin ? 'Sign In' : 'Create Account')}
              </span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] text-[#6B726A]">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={switchMode}
              className="text-[#287A52] font-bold hover:underline cursor-pointer"
            >
              {isLogin ? 'Create one' : 'Sign in'}
            </button>
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
