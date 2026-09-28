import React, { useState, useEffect } from 'react';
import { 
  LogOut, Plus, UserPlus, Users, Download, 
  Bell, User, ChevronRight, Lock, Mail, UserCircle, Trash2
} from 'lucide-react';
import { updateProfile, updateEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import roomsplitIcon from '../../assets/roomsplit-icon.webp';
import { Card, Button, Input, NavItem } from '../common/UI';
import { requestNotificationPermission } from '../../utils/notifications';


export default function Dashboard({ user, groups, notifications, onLogout, onOpenGroup, onCreateGroup, onJoinGroup, onUpdateUser, onMarkNotificationsRead, showToast }) {
  const [activeTab, setActiveTab] = useState('groups');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  
  const myGroups = groups.filter((group) => group.members && group.members.includes(user.id));
  const unreadNotifications = notifications.filter((notification) => !notification.read);

  useEffect(() => {
    if (activeTab === 'notifications' && unreadNotifications.length) {
      onMarkNotificationsRead(unreadNotifications.map((notification) => notification.id));
    }
  }, [activeTab, notifications]);

  // Request notification permissions when user logs in
  useEffect(() => {
    if (user?.id) {
      requestNotificationPermission(user);
    }
  }, [user?.id]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleClearAllNotifications = async () => {
  if (!notifications.length) return;
  
  try {
    const batch = writeBatch(db);
    notifications.forEach((n) => {
      if (n.id) {
        batch.delete(doc(db, 'notifications', n.id));
      }
    });
    await batch.commit();
    if (typeof showToast === 'function') {
      showToast('Notifications cleared');
    }
  } catch (err) {
    console.error('Failed to clear notifications:', err);
    if (typeof showToast === 'function') {
      showToast('Failed to clear notifications');
    }
  }
};

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Sticky Header */}
      <header className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src={roomsplitIcon} alt="RoomSplit" className="w-9 h-9 rounded-xl object-contain shadow-sm" />
          <span className="text-xl font-bold text-slate-900">RoomSplit</span>
        </div>
        <button 
          onClick={onLogout} 
          className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-full" 
          title="Log out"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Main Scrollable Area */}
      <main className="flex-1 overflow-y-auto pb-24 relative">
        
        {/* ============================== */}
        {/* TAB 1: GROUPS (Dashboard Home) */}
        {/* ============================== */}
        {activeTab === 'groups' && (
          <div className="p-5 animate-in fade-in duration-200">
            {showInstallBanner && (
              <div className="mb-6 bg-slate-900 text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Download size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Install App</h3>
                    <p className="text-xs text-slate-300">Add to home screen for quick access.</p>
                  </div>
                </div>
                <button 
                  onClick={handleInstallClick}
                  className="bg-white text-slate-900 font-bold text-xs px-4 py-2 rounded-xl shadow active:scale-95 transition-transform"
                >
                  Install
                </button>
              </div>
            )}

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Hi, {user.username}!</h1>
              <p className="text-slate-500 mt-1 text-sm">Manage your shared spaces.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <button onClick={onCreateGroup} className="flex flex-col items-center justify-center p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700 active:scale-95 transition-all">
                <Plus size={24} className="mb-2" />
                <span className="font-semibold text-sm">Create Group</span>
              </button>
              <button onClick={onJoinGroup} className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl text-slate-700 active:scale-95 transition-all shadow-sm">
                <UserPlus size={24} className="mb-2" />
                <span className="font-semibold text-sm">Join Group</span>
              </button>
            </div>

            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Your Groups</h2>
            
            {myGroups.length === 0 ? (
              <div className="text-center py-10 bg-white border border-dashed border-slate-300 rounded-3xl">
                <Users size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium text-sm">You aren't in any groups yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myGroups.map((group) => (
                  <Card key={group.id} onClick={() => onOpenGroup(group.id)} className="p-4 hover:border-slate-300 transition-colors cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{group.name}</h3>
                          <p className="text-slate-500 text-xs mt-0.5">{group.members.length} Members</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-slate-300" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================== */}
        {/* TAB 2: IN-APP NOTIFICATIONS    */}
        {/* ============================== */}
        {activeTab === 'notifications' && (
          <div className="p-5 animate-in fade-in duration-200">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Notifications</h1>
            
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center px-6 pt-16">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Bell size={28} className="text-slate-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">All caught up!</h3>
                  <p className="text-slate-500 text-sm mt-1">You have no activity yet.</p>
                </div>
              ) : (
                notifications
                  .slice()
                  .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
                  .map((notification) => {
                    // 1. Determine who created the notification
                    const creatorId = notification.createdBy || notification.senderId || notification.userId;
                    const isMe = creatorId === user?.id;
                    
                    // 2. Resolve creator's name
                    const creatorName = isMe 
                      ? 'You' 
                      : (notification.createdByName || notification.senderName || (typeof getUserName === 'function' && getUserName(creatorId)) || 'Someone');

                    // 3. Format message: replace hardcoded "You added" with "[Name] added" if someone else added it
                    let displayMessage = notification.message || '';
                    if (!isMe && displayMessage.startsWith('You added')) {
                      displayMessage = displayMessage.replace('You added', `${creatorName} added`);
                    } else if (isMe && !displayMessage.startsWith('You added') && displayMessage.includes('added')) {
                      // If it saved with author's name, show "You added" to the author
                      displayMessage = displayMessage.replace(`${creatorName} added`, 'You added');
                    }

                    return (
                      <div 
                        key={notification.id} 
                        onClick={() => {
                          if (notification.groupId && typeof onOpenGroup === 'function') {
                            onOpenGroup(notification.groupId);
                          }
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-slate-300 ${
                          notification.read ? 'bg-white border-slate-100 shadow-xs' : 'bg-indigo-50/70 border-indigo-100 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white shadow-xs flex items-center justify-center text-indigo-600 flex-shrink-0 mt-0.5">
                            <Bell size={17} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-800 font-medium leading-relaxed">
                              {displayMessage}
                            </p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-xs text-slate-400">
                                {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ''}
                              </span>
                              {notification.groupId && (
                                <span className="text-[11px] font-semibold text-indigo-600 hover:underline">
                                  View bill →
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* ============================== */}
        {/* TAB 3: USER PROFILE SETTINGS   */}
        
        {activeTab === 'profile' && (
          <ProfileTab 
            user={user} 
            onUpdateUser={onUpdateUser} 
            showToast={showToast} 
          />
        )}
      </main>

      {/* Main Dashboard Bottom Navigation */}
      {/* Main Dashboard Bottom Navigation */}
      <nav className="bg-white/95 backdrop-blur-md border-t border-slate-200 absolute bottom-0 w-full z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16">
          <NavItem 
            icon={Users} 
            label="Groups" 
            isActive={activeTab === 'groups'} 
            onClick={() => setActiveTab('groups')} 
          />

          {/* Activity Tab with unread indicator badge */}
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative ${
              activeTab === 'notifications' ? 'text-indigo-600 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <div className="relative">
              <Bell size={20} />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white"></span>
                </span>
              )}
            </div>
            <span className="text-[11px] mt-1">Activity</span>
          </button>

          <NavItem 
            icon={User} 
            label="Profile" 
            isActive={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
          />
        </div>
      </nav>
    </div>
  );
}


//* ========================================= */
/* PROFILE TAB COMPONENT (Internal)          */
/* ========================================= */
function ProfileTab({ user, onUpdateUser, showToast }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.username || '');
  const [email, setEmail] = useState(auth.currentUser?.email || '');
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [fallbackToast, setFallbackToast] = useState(false);

  // Keep state in sync whenever user object updates from Firebase
  useEffect(() => {
    if (user) {
      setName(user.username || '');
      setUpiId(user.upiId || '');
    }
    if (auth.currentUser?.email) {
      setEmail(auth.currentUser.email);
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLoading(true);
    
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("No authenticated user found.");

      if (password.trim() && password.length < 6) {
        throw new Error("New password must be at least 6 characters long.");
      }

      const firestoreUpdates = {};

      // 1. Update Display Name
      if (name.trim() && name.trim() !== user.username) {
        await updateProfile(firebaseUser, { displayName: name.trim() });
        firestoreUpdates.username = name.trim();
      }

      // 2. Update UPI ID
      if (upiId.trim() !== (user.upiId || '')) {
        firestoreUpdates.upiId = upiId.trim();
      }

      // 3. Update Email safely
      if (email.trim() && email.trim() !== firebaseUser.email) {
        try {
          await updateEmail(firebaseUser, email.trim());
          firestoreUpdates.email = email.trim();
        } catch (emailErr) {
          if (emailErr.code === 'auth/operation-not-allowed') {
            throw new Error("Firebase requires email verification to change emails. Please update your Firebase Console settings.");
          }
          throw emailErr;
        }
      }

      // Commit changes to Firestore and parent state
      if (Object.keys(firestoreUpdates).length > 0) {
        await updateDoc(doc(db, 'users', user.id), firestoreUpdates);
        if (typeof onUpdateUser === 'function') {
          await onUpdateUser(user.id, firestoreUpdates);
        } else {
          Object.assign(user, firestoreUpdates);
        }
      }

      // 4. Update Password
      if (password.trim()) {
        if (typeof onUpdateUser === 'function') {
          await onUpdateUser(user.id, { password });
        }
        setPassword(''); 
      }

      // Trigger bottom toast notification matching expense submit theme
      if (typeof showToast === 'function') {
        showToast("Profile updated successfully!");
      } else {
        setFallbackToast(true);
        setTimeout(() => setFallbackToast(false), 3000);
      }

      setIsEditing(false);
      
    } catch (err) {
      console.error("Profile update error:", err);
      
      if (err.code === 'auth/requires-recent-login') {
        setLocalError("For security, please log out and log back in before changing your password or email.");
      } else if (err.code === 'auth/invalid-email') {
        setLocalError("The email address is not valid.");
      } else if (err.code === 'auth/email-already-in-use') {
        setLocalError("This email is already registered to another account.");
      } else {
        setLocalError(err.message || "Failed to update profile.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    return (user?.username || 'U').charAt(0).toUpperCase();
  };

  return (
    <div className="p-5 animate-in fade-in duration-200 pb-12 relative">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Your Profile</h1>

      {!isEditing ? (
        /* --- VIEW MODE --- */
        <div className="flex flex-col items-center text-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm animate-in zoom-in-95 duration-200">
          <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-4xl mb-4 shadow-inner">
            {getInitials()}
          </div>
          
          <h2 className="text-xl font-bold text-slate-900">{user?.username}</h2>
          
          <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1 mb-4">
            <Mail size={14} />
            <span>{auth.currentUser?.email || 'No email set'}</span>
          </div>

          {/* Read-Only UPI Display Badge */}
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
        /* --- EDIT MODE --- */
        <form onSubmit={handleUpdateProfile} className="space-y-4 animate-in slide-in-from-bottom-4 duration-200">
          {localError && (
            <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm flex items-start gap-2.5 border border-red-100">
              <span className="mt-0.5 flex-shrink-0">⚠️</span>
              <p className="font-medium leading-snug">{localError}</p>
            </div>
          )}

          <Card className="p-4 bg-white space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <UserCircle size={16} className="text-slate-400" />
                Display Name
              </label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Your Name" 
                required 
              />
            </div>

            {/* UPI ID Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">UPI</span>
                UPI ID (to receive settlements)
              </label>
              <Input 
                value={upiId} 
                onChange={(e) => setUpiId(e.target.value)} 
                placeholder="e.g. username@okhdfcbank or 9876543210@paytm" 
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Roommates will settle directly to this UPI address on Google Pay/PhonePe.
              </p>
            </div>
            
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail size={16} className="text-slate-400" />
                Email Address
              </label>
              <Input 
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="your@email.com" 
              />
            </div>
          </Card>

          {/* Change Password Card */}
          <Card className="p-4 bg-white">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Lock size={16} className="text-slate-400" />
              New Password
            </label>
            <Input 
              type="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Leave blank to keep current" 
              minLength={6}
            />
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              * Must be at least 6 characters.
            </p>
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
                setEmail(auth.currentUser?.email || '');
                setUpiId(user?.upiId || '');
                setPassword('');
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-12 text-base" 
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      )}

      {/* Matching Floating Toast (Fallback if parent showToast is not wired) */}
      {fallbackToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg border border-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Profile updated successfully!
          </div>
        </div>
      )}
    </div>
  );
}