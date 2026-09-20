import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ toast, onClose }) => {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />
  };

  const bgStyles = {
    success: 'border-emerald-200 bg-white text-slate-800 shadow-lg shadow-emerald-500/5',
    warning: 'border-amber-200 bg-white text-slate-800 shadow-lg shadow-amber-500/5',
    error: 'border-rose-200 bg-white text-slate-800 shadow-lg shadow-rose-500/5',
    info: 'border-blue-200 bg-white text-slate-800 shadow-lg shadow-blue-500/5'
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in max-w-sm">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${bgStyles[toast.type || 'success']} transition-all`}>
        {icons[toast.type || 'success']}
        <p className="text-sm font-medium text-slate-700">{toast.message}</p>
        <button
          onClick={onClose}
          className="ml-auto text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
