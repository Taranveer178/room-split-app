import { useState } from 'react';
import { AlertTriangle, Copy, Trash2 } from 'lucide-react';
import { Card } from '../common/UI';
import { calculateSettlements } from '../../utils/settlement';

export default function MembersTab({ group, users, currentUser, expenses, onDeleteGroup, showToast }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isAdmin = group.createdBy === currentUser.id;
  const { balances } = calculateSettlements(expenses, group.members);
  const hasOutstandingBalances = Object.values(balances).some((balance) => balance !== 0);

  const handleCopyInvite = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(group.inviteCode);
      showToast('Invite code copied!');
    } else showToast(`Code: ${group.inviteCode}`);
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
      <Card className="p-5 text-center border-dashed border-2 border-indigo-200 bg-indigo-50/30">
        <h3 className="text-xs font-bold text-indigo-800 mb-1 uppercase tracking-wide">Invite Roommates</h3>
        <p className="text-slate-600 text-xs mb-3">Share this code with flatmates so they can join.</p>
        <div className="flex items-center justify-center gap-3"><div className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 font-mono text-xl font-bold tracking-[0.2em] text-slate-800">{group.inviteCode}</div><button onClick={handleCopyInvite} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md active:bg-indigo-700" title="Copy Code"><Copy size={20} /></button></div>
      </Card>
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 px-1">Group Members ({group.members.length})</h3>
        <Card className="overflow-hidden">{group.members.map((memberId, index) => {
          const user = users.find((item) => item.id === memberId);
          const isMe = memberId === currentUser.id;
          return (
            <div key={memberId} className={`p-3.5 flex items-center justify-between ${index !== group.members.length - 1 ? 'border-b border-slate-100' : ''} ${isMe ? 'bg-slate-50' : ''}`}>
              <div className="flex items-center gap-3">
                {user?.photoDataUrl ? (
                  <img src={user.photoDataUrl} alt={`${user.username} profile`} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                    {user ? user.username.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <div>
                  <span className="font-semibold text-slate-800 text-sm block">{user ? user.username : 'Unknown User'} {isMe && <span className="text-[10px] text-slate-400 font-normal">(You)</span>}</span>
                  <span className="text-[10px] text-slate-400">{memberId === group.createdBy ? 'Admin' : 'Member'}</span>
                </div>
              </div>
            </div>
          );
        })}</Card>
      </div>
      {isAdmin && (
        <Card className="p-4 border border-rose-200 bg-rose-50/50">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-rose-600" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900">Delete group</h3>
              <p className="mt-1 text-xs text-slate-600">
                {hasOutstandingBalances
                  ? 'All member balances must be settled before this group can be deleted.'
                  : 'This permanently removes the group and its expense history.'}
              </p>
              {confirmingDelete ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
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
                      showToast('Please settle all group balances before deleting this group.', 'error');
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