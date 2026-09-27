import { ChevronRight, LogOut, Plus, UserPlus, Users } from 'lucide-react';
import roomsplitIcon from '../../assets/roomsplit-icon.webp';
import { Card } from '../common/UI';

export default function Dashboard({ user, groups, onLogout, onOpenGroup, onCreateGroup, onJoinGroup }) {
  const myGroups = groups.filter((group) => group.members && group.members.includes(user.id));
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10 sticky top-0">
        <div className="flex items-center gap-3"><img src={roomsplitIcon} alt="RoomSplit" className="w-9 h-9 rounded-xl object-contain shadow-sm" /><span className="text-xl font-bold text-slate-800">RoomSplit</span></div>
        <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-full" title="Log out"><LogOut size={20} /></button>
      </header>
      <main className="flex-1 overflow-y-auto p-5 pb-24">
        <div className="mb-6"><h1 className="text-2xl font-bold text-slate-800">Hi, {user.username}!</h1><p className="text-slate-500 mt-1">Here are your shared groups.</p></div>
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button onClick={onCreateGroup} className="flex flex-col items-center justify-center p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700 active:bg-indigo-100 transition-colors"><Plus size={26} className="mb-2" /><span className="font-semibold text-sm">Create Group</span></button>
          <button onClick={onJoinGroup} className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl text-slate-700 active:bg-slate-50 transition-colors shadow-sm"><UserPlus size={26} className="mb-2" /><span className="font-semibold text-sm">Join Group</span></button>
        </div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Your Groups</h2>
        {myGroups.length === 0 ? (
          <div className="text-center py-10 bg-white border border-dashed border-slate-300 rounded-3xl"><Users size={32} className="mx-auto text-slate-300 mb-3" /><p className="text-slate-500 font-medium">You aren't in any groups yet.</p></div>
        ) : (
          <div className="space-y-3">{myGroups.map((group) => (
            <Card key={group.id} onClick={() => onOpenGroup(group.id)} className="p-4">
              <div className="flex justify-between items-center"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl">{group.name.charAt(0).toUpperCase()}</div><div><h3 className="font-bold text-slate-800 text-base">{group.name}</h3><p className="text-slate-500 text-xs mt-0.5">{group.members.length} Members</p></div></div><ChevronRight size={22} className="text-slate-300" /></div>
            </Card>
          ))}</div>
        )}
      </main>
    </div>
  );
}