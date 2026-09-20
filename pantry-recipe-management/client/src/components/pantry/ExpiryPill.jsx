import React from 'react';
import { Clock, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';

export const ExpiryPill = ({ expiryInfo }) => {
  if (!expiryInfo) return null;
  const { status, label, daysRemaining } = expiryInfo;

  if (status === 'expired') {
    return (
      <span 
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200"
        title="Item has passed its expiry date"
      >
        <AlertOctagon className="w-3 h-3 text-rose-600" />
        <span>{label || 'Expired'}</span>
      </span>
    );
  }

  if (status === 'expiring_soon') {
    return (
      <span 
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200"
        title="Expiring within 3 days — use soon!"
      >
        <AlertTriangle className="w-3 h-3 text-amber-600" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span 
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200"
      title="Fresh stock"
    >
      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
      <span>{label || 'Fresh'}</span>
    </span>
  );
};
