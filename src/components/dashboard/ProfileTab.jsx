import { useState } from 'react';
import { 
  ImagePlus, 
  Lock, 
  Mail, 
  Trash2, 
  UserCircle, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  QrCode, 
  KeyRound, 
  Sparkles,
  Camera
} from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../firebase';
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
      const scale = Math.min(1, 320 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not process this image.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const compressedPhoto = canvas.toDataURL('image/jpeg', 0.75);
      if (compressedPhoto.length > 280_000) {
        throw new Error('This image is too large after compression. Choose another image.');
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
    <div className={`relative w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-10 animate-in fade-in duration-300 ${isEditing ? 'pb-28 md:pb-10' : 'pb-16'}`}>
      
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 right-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Title */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          
          
        </div>
      </div>

      {!isEditing ? (
        /* ======================== VIEW PROFILE MODE ======================== */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300">
          {/* Top Banner with Theme Gradient */}
          <div className="h-32 sm:h-40 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 relative px-6 flex items-end">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-60" />
          </div>

          <div className="px-6 pb-8 pt-0 sm:px-10">
            {/* Avatar section positioned over banner */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 mb-6 gap-4">
              <div className="relative inline-block mx-auto sm:mx-0">
                <div className="p-1.5 bg-white rounded-3xl shadow-xl border border-slate-100">
                  {photoDataUrl ? (
                    <img 
                      src={photoDataUrl} 
                      alt={`${user?.username || 'User'} profile`} 
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover shadow-inner" 
                    />
                  ) : (
                    <div className="w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-4xl sm:text-5xl shadow-inner">
                      {getInitials()}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-2 right-2 p-1.5 bg-emerald-500 text-white rounded-full border-2 border-white shadow-sm" title="Active">
                  <CheckCircle2 size={14} />
                </div>
              </div>

              {/* Edit Trigger Button */}
              <div className="w-full sm:w-auto">
                <Button
                  onClick={() => {
                    setIsEditing(true);
                    setLocalError('');
                  }}
                  className="w-full sm:w-auto h-11 px-6 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 rounded-xl transition-all hover:-translate-y-0.5"
                >
                  Edit Profile
                </Button>
              </div>
            </div>

            {/* Profile Info Details */}
            <div className="mb-6 text-center sm:text-left">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{user?.username}</h2>
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-500 text-sm mt-1">
                <Mail size={15} className="text-slate-400" />
                <span>{user?.email || 'No email set'}</span>
              </div>
            </div>

            {/* Structured Info Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* UPI Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center gap-4 hover:border-blue-200 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                  <QrCode size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Settlement UPI ID</p>
                  <p className="font-mono text-sm font-semibold text-slate-800 truncate mt-0.5">
                    {user?.upiId || <span className="text-slate-400 font-sans italic text-xs">Not configured</span>}
                  </p>
                </div>
              </div>

              {/* Password Status Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center gap-4 hover:border-blue-200 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                  <KeyRound size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Password Security</p>
                  <p className="text-sm font-semibold text-slate-800 tracking-widest mt-0.5">••••••••</p>
                </div>
              </div>
            </div>

            {/* Security Notice Footer */}
            <div className="mt-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-100/60 text-slate-500 text-xs">
              <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
              <span>Your profile information is shared exclusively with verified members in your shared spaces.</span>
            </div>
          </div>
        </div>
      ) : (
        /* ======================== EDIT PROFILE MODE ======================== */
        <form onSubmit={handleUpdateProfile} className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          {localError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm flex items-start gap-3 border border-red-100 animate-in fade-in duration-200">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p className="font-medium leading-snug">{localError}</p>
            </div>
          )}

          {/* Photo Uploader Card */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Profile Photo</h3>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="relative group">
                <div className="p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  {photoDataUrl ? (
                    <img src={photoDataUrl} alt="Profile preview" className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl font-black">
                      {getInitials()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-center items-center sm:items-start space-y-2">
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-sm font-bold text-blue-700 cursor-pointer hover:bg-blue-100 transition-all active:scale-95">
                    <Camera size={16} />
                    <span>{photoDataUrl ? 'Change Photo' : 'Upload Photo'}</span>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="sr-only" />
                  </label>

                  {photoDataUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoDataUrl('')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 text-sm font-bold transition-all active:scale-95"
                      aria-label="Remove profile photo"
                      title="Remove profile photo"
                    >
                      <Trash2 size={16} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 text-center sm:text-left">
                  Supports JPG, PNG up to 8MB. Auto-compressed for performance.
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields Card */}
          <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <UserCircle size={16} className="text-blue-600" />
                  <span>Display Name</span>
                </label>
                <Input 
                  value={name} 
                  onChange={(event) => setName(event.target.value)} 
                  placeholder="Your Name" 
                  required 
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Mail size={16} className="text-blue-600" />
                  <span>Email Address</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">UPI</span>
                <span>UPI ID for Reimbursements</span>
              </label>
              <Input
                value={upiId}
                onChange={(event) => setUpiId(event.target.value)}
                placeholder="e.g. username@okhdfcbank or 9876543210@paytm"
              />
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Roommates will settle debts directly to this handle using PhonePe, GPay, or Paytm.
              </p>
            </div>
          </div>

          {/* Password Security Card */}
          <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Security Settings</h3>
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Lock size={16} className="text-blue-600" />
                <span>New Password</span>
              </label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Leave blank to keep existing password"
                minLength={6}
              />
              <p className="text-xs text-slate-400 mt-1.5">Minimum 6 characters long.</p>
            </div>
          </div>

          {/* Action Button Row */}
          <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
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

            <Button 
              type="submit" 
              className="w-full sm:flex-1 h-12 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/25 transition-all hover:-translate-y-0.5" 
              disabled={loading}
            >
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      )}

      {/* Floating Fallback Toast */}
      {fallbackToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold px-5 py-3 rounded-full shadow-2xl border border-white/10 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Profile updated successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
}