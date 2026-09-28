import { useMemo } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { calculateSettlements } from '../../utils/settlement';
import { Card } from '../common/UI';

export default function BalancesTab({ expenses, group, currentUser, getUserName }) {
  const { balances, settlements } = useMemo(() => calculateSettlements(expenses, group.members), [expenses, group.members]);
  const myBalance = balances[currentUser.id] || 0;
  
  const DEFAULT_UPI_ID = "staranveer178@okicici";

  return (
    <div className="p-4 pb-12 space-y-5">
      <Card className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-none shadow-md">
        <h2 className="text-indigo-100 font-medium mb-1 text-xs uppercase tracking-wider">Your Balance</h2>
        <div className="text-3xl font-bold tracking-tight">{myBalance < 0 ? '-' : ''}₹{Math.abs(myBalance).toFixed(2)}</div>
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
              const note = encodeURIComponent(`RoomSplit Settlement to ${toName}`);
              
              // Direct Intent URL targeted specifically to open Google Pay package if available, 
              // falling back to general UPI if GPay isn't installed.
              const gpayIntentUrl = `intent://pay?pa=${DEFAULT_UPI_ID}&pn=${encodeURIComponent(toName)}&am=${amountStr}&cu=INR&tn=${note}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
              
              // Standard fallback UPI link for iOS / Web browsers
              const standardUpiLink = `upi://pay?pa=${DEFAULT_UPI_ID}&pn=${encodeURIComponent(toName)}&am=${amountStr}&cu=INR&tn=${note}`;

              const handlePayClick = (e) => {
                e.preventDefault();
                // Check if Android to use intent package, otherwise use standard upi link
                const isAndroid = /Android/i.test(navigator.userAgent);
                window.location.href = isAndroid ? gpayIntentUrl : standardUpiLink;
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
                    <div className="pt-1">
                      <button 
                        onClick={handlePayClick}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm cursor-pointer"
                      >
                        <Send size={16} />
                        Pay via Google Pay
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