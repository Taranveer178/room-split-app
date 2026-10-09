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
  Layers, 
  Link, 
  Share2, 
  QrCode, 
  UserPlus 
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { calculateSettlements, GROUP_DELETE_BALANCE_TOLERANCE } from '../../utils/settlement';
import { useBackHandler } from '../../utils/backNavigation';

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
  
  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  useBackHandler(
    confirmingDelete || confirmingLeave || isInviteOpen || showQrModal,
    () => {
      if (showQrModal) setShowQrModal(false);
      else if (isInviteOpen) setIsInviteOpen(false);
      else if (confirmingDelete) setConfirmingDelete(false);
      else setConfirmingLeave(false);
      return true;
    },
    100
  );

  const inviteUrl = `${window.location.origin}/?join=${encodeURIComponent(group.inviteCode)}`;

  const isAdmin = group.createdBy === currentUser.id;
  const { balances } = calculateSettlements(expenses, group.members);
  const myBalance = balances[currentUser.id] || 0;
  const hasMyOutstandingBalance = Math.abs(myBalance) >= GROUP_DELETE_BALANCE_TOLERANCE;
  const hasOutstandingBalances = Object.values(balances).some(
    (balance) => Math.abs(balance) >= GROUP_DELETE_BALANCE_TOLERANCE
  );

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(group.inviteCode);
      } else {
        const temporaryInput = document.createElement('textarea');
        temporaryInput.value = group.inviteCode;
        temporaryInput.style.position = 'fixed';
        temporaryInput.style.opacity = '0';
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        document.execCommand('copy');
        temporaryInput.remove();
      }
      setCopiedKey('code');
      showToast('Invite code copied!');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      showToast('Could not copy invite code.', 'error');
    }
  };

  const copyInviteLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        const temporaryInput = document.createElement('textarea');
        temporaryInput.value = inviteUrl;
        temporaryInput.style.position = 'fixed';
        temporaryInput.style.opacity = '0';
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        document.execCommand('copy');
        temporaryInput.remove();
      }
      setCopiedKey('link');
      showToast('Invite link copied!');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      showToast('Could not copy the invite link.', 'error');
    }
  };

  const shareInviteLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ 
          title: `Join ${group.name} on RoomSplit`, 
          text: `Join our shared group "${group.name}". Use code: ${group.inviteCode}`, 
          url: inviteUrl 
        });
      } else {
        await copyInviteLink();
      }
    } catch (error) {
      if (error.name !== 'AbortError') showToast('Could not share the invite link.', 'error');
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
    <div className="p-4 sm:p-6 lg:p-10 space-y-4 pb-[130px] md:pb-36 relative min-h-full max-w-4xl mx-auto animate-in fade-in duration-300 font-sans">
      
      {/* Ambient background glows */}
      <div className="absolute top-0 right-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Redesigned Space Name Hero Card */}
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

      {/* Clean Compact Invite Bar */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-white/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UserPlus size={17} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">Invite Roommates</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Add flatmates via code, link or QR</p>
          </div>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
        >
          <UserPlus size={14} />
          <span>Invite +</span>
        </button>
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

      {/* Invite Options Modal (Liquid Glass) */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-[32px] p-6 bg-white/95 backdrop-blur-2xl border border-white/70 shadow-[0_24px_50px_-12px_rgba(15,23,42,0.25)] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/60 shadow-2xs">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Invite Roommates</h3>
                  <p className="text-[11px] text-slate-400">Share room code or invite link</p>
                </div>
              </div>
              <button 
                onClick={() => setIsInviteOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Room Code Display Block */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-2xl mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Room Code</span>
                <span className="font-mono text-xl font-black tracking-widest text-slate-900">{group.inviteCode}</span>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 border border-blue-200/70 text-xs font-bold shadow-2xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                {copiedKey === 'code' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedKey === 'code' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Options List */}
            <div className="space-y-2">
              
              {/* Copy Link */}
              <button
                onClick={copyInviteLink}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/80 hover:bg-white border border-slate-200/70 text-slate-800 text-xs font-bold transition-all active:scale-[0.99] shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <Link size={15} />
                  </div>
                  <span>Copy Invite Link</span>
                </div>
                {copiedKey === 'link' ? (
                  <span className="text-emerald-600 text-[11px] flex items-center gap-1 font-bold"><Check size={13} /> Copied</span>
                ) : (
                  <Copy size={14} className="text-slate-400" />
                )}
              </button>

              {/* Share Link (Exclusive Share Option) */}
              <button
                onClick={shareInviteLink}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all active:scale-[0.99] shadow-md shadow-blue-500/20"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
                    <Share2 size={15} />
                  </div>
                  <span>Share Invite Link</span>
                </div>
                <Share2 size={14} className="text-blue-100" />
              </button>

              {/* Generate QR Code */}
              <button
                onClick={() => {
                  setIsInviteOpen(false);
                  setShowQrModal(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/80 hover:bg-white border border-slate-200/70 text-slate-800 text-xs font-bold transition-all active:scale-[0.99] shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <QrCode size={15} />
                  </div>
                  <span>Generate QR Code</span>
                </div>
                <QrCode size={14} className="text-slate-400" />
              </button>

            </div>

          </div>
        </div>
      )}

      {/* QR Code Presentation Modal (No Download Button) */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xs rounded-[32px] p-6 bg-white/95 backdrop-blur-2xl border border-white/70 shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 border border-blue-100">
              <QrCode size={20} />
            </div>
            
            <h3 className="text-base font-extrabold text-slate-900">Scan to Join</h3>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">Have your flatmate scan this QR with their camera</p>

            {/* Native Canvas QR Code */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-inner inline-block mb-4">
              <QRCodeCanvas 
                value={inviteUrl} 
                size={172} 
                level="H" 
                includeMargin 
              />
            </div>

            <div className="text-[11px] font-semibold text-slate-500 bg-slate-50 py-2 px-3 rounded-xl border border-slate-100">
              Room Code: <span className="font-mono font-bold text-slate-800">{group.inviteCode}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}