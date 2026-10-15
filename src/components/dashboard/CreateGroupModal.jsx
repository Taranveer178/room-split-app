import { useState } from 'react';
import { ArrowLeft, ImagePlus, X, Loader2, Sparkles } from 'lucide-react';
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => !saving && onBack()}
    >
      {/* Liquid Glass Modal Card */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/80 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.3)] backdrop-blur-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Ambient Gradient Highlights */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between pb-5 border-b border-slate-200/50">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onBack} 
              disabled={saving}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 border border-white/80 text-slate-600 shadow-sm transition-all hover:bg-white hover:text-slate-900 active:scale-95 disabled:opacity-50"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Create New Group</h1>
              <p className="text-xs text-slate-500 font-medium">Set up a space to split bills & manage balances</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onBack}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/80 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleCreate} className="relative z-10 mt-6 space-y-5">
          <div className="space-y-4">
            <Input 
              label="Group Name" 
              placeholder="e.g. Goa Trip, Flat 101" 
              value={name} 
              onChange={(event) => setName(event.target.value)} 
              required 
            />

            <Input 
              label="Description (Optional)" 
              placeholder="What is this group for?" 
              value={description} 
              onChange={(event) => setDescription(event.target.value)} 
            />
          </div>

          {/* Group Image Picker Container */}
          <div className="rounded-2xl border border-white/80 bg-white/50 p-4 shadow-sm backdrop-blur-sm">
            <span className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Group Image (Optional)
            </span>
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 shadow-inner">
                {imageDataUrl ? (
                  <img src={imageDataUrl} alt="Group preview" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus size={24} className="text-blue-500" />
                )}
              </div>

              <div className="flex flex-1 flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-blue-50/70 hover:border-blue-300 hover:text-blue-700 active:scale-95">
                  <ImagePlus size={16} />
                  {imageDataUrl ? 'Change image' : 'Upload image'}
                  <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
                </label>

                {imageDataUrl && (
                  <button
                    type="button"
                    onClick={() => setImageDataUrl('')}
                    className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    aria-label="Remove group image"
                  >
                    <X size={15} /> Remove
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Images are automatically compressed before saving.</p>
          </div>

          {/* Submit Action Button */}
          <Button 
            type="submit" 
            disabled={saving || !name.trim()} 
            className="w-full h-13 mt-2 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 size={19} className="animate-spin text-white" />
                <span>Creating Group…</span>
              </>
            ) : (
              <span>Create Group</span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}