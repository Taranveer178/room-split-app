import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle2, Send, Copy, AlertTriangle, 
  CheckCheck, Sparkles, ArrowRightLeft, 
  PlusCircle, ChevronDown, ChevronUp, Receipt, 
  User, IndianRupee, ArrowUpRight, ArrowDownLeft, X
} from 'lucide-react';
import { calculateSettlements } from '../../utils/settlement';
import { Button } from '../common/UI';
import { triggerPushNotification } from '../../utils/notifications';

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
  const confirmationInFlight = useRef(false);

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
      if (!payer || !exp.splits) return;
      Object.entries(exp.splits).forEach(([participant, shareAmount]) => {
        const share = parseFloat(shareAmount) || 0;
        if (exp.category === 'Settlement') {
          if (participant !== payer && debtMatrix[payer]?.[participant] !== undefined) {
            debtMatrix[payer][participant] -= share;
          }
          return;
        }
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

    const toName = getUserName(toId);
    const fromName = getUserName(fromId);

    const settlementSplits = {};
    group.members.forEach(m => settlementSplits[m] = "0");
    settlementSplits[toId] = parseFloat(amountStr).toFixed(2);

    const settlementContext = [
      group.id,
      fromId,
      toId,
      parseFloat(amountStr).toFixed(2),
      ...expenses.map(expense => expense.id).sort(),
    ].join('|');
    let settlementHash = 2166136261;
    for (let index = 0; index < settlementContext.length; index += 1) {
      settlementHash = Math.imul(settlementHash ^ settlementContext.charCodeAt(index), 16777619);
    }

    const settlementTransaction = {
      id: `exp_settle_${(settlementHash >>> 0).toString(36)}`,
      groupId: group.id,
      title: `${titlePrefix}: ${fromName} → ${toName}`,
      settlementFrom: fromId,
      settlementTo: toId,
      settlementTitlePrefix: titlePrefix,
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
    if (!confirmSettlement || confirmationInFlight.current) return;
    confirmationInFlight.current = true;
    setLoading(true);
    try {
      await recordSettlement(confirmSettlement.from, confirmSettlement.to, confirmSettlement.amount);
      setConfirmSettlement(null);
      setExpandedId(null);
      const receiverName = currentUser.username || getUserName(currentUser.id);
      const message = `${receiverName} confirmed receiving ₹${confirmSettlement.amount.toFixed(2)} from you.`;

      try {
        await sendPaymentNotification(confirmSettlement.from, 'SETTLEMENT_CONFIRMED', message);
        await triggerPushNotification({
          recipientId: confirmSettlement.from,
          title: 'Payment Confirmed',
          message,
          groupId: group.id,
        });
      } catch (notificationError) {
        console.error('Settlement notification failed:', notificationError);
      }

      if (typeof showToast === 'function') showToast('Payment received and balance cleared!');
    } catch (err) {
      console.error(err);
      if (typeof showToast === 'function') showToast('Failed to record settlement', 'error');
    } finally {
      confirmationInFlight.current = false;
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
        const message = `${payerName} recorded a payment of ₹${amt.toFixed(2)} to you.`;

        await sendPaymentNotification(
          customPayee,
          'PAYMENT_RECORDED',
          message
        );

        await triggerPushNotification({
          recipientId: customPayee,
          title: 'Payment Received',
          message,
          groupId: group.id,
        });

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
    <div className="p-4 sm:p-6 lg:p-10 space-y-5 pb-[130px] md:pb-36 relative min-h-full max-w-5xl mx-auto animate-in fade-in duration-300">
      
      {/* Ambient background glows */}
      <div className="absolute top-0 right-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Net Balance Card (Liquid Gradient Glass) */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-6 sm:p-8 text-white shadow-[0_12px_40px_rgba(37,99,235,0.25)] border border-white/20">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-blue-200 block mb-1">
              Your Net Position
            </span>
            <div className="flex items-center gap-1 text-4xl sm:text-5xl font-black font-mono tracking-tight my-1 text-white">
              <span>{myBalance < 0 ? '-' : ''}₹{Math.abs(myBalance).toFixed(2)}</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 shadow-sm self-start sm:self-auto">
            {myBalance > 0 ? (
              <>
                <ArrowDownLeft size={16} className="text-emerald-300 stroke-[2.5]" />
                <span className="text-xs font-bold text-emerald-100">You need to receive money</span>
              </>
            ) : myBalance < 0 ? (
              <>
                <ArrowUpRight size={16} className="text-rose-300 stroke-[2.5]" />
                <span className="text-xs font-bold text-rose-100">You need to money</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} className="text-blue-200" />
                <span className="text-xs font-bold text-blue-100">All settled up</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* SETTLEMENTS SECTION */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Balances & Dues</h3>
          </div>

          {/* Smart vs Exact segmented toggle */}
          <div className="flex bg-white/80 backdrop-blur-md p-1 rounded-2xl border border-white/70 shadow-2xs">
            <button 
              onClick={() => { setShowOptimized(true); setExpandedId(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                showOptimized 
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles size={13} /> Smart
            </button>
            <button 
              onClick={() => { setShowOptimized(false); setExpandedId(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                !showOptimized 
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft size={13} /> Exact
            </button>
          </div>
        </div>
        
        {displayedSettlements.length === 0 ? (
          <div className="rounded-[28px] bg-white/80 backdrop-blur-2xl p-10 text-center border border-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-base font-extrabold text-slate-800">All Settled Up</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">No outstanding dues or debts remaining across your room.</p>
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
              let amountBadge = 'text-slate-800 bg-white/60 border-slate-200/50';
              
              if (iAmFrom) {
                statusText = `You need to pay ${toName}`;
                amountBadge = 'text-rose-600 bg-rose-50/80 border-rose-200/70';
              } else if (iAmTo) {
                statusText = `${fromName} needs to pay you`;
                amountBadge = 'text-emerald-600 bg-emerald-50/80 border-emerald-200/70';
              }
              const avatarMemberId = iAmFrom ? settlement.to : settlement.from;
              const avatarMember = users.find((member) => member.id === avatarMemberId);
              const avatarName = getUserName(avatarMemberId) || 'Roommate';

              return (
                <div 
                  key={index} 
                  className={`rounded-[26px] backdrop-blur-2xl border transition-all duration-300 overflow-hidden ${
                    isExpanded
                      ? 'bg-white/95 border-blue-300/80 shadow-[0_12px_36px_rgba(37,99,235,0.08)]'
                      : 'bg-white/80 border-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white/95 hover:border-white'
                  }`}
                >
                  {/* Collapsed Header Bar */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : index)}
                    className="p-4 sm:p-4.5 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3.5">
                      {avatarMember?.photoDataUrl ? (
                        <img src={avatarMember.photoDataUrl} alt={`${avatarName} profile`} className="h-11 w-11 rounded-2xl object-cover shadow-2xs border border-white" />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-100 border border-blue-200/50 flex items-center justify-center font-black text-blue-700 shadow-2xs">
                          {avatarName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-tight">{statusText}</p>
                        <div className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs font-mono font-black border mt-1 ${amountBadge}`}>
                          <span>₹{settlement.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100/70 flex items-center justify-center text-slate-400">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Expanded Actions Panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-blue-50/20 border-t border-slate-100/80 animate-in fade-in duration-150">
                      
                      {/* Breakdown Trigger for Exact Mode */}
                      {!showOptimized && (
                        <div className="flex justify-center mb-3">
                          <button 
                            onClick={() => setBreakdownData({ from: settlement.from, to: settlement.to, amount: settlement.amount, fromName, toName })}
                            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full hover:bg-blue-100 transition-colors shadow-2xs"
                          >
                            <Receipt size={13} /> View expense breakdown
                          </button>
                        </div>
                      )}

                      {/* Pay Options (Sender) */}
                      {iAmFrom && (
                        <div className="space-y-2.5">
                          {!hasCustomUpi && (
                            <div className="text-[11px] text-amber-700 flex items-start gap-1.5 bg-amber-50/80 border border-amber-200/60 p-3 rounded-2xl">
                              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
                              <span className="leading-snug">{toName} hasn't linked a UPI ID yet. Using default fallback.</span>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                const note = encodeURIComponent(`RoomSplit to ${toName}`);
                                window.location.href = `gpay://upi/pay?pa=${payeeUpi}&pn=${encodeURIComponent(toName)}&am=${settlement.amount.toFixed(2)}&cu=INR&tn=${note}`;
                              }}
                              className="flex items-center justify-center gap-2 py-3 px-3 bg-blue-600 text-white rounded-2xl text-xs font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20"
                            >
                              <Send size={14} /> Pay via GPay
                            </button>
                            <button
                              onClick={() => handleCopyUPI(payeeUpi, index)}
                              className="flex items-center justify-center gap-2 py-3 px-3 bg-white/80 border border-slate-200/80 text-slate-700 rounded-2xl text-xs font-bold hover:bg-white active:scale-[0.98] transition-all shadow-2xs"
                            >
                              <Copy size={14} /> {copiedIndex === index ? 'Copied!' : 'Copy UPI ID'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Receive Options (Receiver) */}
                      {iAmTo && (
                        <div>
                          <button
                            onClick={() => setConfirmSettlement(settlement)}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md shadow-emerald-500/25"
                          >
                            <CheckCheck size={16} strokeWidth={2.5} /> Confirm Payment Received
                          </button>
                        </div>
                      )}

                      {!isMySettlement && (
                        <div className="text-center text-xs text-slate-400 py-1.5">
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

      {/* QUICK PAY & RECORD MODULE (Liquid Glass Container) */}
      <div className="rounded-[28px] bg-white/80 backdrop-blur-2xl p-5 border border-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <PlusCircle size={15} className="text-blue-600" /> Quick Pay & Settle
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          {/* Payee Selection Dropdown */}
          <div className="relative flex-1">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select 
              value={customPayee} 
              onChange={(e) => setCustomPayee(e.target.value)}
              className="w-full h-11 pl-10 pr-3 text-xs font-semibold border border-slate-200/80 rounded-2xl bg-white/60 hover:bg-white text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs"
            >
              <option value="" className="font-normal">Select payee roommate...</option>
              {group.members.filter(m => m !== currentUser.id).map(memberId => (
                <option key={memberId} value={memberId}>{getUserName(memberId)}</option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div className="relative w-full sm:w-40 flex-shrink-0">
            <IndianRupee size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
            <input 
              type="number" 
              placeholder="0.00" 
              min="1"
              step="0.01"
              value={customAmount} 
              onChange={(e) => setCustomAmount(e.target.value)} 
              className="w-full h-11 pl-9 pr-3 text-sm font-mono font-bold border border-slate-200/80 rounded-2xl bg-white/60 hover:bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* Action Buttons with Icons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button 
            type="button"
            onClick={() => handleCustomPayment(false)}
            className="h-11 text-xs font-bold rounded-2xl border border-blue-200/80 text-blue-700 bg-blue-50/70 hover:bg-blue-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Send size={13} className="text-blue-600" />
            <span>Pay via GPay</span>
          </button>
          <button 
            type="button"
            onClick={() => handleCustomPayment(true)}
            disabled={loading}
            className="h-11 text-xs font-bold rounded-2xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 size={14} className="text-white" />
            <span>{loading ? 'Saving...' : 'Record Payment'}</span>
          </button>
        </div>
      </div>

      {/* MODAL: Breakdown Receipt (Liquid Glass Modal, No slider) */}
      {breakdownData && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative overflow-hidden w-full max-w-sm rounded-[32px] p-6 bg-white/85 backdrop-blur-2xl border border-white/60 shadow-[0_24px_50px_-12px_rgba(15,23,42,0.25)] animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/50 mb-3.5">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Expense Breakdown</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {breakdownData.fromName} owes {breakdownData.toName}
                </p>
              </div>
              <button 
                onClick={() => setBreakdownData(null)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-white/60 hover:bg-white/90 border border-slate-200/50 rounded-full shadow-xs transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {getBreakdownForPair(breakdownData.from, breakdownData.to).map(exp => {
                const isFromPaid = exp.paidBy === breakdownData.from;
                const payerName = isFromPaid ? breakdownData.fromName : breakdownData.toName;
                const borrowerName = isFromPaid ? breakdownData.toName : breakdownData.fromName;
                const shareAmt = isFromPaid ? exp.splits[breakdownData.to] : exp.splits[breakdownData.from];

                return (
                  <div key={exp.id} className="p-3 bg-white/70 backdrop-blur-md border border-white/80 rounded-2xl shadow-2xs">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-slate-800">{exp.title}</span>
                      <span className="text-xs font-mono font-bold text-blue-600">₹{parseFloat(shareAmt).toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between items-center">
                      <span>{payerName} paid ₹{parseFloat(exp.totalAmount).toFixed(2)}</span>
                      <span>({borrowerName}'s share)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button 
              onClick={() => setBreakdownData(null)} 
              variant="secondary" 
              className="w-full py-2.5 text-xs font-bold rounded-xl bg-white/70 hover:bg-white border border-slate-200/60 text-slate-700 shadow-xs"
            >
              Done
            </Button>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Confirm Payment Received (Liquid Glass Modal) */}
      {confirmSettlement && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative overflow-hidden w-full max-w-xs rounded-[32px] p-6 bg-white/85 backdrop-blur-2xl border border-white/60 shadow-[0_24px_50px_-12px_rgba(15,23,42,0.25)] animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-3.5 shadow-inner">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Confirm Receipt</h3>
            <p className="text-slate-500 text-xs mb-5 leading-relaxed">
              Verify you received <strong className="text-slate-900 font-mono text-sm">₹{confirmSettlement.amount.toFixed(2)}</strong> from <strong className="text-slate-800">{getUserName(confirmSettlement.from)}</strong>.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <Button 
                variant="secondary" 
                onClick={() => setConfirmSettlement(null)} 
                disabled={loading} 
                className="py-2.5 text-xs font-bold rounded-xl bg-white/70 hover:bg-white border border-slate-200/60"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmReceived} 
                disabled={loading} 
                className="py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
              >
                {loading ? 'Confirming...' : 'Yes, Received'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}