import { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Receipt, Settings, Wallet, MessageSquare, 
  MoreVertical, X, ChevronRight, Layers, Copy, Check, Share2, QrCode
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';
import PrimaryNav from '../common/PrimaryNav';
import AddExpenseTab from './AddExpenseTab';
import BalancesTab from './BalancesTab';
import ExpensesTab from './ExpensesTab';
import MembersTab from './MembersTab';
import ChatTab from './ChatTab';

export default function GroupView({ 
  group, 
  initialTab = 'expenses',
  initialDrawerOpen = false,
  onGroupTabChange,
  onOpenRoomOptions,
  onCloseRoomOptions,
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
  const isDrawerOpen = initialDrawerOpen;
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isInviteCopied, setIsInviteCopied] = useState(false);
  const drawerRef = useRef(null);
  const inviteUrl = `${window.location.origin}/?join=${encodeURIComponent(group.inviteCode)}`;

  const getUserName = (userId) => users.find((user) => user.id === userId)?.username || 'Unknown';
  const sortedExpenses = [...expenses].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) onCloseRoomOptions?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, onCloseRoomOptions]);

  useEffect(() => {
    onActiveChatChange?.(activeTab === 'chat' ? group.id : null);
    return () => onActiveChatChange?.(null);
  }, [activeTab, group.id, onActiveChatChange]);

  const handleTabSelect = (tab) => {
    onGroupTabChange?.(tab, { replace: isDrawerOpen });
  };

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setIsInviteCopied(true);
      showToast('Invite code copied!');
      window.setTimeout(() => setIsInviteCopied(false), 2000);
    } catch (error) {
      console.error('Could not copy invite code:', error);
      showToast('Could not copy invite code.', 'error');
    }
  };

  const shareInviteLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Join ${group.name} on RoomSplit`,
          text: `Join our shared group "${group.name}". Use code: ${group.inviteCode}`,
          url: inviteUrl,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
        showToast('Invite link copied!');
      } else {
        throw new Error('Sharing is not available in this browser.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Could not share invite link:', error);
        showToast('Could not share the invite link.', 'error');
      }
    }
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
            onClick={onOpenRoomOptions}
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
            onClick={() => handleTabSelect('expenses')}
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
            onClick={() => handleTabSelect('chat')}
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
            onClick={() => handleTabSelect('balances')}
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
            onClick={onOpenRoomOptions}
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
            onSaved={() => handleTabSelect('expenses')}
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
          onClick={() => handleTabSelect('add')}
          aria-label="Add expense"
          className="fixed bottom-6 right-6 z-30 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0 text-white shadow-[0_12px_28px_rgba(37,99,235,0.35)] transition-all duration-200 active:scale-90 hover:scale-105"
          title="Add Expense"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      )}
      </div>

      {/* ======================================================== */}
      {/* SLIDE-OVER DRAWER / SIDEBAR (Settings, Room Info, Roster)*/}
      {/* ======================================================== */}
      {isDrawerOpen && createPortal(
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          
          {/* Backdrop Click */}
          <div 
            className="flex-1"
            onClick={onCloseRoomOptions}
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
                onClick={onCloseRoomOptions}
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
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-500">{group.members.length} Members</span>
                  <button
                    type="button"
                    onClick={copyInviteCode}
                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200/70 bg-white px-2 py-1 text-[10px] font-bold text-blue-700 transition-colors hover:bg-blue-50"
                  >
                    {isInviteCopied ? <Check size={12} /> : <Copy size={12} />}
                    {isInviteCopied ? 'Copied' : 'Copy code'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={shareInviteLink}
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  <Share2 size={14} />
                  <span>Share link</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsQrOpen(true)}
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <QrCode size={14} />
                  <span>Show QR</span>
                </button>
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
        </div>,
        document.body
      )}

      {/* PrimaryNav component preserved */}
      <PrimaryNav
        activeItem="groups"
        onNavigate={onNavigateDashboard}
        desktopOnly
      />

      {isQrOpen && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsQrOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-invite-qr-title"
            className="relative w-full max-w-xs rounded-[30px] border border-white/70 bg-white/95 p-6 text-center shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-150"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsQrOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
              aria-label="Close QR code"
            >
              <X size={16} />
            </button>
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
              <QrCode size={21} />
            </div>
            <h2 id="group-invite-qr-title" className="text-base font-extrabold text-slate-900">Scan to join {group.name}</h2>
            <p className="mb-4 mt-1 text-xs text-slate-500">Scan this code to open the group invite.</p>
            <div className="mb-4 inline-block rounded-2xl border border-slate-200 bg-white p-3 shadow-inner">
              <QRCodeCanvas value={inviteUrl} size={188} level="H" includeMargin />
            </div>
            <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              Invite code: <span className="font-mono font-bold tracking-wider text-slate-800">{group.inviteCode}</span>
            </p>
          </section>
        </div>,
        document.body
      )}

    </div>
  );
}