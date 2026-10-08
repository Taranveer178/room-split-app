import { useState } from 'react';
import { 
  AlertCircle, 
  IndianRupee, 
  Calendar, 
  CreditCard, 
  Tag, 
  User, 
  Users, 
  Check, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { CATEGORIES, PAYMENT_METHODS } from '../../utils/constants';
import { Button, Input } from '../common/UI';

export default function AddExpenseTab({
  group,
  currentUser,
  getUserName,
  onSaveExpense,
  onSendNotification,
  onSaved,
  showToast,
}) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUser.id);
  const [date, setDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().split('T')[0];
  });
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
      paymentMethod,
      category,
      date,
      splits: finalSplits,
      createdAt: new Date().toISOString(),
    };

    try {
      await onSaveExpense(newExpense);

      // Notify other members involved in the group (excluding yourself)
      if (onSendNotification) {
        const actualPayerName = getUserName(paidBy) || currentUser.username || 'A member';
        const otherMemberIds = group.members.filter((id) => id !== currentUser.id);

        const recipientNotifications = otherMemberIds.map((memberId) => {
          const owesAmount = finalSplits[memberId];
          const splitText = owesAmount && parseFloat(owesAmount) > 0 ? ` (Your share: ₹${owesAmount})` : '';

          return {
            id: `notif_${Date.now()}_${memberId}`,
            recipientId: memberId,
            senderId: currentUser.id,
            createdBy: currentUser.id,
            createdByName: actualPayerName,
            groupId: group.id,
            type: 'EXPENSE_ADDED',
            message: `${actualPayerName} added "${newExpense.title}" for ₹${newExpense.totalAmount}${splitText}.`,
            expenseId: newExpense.id,
            createdAt: new Date().toISOString(),
            read: false,
          };
        });

        if (recipientNotifications.length > 0) {
          await onSendNotification(recipientNotifications);
        }
      }

      showToast('Expense saved and members notified!');
      onSaved();
    } catch (err) {
      console.error(err);
      setError('Failed to save expense. Please try again.');
    }
  };

  const activeCount = Object.values(selectedParticipants).filter(Boolean).length;
  const equalAmount = amount && !Number.isNaN(Number(amount)) && activeCount > 0 
    ? (parseFloat(amount) / activeCount).toFixed(2) 
    : '0.00';

  return (
    <div className="relative w-full max-w-xl mx-auto p-4 sm:p-6 pb-28 md:pb-20 animate-in fade-in duration-300">
      
      {/* Ambient background glows */}
      <div className="absolute top-0 right-10 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar with Badge and Back Button */}
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/70 text-blue-700 text-xs font-bold">
          <Sparkles size={12} />
          <span>New Transaction</span>
        </div>

        {/* Back Button to Return to Expenses Tab */}
        <button
          type="button"
          onClick={onSaved}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-slate-700 hover:text-blue-600 border border-slate-200/80 shadow-xs text-xs font-bold transition-all active:scale-95"
          title="Back to Expenses"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border border-red-100 mb-4 animate-in fade-in duration-200">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p className="font-semibold leading-relaxed">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Main Card: Amount & Primary Details */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-2xl border border-white/70 rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          
          {/* Hero Amount Field */}
          <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-100/80 rounded-2xl p-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
              Total Amount
            </span>
            <div className="flex items-center justify-center gap-1">
              <IndianRupee size={24} className="text-blue-600 stroke-[3]" />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                className="w-48 bg-transparent text-3xl font-black font-mono tracking-tight text-slate-900 outline-none text-center placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Description / Title
            </label>
            <Input 
              placeholder="e.g. Dinner, Grocery, WiFi Bill" 
              value={title} 
              onChange={(event) => setTitle(event.target.value)} 
              required 
            />
          </div>

          {/* Payer and Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User size={13} className="text-blue-600" />
                <span>Paid By</span>
              </label>
              <select 
                className="w-full px-3.5 py-3 text-sm font-semibold border border-slate-200/80 rounded-xl bg-slate-50/70 hover:bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                value={paidBy} 
                onChange={(event) => setPaidBy(event.target.value)}
              >
                {group.members.map((memberId) => (
                  <option key={memberId} value={memberId}>
                    {memberId === currentUser.id ? 'You' : getUserName(memberId)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-600" />
                <span>Date</span>
              </label>
              <Input 
                type="date" 
                value={date} 
                onChange={(event) => setDate(event.target.value)} 
                required 
              />
            </div>
          </div>

          {/* Category & Payment Method */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Tag size={13} className="text-blue-600" />
                <span>Category</span>
              </label>
              <select 
                className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-200/80 rounded-xl bg-slate-50/70 hover:bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                value={category} 
                onChange={(event) => setCategory(event.target.value)}
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <CreditCard size={13} className="text-blue-600" />
                <span>Method</span>
              </label>
              <select 
                className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-200/80 rounded-xl bg-slate-50/70 hover:bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                value={paymentMethod} 
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                {PAYMENT_METHODS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Split Breakdown Section Card */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-2xl border border-white/70 rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex justify-between items-center mb-3.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={14} className="text-blue-600" />
              <span>Split Method</span>
            </label>

            {/* Split Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
              <button 
                type="button" 
                onClick={() => setSplitMode('equal')} 
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  splitMode === 'equal' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Equal
              </button>
              <button 
                type="button" 
                onClick={() => setSplitMode('custom')} 
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  splitMode === 'custom' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Members List for Splitting */}
          <div className="space-y-2">
            {group.members.map((memberId) => {
              const isUser = memberId === currentUser.id;
              const memberName = isUser ? 'You' : getUserName(memberId);
              const isChecked = selectedParticipants[memberId] || false;

              return (
                <div 
                  key={memberId} 
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    splitMode === 'equal' && isChecked
                      ? 'bg-blue-50/50 border-blue-200/70 shadow-2xs'
                      : 'bg-white/60 border-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-7 h-7 overflow-hidden rounded-full flex items-center justify-center text-[10px] font-black ${
                      isUser ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {(isUser ? 'Y' : (memberName || 'U')).charAt(0).toUpperCase()}
                    </span>
                    <span className="font-bold text-xs text-slate-800">
                      {memberName}
                    </span>
                  </div>

                  {splitMode === 'equal' ? (
                    <div className="flex items-center gap-3">
                      {isChecked && parseFloat(amount) > 0 && (
                        <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                          ₹{equalAmount}
                        </span>
                      )}
                      <label className="relative flex items-center justify-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={(event) => setSelectedParticipants((prev) => ({ 
                            ...prev, 
                            [memberId]: event.target.checked 
                          }))}
                          className="sr-only" 
                        />
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs' 
                            : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check size={12} strokeWidth={3.5} />}
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-bold text-xs">₹</span>
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        placeholder="0.00" 
                        className="w-24 px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-200 rounded-xl text-right bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs" 
                        value={customSplits[memberId]} 
                        onChange={(event) => setCustomSplits((prev) => ({ 
                          ...prev, 
                          [memberId]: event.target.value 
                        }))} 
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Action */}
        <Button 
          type="submit" 
          className="w-full h-13 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 rounded-2xl transition-all"
        >
          Save & Notify Group
        </Button>
      </form>
    </div>
  );
}