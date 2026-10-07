import { useState, useEffect } from 'react';
import { LogOut, Plus, UserPlus, Users, Download, Bell, User, ChevronRight, TrendingUp } from 'lucide-react';
import roomsplitIcon from '../../assets/roomsplit-icon.webp';
import { Card } from '../common/UI';
import { requestNotificationPermission } from '../../utils/notifications';
import ActivityTab from './ActivityTab';
import MonthlyAnalyticsTab from './MonthlyAnalyticsTab';
import ProfileTabView from './ProfileTab';


export default function Dashboard({ user, groups, notifications,expenses= [], onLogout, onOpenGroup, onCreateGroup, onJoinGroup, onUpdateUser, onMarkNotificationsRead, showToast }) {
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

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden lg:flex-row">
      {/* Sticky Header */}
      <header className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-30 flex-shrink-0 lg:absolute lg:left-0 lg:top-0 lg:z-50 lg:w-64 lg:items-center lg:px-5 lg:py-6 lg:border-b-0">
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
      <main className="flex-1 min-w-0 overflow-y-auto pb-24 relative lg:order-3 lg:pb-0">
        
        {/* ============================== */}
        {/* TAB 1: GROUPS (Dashboard Home) */}
        {/* ============================== */}
        {activeTab === 'groups' && (
          <div className="p-5 animate-in fade-in duration-200 lg:p-10">
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
              <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
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
          <ActivityTab notifications={notifications} user={user} onOpenGroup={onOpenGroup} />
        )}

        {/* ============================== */}
        {/* TAB 3: MONTHLY EXPENSES TRACK  */}
        {/* ============================== */}
        {activeTab === 'monthly' && (
          <MonthlyAnalyticsTab 
            user={user} 
            expenses={expenses} 
            groups={groups} 
          />
        )}

        {/* ============================== */}
        {/* TAB 4: USER PROFILE SETTINGS   */}
        
        {activeTab === 'profile' && (
          <ProfileTabView 
            key={[user.id, user.username, user.email, user.upiId, user.photoDataUrl].join(':')}
            user={user} 
            onUpdateUser={onUpdateUser} 
            showToast={showToast} 
          />
        )}
      </main>

      {/* Main Dashboard Bottom Navigation */}
      <nav className="bg-white/95 backdrop-blur-md border-t border-slate-200 absolute bottom-0 w-full z-40 pb-[env(safe-area-inset-bottom)] lg:order-2 lg:static lg:w-64 lg:h-full lg:flex-shrink-0 lg:border-t-0 lg:border-r lg:pb-0 lg:pt-24">
        <div className="grid grid-cols-4 items-center h-16 w-full lg:grid-cols-1 lg:h-auto lg:gap-2">
          {/* 1. Groups */}
          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            className={`flex flex-col items-center justify-center w-full py-1 transition-colors lg:flex-row lg:justify-start lg:gap-3 lg:px-5 lg:py-3 ${
              activeTab === 'groups' ? 'text-indigo-600 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <Users size={20} />
            <span className="text-[11px] mt-1 lg:mt-0 lg:text-sm">Groups</span>
          </button>

          {/* 2. Activity with Badge */}
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex flex-col items-center justify-center w-full py-1 transition-colors relative lg:flex-row lg:justify-start lg:gap-3 lg:px-5 lg:py-3 ${
              activeTab === 'notifications' ? 'text-indigo-600 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <div className="relative inline-flex items-center justify-center">
              <Bell size={20} />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 z-20 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white"></span>
                </span>
              )}
            </div>
            <span className="text-[11px] mt-1 lg:mt-0 lg:text-sm">Activity</span>
          </button>

          {/* 3. Monthly Tracker */}
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`flex flex-col items-center justify-center w-full py-1 transition-colors lg:flex-row lg:justify-start lg:gap-3 lg:px-5 lg:py-3 ${
              activeTab === 'monthly' ? 'text-indigo-600 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <TrendingUp size={20} />
            <span className="text-[11px] mt-1 lg:mt-0 lg:text-sm">Monthly</span>
          </button>

          {/* 4. Profile */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center w-full py-1 transition-colors lg:flex-row lg:justify-start lg:gap-3 lg:px-5 lg:py-3 ${
              activeTab === 'profile' ? 'text-indigo-600 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <User size={20} />
            <span className="text-[11px] mt-1 lg:mt-0 lg:text-sm">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}


