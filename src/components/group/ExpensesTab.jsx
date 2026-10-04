import { useState } from 'react';
import { 
  Receipt, Trash2, Check, AlertCircle, X, 
  Calendar, CreditCard, User, Users, ChevronRight, 
  Sparkles, ArrowUpRight, ArrowDownLeft, SlidersHorizontal
} from 'lucide-react';
import { Button } from '../common/UI';

// Category color palettes for visual distinction
const getCategoryStyle = (category = '') => {
  const cat = category.toLowerCase();
  if (cat.includes('food') || cat.includes('dinner') || cat.includes('snack') || cat.includes('grocer')) {
    return { bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: '🍽️' };
  }
  if (cat.includes('travel') || cat.includes('petrol') || cat.includes('fuel') || cat.includes('cab') || cat.includes('auto')) {
    return { bg: 'bg-sky-500/10 text-sky-600 border-sky-500/20', icon: '🚗' };
  }
  if (cat.includes('rent') || cat.includes('wifi') || cat.includes('bill') || cat.includes('maid') || cat.includes('electricity')) {
    return { bg: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', icon: '🏠' };
  }
  if (cat.includes('shop') || cat.includes('cloth') || cat.includes('mart')) {
    return { bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: '🛍️' };
  }
  return { bg: 'bg-violet-500/10 text-violet-600 border-violet-500/20', icon: '⚡' };
};

export default function ExpensesTab({ expenses, currentUser, users = [], getUserName, onDeleteExpense, showToast }) {
  const [payerFilter, setPayerFilter] = useState('ALL');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [detailExpense, setDetailExpense] = useState(null);

  const uniquePayers = Array.from(new Set(expenses.map(e => e.paidBy).filter(Boolean)));

  const filtered = expenses.filter(exp => {
    if (payerFilter === 'ALL') return true;
    return exp.paidBy === payerFilter;
  });

  const canDeleteExpense = (exp) => {
    return exp.paidBy === currentUser.id || exp.createdBy === currentUser.id;
  };

  const toggleSelectMode = () => {
    if (isSelectMode) {
      setSelectedIds([]);
      setIsSelectMode(false);
    } else {
      setIsSelectMode(true);
    }
  };

  const handleCardClick = (exp) => {
    if (isSelectMode) {
      if (!canDeleteExpense(exp)) {
        showToast('Only the payer or creator can delete this bill.', 'error');
        return;
      }
      setSelectedIds(prev => 
        prev.includes(exp.id) ? prev.filter(id => id !== exp.id) : [...prev, exp.id]
      );
    } else {
      setDetailExpense(exp);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      for (const id of selectedIds) {
        await onDeleteExpense(id);
      }
      showToast(`Removed ${selectedIds.length} expense(s)`);
      setSelectedIds([]);
      setIsSelectMode(false);
      setShowConfirmModal(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to delete selected expenses', 'error');
    }
  };

  const getParticipantsList = (exp) => {
    if (!exp.splits) return [];
    return Object.keys(exp.splits).filter(id => parseFloat(exp.splits[id]) > 0);
  };

  const getExpenseTitle = (exp) => {
    if (exp.category !== 'Settlement') return exp.title;

    const fromId = exp.settlementFrom || exp.paidBy;
    const toId = exp.settlementTo || Object.entries(exp.splits || {})
      .find(([memberId, amount]) => memberId !== fromId && parseFloat(amount) > 0)?.[0];
    if (!fromId || !toId) return exp.title;

    const prefix = exp.settlementTitlePrefix || exp.title?.split(':')[0] || 'Settlement';
    const fromName = fromId === currentUser.id ? 'You' : getUserName(fromId);
    const toName = toId === currentUser.id ? 'You' : getUserName(toId);
    return `${prefix}: ${fromName} → ${toName}`;
  };

  return (
    <div className="p-4 space-y-4 pb-28 relative min-h-full">
      {/* Top Filter and Select Controls */}
      <div className="flex items-center justify-between gap-2.5">
        {/* Paid-by Roommate Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs flex-1 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button 
            onClick={() => setPayerFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all duration-200 flex-shrink-0 text-xs active:scale-95 ${
              payerFilter === 'ALL' 
                ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10' 
                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            All <span className="opacity-70 ml-0.5">({expenses.length})</span>
          </button>
          
          {uniquePayers.map(payerId => {
            const isMe = payerId === currentUser.id;
            const name = isMe ? 'You' : getUserName(payerId);
            const payer = users.find((member) => member.id === payerId);
            const isSelected = payerFilter === payerId;

            return (
              <button 
                key={payerId} 
                onClick={() => setPayerFilter(payerId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all duration-200 flex-shrink-0 text-xs border active:scale-95 ${
                  isSelected 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200' 
                    : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span className={`w-5 h-5 overflow-hidden rounded-full flex items-center justify-center text-[9px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {payer?.photoDataUrl ? (
                    <img src={payer.photoDataUrl} alt="" className="h-full w-full object-cover" />
                  ) : name.charAt(0).toUpperCase()}
                </span>
                <span>{name}</span>
              </button>
            );
          })}
        </div>

        {/* Action Toggle (Select Mode) */}
        <button
          onClick={toggleSelectMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border flex-shrink-0 active:scale-95 ${
            isSelectMode 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' 
              : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs'
          }`}
          title="Select multiple expenses"
        >
          {isSelectMode ? (
            <>
              <X size={13} className="stroke-[2.5]" />
              <span>Done</span>
            </>
          ) : (
            <>
              <SlidersHorizontal size={13} className="text-slate-500" />
              <span>Select</span>
            </>
          )}
        </button>
      </div>

      {/* Expenses Feed */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-6 pt-20 pb-16">
          <div className="w-16 h-16 bg-gradient-to-b from-indigo-50 to-slate-50 border border-indigo-100/60 rounded-3xl flex items-center justify-center mb-3 shadow-inner">
            <Receipt size={26} className="text-indigo-500" />
          </div>
          <h2 className="text-base font-bold text-slate-800">No transactions recorded</h2>
          <p className="text-slate-400 text-xs mt-1 max-w-[240px] leading-relaxed">
            {payerFilter !== 'ALL' 
              ? 'No bills found matching this roommate filter.' 
              : 'Keep track of house spending by tapping the + button below.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(exp => {
            const iPaid = exp.paidBy === currentUser.id;
            const hasAccess = canDeleteExpense(exp);
            const isSelected = selectedIds.includes(exp.id);
            const myShare = exp.splits ? exp.splits[currentUser.id] : 0;
            const participants = getParticipantsList(exp);
            const catStyle = getCategoryStyle(exp.category);

            let statusAmount = null;
            let isPositive = false;
            let isInvolved = false;
            
            if (iPaid) {
              const totalOthersOwe = parseFloat(exp.totalAmount) - (myShare ? parseFloat(myShare) : 0);
              if (totalOthersOwe > 0) {
                statusAmount = `+₹${totalOthersOwe.toFixed(2)}`;
                isPositive = true;
                isInvolved = true;
              } else {
                statusAmount = `₹${parseFloat(exp.totalAmount).toFixed(2)}`;
              }
            } else if (myShare && parseFloat(myShare) > 0) {
              statusAmount = `-₹${parseFloat(myShare).toFixed(2)}`;
              isPositive = false;
              isInvolved = true;
            }

            return (
              <div 
                key={exp.id} 
                onClick={() => handleCardClick(exp)}
                className={`group relative bg-white p-3.5 rounded-2xl transition-all duration-200 cursor-pointer border ${
                  isSelected 
                    ? 'border-indigo-500 bg-indigo-50/25 ring-1 ring-indigo-500/30 shadow-md' 
                    : 'border-slate-100/90 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-slate-200/90 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  
                  {/* Category icon & Meta */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-lg flex-shrink-0 mt-0.5 shadow-2xs transition-transform duration-200 group-hover:scale-105 ${catStyle.bg}`}>
                      {catStyle.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-slate-800 text-[13.5px] truncate tracking-tight leading-tight">
                          {getExpenseTitle(exp)}
                        </h3>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                          {exp.paymentMethod || 'UPI'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-1 leading-normal">
                        <span className="font-semibold text-slate-700">
                          {iPaid ? 'You' : getUserName(exp.paidBy)}
                        </span> paid <span className="font-bold text-slate-800 font-mono">₹{parseFloat(exp.totalAmount).toFixed(2)}</span>
                      </p>

                      {/* Split members summary */}
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-semibold mr-0.5 uppercase tracking-wider">Split:</span>
                        {participants.slice(0, 3).map((pId) => (
                          <span 
                            key={pId} 
                            className={`text-[9.5px] px-1.5 py-0.5 rounded-md font-semibold border ${
                              pId === currentUser.id 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                                : 'bg-slate-50 text-slate-600 border-slate-100'
                            }`}
                          >
                            {pId === currentUser.id ? 'You' : getUserName(pId)}
                          </span>
                        ))}
                        {participants.length > 3 && (
                          <span className="text-[9.5px] text-slate-400 font-semibold bg-slate-50 px-1 py-0.5 rounded border border-slate-100">
                            +{participants.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Directional balance badge & Selector */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      {statusAmount ? (
                        <div className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs font-bold font-mono tracking-tight ${
                          isInvolved 
                            ? isPositive 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/80' 
                              : 'bg-rose-50 text-rose-600 border border-rose-100/80'
                            : 'text-slate-400 bg-slate-50'
                        }`}>
                          {isInvolved && (
                            isPositive 
                              ? <ArrowUpRight size={13} className="text-emerald-600 stroke-[2.5]" /> 
                              : <ArrowDownLeft size={13} className="text-rose-600 stroke-[2.5]" />
                          )}
                          <span>{statusAmount}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">Not involved</span>
                      )}
                      
                      <div className="text-[10px] font-medium text-slate-400 mt-1">
                        {exp.date}
                      </div>
                    </div>

                    {isSelectMode ? (
                      <div className="mt-0.5">
                        {hasAccess ? (
                          <div 
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs scale-105' 
                                : 'border-slate-300 bg-white hover:border-slate-400'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3.5} />}
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center cursor-not-allowed opacity-40">
                            <span className="text-[10px] text-slate-400">✕</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all mt-0.5">
                        <ChevronRight size={16} />
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dead-Center Modal: Detailed Breakdown */}
      {detailExpense && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] w-full max-w-sm max-h-[85vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-xl shadow-xs ${getCategoryStyle(detailExpense.category).bg}`}>
                  {getCategoryStyle(detailExpense.category).icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">{getExpenseTitle(detailExpense)}</h3>
                  <span className="text-xs text-slate-400 font-medium">{detailExpense.category || 'General'}</span>
                </div>
              </div>
              <button 
                onClick={() => setDetailExpense(null)} 
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Total Hero Block */}
            <div className="bg-gradient-to-br from-indigo-50/80 via-slate-50 to-indigo-50/30 border border-indigo-100/70 rounded-2xl p-4 text-center mb-4 shadow-inner">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">Total Bill</span>
              <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                ₹{parseFloat(detailExpense.totalAmount).toFixed(2)}
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5 mb-1 text-[11px]">
                  <User size={12} className="text-indigo-500" />
                  <span>Paid By</span>
                </div>
                <div className="font-bold text-slate-800 truncate">
                  {detailExpense.paidBy === currentUser.id ? 'You' : getUserName(detailExpense.paidBy)}
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5 mb-1 text-[11px]">
                  <CreditCard size={12} className="text-indigo-500" />
                  <span>Method</span>
                </div>
                <div className="font-bold text-slate-800">
                  {detailExpense.paymentMethod || 'UPI'}
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5 mb-1 text-[11px]">
                  <Calendar size={12} className="text-indigo-500" />
                  <span>Date</span>
                </div>
                <div className="font-bold text-slate-800">
                  {detailExpense.date}
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5 mb-1 text-[11px]">
                  <Sparkles size={12} className="text-indigo-500" />
                  <span>Created By</span>
                </div>
                <div className="font-bold text-slate-800 truncate">
                  {detailExpense.createdBy 
                    ? (detailExpense.createdBy === currentUser.id ? 'You' : getUserName(detailExpense.createdBy))
                    : (detailExpense.paidBy === currentUser.id ? 'You' : getUserName(detailExpense.paidBy))}
                </div>
              </div>
            </div>

            {/* Participant Breakdown List */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2 px-0.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  <Users size={13} className="text-indigo-600" />
                  Split Breakdown
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">
                  {getParticipantsList(detailExpense).length} members
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {Object.entries(detailExpense.splits || {}).map(([memberId, shareAmount]) => {
                  const numShare = parseFloat(shareAmount);
                  if (numShare <= 0) return null;
                  const isUser = memberId === currentUser.id;
                  const member = users.find((item) => item.id === memberId);
                  const memberName = isUser ? 'You' : getUserName(memberId);

                  return (
                    <div 
                      key={memberId} 
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                        isUser 
                          ? 'bg-indigo-50/70 border-indigo-100 text-indigo-950 font-medium' 
                          : 'bg-white border-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 overflow-hidden rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isUser ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {member?.photoDataUrl ? (
                            <img src={member.photoDataUrl} alt="" className="h-full w-full object-cover" />
                          ) : (isUser ? 'Y' : (memberName || 'U')).charAt(0).toUpperCase()}
                        </span>
                        <span className="font-semibold">
                          {isUser ? 'You' : getUserName(memberId)}
                        </span>
                      </div>
                      <span className="font-bold font-mono text-slate-900">
                        ₹{numShare.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button 
              variant="secondary" 
              onClick={() => setDetailExpense(null)} 
              className="w-full text-xs font-semibold py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Floating Bottom Selection Bar (Fintech Dark Glassmorphism) */}
      {isSelectMode && selectedIds.length > 0 && (
        <div className="fixed bottom-[76px] left-4 right-4 max-w-sm mx-auto z-40 animate-in slide-in-from-bottom-4 duration-200">
          <div className="bg-slate-900/90 backdrop-blur-xl text-white px-4 py-3 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500 text-white font-bold text-xs px-2.5 py-0.5 rounded-full shadow-xs">
                {selectedIds.length}
              </span>
              <span className="text-xs font-medium text-slate-200">selected</span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSelectedIds([])} 
                className="text-xs text-slate-400 hover:text-white px-2 py-1 font-medium transition-colors"
              >
                Clear
              </button>
              <button 
                onClick={() => setShowConfirmModal(true)} 
                className="bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-xs w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-rose-100">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Delete {selectedIds.length} bill(s)?</h3>
            <p className="text-slate-500 text-xs mb-5 leading-relaxed">
              This action cannot be undone and will recalculate balances for all group members.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="secondary" onClick={() => setShowConfirmModal(false)} className="py-2.5 text-xs rounded-xl">
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete} className="py-2.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}