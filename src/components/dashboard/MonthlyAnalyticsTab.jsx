import { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownLeft, PieChart, Receipt,
  Utensils, Car, Home, ShoppingBag, Zap, HelpCircle, X, CalendarDays
} from 'lucide-react';

const CATEGORY_META = {
  Food: {
    color: 'bg-amber-500',
    softBg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    textColor: 'text-amber-600',
    icon: <Utensils size={14} className="text-amber-600" />
  },
  Travel: {
    color: 'bg-sky-500',
    softBg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    textColor: 'text-sky-600',
    icon: <Car size={14} className="text-sky-600" />
  },
  Rent: {
    color: 'bg-blue-500',
    softBg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    textColor: 'text-blue-600',
    icon: <Home size={14} className="text-blue-600" />
  },
  Utilities: {
    color: 'bg-indigo-500',
    softBg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    textColor: 'text-indigo-600',
    icon: <Zap size={14} className="text-indigo-600" />
  },
  Shopping: {
    color: 'bg-emerald-500',
    softBg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    textColor: 'text-emerald-600',
    icon: <ShoppingBag size={14} className="text-emerald-600" />
  },
  Other: {
    color: 'bg-slate-400',
    softBg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    textColor: 'text-slate-600',
    icon: <HelpCircle size={14} className="text-slate-500" />
  }
};

const getCategoryMeta = (name = 'Other') => {
  return CATEGORY_META[name] || CATEGORY_META.Other;
};

