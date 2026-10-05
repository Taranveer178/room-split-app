import { useState } from 'react';
import { 
  AlertTriangle, 
  Copy, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  LogOut 
} from 'lucide-react';
import { Card } from '../common/UI';
import { calculateSettlements, GROUP_DELETE_BALANCE_TOLERANCE } from '../../utils/settlement';

export default function MembersTab({ 
  group, 
  users, 
  currentUser, 
  expenses, 
  onDeleteGroup, 
  onUpdateGroup,  // Handler to update group metadata (e.g., name)
  onLeaveGroup,   // Handler to remove current user from group
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
    <div className="p-4 pb-12 space-y-5">
      {/* Group Info & Rename Card */}
      <Card className="p-4 bg-white border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Group Name</span>
            {isEditingName ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full text-sm font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveGroupName}
                  disabled={savingName}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  title="Save"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => {
                    setNewGroupName(group.name || '');
                    setIsEditingName(false);
                  }}
                  className="p-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50"
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-base font-bold text-slate-800">{group.name || 'Untitled Group'}</h2>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                  title="Rename Group"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Invite Code */}
      <Card className="p-5 text-center border-dashed border-2 border-indigo-200 bg-indigo-50/30">
        <h3 className="text-xs font-bold text-indigo-800 mb-1 uppercase tracking-wide">Invite Roommates</h3>
        <p className="text-slate-600 text-xs mb-3">Share this code with flatmates so they can join.</p>
        <div className="flex items-center justify-center gap-3">
          <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 font-mono text-xl font-bold tracking-[0.2em] text-slate-800">
            {group.inviteCode}
          </div>
          <button
            onClick={handleCopyInvite}
            className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md active:bg-indigo-700"
            title="Copy Code"
          >
            <Copy size={20} />
          </button>
        </div>
      </Card>

      {/* Members List */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 px-1">Group Members ({group.members.length})</h3>
        <Card className="overflow-hidden">
          {group.members.map((memberId, index) => {
            const user = users.find((item) => item.id === memberId);
            const isMe = memberId === currentUser.id;
            return (
              <div
                key={memberId}
                className={`p-3.5 flex items-center justify-between ${
                  index !== group.members.length - 1 ? 'border-b border-slate-100' : ''
                } ${isMe ? 'bg-slate-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {user?.photoDataUrl ? (
                    <img src={user.photoDataUrl} alt={`${user.username} profile`} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                      {user ? user.username.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-slate-800 text-sm block">
                      {user ? user.username : 'Unknown User'} {isMe && <span className="text-[10px] text-slate-400 font-normal">(You)</span>}
                    </span>
                    <span className="text-[10px] text-slate-400">{memberId === group.createdBy ? 'Admin' : 'Member'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Exit / Leave Group (For Non-Admin Members) */}
      {!isAdmin && (
        <Card className="p-4 border border-amber-200 bg-amber-50/40">
          <div className="flex items-start gap-3">
            <LogOut size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900">Leave group</h3>
              <p className="mt-1 text-xs text-slate-600">
                {hasMyOutstandingBalance
                  ? `Your balance is ₹${Math.abs(myBalance).toFixed(2)}. Settle your balance before leaving.`
                  : 'You have no outstanding balance. Leaving will remove you from this room.'}
              </p>
              {confirmingLeave ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setConfirmingLeave(false)}
                    disabled={leaving}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExitGroup}
                    disabled={leaving}
                    className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white"
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
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  <LogOut size={14} />
                  Leave group
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Delete Group (Admin Only) */}
      {isAdmin && (
        <Card className="p-4 border border-rose-200 bg-rose-50/50">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-rose-600" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900">Delete group</h3>
              <p className="mt-1 text-xs text-slate-600">
                {hasOutstandingBalances
                  ? 'Settle all balances of ₹1 or more before deleting this group.'
                  : 'All member balances are below ₹1. Deleting this group permanently removes its expense history.'}
              </p>
              {confirmingDelete ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteGroup}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
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
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  <Trash2 size={14} />
                  Delete group
                </button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}