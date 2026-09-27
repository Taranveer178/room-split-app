import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { CATEGORIES, PAYMENT_METHODS } from '../../utils/constants';
import { Button, Card, Input } from '../common/UI';

export default function AddExpenseTab({ group, currentUser, getUserName, onSaveExpense, onSaved, showToast }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUser.id);
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Food');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [splitMode, setSplitMode] = useState('equal');
  const [error, setError] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState(() => (
    Object.fromEntries(group.members.map((memberId) => [memberId, true]))
  ));
  const [customSplits, setCustomSplits] = useState(() => (
    Object.fromEntries(group.members.map((memberId) => [memberId, '']))
  ));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const numericAmount = parseFloat(amount);
    if (!title.trim() || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid title and total amount.');
      return;
    }

    const finalSplits = {};
    if (splitMode === 'equal') {
      const activeMembers = Object.keys(selectedParticipants).filter((memberId) => selectedParticipants[memberId]);
      if (activeMembers.length === 0) {
        setError('Select at least one participant.');
        return;
      }
      const splitAmount = (numericAmount / activeMembers.length).toFixed(2);
      activeMembers.forEach((memberId) => { finalSplits[memberId] = splitAmount; });
    } else {
      let totalCustom = 0;
      let hasInvalid = false;
      const activeMembers = Object.keys(customSplits).filter((memberId) => customSplits[memberId] !== '' && parseFloat(customSplits[memberId]) > 0);
      if (activeMembers.length === 0) {
        setError('Enter individual amounts.');
        return;
      }
      activeMembers.forEach((memberId) => {
        const value = parseFloat(customSplits[memberId]);
        if (Number.isNaN(value) || value < 0) hasInvalid = true;
        else {
          totalCustom += value;
          finalSplits[memberId] = value.toFixed(2);
        }
      });
      if (hasInvalid) {
        setError('Enter valid positive amounts.');
        return;
      }
      if (Math.abs(totalCustom - numericAmount) > 0.05) {
        setError(`Participant amounts sum to ₹${totalCustom.toFixed(2)}, but total expense is ₹${numericAmount.toFixed(2)}. They must match!`);
        return;
      }
    }

    const newExpense = {
      id: `exp_${Date.now()}`,
      groupId: group.id,
      title: title.trim(),
      totalAmount: numericAmount.toFixed(2),
      paidBy,
      createdBy: currentUser.id,
      paymentMethod,
      category,
      date,
      splits: finalSplits,
      createdAt: new Date().toISOString(),
    };
    await onSaveExpense(newExpense);
    showToast('Expense saved!');
    onSaved();
  };

  const activeCount = Object.values(selectedParticipants).filter(Boolean).length;
  const equalAmount = amount && !Number.isNaN(Number(amount)) && activeCount > 0 ? (parseFloat(amount) / activeCount).toFixed(2) : '0.00';

  return (
    <div className="p-4 pb-12">
      <h2 className="text-lg font-bold text-slate-800 mb-3">Add Expense</h2>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs flex items-start gap-2 border border-red-100 mb-4"><AlertCircle size={16} className="mt-0.5 flex-shrink-0" /><p className="font-medium">{error}</p></div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-4 space-y-3 bg-white">
          <Input label="Description / Title" placeholder="e.g. Dinner, Petrol, WiFi" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount (₹)" type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Paid By</label>
              <select className="w-full px-3 py-3.5 text-base border border-slate-200 rounded-xl bg-slate-50 outline-none" value={paidBy} onChange={(event) => setPaidBy(event.target.value)}>
                {group.members.map((memberId) => <option key={memberId} value={memberId}>{memberId === currentUser.id ? 'You' : getUserName(memberId)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label><select className="w-full px-3 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>{CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Method</label><select className="w-full px-3 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none text-sm" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{PAYMENT_METHODS.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
          </div>
        </Card>

        <Card className="p-4 bg-white">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-bold text-slate-800">Split Method</label>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button type="button" onClick={() => setSplitMode('equal')} className={`px-3 py-1 text-xs font-bold rounded-lg ${splitMode === 'equal' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Equal</button>
              <button type="button" onClick={() => setSplitMode('custom')} className={`px-3 py-1 text-xs font-bold rounded-lg ${splitMode === 'custom' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Custom</button>
            </div>
          </div>
          <div className="space-y-2">
            {group.members.map((memberId) => (
              <div key={memberId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-sm text-slate-700">{memberId === currentUser.id ? 'You' : getUserName(memberId)}</span>
                {splitMode === 'equal' ? (
                  <div className="flex items-center gap-3">
                    {selectedParticipants[memberId] && amount > 0 && <span className="text-xs font-mono font-medium text-slate-500">₹{equalAmount}</span>}
                    <input type="checkbox" className="w-5 h-5 rounded accent-indigo-600 cursor-pointer" checked={selectedParticipants[memberId] || false} onChange={(event) => setSelectedParticipants((previous) => ({ ...previous, [memberId]: event.target.checked }))} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2"><span className="text-slate-400 text-sm">₹</span><input type="number" min="0" step="0.01" placeholder="0.00" className="w-20 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg text-right font-mono bg-white outline-none focus:border-indigo-500" value={customSplits[memberId]} onChange={(event) => setCustomSplits((previous) => ({ ...previous, [memberId]: event.target.value }))} /></div>
                )}
              </div>
            ))}
          </div>
        </Card>
        <Button type="submit" className="w-full h-14 mt-4 text-base">Save Expense</Button>
      </form>
    </div>
  );
}