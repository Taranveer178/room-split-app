import { useState } from 'react';
import { 
  AlertTriangle, 
  Copy, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  LogOut,
  Users,
  Shield,
  QrCode,
  Layers
} from 'lucide-react';
import { calculateSettlements, GROUP_DELETE_BALANCE_TOLERANCE } from '../../utils/settlement';

export default function MembersTab({ 
  group, 
  users, 
  currentUser, 
  expenses, 
  onDeleteGroup, 
  onUpdateGroup,
  onLeaveGroup,
  showToast 
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState(group.name || '');
  const [savingName, setSavingName] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isAdmin = group.createdBy === currentUser.id;
  const { balances } = calculateSettlements(expenses, group.members);
  const myBalance = balances[currentUser.id] || 0;
  const hasMyOutstandingBalance = Math.abs(myBalance) >= GROUP_DELETE_BALANCE_TOLERANCE;
  const hasOutstandingBalances = Object.values(balances).some(
    (balance) => Math.abs(balance) >= GROUP_DELETE_BALANCE_TOLERANCE
  );

  const handleCopyInvite = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(group.inviteCode);
      showToast('Invite code copied!');
    } else {
      showToast(`Code: ${group.inviteCode}`);
    }
  };

  const handleSaveGroupName = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      showToast('Group name cannot be empty', 'error');
      return;
    }
    if (trimmed === group.name) {
      setIsEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      if (onUpdateGroup) {
        await onUpdateGroup({ ...group, name: trimmed });
      }
      showToast('Group name updated!');
      setIsEditingName(false);
    } catch (error) {
      showToast(error.message || 'Failed to rename group', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleExitGroup = async () => {
    if (hasMyOutstandingBalance) {
      showToast('Settle your balance before leaving the group.', 'error');
      return;
    }
    setLeaving(true);
    try {
      if (onLeaveGroup) {
        await onLeaveGroup(group.id, currentUser.id);
      }
      showToast('You have left the group.');
    } catch (error) {
      showToast(error.message || 'Could not leave group', 'error');
      setConfirmingLeave(false);
    } finally {
      setLeaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await onDeleteGroup(group);
    } catch (error) {
      showToast(error.message || 'Could not delete the group.', 'error');
      setConfirmingDelete(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-4 pb-[130px] md:pb-36 relative min-h-full max-w-4xl mx-auto animate-in fade-in duration-300">
      
      {/* Ambient background glows */}
      <div className="absolute top-0 right-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Redesigned Space Name Hero Card (Frosted Liquid Glass) */}
      <div className="relative overflow-hidden rounded-[28px] p-4 sm:p-5 bg-white/85 backdrop-blur-2xl border border-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="relative z-10 flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            {/* Space Avatar Initial */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-500/20 flex-shrink-0">
              {group.name ? group.name.charAt(0).toUpperCase() : <Layers size={22} />}
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-0.5">
                Current Space
              </span>

              {isEditingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full text-base font-bold border border-blue-200 rounded-xl px-3 py-1.5 bg-white/90 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 shadow-2xs"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveGroupName}
                    disabled={savingName}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all shadow-sm shadow-blue-500/20"
                    title="Save"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setNewGroupName(group.name || '');
                      setIsEditingName(false);
                    }}
                    className="p-2 border border-slate-200/80 text-slate-500 bg-white/80 rounded-xl hover:bg-white active:scale-95 transition-all"
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight truncate">
                    {group.name || 'Untitled Group'}
                  </h2>
                </div>
              )}
            </div>
          </div>

          {!isEditingName && (
            <button
              onClick={() => setIsEditingName(true)}
              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/80 rounded-xl transition-all border border-transparent hover:border-blue-100 flex-shrink-0"
              title="Rename Space"
            >
              <Edit2 size={16} />
            </button>
          )}

        </div>
      </div>

      {/* Invite Code (Liquid Hero Card) */}
      <div className="relative overflow-hidden rounded-[28px] p-6 text-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white border border-white/20 shadow-lg shadow-blue-500/20">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center mb-2 border border-white/20 shadow-inner">
            <QrCode size={20} className="text-white" />
          </div>
          <h3 className="text-xs font-bold text-blue-100 uppercase tracking-wider mb-1">Invite Roommates</h3>
          <p className="text-blue-100/80 text-xs mb-4 max-w-xs">Share this code with flatmates so they can join and sync expenses.</p>
          
          <div className="flex items-center justify-center gap-2.5">
            <div className="bg-white/15 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/25 font-mono text-xl sm:text-2xl font-black tracking-[0.22em] text-white shadow-inner">
              {group.inviteCode}
            </div>
            <button
              onClick={handleCopyInvite}
              className="p-3 bg-white text-blue-700 hover:bg-blue-50 active:scale-95 rounded-2xl shadow-md transition-all font-bold"
              title="Copy Code"
            >
              <Copy size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Members List Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            <span>Group Members</span>
          </h3>
          <span className="text-xs font-bold text-slate-400 bg-white/80 px-2.5 py-1 rounded-full border border-slate-200/60 shadow-2xs">
            {group.members.length} total
          </span>
        </div>

        <div className="rounded-[28px] bg-white/80 backdrop-blur-2xl border border-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden divide-y divide-slate-100/80">
          {group.members.map((memberId) => {
            const user = users.find((item) => item.id === memberId);
            const isMe = memberId === currentUser.id;
            const isGroupAdmin = memberId === group.createdBy;

            return (
              <div
                key={memberId}
                className={`p-4 flex items-center justify-between transition-colors ${
                  isMe ? 'bg-blue-50/30' : 'hover:bg-white/90'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {user?.photoDataUrl ? (
                    <img 
                      src={user.photoDataUrl} 
                      alt={`${user.username} profile`} 
                      className="h-11 w-11 rounded-2xl object-cover shadow-2xs border border-white" 
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-100 border border-blue-200/50 flex items-center justify-center text-blue-700 font-black text-sm shadow-2xs">
                      {user ? user.username.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-slate-800 text-sm block">
                      {user ? user.username : 'Unknown User'} 
                      {isMe && <span className="text-xs text-blue-600 font-semibold ml-1.5">(You)</span>}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {user?.email || 'Active roommate'}
                    </span>
                  </div>
                </div>

                <div>
                  {isGroupAdmin ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs">
                      <Shield size={12} /> Admin
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200/50">
                      Member
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exit / Leave Group (For Non-Admin Members) */}
      {!isAdmin && (
        <div className="rounded-[28px] p-5 bg-white/80 backdrop-blur-2xl border border-amber-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-200/60 shadow-inner">
              <LogOut size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900">Leave Space</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {hasMyOutstandingBalance
                  ? `Your balance is ₹${Math.abs(myBalance).toFixed(2)}. Settle all dues before leaving.`
                  : 'You are completely settled. Leaving will remove you from this room workspace.'}
              </p>
              {confirmingLeave ? (
                <div className="mt-3.5 flex gap-2">
                  <button
                    onClick={() => setConfirmingLeave(false)}
                    disabled={leaving}
                    className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-2xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExitGroup}
                    disabled={leaving}
                    className="rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    {leaving ? 'Leaving...' : 'Confirm Exit'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (hasMyOutstandingBalance) {
                      showToast('Please settle all your balances before leaving the group.', 'error');
                      return;
                    }
                    setConfirmingLeave(true);
                  }}
                  className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-bold shadow-sm shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <LogOut size={14} />
                  <span>Leave group</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Group (Admin Only) */}
      {isAdmin && (
        <div className="rounded-[28px] p-5 bg-white/80 backdrop-blur-2xl border border-rose-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-rose-200/60 shadow-inner">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900">Delete Space</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {hasOutstandingBalances
                  ? 'Settle all balances of ₹1 or more before deleting this group.'
                  : 'All member balances are settled. Deleting permanently removes its expense and transaction history.'}
              </p>
              {confirmingDelete ? (
                <div className="mt-3.5 flex gap-2">
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-2xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteGroup}
                    className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-rose-500/20 active:scale-95 transition-all"
                  >
                    Confirm delete
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (hasOutstandingBalances) {
                      showToast('Please settle all group balances of ₹1 or more before deleting this group.', 'error');
                      return;
                    }
                    setConfirmingDelete(true);
                  }}
                  className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold shadow-sm shadow-rose-500/20 active:scale-95 transition-all"
                >
                  <Trash2 size={14} />
                  <span>Delete group</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}