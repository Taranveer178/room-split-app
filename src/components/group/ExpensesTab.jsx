import React, { useState } from 'react';
import { 
  Receipt, Trash2, Check, AlertCircle, X 
} from 'lucide-react';
import { Card, Button } from '../common/UI';
import { PAYMENT_METHODS } from '../../utils/constants';

export default function ExpensesTab({ expenses, currentUser, getUserName, onDeleteExpense, showToast }) {
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const filtered = expenses.filter(exp => {
    if (filterMethod === 'ALL') return true;
    return exp.paymentMethod === filterMethod;
  });

  // Dual permission: Payer OR Creator can delete
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
    if (!isSelectMode) return;

    if (!canDeleteExpense(exp)) {
      showToast('Only the payer or creator can delete this bill.', 'error');
      return;
    }

    setSelectedIds(prev => 
      prev.includes(exp.id) ? prev.filter(id => id !== exp.id) : [...prev, exp.id]
    );
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

  return (
    <div className="p-4 space-y-3.5 pb-28 relative min-h-full">
      {/* Top Filter and Select Controls */}
      <div className="flex items-center justify-between gap-2">
        {/* Horizontal Category / Payment Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs flex-1">
          <button 
            onClick={() => setFilterMethod('ALL')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all flex-shrink-0 text-xs ${
              filterMethod === 'ALL' 
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' 
                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All ({expenses.length})
          </button>
          {PAYMENT_METHODS.map(method => (
            <button 
              key={method}
              onClick={() => setFilterMethod(method)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex-shrink-0 text-xs ${
                filterMethod === method 
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' 
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        {/* Top-Right Professional Select Trigger */}
        <button
          onClick={toggleSelectMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex-shrink-0 ${
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
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-3">
            <Receipt size={28} className="text-indigo-500" />
          </div>
          <h2 className="text-base font-bold text-slate-700">No Expenses Recorded</h2>
          <p className="text-slate-400 text-xs mt-1 max-w-[220px]">
            {filterMethod !== 'ALL' ? `No bills tagged with ${filterMethod}.` : 'Tap the + button to split your first expense.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(exp => {
            const iPaid = exp.paidBy === currentUser.id;
            const hasAccess = canDeleteExpense(exp);
            const isSelected = selectedIds.includes(exp.id);
            const myShare = exp.splits ? exp.splits[currentUser.id] : 0;

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
              <Card 
                key={exp.id} 
                onClick={() => handleCardClick(exp)}
                className={`p-3.5 transition-all duration-200 border ${
                  isSelected 
                    ? 'border-indigo-500 bg-indigo-50/25 ring-1 ring-indigo-500/20' 
                    : isSelectMode && hasAccess 
                      ? 'hover:border-slate-300 cursor-pointer' 
                      : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Category Icon & Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-indigo-50/80 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0 font-bold text-sm">
                      {exp.category ? exp.category.charAt(0) : '₹'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 text-[13px] truncate leading-tight">
                        {exp.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate mt-1 flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">
                          {iPaid ? 'You' : getUserName(exp.paidBy)}
                        </span> 
                        <span>paid ₹{parseFloat(exp.totalAmount).toFixed(2)}</span>
                        <span className="inline-block w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide">
                          {exp.paymentMethod || 'UPI'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Balance & Checkbox */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className={`text-xs font-bold ${statusColor}`}>
                        {statusText}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                        {exp.date}
                      </div>
                    </div>

                    {/* Animated Checkbox when Select Mode is Active */}
                    {isSelectMode && (
                      <div className="pl-1">
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
                          <div className="w-5 h-5 rounded-lg border border-slate-200 bg-slate-100/60 flex items-center justify-center cursor-not-allowed opacity-40" title="Permission restricted">
                            <span className="text-[10px] text-slate-400">✕</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Selection Bar with proper side padding margins */}
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
              <Button variant="secondary" onClick={() => setShowConfirmModal(false)} className="py-2.5 text-xs">
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete} className="py-2.5 text-xs bg-rose-600 text-white hover:bg-rose-700">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}