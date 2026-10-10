import { useState } from 'react';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import { generateInviteCode } from '../../utils/constants';
import { compressImageFile } from '../../utils/compressImage';
import { Button, Input } from '../common/UI';

export default function CreateGroupModal({ user, onSaveGroup, onBack, showToast }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const newGroup = {
      id: `grp_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      ...(imageDataUrl ? { imageDataUrl } : {}),
      inviteCode: generateInviteCode(),
      createdBy: user.id,
      members: [user.id],
      createdAt: new Date().toISOString(),
    };
    try {
      await onSaveGroup(newGroup);
      showToast('Group created successfully!');
      onBack();
    } catch (error) {
      showToast(error.message || 'Could not create group. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = async (event) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    try {
      setImageDataUrl(await compressImageFile(file));
    } catch (error) {
      showToast(error.message || 'Could not process this image.', 'error');
    }
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
          <div className="mt-4">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Group image (Optional)</span>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600">
                {imageDataUrl ? (
                  <img src={imageDataUrl} alt="Group preview" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus size={22} />
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <ImagePlus size={16} />
                {imageDataUrl ? 'Change image' : 'Add image'}
                <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
              </label>
              {imageDataUrl && (
                <button
                  type="button"
                  onClick={() => setImageDataUrl('')}
                  className="inline-flex items-center gap-1 rounded-xl px-2 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                  aria-label="Remove group image"
                >
                  <X size={16} /> Remove
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">Images are automatically compressed before saving.</p>
          </div>
          <Button type="submit" disabled={saving} className="w-full mt-6 h-14">
            {saving ? 'Creating…' : 'Create Group'}
          </Button>
        </form>
      </div>
    </div>
  );
}