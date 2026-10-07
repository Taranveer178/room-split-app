import { useState } from 'react';
import { ArrowLeft, Plus, Receipt, Settings, Wallet, MessageSquare } from 'lucide-react';
import { NavItem } from '../common/UI';
import AddExpenseTab from './AddExpenseTab';
import BalancesTab from './BalancesTab';
import ExpensesTab from './ExpensesTab';
import MembersTab from './MembersTab';
import ChatTab from './ChatTab';

export default function GroupView({ group, expenses, onSaveExpense, onDeleteExpense, onDeleteGroup, onSendNotification, users, currentUser, onBack, showToast }) {
  const [activeTab, setActiveTab] = useState('expenses');
  const getUserName = (userId) => users.find((user) => user.id === userId)?.username || 'Unknown';
  const sortedExpenses = [...expenses].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden lg:flex-row">
      {/* Sticky Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center gap-3 z-30 flex-shrink-0 shadow-sm lg:absolute lg:left-0 lg:top-0 lg:z-50 lg:w-64 lg:px-5 lg:py-6 lg:border-b-0 lg:shadow-none">
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
      <nav className="bg-white/95 backdrop-blur-md border-t border-slate-200 absolute bottom-0 w-full z-40 pb-[env(safe-area-inset-bottom)] lg:order-2 lg:static lg:w-64 lg:h-full lg:flex-shrink-0 lg:border-t-0 lg:border-r lg:pb-0 lg:pt-24">
        <div className="flex justify-around items-center h-16 lg:h-auto lg:flex-col lg:items-stretch lg:gap-2">
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
    </div>
  );
}