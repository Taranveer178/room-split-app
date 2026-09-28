import { useMemo, useState } from 'react';
import { CheckCircle2, Send, Copy, ExternalLink, AlertTriangle, CheckCheck, Sparkles, ArrowRightLeft, PlusCircle } from 'lucide-react';
import { calculateSettlements } from '../../utils/settlement';
import { Card, Button, Input } from '../common/UI';

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
  const [loading, setLoading] = useState(false);
  const [showOptimized, setShowOptimized] = useState(true);

  // Custom Quick Pay States
  const [customPayee, setCustomPayee] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  // Calculate Raw Pairwise (Exact) Settlements
  const rawSettlements = useMemo(() => {
    const owes = {};
    group.members.forEach(m1 => {
      owes[m1] = {};
      group.members.forEach(m2 => owes[m1][m2] = 0);
    });

    expenses.forEach(exp => {
      const payer = exp.paidBy;
      if (!payer || !exp.splits) return;
      Object.entries(exp.splits).forEach(([participant, shareAmount]) => {
        const share = parseFloat(shareAmount) || 0;
        if (participant !== payer && share > 0 && owes[participant]) {
          owes[participant][payer] += share;
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

        const net = owes[m1][m2] - owes[m2][m1];
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

  // Records a settlement transaction to properly deduct the balances
  const recordSettlement = async (fromId, toId, amountStr, titlePrefix = "Settlement") => {
    if (!onSaveExpense) throw new Error("Save handler missing");

    const toName = toId === currentUser.id ? 'You' : getUserName(toId);
    const fromName = fromId === currentUser.id ? 'You' : getUserName(fromId);

    const settlementTransaction = {
      id: `exp_settle_${Date.now()}`,
      groupId: group.id,
      title: `${titlePrefix}: ${fromName} → ${toName}`,
      totalAmount: amountStr,
      paidBy: fromId, // The person who gave the money
      paymentMethod: 'UPI',
      category: 'Settlement',
      date: new Date().toISOString().split('T')[0],
      splits: {
        [toId]: amountStr // The person who received the money takes the "expense" share
      },
      isSettlement: true,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
    };

    await onSaveExpense(settlementTransaction);
  };

  // Handler for Receiver clicking "Mark Settled"
  const handleConfirmReceived = async () => {
    setLoading(true);
    try {
      // confirmSettlement.from is the person who owed the money
      // confirmSettlement.to is the current user (receiver)
      await recordSettlement(confirmSettlement.from, confirmSettlement.to, confirmSettlement.amount.toFixed(2));
      const receiverName = currentUser.username || getUserName(currentUser.id);
      await sendPaymentNotification(
        confirmSettlement.from,
        'SETTLEMENT_CONFIRMED',
        `${receiverName} confirmed receiving ₹${confirmSettlement.amount.toFixed(2)} from you.`,
      );
      
      if (typeof showToast === 'function') showToast(`Payment received and balance cleared!`);
      setConfirmSettlement(null);
    } catch (err) {
      console.error(err);
      if (typeof showToast === 'function') showToast('Failed to record settlement', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Custom Quick Pay Handlers
  const handleCustomGPay = () => {
    const amt = parseFloat(customAmount);
    if (!customPayee || isNaN(amt) || amt <= 0) {
      if (typeof showToast === 'function') showToast('Please select a roommate and enter a valid amount', 'error');
      return;
    }

    const payeeName = getUserName(customPayee);
    const payeeUpi = getMemberUpi(customPayee) || FALLBACK_DEFAULT_UPI;
    const amountStr = amt.toFixed(2);
    const note = encodeURIComponent(`RoomSplit Payment from ${currentUser.username}`);

    const gpayDirectUrl = `gpay://upi/pay?pa=${payeeUpi}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=INR&tn=${note}`;
    const androidGPayIntent = `intent://upi/pay?pa=${payeeUpi}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=INR&tn=${note}#Intent;scheme=gpay;package=com.google.android.apps.nbu.paisa.user;end`;

    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href = androidGPayIntent;
      setTimeout(() => window.location.href = gpayDirectUrl, 500);
    } else {
      window.location.href = gpayDirectUrl;
    }
  };

  const handleCustomRecordEntry = async () => {
    const amt = parseFloat(customAmount);
    if (!customPayee || isNaN(amt) || amt <= 0) {
      if (typeof showToast === 'function') showToast('Please select a roommate and enter a valid amount', 'error');
      return;
    }

    setLoading(true);
    try {
      // Current User pays the selected Payee
      await recordSettlement(currentUser.id, customPayee, amt.toFixed(2), "Custom Payment");
      const payerName = currentUser.username || getUserName(currentUser.id);
      await sendPaymentNotification(
        customPayee,
        'PAYMENT_RECORDED',
        `${payerName} recorded a payment of ₹${amt.toFixed(2)} to you.`,
      );
      if (typeof showToast === 'function') showToast(`Payment to ${getUserName(customPayee)} recorded successfully!`);
      
      setCustomPayee('');
      setCustomAmount('');
    } catch (err) {
      console.error(err);
      if (typeof showToast === 'function') showToast('Failed to record custom payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pb-28 space-y-6 relative min-h-full">
      {/* Header Total Balance Banner */}
      <Card className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-none shadow-md">
        <h2 className="text-indigo-100 font-medium mb-1 text-xs uppercase tracking-wider">Your Balance</h2>
        <div className="text-3xl font-bold tracking-tight font-mono">
          {myBalance < 0 ? '-' : ''}₹{Math.abs(myBalance).toFixed(2)}
        </div>
        <p className="mt-2 text-indigo-100 text-xs">
          {myBalance > 0 ? 'You are owed money in total.' : myBalance < 0 ? 'You owe money in total.' : 'You are settled up!'}
        </p>
      </Card>
      
      {/* PENDING SETTLEMENTS LIST */}
      <div>
        <div className="flex items-end justify-between mb-3 px-1">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Pending Settlements</h3>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5 block">
              {showOptimized ? 'Minimum Transactions' : 'Direct Balances'}
            </span>
          </div>

          <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
            <button 
              onClick={() => setShowOptimized(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                showOptimized ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sparkles size={13} />
              Smart
            </button>
            <button 
              onClick={() => setShowOptimized(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                !showOptimized ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowRightLeft size={13} />
              Exact
            </button>
          </div>
        </div>
        
        {displayedSettlements.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500" />
            <p className="text-base font-bold text-slate-700">All Settled Up</p>
            <p className="text-xs text-slate-400 mt-1">No outstanding balances remaining.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {displayedSettlements.map((settlement, index) => {
              const iAmFrom = settlement.from === currentUser.id;
              const iAmTo = settlement.to === currentUser.id;
              const isMySettlement = iAmFrom || iAmTo;
              
              const fromName = iAmFrom ? 'You' : getUserName(settlement.from);
              const toName = iAmTo ? 'You' : getUserName(settlement.to);
              const amountStr = settlement.amount.toFixed(2);
              const note = encodeURIComponent(`RoomSplit to ${toName}`);

              const payeeUpi = getMemberUpi(settlement.to) || FALLBACK_DEFAULT_UPI;
              const hasCustomUpi = Boolean(getMemberUpi(settlement.to));

              const gpayDirectUrl = `gpay://upi/pay?pa=${payeeUpi}&pn=${encodeURIComponent(toName)}&am=${amountStr}&cu=INR&tn=${note}`;
              const phonePeUrl = `phonepe://pay?pa=${payeeUpi}&pn=${encodeURIComponent(toName)}&am=${amountStr}&cu=INR&tn=${note}`;
              const androidGPayIntent = `intent://upi/pay?pa=${payeeUpi}&pn=${encodeURIComponent(toName)}&am=${amountStr}&cu=INR&tn=${note}#Intent;scheme=gpay;package=com.google.android.apps.nbu.paisa.user;end`;

              const handleOpenGPay = () => {
                const isAndroid = /Android/i.test(navigator.userAgent);
                if (isAndroid) {
                  window.location.href = androidGPayIntent;
                  setTimeout(() => window.location.href = gpayDirectUrl, 500);
                } else {
                  window.location.href = gpayDirectUrl;
                }
              };

              return (
                <Card 
                  key={index} 
                  className={`p-4 flex flex-col gap-3 transition-all ${isMySettlement ? 'border-indigo-200 bg-indigo-50/30' : 'bg-white'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-sm">
                      <strong className="text-slate-800 font-semibold">{fromName}</strong> pays <strong className="text-slate-800 font-semibold">{toName}</strong>
                    </span>
                    <div className={`text-base font-bold font-mono ${iAmFrom ? 'text-rose-500' : iAmTo ? 'text-emerald-600' : 'text-slate-700'}`}>
                      ₹{amountStr}
                    </div>
                  </div>

                  {/* If I OWE MONEY: Show Pay & Copy Options */}
                  {iAmFrom && (
                    <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                      {!hasCustomUpi && (
                        <div className="text-[11px] text-amber-600 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg">
                          <AlertTriangle size={12} />
                          <span>{toName} hasn't added a UPI ID yet.</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleOpenGPay} className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 active:scale-95 transition-all shadow-xs">
                          <Send size={13} />
                          <span>Google Pay</span>
                        </button>
                        <a href={phonePeUrl} className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 active:scale-95 transition-all shadow-xs">
                          <ExternalLink size={13} />
                          <span>PhonePe</span>
                        </a>
                      </div>
                      <button onClick={() => handleCopyUPI(payeeUpi, index)} className="flex items-center justify-center gap-1.5 py-2 text-slate-500 hover:text-slate-700 text-xs font-medium bg-white border border-slate-200/80 rounded-xl active:bg-slate-50 transition-colors">
                        <Copy size={13} />
                        <span>{copiedIndex === index ? 'UPI ID Copied!' : `Copy UPI (${payeeUpi})`}</span>
                      </button>
                    </div>
                  )}

                  {/* If I RECEIVE MONEY: Show the "Mark Settled" completion button */}
                  {iAmTo && (
                    <div className="pt-2 border-t border-slate-100/80 flex justify-end">
                      <button
                        onClick={() => setConfirmSettlement(settlement)}
                        className="inline-flex items-center justify-center w-full gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2.5 rounded-xl border border-emerald-200/60 active:scale-95 transition-all"
                      >
                        <CheckCheck size={16} />
                        <span>I have received ₹{amountStr} from {fromName}</span>
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* CUSTOM QUICK PAYMENT SECTION */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <h3 className="text-sm font-bold text-slate-800 mb-3 px-1 flex items-center gap-1.5">
          <PlusCircle size={16} className="text-indigo-600" />
          Quick Pay & Record
        </h3>
        <Card className="p-4 bg-white border border-slate-200 shadow-sm space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Need to pay a partial amount? Select a roommate below, enter the amount, and record the entry to immediately reduce your balance.
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pay To</label>
              <select 
                value={customPayee} 
                onChange={(e) => setCustomPayee(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-medium border border-slate-200 rounded-xl bg-slate-50 outline-none text-slate-700"
              >
                <option value="">Select member...</option>
                {group.members.filter(m => m !== currentUser.id).map(memberId => (
                  <option key={memberId} value={memberId}>
                    {getUserName(memberId)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount</label>
              <Input 
                type="number" 
                placeholder="₹0.00" 
                min="1"
                step="0.01"
                value={customAmount} 
                onChange={(e) => setCustomAmount(e.target.value)} 
                className="h-10 text-sm font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button 
              type="button"
              variant="secondary"
              onClick={handleCustomGPay}
              className="py-2.5 text-xs font-bold border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
            >
              Pay via GPay
            </Button>
            <Button 
              type="button"
              onClick={handleCustomRecordEntry}
              disabled={loading}
              className="py-2.5 text-xs font-bold"
            >
              {loading ? 'Saving...' : 'Record Entry'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Confirmation Modal for Receiving Balances */}
      {confirmSettlement && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Confirm Payment</h3>
            <p className="text-slate-500 text-xs mb-4 leading-relaxed">
              Confirm that you have received <strong className="text-slate-800 font-mono">₹{confirmSettlement.amount.toFixed(2)}</strong> from <strong className="text-slate-800">{getUserName(confirmSettlement.from)}</strong>?
            </p>
            <p className="text-[11px] text-slate-400 mb-5 bg-slate-50 p-2 rounded-xl">
              This will automatically deduct the amount from their pending balance.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <Button 
                variant="secondary" 
                onClick={() => setConfirmSettlement(null)} 
                className="py-2.5 text-xs rounded-xl"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmReceived} 
                className="py-2.5 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Yes, I got it'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}