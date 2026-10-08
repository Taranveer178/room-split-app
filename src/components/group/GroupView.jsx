import { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Receipt, Settings, Wallet, MessageSquare, 
  MoreVertical, X, ChevronRight, Layers
} from 'lucide-react';
import PrimaryNav from '../common/PrimaryNav';
import AddExpenseTab from './AddExpenseTab';
import BalancesTab from './BalancesTab';
import ExpensesTab from './ExpensesTab';
import MembersTab from './MembersTab';
import ChatTab from './ChatTab';

export default function GroupView({ 
  group, 
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
  const [activeTab, setActiveTab] = useState('expenses');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerRef = useRef(null);

  const getUserName = (userId) => users.find((user) => user.id === userId)?.username || 'Unknown';
  const sortedExpenses = [...expenses].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 font-sans md:flex-row">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-10 w-80 h-80 bg-blue-300/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-indigo-300/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {/* ======================================================== */}
      {/* UNIFIED TOP HEADER: Room Name + Tab Icons + Three Dots   */}
      {/* ======================================================== */}
      <header className="z-30 flex flex-shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/85 px-3 sm:px-5 py-2.5 backdrop-blur-xl shadow-xs">
        
        {/* Left Side: Back Arrow + Room Name & Member Count */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
          <button 
            onClick={onBack} 
            className="p-2 -ml-1 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors flex-shrink-0"
            title="Back to Spaces"
            aria-label="Back to Spaces"
          >
            <ArrowLeft size={19} />
          </button>

          <div 
            onClick={() => setIsDrawerOpen(true)}
            className="min-w-0 cursor-pointer group select-none"
            title="Open Room Details"
          >
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate tracking-tight group-hover:text-blue-600 transition-colors">
                {group.name}
              </h1>
              <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            </div>
            <p className="text-[11px] font-semibold text-slate-400 truncate">
              {group.members.length} Members
            </p>
          </div>
        </div>

        {/* Right Side: Tab Icons (Expenses, Chat, Balance) + Three Dots */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          
          {/* Expenses Tab Button */}
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              activeTab === 'expenses' || activeTab === 'add'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
            title="Expenses"
          >
            <Receipt size={16} />
            <span className="hidden sm:inline">Expenses</span>
          </button>

          {/* Chat Tab Button */}
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
            title="Chat"
          >
            <MessageSquare size={16} />
            <span className="hidden sm:inline">Chat</span>
          </button>

          {/* Balance Tab Button */}
          <button
            type="button"
            onClick={() => setActiveTab('balances')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              activeTab === 'balances'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
            title="Balances"
          >
            <Wallet size={16} />
            <span className="hidden sm:inline">Balances</span>
          </button>

          {/* Divider */}
          <div className="h-5 w-[1px] bg-slate-200 mx-0.5" />

          {/* Three-Dots / Hamburger Button (Opens Slide-over Drawer) */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className={`p-2 rounded-xl transition-all active:scale-95 ${
              activeTab === 'members' || isDrawerOpen
                ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
            }`}
            title="Room Options & Settings"
            aria-label="Room Options"
          >
            <MoreVertical size={18} />
          </button>

        </div>

      </header>

      {/* ======================================================== */}
      {/* MAIN VIEWPORT: Active Tab Body (Full Screen, No Nav Bar) */}
      {/* ======================================================== */}
      <main className={`relative min-w-0 min-h-0 flex-1 overscroll-y-contain ${
        activeTab === 'chat' 
          ? 'flex flex-col overflow-hidden pb-0' 
          : 'overflow-y-auto pb-10 scrollbar-hide'
      }`}>
        {activeTab === 'expenses' && (
          <ExpensesTab 
            expenses={sortedExpenses} 
            currentUser={currentUser} 
            users={users}
            getUserName={getUserName} 
            onDeleteExpense={onDeleteExpense} 
            showToast={showToast} 
          />
        )}

        {activeTab === 'add' && (
          <AddExpenseTab 
            key={group.members.join(':')} 
            group={group} 
            currentUser={currentUser} 
            getUserName={getUserName} 
            onSaveExpense={onSaveExpense} 
            onSendNotification={onSendNotification}
            onSaved={() => setActiveTab('expenses')} 
            showToast={showToast} 
          />
        )}

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

        {activeTab === 'chat' && (
          <ChatTab
            group={group}
            groups={groups}
            currentUser={currentUser}
            users={users}
            showToast={showToast}
          />
        )}

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
      {activeTab === 'expenses' && (
        <button 
          onClick={() => setActiveTab('add')} 
          className="fixed bottom-6 right-6 flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-[0_12px_28px_rgba(37,99,235,0.35)] transition-all duration-200 active:scale-90 hover:scale-105 z-30"
          title="Add Expense"
        >
          <Plus size={26} strokeWidth={2.8} />
        </button>
      )}
      </div>

      {/* ======================================================== */}
      {/* SLIDE-OVER DRAWER / SIDEBAR (Settings, Room Info, Roster)*/}
      {/* ======================================================== */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          
          {/* Backdrop Click */}
          <div 
            className="flex-1"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Container */}
          <div 
            ref={drawerRef}
            className="relative w-full max-w-sm sm:max-w-md h-full bg-white/95 backdrop-blur-2xl border-l border-white/70 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
          >
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                  {group.name ? group.name.charAt(0).toUpperCase() : <Layers size={18} />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 truncate">{group.name}</h3>
                  <p className="text-xs text-slate-400 font-medium">Workspace details & roster</p>
                </div>
              </div>

              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                aria-label="Close sidebar"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
              
              {/* Room Code Badge */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Invite Code</span>
                  <span className="font-mono text-lg font-black tracking-widest text-slate-900">{group.inviteCode}</span>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-xl border border-blue-100 shadow-2xs">
                  {group.members.length} Members
                </span>
              </div>

              {/* Navigation Links inside Drawer */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">Tabs & Views</span>

                <button
                  type="button"
                  onClick={() => handleTabSelect('expenses')}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'expenses'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Receipt size={17} className={activeTab === 'expenses' ? 'text-blue-600' : 'text-slate-400'} />
                    <span>Expenses List</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300" />
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSelect('chat')}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'chat'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare size={17} className={activeTab === 'chat' ? 'text-blue-600' : 'text-slate-400'} />
                    <span>Group Discussion & Chat</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300" />
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSelect('balances')}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'balances'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Wallet size={17} className={activeTab === 'balances' ? 'text-blue-600' : 'text-slate-400'} />
                    <span>Balances & Settlements</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300" />
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSelect('members')}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'members'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings size={17} className={activeTab === 'members' ? 'text-blue-600' : 'text-slate-400'} />
                    <span>Room Settings & Member Roster</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300" />
                </button>
              </div>

              {/* Members Quick Preview inside Drawer */}
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2 block">Roommates</span>
                <div className="space-y-2">
                  {group.members.slice(0, 5).map((memberId) => {
                    const u = users.find((m) => m.id === memberId);
                    const isMe = memberId === currentUser.id;
                    return (
                      <div key={memberId} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                            {(u?.username || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            {u?.username || 'Member'} {isMe && <span className="text-[10px] text-blue-600 font-medium">(You)</span>}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {memberId === group.createdBy ? 'Admin' : 'Member'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-white">
              <button
                type="button"
                onClick={onBack}
                className="w-full py-2.5 rounded-xl border border-slate-200/80 text-slate-600 hover:text-slate-900 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Return to All Spaces</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PrimaryNav component preserved */}
      <PrimaryNav
        activeItem="groups"
        onNavigate={onNavigateDashboard}
        desktopOnly
      />

    </div>
  );
}