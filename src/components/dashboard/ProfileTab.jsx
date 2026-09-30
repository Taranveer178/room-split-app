import { useState } from 'react';
import { ImagePlus, Lock, Mail, Trash2, UserCircle } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { Button, Card, Input } from '../common/UI';

export default function ProfileTab({ user, onUpdateUser, showToast }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [photoDataUrl, setPhotoDataUrl] = useState(user?.photoDataUrl || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [fallbackToast, setFallbackToast] = useState(false);

  const handlePhotoChange = async (event) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLocalError('Choose an image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setLocalError('Choose an image smaller than 8 MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const loadedImage = new Image();
        loadedImage.onload = () => resolve(loadedImage);
        loadedImage.onerror = () => reject(new Error('Could not load this image.'));
        loadedImage.src = objectUrl;
      });
      const maxDimension = 320;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not process this image.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const compressedPhoto = canvas.toDataURL('image/jpeg', 0.75);
      if (compressedPhoto.length > 280_000) {
        throw new Error('This image is still too large after compression. Choose another image.');
      }
      setPhotoDataUrl(compressedPhoto);
      setLocalError('');
    } catch (error) {
      setLocalError(error.message || 'Could not process this image.');
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    setLocalError('');
    setLoading(true);

    try {
      const firebaseUser = auth.currentUser;
      if (password.trim() && password.length < 6) {
        throw new Error('New password must be at least 6 characters long.');
      }

      const firestoreUpdates = {};
      if (name.trim() && name.trim() !== user.username) {
        if (firebaseUser) await updateProfile(firebaseUser, { displayName: name.trim() });
        firestoreUpdates.username = name.trim();
      }
      if (upiId.trim() !== (user.upiId || '')) firestoreUpdates.upiId = upiId.trim();
      if (email.trim() !== (user.email || '')) firestoreUpdates.email = email.trim();
      if (photoDataUrl !== (user.photoDataUrl || '')) firestoreUpdates.photoDataUrl = photoDataUrl;

      if (Object.keys(firestoreUpdates).length > 0) {
        await updateDoc(doc(db, 'users', user.id), firestoreUpdates);
        if (typeof onUpdateUser === 'function') {
          await onUpdateUser(user.id, firestoreUpdates);
        } else {
          Object.assign(user, firestoreUpdates);
        }
      }

      if (password.trim()) {
        if (typeof onUpdateUser === 'function') await onUpdateUser(user.id, { password });
        setPassword('');
      }

      if (typeof showToast === 'function') {
        showToast('Profile updated successfully!');
      } else {
        setFallbackToast(true);
        setTimeout(() => setFallbackToast(false), 3000);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);
      if (error.code === 'auth/requires-recent-login') {
        setLocalError('For security, please log out and log back in before changing your password or email.');
      } else if (error.code === 'auth/invalid-email') {
        setLocalError('The email address is not valid.');
      } else {
        setLocalError(error.message || 'Failed to update profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => (user?.username || 'U').charAt(0).toUpperCase();

  return (
    <div className="p-5 animate-in fade-in duration-200 pb-12 relative">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Your Profile</h1>

      {!isEditing ? (
        <div className="flex flex-col items-center text-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm animate-in zoom-in-95 duration-200">
          {photoDataUrl ? (
            <img src={photoDataUrl} alt={`${user?.username || 'User'} profile`} className="w-24 h-24 rounded-full object-cover mb-4 shadow-inner" />
          ) : (
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-4xl mb-4 shadow-inner">
              {getInitials()}
            </div>
          )}
          <h2 className="text-xl font-bold text-slate-900">{user?.username}</h2>
          <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1 mb-4">
            <Mail size={14} />
            <span>{user?.email || 'No email set'}</span>
          </div>

          <div className="w-full max-w-xs flex items-center justify-between text-sm mb-3 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">UPI ID</span>
            <span className="font-mono text-xs font-semibold text-slate-800 truncate max-w-[170px]">
              {user?.upiId || 'Not set'}
            </span>
          </div>

          <div className="w-full max-w-xs flex items-center justify-between text-sm text-slate-500 mb-6 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-1.5">
              <Lock size={14} className="text-slate-400" />
              <span>Password</span>
            </div>
            <span>••••••••</span>
          </div>

          <Button
            onClick={() => {
              setIsEditing(true);
              setLocalError('');
            }}
            className="w-full max-w-xs h-12 text-sm"
          >
            Edit Profile
          </Button>
        </div>
      ) : (
        <form onSubmit={handleUpdateProfile} className="space-y-4 animate-in slide-in-from-bottom-4 duration-200">
          {localError && (
            <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm flex items-start gap-2.5 border border-red-100">
              <span className="mt-0.5 flex-shrink-0">⚠️</span>
              <p className="font-medium leading-snug">{localError}</p>
            </div>
          )}

          <Card className="p-4 bg-white space-y-4">
            <div className="flex items-center gap-4">
              {photoDataUrl ? (
                <img src={photoDataUrl} alt="Profile preview" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
                  {getInitials()}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <ImagePlus size={16} />
                  {photoDataUrl ? 'Change photo' : 'Add photo'}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="sr-only" />
                </label>
                {photoDataUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl('')}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                    aria-label="Remove profile photo"
                    title="Remove profile photo"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <UserCircle size={16} className="text-slate-400" />
                Display Name
              </label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your Name" required />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">UPI</span>
                UPI ID (to receive settlements)
              </label>
              <Input
                value={upiId}
                onChange={(event) => setUpiId(event.target.value)}
                placeholder="e.g. username@okhdfcbank or 9876543210@paytm"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Roommates will settle directly to this UPI address on Google Pay/PhonePe.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail size={16} className="text-slate-400" />
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="your@email.com"
              />
            </div>
          </Card>

          <Card className="p-4 bg-white">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Lock size={16} className="text-slate-400" />
              New Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Leave blank to keep current"
              minLength={6}
            />
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">* Must be at least 6 characters.</p>
          </Card>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700"
              onClick={() => {
                setIsEditing(false);
                setLocalError('');
                setName(user?.username || '');
                setEmail(user?.email || '');
                setUpiId(user?.upiId || '');
                setPhotoDataUrl(user?.photoDataUrl || '');
                setPassword('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-12 text-base" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      )}

      {fallbackToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg border border-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Profile updated successfully!
          </div>
        </div>
      )}
    </div>
  );
}
