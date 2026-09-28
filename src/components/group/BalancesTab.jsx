import React, { useMemo, useState } from 'react';
import { CheckCircle2, Send, Copy, ExternalLink, AlertTriangle } from 'lucide-react';
import { calculateSettlements } from '../../utils/settlement';
import { Card } from '../common/UI';

export default function BalancesTab({ expenses, group, currentUser, getUserName, users = [] }) {
  const { balances, settlements } = useMemo(() => calculateSettlements(expenses, group.members), [expenses, group.members]);
  const myBalance = balances[currentUser.id] || 0;
  const [copiedIndex, setCopiedIndex] = useState(null);

  const FALLBACK_DEFAULT_UPI = "staranveer178@okicici";

  // Helper to retrieve member's upiId
  const getMemberUpi = (memberId) => {
    const member = users.find(u => u.id === memberId);
    return member?.upiId?.trim() || null;
  };

  const handleCopyUPI = (upiToCopy, idx) => {
    navigator.clipboard.writeText(upiToCopy);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="p-4 pb-12 space-y-5">
      <Card className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-none shadow-md">
        <h2 className="text-indigo-100 font-medium mb-1 text-xs uppercase tracking-wider">Your Balance</h2>
        <div className="text-3xl font-bold tracking-tight">
          {myBalance < 0 ? '-' : ''}₹{Math.abs(myBalance).toFixed(2)}
        </div>
        <p className="mt-2 text-indigo-100 text-xs">
          {myBalance > 0 ? 'You are owed money in total.' : myBalance < 0 ? 'You owe money in total.' : 'You are settled up!'}
        </p>
      </Card>
      
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 px-1">How to Settle</h3>
        
        {settlements.length === 0 ? (
          <Card className="p-6 text-center text-slate-500">
            <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500" />
            <p className="text-base font-bold text-slate-700">All Settled Up</p>
            <p className="text-xs text-slate-400 mt-1">No outstanding balances remaining.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {settlements.map((settlement, index) => {
              const iAmFrom = settlement.from === currentUser.id;
              const iAmTo = settlement.to === currentUser.id;
              const fromName = iAmFrom ? 'You' : getUserName(settlement.from);
              const toName = iAmTo ? 'You' : getUserName(settlement.to);
              const amountStr = settlement.amount.toFixed(2);
              const note = encodeURIComponent(`RoomSplit to ${toName}`);

              // Target the payee's actual registered UPI ID
              const payeeUpi = getMemberUpi(settlement.to) || FALLBACK_DEFAULT_UPI;
              const hasCustomUpi = Boolean(getMemberUpi(settlement.to));

              // App-specific URLs using the payee's UPI
              const gpayDirectUrl = `gpay://upi/pay?pa=${payeeUpi}&pn=${encodeURIComponent(toName)}&am=${amountStr}&cu=INR&tn=${note}`;
              const phonePeUrl = `phonepe://pay?pa=${payeeUpi}&pn=${encodeURIComponent(toName)}&am=${amountStr}&cu=INR&tn=${note}`;
              const androidGPayIntent = `intent://upi/pay?pa=${payeeUpi}&pn=${encodeURIComponent(toName)}&am=${amountStr}&cu=INR&tn=${note}#Intent;scheme=gpay;package=com.google.android.apps.nbu.paisa.user;end`;

              const handleOpenGPay = () => {
                const isAndroid = /Android/i.test(navigator.userAgent);
                if (isAndroid) {
                  window.location.href = androidGPayIntent;
                  setTimeout(() => {
                    window.location.href = gpayDirectUrl;
                  }, 500);
                } else {
                  window.location.href = gpayDirectUrl;
                }
              };

              return (
                <Card 
                  key={index} 
                  className={`p-4 flex flex-col gap-3 ${(iAmFrom || iAmTo) ? 'border-indigo-200 bg-indigo-50/40' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-sm">
                      <strong className="text-slate-800 font-semibold">{fromName}</strong> pays <strong className="text-slate-800 font-semibold">{toName}</strong>
                    </span>
                    <div className={`text-base font-bold ${iAmFrom ? 'text-rose-500' : iAmTo ? 'text-emerald-600' : 'text-slate-700'}`}>
                      ₹{amountStr}
                    </div>
                  </div>

                  {iAmFrom && (
                    <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                      {!hasCustomUpi && (
                        <div className="text-[11px] text-amber-600 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg">
                          <AlertTriangle size={12} />
                          <span>{toName} hasn't added a UPI ID yet (using default).</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        {/* Primary GPay Button */}
                        <button
                          onClick={handleOpenGPay}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
                        >
                          <Send size={14} />
                          <span>Google Pay</span>
                        </button>

                        {/* PhonePe Alternative */}
                        <a
                          href={phonePeUrl}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 active:scale-95 transition-all shadow-sm"
                        >
                          <ExternalLink size={14} />
                          <span>PhonePe</span>
                        </a>
                      </div>

                      {/* Manual Copy Button */}
                      <button
                        onClick={() => handleCopyUPI(payeeUpi, index)}
                        className="flex items-center justify-center gap-1.5 py-2 text-slate-500 hover:text-slate-700 text-xs font-medium bg-white border border-slate-200/80 rounded-xl active:bg-slate-50 transition-colors"
                      >
                        <Copy size={13} />
                        <span>{copiedIndex === index ? 'UPI ID Copied!' : `Copy UPI (${payeeUpi})`}</span>
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}