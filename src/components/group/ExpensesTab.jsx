import { useState } from 'react';
import { 
  Receipt, Trash2, Check, AlertCircle, X, 
  Calendar, CreditCard, User, Users, ChevronRight, 
  ArrowUpRight, ArrowDownLeft, SlidersHorizontal,
  Utensils, Car, Home, ShoppingBag, Zap, IndianRupee
} from 'lucide-react';
import { Button } from '../common/UI';
import { useBackHandler } from '../../utils/backNavigation';

// Professional category styling with modern Lucide SVGs
const getCategoryMeta = (category = '') => {
  const cat = category.toLowerCase();
  if (cat.includes('food') || cat.includes('dinner') || cat.includes('snack') || cat.includes('grocer')) {
    return { 
      bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20', 
      icon: <Utensils size={18} /> 
    };
  }
  if (cat.includes('travel') || cat.includes('petrol') || cat.includes('fuel') || cat.includes('cab') || cat.includes('auto')) {
    return { 
      bg: 'bg-sky-500/10 text-sky-600 border-sky-500/20', 
      icon: <Car size={18} /> 
    };
  }
  if (cat.includes('rent') || cat.includes('wifi') || cat.includes('bill') || cat.includes('maid') || cat.includes('electricity')) {
    return { 
      bg: 'bg-blue-500/10 text-blue-600 border-blue-500/20', 
      icon: <Home size={18} /> 
    };
  }
  if (cat.includes('shop') || cat.includes('cloth') || cat.includes('mart')) {
    return { 
      bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', 
      icon: <ShoppingBag size={18} /> 
    };
  }
  return { 
    bg: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', 
    icon: <Zap size={18} /> 
  };
};

