import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, TrendingUp, 
  ArrowUpRight, ArrowDownLeft, PieChart, Receipt, Layers 
} from 'lucide-react';
import { Card } from '../common/UI';

const CATEGORY_COLORS = {
  Food: 'bg-amber-500',
  Travel: 'bg-sky-500',
  Rent: 'bg-indigo-500',
  Utilities: 'bg-purple-500',
  Shopping: 'bg-emerald-500',
  Other: 'bg-slate-400'
};

export default function MonthlyAnalyticsTab({ user, expenses = [], groups = [] }) {
  // Default to current year and month (YYYY-MM)
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

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

  // Aggregate stats
  const stats = useMemo(() => {
    let totalGroupSpent = 0;
    let yourShareTotal = 0;
    let youPaidTotal = 0;
    const categoryTotals = {};

    monthlyExpenses.forEach((exp) => {
      const amount = parseFloat(exp.totalAmount) || 0;
      totalGroupSpent += amount;

      if (exp.paidBy === user?.id) {
        youPaidTotal += amount;
      }

      if (exp.splits && exp.splits[user?.id]) {
        yourShareTotal += parseFloat(exp.splits[user.id]) || 0;
      }

      const cat = exp.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
    });

    const categoryList = Object.entries(categoryTotals)
      .map(([name, total]) => ({
        name,
        total,
        percentage: totalGroupSpent > 0 ? ((total / totalGroupSpent) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.total - a.total);

    return { totalGroupSpent, yourShareTotal, youPaidTotal, categoryList };
  }, [monthlyExpenses, user?.id]);

  return (
    <div className="p-5 animate-in fade-in duration-200 pb-16 space-y-5">
      {/* Header & Month Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Monthly Spend</h1>
          <p className="text-slate-400 text-xs mt-0.5">Track group and personal expenditure</p>
        </div>

        {/* Month Switcher Controls */}
        <div className="flex items-center bg-white border border-slate-200/80 rounded-2xl p-1 shadow-xs">
          <button 
            onClick={handlePrevMonth} 
            className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors active:scale-95"
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-slate-700 px-2 min-w-[105px] text-center select-none">
            {formattedMonthLabel}
          </span>
          <button 
            onClick={handleNextMonth} 
            className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors active:scale-95"
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Spend Stats Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 shadow-xl border border-indigo-950/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between text-indigo-200/80 text-xs font-semibold uppercase tracking-wider mb-1">
          <span>Your Net Share</span>
          <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-full text-white font-medium">
            {monthlyExpenses.length} bill{monthlyExpenses.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="text-3xl font-black font-mono tracking-tight text-white mb-5">
          ₹{stats.yourShareTotal.toFixed(2)}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3.5 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <ArrowUpRight size={16} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">You Paid Out</p>
              <p className="text-sm font-bold text-slate-100 font-mono">₹{stats.youPaidTotal.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Total Group Spend</p>
              <p className="text-sm font-bold text-slate-100 font-mono">₹{stats.totalGroupSpent.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown Section */}
      <Card className="p-4 bg-white border border-slate-100/90 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PieChart size={16} className="text-indigo-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Top Spending Categories</h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {stats.categoryList.length} categories
          </span>
        </div>

        {stats.categoryList.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Receipt size={22} />
            </div>
            <p className="text-xs text-slate-400 font-medium">No expenses logged for {formattedMonthLabel}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.categoryList.map((cat) => (
              <div key={cat.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[cat.name] || 'bg-slate-400'}`} />
                    <span className="font-semibold text-slate-700">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400 text-[11px] font-normal">{cat.percentage}%</span>
                    <span className="font-bold text-slate-800">₹{cat.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${CATEGORY_COLORS[cat.name] || 'bg-slate-400'}`}
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}