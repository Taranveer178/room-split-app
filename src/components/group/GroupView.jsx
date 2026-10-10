import { useEffect } from 'react';
import { 
  ArrowLeft, Plus, Receipt, Settings, Wallet, MessageSquare 
} from 'lucide-react';

import PrimaryNav from '../common/PrimaryNav';
import AddExpenseTab from './AddExpenseTab';
import BalancesTab from './BalancesTab';
import ExpensesTab from './ExpensesTab';
import MembersTab from './MembersTab';
import ChatTab from './ChatTab';

export default function GroupView({ 
  group, 
  initialTab = 'expenses',
  onGroupTabChange,
  onActiveChatChange,
  groups = [],
  expenses, 
  onSaveExpense, 
  onDeleteExpense, 
  onDeleteGroup, 
  onUpdateGroup, 
  onSendNotification, 
  users, 
  currentUser, 
  onBack, 
  onNavigateDashboard, 
  showToast 
}) {
  const activeTab = initialTab;

  const getUserName = (userId) => users.find((user) => user.id === userId)?.username || 'Unknown';
  const sortedExpenses = [...expenses].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));

  // --- HARDWARE BACK BUTTON LOGIC (Mobile Nav Back) ---
  useEffect(() => {
    // Push a state to the browser history so we can trap the hardware back button
    window.history.pushState({ tab: activeTab }, '');

    const handleHardwareBack = (e) => {
      e.preventDefault();
      if (activeTab !== 'expenses') {
        // If in chat, balances, or settings -> go back to expenses
        handleTabSelect('expenses');
      } else {
        // If already in expenses -> go back to dashboard
        onBack();
      }
    };

    window.addEventListener('popstate', handleHardwareBack);
    return () => window.removeEventListener('popstate', handleHardwareBack);
  }, [activeTab, onBack]);

  // --- TAB CHANGE HANDLERS ---
  useEffect(() => {
    onActiveChatChange?.(activeTab === 'chat' ? group.id : null);
    return () => onActiveChatChange?.(null);
  }, [activeTab, group.id, onActiveChatChange]);

  const handleTabSelect = (tab) => {
    onGroupTabChange?.(tab);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 font-sans md:flex-row">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-10 w-80 h-80 bg-blue-300/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-indigo-300/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        
        {/* ======================================================== */}
        {/* HEADER: Room Name (Left) + Tab Icons (Right)             */}
        {/* ======================================================== */}
        <header className="z-30 flex flex-shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/85 px-2 sm:px-4 py-3 backdrop-blur-xl shadow-xs">
          
          {/* Left Side: Back Arrow + Room Name */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 mr-2">
            
            {/* Navigates to Dashboard */}
            <button 
              onClick={onBack} 
              className="p-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors flex-shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft size={22} />
            </button>

            {/* Navigates to Expenses Tab - FIXED ALIGNMENT */}
            <div 
              onClick={() => handleTabSelect('expenses')}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer group select-none pl-1"
              title="View Expenses"
            >
              {/* Group Image / Avatar */}
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-lg font-black text-white shadow-sm">
                {group.imageDataUrl ? (
                  <img src={group.imageDataUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (group.name || 'G').charAt(0).toUpperCase()
                )}
              </span>
              
              {/* Group Text Content (Stacked) */}
              <div className="flex flex-col justify-center min-w-0">
                <h1 className="text-base sm:text-lg leading-tight font-extrabold text-slate-900 truncate tracking-tight group-hover:text-blue-600 transition-colors">
                  {group.name}
                </h1>
                <p className="text-[11px] leading-tight font-semibold text-slate-400 mt-0.5 truncate">
                  {group.members.length} Members
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Chat, Balance, Settings Options */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 bg-slate-100/70 p-1 rounded-2xl">
            
            {/* Chat Tab Button */}
            <button
              type="button"
              onClick={() => handleTabSelect('chat')}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl transition-all flex items-center justify-center ${
                activeTab === 'chat'
                  ? 'bg-white text-blue-600 shadow-sm shadow-slate-200/50'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Chat"
            >
              <MessageSquare size={18} strokeWidth={activeTab === 'chat' ? 2.5 : 2} />
            </button>

            {/* Balance Tab Button */}
            <button
              type="button"
              onClick={() => handleTabSelect('balances')}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl transition-all flex items-center justify-center ${
                activeTab === 'balances'
                  ? 'bg-white text-blue-600 shadow-sm shadow-slate-200/50'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Balances"
            >
              <Wallet size={18} strokeWidth={activeTab === 'balances' ? 2.5 : 2} />
            </button>

            {/* Settings Tab Button */}
            <button
              type="button"
              onClick={() => handleTabSelect('members')}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl transition-all flex items-center justify-center ${
                activeTab === 'members'
                  ? 'bg-white text-blue-600 shadow-sm shadow-slate-200/50'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Room Settings"
            >
              <Settings size={18} strokeWidth={activeTab === 'members' ? 2.5 : 2} />
            </button>

          </div>
        </header>

        {/* ======================================================== */}
        {/* MAIN VIEWPORT: Render active tab                         */}
        {/* ======================================================== */}
        <main className={`relative min-w-0 min-h-0 flex-1 overscroll-y-contain ${
          activeTab === 'chat' 
            ? 'flex flex-col overflow-hidden pb-0' 
            : 'overflow-y-auto pb-10 scrollbar-hide'
        }`}>
          {/* Default / Expenses */}
          {(activeTab === 'expenses' || !activeTab) && (
            <ExpensesTab 
              expenses={sortedExpenses} 
              currentUser={currentUser} 
              users={users}
              getUserName={getUserName} 
              onDeleteExpense={onDeleteExpense} 
              showToast={showToast} 
            />
          )}

          {/* Add Expense Form */}
          {activeTab === 'add' && (
            <AddExpenseTab 
              key={group.members.join(':')} 
              group={group} 
              currentUser={currentUser} 
              users={users}
              getUserName={getUserName} 
              onSaveExpense={onSaveExpense} 
              onSendNotification={onSendNotification}
              onSaved={() => handleTabSelect('expenses')}
              showToast={showToast} 
            />
          )}

          {/* Balances */}
          {activeTab === 'balances' && (
            <BalancesTab 
              expenses={expenses} 
              group={group} 
              currentUser={currentUser} 
              getUserName={getUserName}
              users={users} 
              onSaveExpense={onSaveExpense}
              onSendNotification={onSendNotification}
              showToast={showToast}
            />
          )}

          {/* Chat */}
          {activeTab === 'chat' && (
            <ChatTab
              group={group}
              groups={groups}
              currentUser={currentUser}
              users={users}
              showToast={showToast}
            />
          )}

          {/* Settings / Members */}
          {activeTab === 'members' && (
            <MembersTab 
              group={group} 
              users={users} 
              currentUser={currentUser} 
              expenses={expenses}
              onUpdateGroup={onUpdateGroup}
              onDeleteGroup={onDeleteGroup}
              showToast={showToast} 
            />
          )}
        </main>

        {/* Floating Add Expense Button */}
        {(activeTab === 'expenses' || !activeTab) && (
          <button 
            onClick={() => handleTabSelect('add')}
            aria-label="Add expense"
            className="fixed bottom-6 right-6 z-30 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0 text-white shadow-[0_12px_28px_rgba(37,99,235,0.35)] transition-all duration-200 active:scale-90 hover:scale-105"
            title="Add Expense"
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <PrimaryNav
        activeItem="groups"
        onNavigate={onNavigateDashboard}
        desktopOnly
      />
    </div>
  );
}