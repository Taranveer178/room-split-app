import React, { useMemo, useState } from 'react';
import { 
  CheckCircle2, Send, Copy, AlertTriangle, 
  CheckCheck, Sparkles, ArrowRightLeft, 
  PlusCircle, ChevronDown, ChevronUp, Receipt, 
  User
} from 'lucide-react';
import { calculateSettlements } from '../../utils/settlement';
import { Card, Button } from '../common/UI';

export default function BalancesTab({ 
  expenses, 
  group, 
  currentUser, 
  getUserName, 
  users = [], 
  onSaveExpense, 
  onSendNotification,
  showToast 
}) {
  const { balances, settlements: optimizedSettlements } = useMemo(() => calculateSettlements(expenses, group.members), [expenses, group.members]);
  const myBalance = balances[currentUser.id] || 0;
  
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [confirmSettlement, setConfirmSettlement] = useState(null);
  const [breakdownData, setBreakdownData] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showOptimized, setShowOptimized] = useState(true);

  // Custom Quick Pay States
  const [customPayee, setCustomPayee] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  // Calculate Raw Pairwise (Exact) Settlements
  const rawSettlements = useMemo(() => {
    const debtMatrix = {};
    group.members.forEach(m1 => {
      debtMatrix[m1] = {};
      group.members.forEach(m2 => debtMatrix[m1][m2] = 0);
    });

    expenses.forEach(exp => {
      const payer = exp.paidBy;
      if (!payer || !exp.splits || exp.category === 'Settlement') return;
      Object.entries(exp.splits).forEach(([participant, shareAmount]) => {
        const share = parseFloat(shareAmount) || 0;
        if (participant !== payer && share > 0 && debtMatrix[participant]) {
          debtMatrix[participant][payer] += share;
        }
      });
    });

    const pairwise = [];
    const processed = new Set();

    group.members.forEach(m1 => {
      group.members.forEach(m2 => {
        if (m1 === m2) return;
        const pairKey = [m1, m2].sort().join('-');
        if (processed.has(pairKey)) return;
        processed.add(pairKey);

        const net = debtMatrix[m1][m2] - debtMatrix[m2][m1];
        if (net > 0.05) pairwise.push({ from: m1, to: m2, amount: net });
        else if (net < -0.05) pairwise.push({ from: m2, to: m1, amount: Math.abs(net) });
      });
    });
    return pairwise;
  }, [expenses, group.members]);

  const displayedSettlements = showOptimized ? optimizedSettlements : rawSettlements;
  const FALLBACK_DEFAULT_UPI = "staranveer178@okicici";

  const getMemberUpi = (memberId) => {
    const member = users.find(u => u.id === memberId);
    return member?.upiId?.trim() || null;
  };

  const sendPaymentNotification = async (recipientId, type, message) => {
    if (!onSendNotification || recipientId === currentUser.id) return;
    const createdAt = new Date().toISOString();
    const senderName = currentUser.username || getUserName(currentUser.id);
    await onSendNotification([{
      id: `notif_payment_${Date.now()}_${recipientId}`,
      recipientId,
      senderId: currentUser.id,
      createdBy: currentUser.id,
      createdByName: senderName,
      groupId: group.id,
      type,
      message,
      createdAt,
      read: false,
    }]);
  };

  const handleCopyUPI = (upiToCopy, idx) => {
    navigator.clipboard.writeText(upiToCopy);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Robust Settlement Record
  const recordSettlement = async (fromId, toId, amountStr, titlePrefix = "Settlement") => {
    if (!onSaveExpense) throw new Error("Save handler missing");

    const toName = toId === currentUser.id ? 'You' : getUserName(toId);
    const fromName = fromId === currentUser.id ? 'You' : getUserName(fromId);

    const settlementSplits = {};
    group.members.forEach(m => settlementSplits[m] = "0");
    settlementSplits[toId] = parseFloat(amountStr).toFixed(2);

    const settlementTransaction = {
      id: `exp_settle_${Date.now()}`,
      groupId: group.id,
      title: `${titlePrefix}: ${fromName} → ${toName}`,
      totalAmount: parseFloat(amountStr).toFixed(2),
      paidBy: fromId,
      paymentMethod: 'UPI',
      category: 'Settlement',
      date: new Date().toISOString().split('T')[0],
      splits: settlementSplits,
      isSettlement: true,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
    };

    await onSaveExpense(settlementTransaction);
  };

  // Receiver verifies payment
  const handleConfirmReceived = async () => {
    setLoading(true);
    try {
      await recordSettlement(confirmSettlement.from, confirmSettlement.to, confirmSettlement.amount);
      const receiverName = currentUser.username || getUserName(currentUser.id);
      await sendPaymentNotification(
        confirmSettlement.from,
        'SETTLEMENT_CONFIRMED',
        `${receiverName} confirmed receiving ₹${confirmSettlement.amount.toFixed(2)} from you.`
      );
      
      if (typeof showToast === 'function') showToast(`Payment received and balance cleared!`);
      setConfirmSettlement(null);
      setExpandedId(null);
    } catch (err) {
      console.error(err);
      if (typeof showToast === 'function') showToast('Failed to record settlement', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Custom Quick Pay
  const handleCustomPayment = async (isRecordingOnly) => {
    const amt = parseFloat(customAmount);
    if (!customPayee || isNaN(amt) || amt <= 0) {
      if (typeof showToast === 'function') showToast('Select a roommate and valid amount', 'error');
      return;
    }

    if (!isRecordingOnly) {
      const payeeName = getUserName(customPayee);
      const payeeUpi = getMemberUpi(customPayee) || FALLBACK_DEFAULT_UPI;
      const amountStr = amt.toFixed(2);
      const note = encodeURIComponent(`RoomSplit Payment`);
      const gpayDirectUrl = `gpay://upi/pay?pa=${payeeUpi}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=INR&tn=${note}`;
      const androidGPayIntent = `intent://upi/pay?pa=${payeeUpi}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=INR&tn=${note}#Intent;scheme=gpay;package=com.google.android.apps.nbu.paisa.user;end`;

      const isAndroid = /Android/i.test(navigator.userAgent);
      if (isAndroid) {
        window.location.href = androidGPayIntent;
        setTimeout(() => window.location.href = gpayDirectUrl, 500);
      } else {
        window.location.href = gpayDirectUrl;
      }
    } else {
      setLoading(true);
      try {
        await recordSettlement(currentUser.id, customPayee, amt.toFixed(2), "Quick Pay");
        const payerName = currentUser.username || getUserName(currentUser.id);
        await sendPaymentNotification(
          customPayee,
          'PAYMENT_RECORDED',
          `${payerName} recorded a payment of ₹${amt.toFixed(2)} to you.`
        );
        if (typeof showToast === 'function') showToast(`Payment recorded successfully!`);
        setCustomPayee('');
        setCustomAmount('');
      } catch (err) {
        console.error(err);
        if (typeof showToast === 'function') showToast('Failed to record custom payment', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Calculate breakdown for exact settlements
  const getBreakdownForPair = (userA, userB) => {
    return expenses.filter(exp => {
      if (exp.category === 'Settlement') return false;
      const aPaid = exp.paidBy === userA;
      const bPaid = exp.paidBy === userB;
      const aShare = parseFloat(exp.splits?.[userA]) || 0;
      const bShare = parseFloat(exp.splits?.[userB]) || 0;
      return (aPaid && bShare > 0) || (bPaid && aShare > 0);
    });
  };

  return (
    <div className="p-4 pb-28 space-y-5 relative min-h-full bg-slate-50">
      
      {/* Header Balance Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-[24px] p-6 text-white shadow-xl border border-indigo-900/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-indigo-200/80 font-semibold mb-1 text-[11px] uppercase tracking-widest flex items-center gap-2">
          Your Net Balance
        </h2>
        <div className="text-4xl font-black tracking-tight font-mono my-2">
          {myBalance < 0 ? '-' : ''}₹{Math.abs(myBalance).toFixed(2)}
        </div>
        <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
          <div className={`w-2 h-2 rounded-full ${myBalance > 0 ? 'bg-emerald-400' : myBalance < 0 ? 'bg-rose-400' : 'bg-slate-400'}`} />
          <p className="text-xs font-medium text-slate-100">
            {myBalance > 0 ? 'You need to receive money' : myBalance < 0 ? 'You need to pay' : 'You are completely settled'}
          </p>
        </div>
      </div>
      
      {/* SETTLEMENTS SECTION */}
      <div>
        <div className="flex items-end justify-between mb-4 px-1">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Balances</h3>
          </div>
          <div className="flex bg-slate-200/60 p-1 rounded-xl">
            <button 
              onClick={() => { setShowOptimized(true); setExpandedId(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                showOptimized ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sparkles size={13} /> Smart
            </button>
            <button 
              onClick={() => { setShowOptimized(false); setExpandedId(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                !showOptimized ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowRightLeft size={13} /> Exact
            </button>
          </div>
        </div>
        
        {displayedSettlements.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-base font-bold text-slate-800">All Settled Up</p>
            <p className="text-xs text-slate-500 mt-1">No outstanding balances remaining.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedSettlements.map((settlement, index) => {
              const iAmFrom = settlement.from === currentUser.id;
              const iAmTo = settlement.to === currentUser.id;
              const isMySettlement = iAmFrom || iAmTo;
              const isExpanded = expandedId === index;
              
              const fromName = iAmFrom ? 'You' : getUserName(settlement.from);
              const toName = iAmTo ? 'You' : getUserName(settlement.to);
              const payeeUpi = getMemberUpi(settlement.to) || FALLBACK_DEFAULT_UPI;
              const hasCustomUpi = Boolean(getMemberUpi(settlement.to));
              
              let statusText = `${fromName} needs to pay ${toName}`;
              let amountColor = 'text-slate-800';
              let badgeColor = 'bg-slate-100 text-slate-600';
              
              if (iAmFrom) {
                statusText = `You need to pay ${toName}`;
                amountColor = 'text-rose-600';
                badgeColor = 'bg-rose-50 text-rose-600 border border-rose-100';
              } else if (iAmTo) {
                statusText = `${fromName} needs to pay you`;
                amountColor = 'text-emerald-600';
                badgeColor = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
              }

              return (
                <div key={index} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all duration-200">
                  {/* Collapsed Header Bar */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : index)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${badgeColor}`}>
                        {iAmFrom ? toName.charAt(0).toUpperCase() : fromName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{statusText}</p>
                        <p className={`text-sm font-bold font-mono mt-0.5 ${amountColor}`}>
                          ₹{settlement.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Expanded Actions Panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-slate-50/50 border-t border-slate-100">
                      
                      {/* Breakdown Button */}
                      {!showOptimized && (
                        <div className="flex justify-center mb-3 mt-2">
                          <button 
                            onClick={() => setBreakdownData({ from: settlement.from, to: settlement.to, amount: settlement.amount, fromName, toName })}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50/80 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                          >
                            <Receipt size={13} /> View expense breakdown
                          </button>
                        </div>
                      )}

                      {/* Pay Options (Sender) */}
                      {iAmFrom && (
                        <div className="space-y-2 mt-2">
                          {!hasCustomUpi && (
                            <div className="text-[11px] text-amber-600 flex items-start gap-1.5 bg-amber-50 px-3 py-2 rounded-xl mb-3">
                              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                              <span className="leading-snug">{toName} hasn't linked a UPI ID yet. Using default fallback.</span>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                const note = encodeURIComponent(`RoomSplit to ${toName}`);
                                window.location.href = `gpay://upi/pay?pa=${payeeUpi}&pn=${encodeURIComponent(toName)}&am=${settlement.amount.toFixed(2)}&cu=INR&tn=${note}`;
                              }}
                              className="flex items-center justify-center gap-2 py-3 px-3 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all shadow-sm"
                            >
                              <Send size={14} /> Pay via GPay
                            </button>
                            <button
                              onClick={() => handleCopyUPI(payeeUpi, index)}
                              className="flex items-center justify-center gap-2 py-3 px-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all shadow-sm"
                            >
                              <Copy size={14} /> {copiedIndex === index ? 'Copied!' : 'Copy UPI ID'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Receive Options (Receiver) */}
                      {iAmTo && (
                        <div className="mt-2">
                          <button
                            onClick={() => setConfirmSettlement(settlement)}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-sm shadow-emerald-200"
                          >
                            <CheckCheck size={16} strokeWidth={2.5} /> Confirm Payment Received
                          </button>
                        </div>
                      )}

                      {!isMySettlement && (
                        <div className="text-center text-xs text-slate-400 py-2">
                          You are not involved in this specific settlement.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK PAY & RECORD MODULE */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <h3 className="text-sm font-bold text-slate-800 mb-3 px-1 flex items-center gap-1.5">
          <PlusCircle size={16} className="text-indigo-600" /> Quick Pay
        </h3>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          
          <div className="flex gap-2 items-center">
            {/* Payee Selection Dropdown */}
            <div className="relative flex-1">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select 
                value={customPayee} 
                onChange={(e) => setCustomPayee(e.target.value)}
                className="w-full h-11 pl-10 pr-3 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 text-slate-700 outline-none focus:border-indigo-400 transition-colors"
              >
                <option value="" className="font-normal">Select payee...</option>
                {group.members.filter(m => m !== currentUser.id).map(memberId => (
                  <option key={memberId} value={memberId}>{getUserName(memberId)}</option>
                ))}
              </select>
            </div>

            {/* Custom Amount Raw Input with Currency Prefix */}
            <div className="relative w-36 flex-shrink-0">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
              <input 
                type="number" 
                placeholder="0.00" 
                min="1"
                step="0.01"
                value={customAmount} 
                onChange={(e) => setCustomAmount(e.target.value)} 
                className="w-full h-11 pl-7 pr-3 text-sm font-mono font-bold border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:border-indigo-400 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Action Buttons with Icons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button 
              type="button"
              onClick={() => handleCustomPayment(false)}
              className="h-10 text-xs font-bold rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Send size={13} className="text-indigo-600" />
              <span>Pay via GPay</span>
            </button>
            <button 
              type="button"
              onClick={() => handleCustomPayment(true)}
              disabled={loading}
              className="h-10 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>{loading ? 'Saving...' : 'Record Entry'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Breakdown Receipt */}
      {breakdownData && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Expense Breakdown</h3>
              <p className="text-xs text-slate-500 mt-1">
                Why <strong className="text-slate-700">{breakdownData.fromName}</strong> needs to pay <strong className="text-slate-700">{breakdownData.toName}</strong> <strong className="font-mono text-slate-800">₹{breakdownData.amount.toFixed(2)}</strong>
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {getBreakdownForPair(breakdownData.from, breakdownData.to).map(exp => {
                const isFromPaid = exp.paidBy === breakdownData.from;
                const payerName = isFromPaid ? breakdownData.fromName : breakdownData.toName;
                const borrowerName = isFromPaid ? breakdownData.toName : breakdownData.fromName;
                const shareAmt = isFromPaid ? exp.splits[breakdownData.to] : exp.splits[breakdownData.from];

                return (
                  <div key={exp.id} className="p-3 bg-white border border-slate-100 rounded-xl shadow-xs">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-sm font-bold text-slate-800">{exp.title}</span>
                      <span className="text-xs font-mono font-bold text-slate-600">₹{parseFloat(shareAmt).toFixed(2)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex justify-between items-center">
                      <span>{payerName} paid ₹{parseFloat(exp.totalAmount).toFixed(2)}</span>
                      <span>({borrowerName}'s share)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white">
              <Button onClick={() => setBreakdownData(null)} variant="secondary" className="w-full py-3 text-xs rounded-xl">
                Close Breakdown
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Payment Received */}
      {confirmSettlement && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] max-w-xs w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100/50">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Confirm Receipt</h3>
            <p className="text-slate-500 text-sm mb-5 leading-relaxed">
              Verify you received <strong className="text-slate-900 font-mono text-base">₹{confirmSettlement.amount.toFixed(2)}</strong> from <strong className="text-slate-800">{getUserName(confirmSettlement.from)}</strong>.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setConfirmSettlement(null)} disabled={loading} className="py-2.5 text-xs rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleConfirmReceived} disabled={loading} className="py-2.5 text-xs rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm">
                {loading ? 'Confirming...' : 'Yes, I got it'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}