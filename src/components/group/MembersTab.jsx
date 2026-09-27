import { Copy } from 'lucide-react';
import { Card } from '../common/UI';

export default function MembersTab({ group, users, currentUser, showToast }) {
  const handleCopyInvite = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(group.inviteCode);
      showToast('Invite code copied!');
    } else showToast(`Code: ${group.inviteCode}`);
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
              <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">{user ? user.username.charAt(0).toUpperCase() : '?'}</div><div><span className="font-semibold text-slate-800 text-sm block">{user ? user.username : 'Unknown User'} {isMe && <span className="text-[10px] text-slate-400 font-normal">(You)</span>}</span><span className="text-[10px] text-slate-400">{memberId === group.createdBy ? 'Admin' : 'Member'}</span></div></div>
            </div>
          );
        })}</Card>
      </div>
    </div>
  );
}