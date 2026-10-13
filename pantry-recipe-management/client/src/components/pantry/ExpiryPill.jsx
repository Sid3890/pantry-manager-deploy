import React from 'react';
import { Clock, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';

export const ExpiryPill = ({ expiryInfo }) => {
  if (!expiryInfo) return null;
  const { status, label, daysRemaining } = expiryInfo;

  if (status === 'expired') {
    return (
      <span 
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-[#D9534F] border border-rose-200 shadow-2xs"
        title="Item has passed its expiry date"
      >
        <AlertOctagon className="w-3 h-3 text-[#D9534F]" />
        <span>{label || 'Expired'}</span>
      </span>
    );
  }

  if (status === 'expiring_soon') {
    return (
      <span 
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-[#E6A23C] border border-[#E6A23C]/30 shadow-2xs"
        title="Expiring within 3 days — use soon!"
      >
        <AlertTriangle className="w-3 h-3 text-[#E6A23C]" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span 
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E5F0E7] text-[#287A52] border border-[#287A52]/20 shadow-2xs"
      title="Fresh stock"
    >
      <CheckCircle2 className="w-3 h-3 text-[#287A52]" />
      <span>{label || 'Fresh'}</span>
    </span>
  );
};
