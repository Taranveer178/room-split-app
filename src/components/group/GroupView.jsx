import { useState } from 'react';
import { ArrowLeft, Plus, Receipt, Settings, Wallet, MessageSquare } from 'lucide-react';
import PrimaryNav from '../common/PrimaryNav';
import AddExpenseTab from './AddExpenseTab';
import BalancesTab from './BalancesTab';
import ExpensesTab from './ExpensesTab';
import MembersTab from './MembersTab';
import ChatTab from './ChatTab';

export default function GroupView({ group, expenses, onSaveExpense, onDeleteExpense, onDeleteGroup, onSendNotification, users, currentUser, onBack, onNavigateDashboard, showToast }) {
  const [activeTab, setActiveTab] = useState('expenses');
  const getUserName = (userId) => users.find((user) => user.id === userId)?.username || 'Unknown';
  const sortedExpenses = [...expenses].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden lg:flex-row">
      {/* Sticky Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center gap-3 z-30 flex-shrink-0 shadow-sm lg:hidden">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 rounded-full active:bg-slate-100">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-800 truncate">{group.name}</h1>
          <p className="text-xs font-medium text-slate-500">{group.members.length} Members</p>
        </div>
      </header>

      {/* Main Tab Area with dynamic layout fix for chat input */}
      <main className={`flex-1 min-w-0 min-h-0 relative lg:order-3 ${activeTab === 'chat' ? 'flex flex-col overflow-hidden pb-16' : 'overflow-y-auto pb-28 lg:pb-0'}`}>
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
            onDeleteGroup={onDeleteGroup}
            showToast={showToast} 
          />
        )}
      </main>

      {/* Pinned Add Expense Button - Moved outside <main> to stay anchored during scroll */}
      {activeTab === 'expenses' && (
        <button 
          onClick={() => setActiveTab('add')} 
          className="absolute bottom-20 right-5 w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(79,70,229,0.4)] active:scale-95 transition-transform z-30 lg:bottom-8 lg:right-8" 
          title="Add Expense"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Pinned Bottom Nav with mobile safe-area protection */}
      <nav className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-30 w-[calc(100%-2rem)] max-w-[26rem] -translate-x-1/2 rounded-full border border-slate-200/80 bg-white/95 px-1 shadow-lg shadow-slate-900/10 backdrop-blur-xl lg:static lg:order-2 lg:flex lg:h-full lg:w-64 lg:max-w-none lg:flex-shrink-0 lg:flex-col lg:translate-x-0 lg:rounded-none lg:border-t-0 lg:border-r lg:bg-white lg:px-4 lg:py-6 lg:pb-6 lg:shadow-none">
        <div className="hidden border-b border-slate-100 px-2 pb-5 lg:block">
          <button onClick={onBack} className="mb-5 flex items-center gap-2 text-xs font-semibold text-slate-400 transition-colors hover:text-indigo-600">
            <ArrowLeft size={15} />
            All spaces
          </button>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Current group</p>
          <h2 className="mt-2 truncate text-lg font-bold text-slate-900">{group.name}</h2>
          <p className="mt-1 text-xs text-slate-500">{group.members.length} members</p>
        </div>
        <div className="flex h-14 items-center justify-around lg:mt-5 lg:h-auto lg:flex-col lg:items-stretch lg:gap-1.5">
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
      className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors lg:h-11 lg:flex-row lg:flex-none lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3 ${
        isActive
          ? 'font-semibold text-indigo-700 lg:bg-indigo-50'
          : 'text-slate-500 hover:text-slate-800 lg:hover:bg-slate-50'
      }`}
    >
      <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
      <span className="text-[10px] lg:text-sm">{label}</span>
    </button>
  );
}