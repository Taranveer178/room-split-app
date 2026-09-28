import React, { useState } from 'react';
import { 
  Receipt, Trash2, Check, AlertCircle, X, 
  Calendar, CreditCard, User, Users, ChevronRight, Sparkles
} from 'lucide-react';
import { Card, Button } from '../common/UI';

export default function ExpensesTab({ expenses, currentUser, getUserName, onDeleteExpense, showToast }) {
  const [payerFilter, setPayerFilter] = useState('ALL');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [detailExpense, setDetailExpense] = useState(null);

  // Collect unique payers present in the current expenses list
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

  return (
    <div className="p-4 space-y-3.5 pb-28 relative min-h-full">
      {/* Top Filter and Select Controls */}
      <div className="flex items-center justify-between gap-2">
        {/* Paid-by Roommate Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs flex-1">
          <button 
            onClick={() => setPayerFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all flex-shrink-0 text-xs ${
              payerFilter === 'ALL' 
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' 
                : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All ({expenses.length})
          </button>
          
          {uniquePayers.map(payerId => {
            const isMe = payerId === currentUser.id;
            const name = isMe ? 'You' : getUserName(payerId);
            const isSelected = payerFilter === payerId;

            return (
              <button 
                key={payerId}
                onClick={() => setPayerFilter(payerId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all flex-shrink-0 text-xs border ${
                  isSelected 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200' 
                    : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {name.charAt(0).toUpperCase()}
                </span>
                <span>{name}</span>
              </button>
            );
          })}
        </div>

        {/* Top-Right Select Trigger */}
        <button
          onClick={toggleSelectMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex-shrink-0 ${
            isSelectMode 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
          }`}
          title="Select multiple expenses"
        >
          {isSelectMode ? (
            <>
              <X size={14} className="stroke-[2.5]" />
              <span>Done</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
              </svg>
              <span>Select</span>
            </>
          )}
        </button>
      </div>

      {/* Expenses List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-6 pt-20 pb-12">
          <div className="w-16 h-16 bg-indigo-50/80 rounded-2xl flex items-center justify-center mb-3">
            <Receipt size={28} className="text-indigo-500" />
          </div>
          <h2 className="text-base font-bold text-slate-700">No Expenses Recorded</h2>
          <p className="text-slate-400 text-xs mt-1 max-w-[220px]">
            {payerFilter !== 'ALL' ? 'No bills found for this roommate.' : 'Tap the + button to log your first bill.'}
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

            let statusText = "Not involved";
            let statusColor = "text-slate-400";
            
            if (iPaid) {
              const totalOthersOwe = parseFloat(exp.totalAmount) - (myShare ? parseFloat(myShare) : 0);
              statusText = `+ ₹${totalOthersOwe.toFixed(2)}`;
              statusColor = "text-emerald-600";
            } else if (myShare) {
              statusText = `- ₹${parseFloat(myShare).toFixed(2)}`;
              statusColor = "text-rose-500";
            }

            return (
              <div 
                key={exp.id} 
                onClick={() => handleCardClick(exp)}
                className={`group relative bg-white p-3.5 rounded-2xl transition-all duration-200 cursor-pointer border ${
                  isSelected 
                    ? 'border-indigo-500 bg-indigo-50/20 ring-1 ring-indigo-500/20 shadow-sm' 
                    : 'border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Category icon & meta */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      {exp.category ? exp.category.charAt(0) : '₹'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-800 text-[13px] truncate leading-tight">
                          {exp.title}
                        </h3>
                        <span className="text-[10px] bg-slate-100/80 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                          {exp.paymentMethod || 'UPI'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700">
                          {iPaid ? 'You' : getUserName(exp.paidBy)}
                        </span> paid <span className="font-semibold text-slate-800">₹{parseFloat(exp.totalAmount).toFixed(2)}</span>
                      </p>

                      {/* Participant pills preview */}
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-medium mr-0.5">Split:</span>
                        {participants.slice(0, 3).map((pId) => (
                          <span 
                            key={pId} 
                            className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${
                              pId === currentUser.id 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                                : 'bg-slate-50 text-slate-600 border-slate-200/60'
                            }`}
                          >
                            {pId === currentUser.id ? 'You' : getUserName(pId)}
                          </span>
                        ))}
                        {participants.length > 3 && (
                          <span className="text-[9px] text-slate-400 font-medium">
                            +{participants.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Net status + selector */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className="text-right">
                      <div className={`text-xs font-bold tracking-tight ${statusColor}`}>
                        {statusText}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                        {exp.date}
                      </div>
                    </div>

                    {isSelectMode ? (
                      <div className="mt-1">
                        {hasAccess ? (
                          <div 
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                                : 'border-slate-300 bg-white'
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
                      <div className="text-slate-300 group-hover:text-slate-500 transition-colors mt-1">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-sm max-h-[85vh] overflow-y-auto p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-sm">
                  {detailExpense.category?.charAt(0) || '₹'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-snug">{detailExpense.title}</h3>
                  <span className="text-[11px] text-slate-400 font-medium">{detailExpense.category || 'General'}</span>
                </div>
              </div>
              <button 
                onClick={() => setDetailExpense(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Total Hero Block */}
            <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100/50 rounded-2xl p-3.5 text-center mb-3.5">
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Total Expense</div>
              <div className="text-2xl font-black text-slate-800">
                ₹{parseFloat(detailExpense.totalAmount).toFixed(2)}
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3.5 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-slate-400 font-medium flex items-center gap-1 mb-0.5 text-[11px]">
                  <User size={12} className="text-indigo-500" />
                  <span>Paid By</span>
                </div>
                <div className="font-bold text-slate-700 truncate">
                  {detailExpense.paidBy === currentUser.id ? 'You' : getUserName(detailExpense.paidBy)}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-slate-400 font-medium flex items-center gap-1 mb-0.5 text-[11px]">
                  <CreditCard size={12} className="text-indigo-500" />
                  <span>Method</span>
                </div>
                <div className="font-bold text-slate-700">
                  {detailExpense.paymentMethod || 'UPI'}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-slate-400 font-medium flex items-center gap-1 mb-0.5 text-[11px]">
                  <Calendar size={12} className="text-indigo-500" />
                  <span>Date</span>
                </div>
                <div className="font-bold text-slate-700">
                  {detailExpense.date}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-slate-400 font-medium flex items-center gap-1 mb-0.5 text-[11px]">
                  <Sparkles size={12} className="text-indigo-500" />
                  <span>Created By</span>
                </div>
                <div className="font-bold text-slate-700 truncate">
                  {detailExpense.createdBy 
                    ? (detailExpense.createdBy === currentUser.id ? 'You' : getUserName(detailExpense.createdBy))
                    : (detailExpense.paidBy === currentUser.id ? 'You' : getUserName(detailExpense.paidBy))}
                </div>
              </div>
            </div>

            {/* Participant Breakdown List */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Users size={13} className="text-indigo-600" />
                  Split Details
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {getParticipantsList(detailExpense).length} members
                </span>
              </div>

              <div className="space-y-1.5">
                {Object.entries(detailExpense.splits || {}).map(([memberId, shareAmount]) => {
                  const numShare = parseFloat(shareAmount);
                  if (numShare <= 0) return null;
                  const isUser = memberId === currentUser.id;

                  return (
                    <div 
                      key={memberId} 
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                        isUser 
                          ? 'bg-indigo-50/60 border-indigo-100' 
                          : 'bg-white border-slate-100'
                      }`}
                    >
                      <span className={`font-semibold ${isUser ? 'text-indigo-900' : 'text-slate-700'}`}>
                        {isUser ? 'You' : getUserName(memberId)}
                      </span>
                      <span className="font-bold text-slate-800 font-mono">
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
              className="w-full text-xs font-semibold py-2.5"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Floating Bottom Selection Bar */}
      {isSelectMode && selectedIds.length > 0 && (
        <div className="fixed bottom-[74px] left-5 right-5 max-w-sm mx-auto z-40 animate-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full shadow-xs">
                {selectedIds.length}
              </span>
              <span className="text-xs font-medium text-slate-200">Selected</span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSelectedIds([])}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 font-medium transition-colors"
              >
                Clear
              </button>
              <button 
                onClick={() => setShowConfirmModal(true)}
                className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-transform shadow-xs flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>Delete ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center mb-1">Confirm Deletion</h3>
            <p className="text-slate-500 text-xs text-center mb-5 leading-relaxed">
              Are you sure you want to permanently remove {selectedIds.length} selected expense(s)?
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="secondary" onClick={() => setShowConfirmModal(false)} className="py-2 text-xs">
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete} className="py-2 text-xs bg-rose-600 text-white hover:bg-rose-700">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}