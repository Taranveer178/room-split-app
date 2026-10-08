import { useState } from 'react';
import { ArrowLeft, Plus, Receipt, Settings, Wallet, MessageSquare } from 'lucide-react';
import PrimaryNav from '../common/PrimaryNav';
import AddExpenseTab from './AddExpenseTab';
import BalancesTab from './BalancesTab';
import ExpensesTab from './ExpensesTab';
import MembersTab from './MembersTab';
import ChatTab from './ChatTab';

export default function GroupView({ group, expenses, onSaveExpense, onDeleteExpense, onDeleteGroup, onUpdateGroup, onSendNotification, users, currentUser, onBack, onNavigateDashboard, showToast }) {
  const [activeTab, setActiveTab] = useState('expenses');
  const getUserName = (userId) => users.find((user) => user.id === userId)?.username || 'Unknown';
  const sortedExpenses = [...expenses].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 md:flex-row">
      {/* Sticky Top Header */}
      <header className="z-30 flex flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3.5 shadow-sm md:hidden">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 rounded-full active:bg-slate-100">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-800 truncate">{group.name}</h1>
          <p className="text-xs font-medium text-slate-500">{group.members.length} Members</p>
        </div>
      </header>

      {/* Main Tab Area with dynamic layout fix for chat input */}
      <main className={`relative min-w-0 min-h-0 flex-1 overscroll-y-contain md:order-3 ${activeTab === 'chat' ? 'flex flex-col overflow-hidden pb-[calc(6rem+env(safe-area-inset-bottom))]' : 'overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0'}`}>
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
            currentUser={currentUser}
            users={users}
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

      {/* Pinned Add Expense Button - Moved outside <main> to stay anchored during scroll */}
      {activeTab === 'expenses' && (
        <button 
          onClick={() => setActiveTab('add')} 
          className="absolute bottom-[calc(7rem+env(safe-area-inset-bottom))] right-5 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.4)] transition-transform active:scale-95 z-30 md:bottom-8 md:right-8"
          title="Add Expense"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Pinned Bottom Nav with mobile safe-area protection */}
      <nav className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-30 w-[calc(100%-2rem)] max-w-[26rem] -translate-x-1/2 rounded-full border border-blue-500/20 bg-slate-900/10 p-1.5 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.3)] backdrop-blur-2xl md:static md:order-2 md:flex md:h-full md:w-56 md:max-w-none md:flex-shrink-0 md:flex-col md:translate-x-0 md:rounded-none md:border-none md:bg-white md:px-3 md:py-5 md:pb-5 md:shadow-none md:backdrop-blur-none lg:w-64 lg:px-4 lg:py-6 lg:pb-6">
        <div className="hidden border-b border-slate-100 px-2 pb-5 md:block">
          <button onClick={onBack} className="mb-5 flex items-center gap-2 text-xs font-semibold text-slate-400 transition-colors hover:text-indigo-600">
            <ArrowLeft size={15} />
            All spaces
          </button>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Current group</p>
          <h2 className="mt-2 truncate text-lg font-bold text-slate-900">{group.name}</h2>
          <p className="mt-1 text-xs text-slate-500">{group.members.length} members</p>
        </div>
        <div className="flex h-14 items-center justify-around md:mt-5 md:h-auto md:flex-col md:items-stretch md:gap-1.5">
          <NavItem 
            icon={Receipt} 
            label="Expenses" 
            isActive={activeTab === 'expenses' || activeTab === 'add'} 
            onClick={() => setActiveTab('expenses')} 
          />
          <NavItem
            icon={MessageSquare}
            label="Chat"
            isActive={activeTab === 'chat'}
            onClick={() => setActiveTab('chat')}
          />
          <NavItem 
            icon={Wallet} 
            label="Balances" 
            isActive={activeTab === 'balances'} 
            onClick={() => setActiveTab('balances')} 
          />
          <NavItem 
            icon={Settings} 
            label="Settings" 
            isActive={activeTab === 'members'} 
            onClick={() => setActiveTab('members')} 
          />
        </div>
      </nav>
      <PrimaryNav
        activeItem="groups"
        onNavigate={onNavigateDashboard}
        desktopOnly
      />
    </div>
  );
}

function NavItem({ icon: Icon, label, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors md:h-11 md:flex-row md:flex-none md:justify-start md:gap-3 md:rounded-xl md:px-3 ${
        isActive
          ? 'font-semibold text-indigo-700 md:bg-indigo-50'
          : 'text-slate-500 hover:text-slate-800 md:hover:bg-slate-50'
      }`}
    >
      <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
      <span className="text-[10px] md:text-sm">{label}</span>
    </button>
  );
}