export default function MonthlyAnalyticsTab({ user, expenses = [], groups = [] }) {
  // Default to current year and month (YYYY-MM)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedBreakdown, setSelectedBreakdown] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const userId = user?.id;

  const formattedMonthLabel = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filter expenses matching selected month
  const monthlyExpenses = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return expenses.filter(exp => exp.date && exp.date.startsWith(monthPrefix));
  }, [expenses, year, month]);
  const spendingExpenses = useMemo(
    () => monthlyExpenses.filter((expense) => !expense.isSettlement && expense.category !== 'Settlement'),
    [monthlyExpenses]
  );

  // Aggregate stats
  const stats = useMemo(() => {
    let totalGroupSpent = 0;
    let yourShareTotal = 0;
    let youPaidTotal = 0;
    const categoryTotals = {};

    spendingExpenses.forEach((exp) => {
      const amount = parseFloat(exp.totalAmount) || 0;
      totalGroupSpent += amount;

      if (exp.paidBy === userId) {
        youPaidTotal += amount;
      }

      if (exp.splits && exp.splits[userId]) {
        yourShareTotal += parseFloat(exp.splits[userId]) || 0;
      }

      const cat = exp.category || 'Other';
      const personalShare = parseFloat(exp.splits?.[userId]) || 0;
      if (personalShare > 0) {
        categoryTotals[cat] = (categoryTotals[cat] || 0) + personalShare;
      }
    });

    const categoryList = Object.entries(categoryTotals)
      .map(([name, total]) => ({
        name,
        total,
        percentage: yourShareTotal > 0 ? ((total / yourShareTotal) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.total - a.total);

    return { totalGroupSpent, yourShareTotal, youPaidTotal, categoryList };
  }, [spendingExpenses, userId]);

  const breakdownExpenses = selectedBreakdown?.type === 'paid'
    ? spendingExpenses.filter((expense) => expense.paidBy === userId)
    : selectedBreakdown?.type === 'share'
      ? spendingExpenses.filter((expense) => (parseFloat(expense.splits?.[userId]) || 0) > 0)
    : selectedBreakdown?.type === 'category'
      ? spendingExpenses.filter((expense) => (
        (expense.category || 'Other') === selectedBreakdown.category
        && (parseFloat(expense.splits?.[userId]) || 0) > 0
      ))
      : spendingExpenses;
  const breakdownTotal = breakdownExpenses.reduce((total, expense) => (
    total + (selectedBreakdown?.type === 'share' || selectedBreakdown?.type === 'category'
      ? parseFloat(expense.splits?.[userId]) || 0
      : parseFloat(expense.totalAmount) || 0)
  ), 0);
  const netBalance = stats.youPaidTotal - stats.yourShareTotal;

  const openBreakdown = (type, title, category) => {
    setSelectedBreakdown({ type, title, category });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-4 pb-[130px] md:pb-36 relative min-h-full max-w-4xl mx-auto animate-in fade-in duration-300">
      
      {/* Ambient background glows */}
      <div className="absolute top-0 right-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Month Switcher Card (Frosted Liquid Glass) */}
      <div className="relative overflow-hidden rounded-[28px] p-4 sm:p-5 bg-white/85 backdrop-blur-2xl border border-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-0.5">
              Analytics Overview
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight truncate">
              {formattedMonthLabel}
            </h2>
          </div>

          {/* Month Switcher Controls */}
          <div className="flex items-center bg-white/80 backdrop-blur-md border border-slate-200/70 rounded-2xl p-1 shadow-2xs">
            <button 
              onClick={handlePrevMonth} 
              className="p-2 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-xl transition-all active:scale-95"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-700 px-2.5 min-w-[90px] text-center select-none truncate">
              {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
            <button 
              onClick={handleNextMonth} 
              className="p-2 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-xl transition-all active:scale-95"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Spend Stats Card (Theme Gradient Hero) */}
      <div className="relative overflow-hidden rounded-[28px] p-6 sm:p-7 text-white bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 border border-white/20 shadow-lg shadow-blue-500/20">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Your Monthly Summary</span>
            <span className="text-[11px] bg-white/15 backdrop-blur-md px-3 py-0.5 rounded-full text-white font-semibold border border-white/20 shadow-inner">
              {spendingExpenses.length} bill{spendingExpenses.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-4 mt-3 border-t border-white/15 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => openBreakdown('paid', 'You Paid Out')}
              className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 p-2.5 text-left backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              aria-label={`View expenses you paid, totaling ₹${stats.youPaidTotal.toFixed(2)}`}
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center flex-shrink-0">
                <ArrowUpRight size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-blue-100/80 font-bold uppercase tracking-wider">Total I Paid</p>
                <p className="text-sm font-extrabold text-white font-mono truncate">₹{stats.youPaidTotal.toFixed(2)}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openBreakdown('share', 'My Share')}
              className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 p-2.5 text-left backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              aria-label={`View your expense shares, totaling ₹${stats.yourShareTotal.toFixed(2)}`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 text-blue-200 flex items-center justify-center flex-shrink-0">
                <Receipt size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-blue-100/80 font-bold uppercase tracking-wider">My Share</p>
                <p className="text-sm font-extrabold text-white font-mono truncate">₹{stats.yourShareTotal.toFixed(2)}</p>
              </div>
            </button>

            <div className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 p-2.5 backdrop-blur-md">
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${netBalance > 0 ? 'bg-emerald-400/20 text-emerald-300' : netBalance < 0 ? 'bg-rose-400/20 text-rose-200' : 'bg-white/20 text-blue-100'}`}>
                {netBalance > 0 ? <ArrowDownLeft size={18} strokeWidth={2.5} /> : <ArrowUpRight size={18} strokeWidth={2.5} />}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-blue-100/80 font-bold uppercase tracking-wider">
                  {netBalance > 0 ? 'You Need To Receive' : netBalance < 0 ? 'You Need To Give' : "You're Settled"}
                </p>
                <p className="truncate font-mono text-sm font-extrabold text-white">
                  ₹{Math.abs(netBalance).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown Section (Liquid Glass Card) */}
      <div className="relative overflow-hidden rounded-[28px] p-5 sm:p-6 bg-white/85 backdrop-blur-2xl border border-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/60">
              <PieChart size={15} />
            </div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Spending By Category</h3>
          </div>
          <span className="text-[11px] font-bold text-slate-400 bg-slate-100/80 px-2.5 py-0.5 rounded-full border border-slate-200/50">
            {stats.categoryList.length} categories
          </span>
        </div>

        {stats.categoryList.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-50 to-indigo-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-2 border border-blue-100 shadow-inner">
              <Receipt size={24} />
            </div>
            <p className="text-sm font-bold text-slate-700">No expenses logged</p>
            <p className="text-xs text-slate-400 mt-0.5">Nothing recorded for {formattedMonthLabel}</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {stats.categoryList.map((cat) => {
              const meta = getCategoryMeta(cat.name);
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => openBreakdown('category', `${cat.name} Spending`, cat.name)}
                  className="w-full space-y-1.5 rounded-2xl p-2 text-left transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  aria-label={`View ${cat.name} expenses, totaling ₹${cat.total.toFixed(2)}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center border ${meta.softBg} ${meta.border}`}>
                        {meta.icon}
                      </div>
                      <span className="font-bold text-slate-800 text-xs">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5 font-mono">
                      <span className="text-slate-400 text-[11px] font-semibold">{cat.percentage}%</span>
                      <span className="font-bold text-slate-900 text-xs">₹{cat.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Liquid Styled Progress Bar */}
                  <div className="w-full bg-slate-100/90 h-2 rounded-full overflow-hidden p-[1px] border border-slate-200/40">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${meta.color} shadow-xs`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedBreakdown && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedBreakdown(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="spending-breakdown-title"
            className="relative flex max-h-[85dvh] w-full max-w-sm flex-col overflow-hidden rounded-[32px] border border-white/60 bg-white/85 p-5 shadow-[0_24px_50px_-12px_rgba(15,23,42,0.25)] backdrop-blur-2xl animate-in zoom-in-95 duration-200 md:max-w-2xl md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-400/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-cyan-400/20 blur-2xl" />
            <header className="relative flex items-start justify-between gap-4 border-b border-slate-200/50 pb-3.5">
              <div className="min-w-0">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <CalendarDays size={14} /> {formattedMonthLabel}
                </p>
                <h3 id="spending-breakdown-title" className="text-base font-extrabold leading-tight text-slate-900">{selectedBreakdown.title}</h3>
                <p className="mt-1 font-mono text-xs font-semibold text-blue-700">₹{breakdownTotal.toFixed(2)} · {breakdownExpenses.length} expense{breakdownExpenses.length === 1 ? '' : 's'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBreakdown(null)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-200/50 bg-white/60 text-slate-400 shadow-sm transition-colors hover:bg-white/90 hover:text-slate-700"
                aria-label="Close spending details"
              >
                <X size={18} />
              </button>
            </header>
            <div className="breakdown-scrollbar relative min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pt-3">
              {breakdownExpenses.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs text-slate-500">No matching expenses for this month.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {breakdownExpenses
                    .slice()
                    .sort((first, second) => (second.date || '').localeCompare(first.date || ''))
                    .map((expense) => {
                      const groupName = groups.find((group) => group.id === expense.groupId)?.name || 'Group';
                      const payerName = expense.paidBy === user?.id ? 'Paid by you' : 'Paid by a group member';
                      return (
                        <li key={expense.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/70 bg-white/60 p-2.5 shadow-sm backdrop-blur-md">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-800">{expense.title || expense.category || 'Expense'}</p>
                            <p className="mt-0.5 truncate text-[10px] text-slate-500">{groupName} · {expense.category || 'Other'} · {payerName}</p>
                            <p className="mt-1 text-[10px] text-slate-400">{expense.date ? new Date(`${expense.date}T00:00:00`).toLocaleDateString() : ''}</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <span className="block font-mono text-xs font-bold text-slate-900">
                              ₹{(selectedBreakdown.type === 'share' || selectedBreakdown.type === 'category'
                                ? parseFloat(expense.splits?.[userId]) || 0
                                : parseFloat(expense.totalAmount) || 0).toFixed(2)}
                            </span>
                            {(selectedBreakdown.type === 'share' || selectedBreakdown.type === 'category') && (
                              <span className="mt-0.5 block text-[10px] text-slate-400">
                                of ₹{(parseFloat(expense.totalAmount) || 0).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}

    </div>
  );
}