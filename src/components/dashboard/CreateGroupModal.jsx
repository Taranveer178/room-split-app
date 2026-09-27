import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { generateInviteCode } from '../../utils/constants';
import { Button, Input } from '../common/UI';

export default function CreateGroupModal({ user, onSaveGroup, onBack, showToast }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    const newGroup = {
      id: `grp_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      inviteCode: generateInviteCode(),
      createdBy: user.id,
      members: [user.id],
      createdAt: new Date().toISOString(),
    };
    await onSaveGroup(newGroup);
    showToast('Group created successfully!');
    onBack();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <header className="px-4 py-4 flex items-center gap-3 border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold text-slate-800">Create New Group</h1>
      </header>
      <div className="p-5">
        <form onSubmit={handleCreate}>
          <Input label="Group Name" placeholder="e.g. Goa Trip, Flat 101" value={name} onChange={(event) => setName(event.target.value)} required />
          <Input label="Description (Optional)" placeholder="What is this group for?" value={description} onChange={(event) => setDescription(event.target.value)} />
          <Button type="submit" className="w-full mt-6 h-14">Create Group</Button>
        </form>
      </div>
    </div>
  );
}