export default function ExpensesTab({ expenses, currentUser, users = [], getUserName, onDeleteExpense, showToast }) {
  const [payerFilter, setPayerFilter] = useState('ALL');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [detailExpense, setDetailExpense] = useState(null);

  useBackHandler(showConfirmModal || Boolean(detailExpense), () => {
    if (showConfirmModal) setShowConfirmModal(false);
    else setDetailExpense(null);
    return true;
  }, 100);

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
    <div className="relative min-h-full space-y-4 p-4 pb-4 md:pb-0">
      {/* Top Filter and Select Controls */}
      <div className="flex items-center justify-between gap-2.5">
        {/* Paid-by Roommate Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs flex-1 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button 
            onClick={() => setPayerFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all duration-200 flex-shrink-0 text-xs active:scale-95 ${
              payerFilter === 'ALL' 
                ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10' 
                : 'bg-white/80 backdrop-blur-md border border-white/60 text-slate-600 hover:bg-white hover:border-slate-300'
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
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200' 
                    : 'bg-white/80 backdrop-blur-md border-white/60 text-slate-600 hover:bg-white hover:border-slate-300'
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
              ? 'bg-blue-50/90 backdrop-blur-md border-blue-200 text-blue-700 font-bold' 
              : 'bg-white/80 backdrop-blur-md border-white/60 text-slate-600 hover:bg-white hover:text-slate-900 shadow-xs'
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
          <div className="w-16 h-16 bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl flex items-center justify-center mb-3 shadow-sm text-blue-500">
            <Receipt size={26} />
          </div>
          <h2 className="text-base font-bold text-slate-800">No transactions recorded</h2>
          <p className="text-slate-400 text-xs mt-1 max-w-[240px] leading-relaxed">
            {payerFilter !== 'ALL' 
              ? 'No bills found matching this roommate filter.' 
              : 'Keep track of house spending by tapping the + button below.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(exp => {
            const iPaid = exp.paidBy === currentUser.id;
            const hasAccess = canDeleteExpense(exp);
            const isSelected = selectedIds.includes(exp.id);
            const myShare = exp.splits ? exp.splits[currentUser.id] : 0;
            const participants = getParticipantsList(exp);
            const catMeta = getCategoryMeta(exp.category);

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
              /* Liquid Glass Container matching popup style */
              <div 
                key={exp.id} 
                onClick={() => handleCardClick(exp)}
                className={`group relative p-4 rounded-[26px] backdrop-blur-2xl transition-all duration-300 cursor-pointer overflow-hidden border ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-md' 
                    : 'bg-white/80 border-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white/95 hover:border-white hover:shadow-[0_12px_36px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 active:scale-[0.99]'
                }`}
              >
                {/* Subtle internal gradient ambient for liquid depth */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex items-start justify-between gap-3">
                  
                  {/* Category SVG icon & Meta */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs backdrop-blur-md transition-transform duration-200 group-hover:scale-105 ${catMeta.bg}`}>
                      {catMeta.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-slate-800 text-[14px] truncate tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
                          {getExpenseTitle(exp)}
                        </h3>
                        <span className="text-[10px] font-semibold text-slate-400 bg-white/70 backdrop-blur-sm border border-slate-200/50 px-1.5 py-0.5 rounded-md shadow-2xs">
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
                            className={`text-[9.5px] px-2 py-0.5 rounded-md font-semibold border backdrop-blur-sm ${
                              pId === currentUser.id 
                                ? 'bg-blue-50/80 text-blue-700 border-blue-200/70' 
                                : 'bg-white/60 text-slate-600 border-slate-200/50'
                            }`}
                          >
                            {pId === currentUser.id ? 'You' : getUserName(pId)}
                          </span>
                        ))}
                        {participants.length > 3 && (
                          <span className="text-[9.5px] text-slate-400 font-semibold bg-white/60 px-1.5 py-0.5 rounded border border-slate-200/50 backdrop-blur-sm">
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
                        <div className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-xl text-xs font-bold font-mono tracking-tight backdrop-blur-md shadow-2xs ${
                          isInvolved 
                            ? isPositive 
                              ? 'bg-emerald-50/80 text-emerald-700 border border-emerald-200/80' 
                              : 'bg-rose-50/80 text-rose-600 border border-rose-200/80'
                            : 'text-slate-400 bg-white/60 border border-slate-200/50'
                        }`}>
                          {isInvolved && (
                            isPositive 
                              ? <ArrowUpRight size={13} className="text-emerald-600 stroke-[2.5]" /> 
                              : <ArrowDownLeft size={13} className="text-rose-600 stroke-[2.5]" />
                          )}
                          <span>{statusAmount}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400 bg-white/60 px-2 py-0.5 rounded-lg border border-slate-200/50">Not involved</span>
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
                                ? 'bg-blue-600 border-blue-600 text-white shadow-xs scale-105' 
                                : 'border-slate-300 bg-white/90 hover:border-slate-400'
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
                      <div className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all mt-0.5">
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

      {/* Liquid Glass Modal: Detailed Breakdown */}
      {detailExpense && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative overflow-hidden w-full max-w-sm rounded-[32px] p-6 bg-white/85 backdrop-blur-2xl border border-white/60 shadow-[0_24px_50px_-12px_rgba(15,23,42,0.25)] animate-in zoom-in-95 duration-200">
            {/* Ambient liquid backdrop highlights inside card */}
            <div className="absolute -top-16 -right-16 w-44 h-44 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />

            {/* Modal Header */}
            <div className="relative flex items-center justify-between pb-3.5 border-b border-slate-200/50 mb-3.5">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shadow-xs ${getCategoryMeta(detailExpense.category).bg}`}>
                  {getCategoryMeta(detailExpense.category).icon}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">{getExpenseTitle(detailExpense)}</h3>
                  <span className="text-xs text-blue-600 font-semibold">{detailExpense.category || 'General'}</span>
                </div>
              </div>
              <button 
                onClick={() => setDetailExpense(null)} 
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-white/60 hover:bg-white/90 border border-slate-200/50 rounded-full shadow-xs transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Total Hero Block */}
            <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white rounded-2xl p-3.5 text-center mb-3.5 shadow-lg shadow-blue-500/20">
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block mb-0.5">Total Bill</span>
              <div className="text-3xl font-black font-mono tracking-tight flex items-center justify-center gap-0.5">
                <IndianRupee size={22} className="stroke-[3]" />
                <span>{parseFloat(detailExpense.totalAmount).toFixed(2)}</span>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3.5 text-xs">
              <div className="p-2.5 bg-white/60 backdrop-blur-md border border-white/70 rounded-xl shadow-xs">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5 mb-0.5 text-[11px]">
                  <User size={12} className="text-blue-600" />
                  <span>Paid By</span>
                </div>
                <div className="font-bold text-slate-800 truncate">
                  {detailExpense.paidBy === currentUser.id ? 'You' : getUserName(detailExpense.paidBy)}
                </div>
              </div>

              <div className="p-2.5 bg-white/60 backdrop-blur-md border border-white/70 rounded-xl shadow-xs">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5 mb-0.5 text-[11px]">
                  <CreditCard size={12} className="text-blue-600" />
                  <span>Method</span>
                </div>
                <div className="font-bold text-slate-800">
                  {detailExpense.paymentMethod || 'UPI'}
                </div>
              </div>

              <div className="p-2.5 bg-white/60 backdrop-blur-md border border-white/70 rounded-xl shadow-xs">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5 mb-0.5 text-[11px]">
                  <Calendar size={12} className="text-blue-600" />
                  <span>Date</span>
                </div>
                <div className="font-bold text-slate-800">
                  {detailExpense.date}
                </div>
              </div>

              <div className="p-2.5 bg-white/60 backdrop-blur-md border border-white/70 rounded-xl shadow-xs">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5 mb-0.5 text-[11px]">
                  <Users size={12} className="text-blue-600" />
                  <span>Members</span>
                </div>
                <div className="font-bold text-slate-800 truncate">
                  {getParticipantsList(detailExpense).length} splitters
                </div>
              </div>
            </div>

            {/* Participant Breakdown List (Vertical slider hidden with scrollbar-none) */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2 px-0.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  <Users size={13} className="text-blue-600" />
                  Split Breakdown
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">
                  {getParticipantsList(detailExpense).length} members
                </span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {Object.entries(detailExpense.splits || {}).map(([memberId, shareAmount]) => {
                  const numShare = parseFloat(shareAmount);
                  if (numShare <= 0) return null;
                  const isUser = memberId === currentUser.id;
                  const member = users.find((item) => item.id === memberId);
                  const memberName = isUser ? 'You' : getUserName(memberId);

                  return (
                    <div 
                      key={memberId} 
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-colors shadow-2xs ${
                        isUser 
                          ? 'bg-blue-50/80 border-blue-200/80 text-blue-950 font-semibold' 
                          : 'bg-white/70 backdrop-blur-md border-white/80 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 overflow-hidden rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isUser ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {member?.photoDataUrl ? (
                            <img src={member.photoDataUrl} alt="" className="h-full w-full object-cover" />
                          ) : (isUser ? 'Y' : (memberName || 'U')).charAt(0).toUpperCase()}
                        </span>
                        <span>{isUser ? 'You' : getUserName(memberId)}</span>
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
              className="w-full text-xs font-bold py-2.5 rounded-xl bg-white/70 hover:bg-white border border-slate-200/60 text-slate-700 shadow-xs"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Floating Bottom Selection Bar (Lifted by an additional 20px: bottom-[54px]) */}
      {isSelectMode && selectedIds.length > 0 && (
        <div className="fixed bottom-[54px] left-4 right-4 max-w-sm mx-auto z-40 animate-in slide-in-from-bottom-4 duration-200">
          <div className="bg-slate-900/85 backdrop-blur-2xl text-white px-4 py-3 rounded-full shadow-[0_16px_36px_rgba(0,0,0,0.35)] border border-white/15 flex items-center justify-between">
            <div className="flex items-center gap-2 pl-2">
              <span className="bg-blue-600 text-white font-black text-xs px-2.5 py-0.5 rounded-full shadow-xs">
                {selectedIds.length}
              </span>
              <span className="text-xs font-medium text-slate-200">selected</span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSelectedIds([])} 
                className="text-xs text-slate-400 hover:text-white px-2 py-1 font-semibold transition-colors"
              >
                Clear
              </button>
              <button 
                onClick={() => setShowConfirmModal(true)} 
                className="bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-bold px-3.5 py-1.5 rounded-full transition-all shadow-sm flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Liquid Glass Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white/85 backdrop-blur-2xl rounded-[32px] max-w-xs w-full p-6 shadow-2xl border border-white/60 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-rose-100 shadow-inner">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Delete {selectedIds.length} bill(s)?</h3>
            <p className="text-slate-500 text-xs mb-5 leading-relaxed">
              This action cannot be undone and will recalculate balances for all group members.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <Button 
                variant="secondary" 
                onClick={() => setShowConfirmModal(false)} 
                className="py-2.5 text-xs font-bold rounded-xl bg-white/70 hover:bg-white border border-slate-200/60"
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={handleConfirmDelete} 
                className="py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}