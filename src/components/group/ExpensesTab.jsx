import { useState } from 'react';
import { Receipt, Trash2 } from 'lucide-react';
import { PAYMENT_METHODS } from '../../utils/constants';
import { Card } from '../common/UI';

export default function ExpensesTab({ expenses, currentUser, getUserName, onDeleteExpense, showToast }) {
  const [filterMethod, setFilterMethod] = useState('ALL');
  const filtered = expenses.filter((expense) => filterMethod === 'ALL' || expense.paymentMethod === filterMethod);
  const handleDelete = async (event, expenseId) => {
    event.stopPropagation();
    await onDeleteExpense(expenseId);
    showToast('Expense deleted');
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button onClick={() => setFilterMethod('ALL')} className={`px-3 py-1.5 rounded-full font-semibold transition-colors flex-shrink-0 ${filterMethod === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>All ({expenses.length})</button>
        {PAYMENT_METHODS.map((method) => <button key={method} onClick={() => setFilterMethod(method)} className={`px-3 py-1.5 rounded-full font-semibold transition-colors flex-shrink-0 ${filterMethod === method ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{method}</button>)}
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-6 pt-16">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4"><Receipt size={32} className="text-indigo-400" /></div>
          <h2 className="text-lg font-bold text-slate-700 mb-1">No Expenses Found</h2>
          <p className="text-slate-400 text-xs">Tap the + button below to log your first bill.</p>
        </div>
      ) : filtered.map((expense) => {
        const iPaid = expense.paidBy === currentUser.id;
        const myShare = expense.splits ? expense.splits[currentUser.id] : 0;
        let statusText = 'Not involved';
        let statusColor = 'text-slate-400';
        if (iPaid) {
          const totalOthersOwe = parseFloat(expense.totalAmount) - (myShare ? parseFloat(myShare) : 0);
          statusText = `+ ₹${totalOthersOwe.toFixed(2)}`;
          statusColor = 'text-emerald-600';
        } else if (myShare) {
          statusText = `- ₹${parseFloat(myShare).toFixed(2)}`;
          statusColor = 'text-rose-500';
        }
        return (
          <Card key={expense.id} className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0 font-bold">{expense.category ? expense.category.charAt(0) : '₹'}</div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 text-sm truncate">{expense.title}</h3>
                <p className="text-xs text-slate-500 truncate mt-0.5"><span className="font-medium text-slate-700">{iPaid ? 'You' : getUserName(expense.paidBy)}</span> paid ₹{parseFloat(expense.totalAmount).toFixed(2)} • <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">{expense.paymentMethod || 'UPI'}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0"><div className="text-right"><div className={`text-sm font-bold ${statusColor}`}>{statusText}</div><div className="text-[10px] font-medium text-slate-400">{expense.date}</div></div><button onClick={(event) => handleDelete(event, expense.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={16} /></button></div>
          </Card>
        );
      })}
    </div>
  );
}