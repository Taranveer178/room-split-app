import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { calculateSettlements } from '../../utils/settlement';
import { Card } from '../common/UI';

export default function BalancesTab({ expenses, group, currentUser, getUserName }) {
  const { balances, settlements } = useMemo(() => calculateSettlements(expenses, group.members), [expenses, group.members]);
  const myBalance = balances[currentUser.id] || 0;
  return (
    <div className="p-4 pb-12 space-y-5">
      <Card className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-none shadow-md">
        <h2 className="text-indigo-100 font-medium mb-1 text-xs uppercase tracking-wider">Your Balance</h2>
        <div className="text-3xl font-bold tracking-tight">{myBalance < 0 ? '-' : ''}₹{Math.abs(myBalance).toFixed(2)}</div>
        <p className="mt-2 text-indigo-100 text-xs">{myBalance > 0 ? 'You are owed money in total.' : myBalance < 0 ? 'You owe money in total.' : 'You are settled up!'}</p>
      </Card>
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 px-1">How to Settle</h3>
        {settlements.length === 0 ? (
          <Card className="p-6 text-center text-slate-500"><CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500" /><p className="text-base font-bold text-slate-700">All Settled Up</p><p className="text-xs text-slate-400 mt-1">No outstanding balances remaining.</p></Card>
        ) : (
          <div className="space-y-2.5">{settlements.map((settlement, index) => {
            const iAmFrom = settlement.from === currentUser.id;
            const iAmTo = settlement.to === currentUser.id;
            const fromName = iAmFrom ? 'You' : getUserName(settlement.from);
            const toName = iAmTo ? 'You' : getUserName(settlement.to);
            return (
              <Card key={index} className={`p-3.5 flex items-center justify-between ${(iAmFrom || iAmTo) ? 'border-indigo-200 bg-indigo-50/40' : ''}`}>
                <span className="text-slate-600 text-sm"><strong className="text-slate-800 font-semibold">{fromName}</strong> pays <strong className="text-slate-800 font-semibold">{toName}</strong></span>
                <div className={`text-base font-bold ${iAmFrom ? 'text-rose-500' : iAmTo ? 'text-emerald-600' : 'text-slate-700'}`}>₹{settlement.amount.toFixed(2)}</div>
              </Card>
            );
          })}</div>
        )}
      </div>
    </div>
  );
}