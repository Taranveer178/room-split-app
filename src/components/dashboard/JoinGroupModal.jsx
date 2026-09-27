import { useState } from 'react';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '../common/UI';

export default function JoinGroupModal({ user, groups, onUpdateGroup, onBack, showToast }) {
  const [code, setCode] = useState('');

  const handleJoin = async (event) => {
    event.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;
    const group = groups.find((item) => item.inviteCode === cleanCode);
    if (!group) {
      showToast('Invalid invite code.', 'error');
      return;
    }
    if (group.members.includes(user.id)) {
      showToast('You are already in this group.');
      onBack();
      return;
    }
    await onUpdateGroup({ ...group, members: [...group.members, user.id] });
    showToast(`Joined ${group.name}!`);
    onBack();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <header className="px-4 py-4 flex items-center gap-3 border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold text-slate-800">Join a Group</h1>
      </header>
      <div className="p-5 text-center pt-8">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-5"><KeyRound size={28} className="text-indigo-600" /></div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Enter Invite Code</h2>
        <p className="text-slate-500 text-sm mb-6 px-4">Ask your roommate for the group invite code to join.</p>
        <form onSubmit={handleJoin} className="max-w-[280px] mx-auto">
          <input className="w-full px-4 py-3.5 text-center text-2xl font-mono tracking-widest border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-0 outline-none uppercase bg-slate-50" placeholder="XXXXXX" maxLength={10} value={code} onChange={(event) => setCode(event.target.value)} required />
          <Button type="submit" className="w-full mt-6 h-14" disabled={code.trim().length < 3}>Join Group</Button>
        </form>
      </div>
    </div>
  );
}