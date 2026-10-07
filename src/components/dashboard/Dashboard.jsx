import { useState, useEffect } from 'react';
import { LogOut, Plus, UserPlus, Users, Download, ChevronRight } from 'lucide-react';
import roomsplitIcon from '../../assets/roomsplit-icon.webp';
import { Card } from '../common/UI';
import PrimaryNav from '../common/PrimaryNav';
import { requestNotificationPermission } from '../../utils/notifications';
import ActivityTab from './ActivityTab';
import MonthlyAnalyticsTab from './MonthlyAnalyticsTab';
import ProfileTabView from './ProfileTab';


export default function Dashboard({ user, groups, notifications, expenses = [], onLogout, onOpenGroup, onCreateGroup, onJoinGroup, onUpdateUser, onMarkNotificationsRead, onTabChange, initialTab = 'groups', showToast }) {
  const [activeTab, setActiveTab] = useState(initialTab);
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
      <header className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-30 flex-shrink-0 lg:hidden">
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
      <main className="flex-1 min-w-0 overflow-y-auto pb-24 relative lg:order-2 lg:pb-0">
        
        {/* ============================== */}
        {/* TAB 1: GROUPS (Dashboard Home) */}
        {/* ============================== */}
        {activeTab === 'groups' && (
          <div className="mx-auto max-w-6xl p-5 animate-in fade-in duration-200 lg:p-12 xl:p-14">
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

            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Your workspace</p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back, {user.username}</h1>
                <p className="mt-2 text-sm text-slate-500">Manage your shared spaces and keep every expense in sync.</p>
              </div>
              <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm sm:block">
                <p className="text-xs font-medium text-slate-400">Your groups</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">{myGroups.length}</p>
              </div>
            </div>

            <div className="mb-10 grid grid-cols-2 gap-4">
              <button onClick={onCreateGroup} className="flex min-h-28 items-center justify-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-600 p-5 text-white shadow-lg shadow-indigo-200/50 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 active:scale-[0.98]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><Plus size={22} /></span>
                <span className="text-left"><span className="block font-semibold">Create a group</span><span className="mt-1 block text-xs text-indigo-100">Start splitting together</span></span>
              </button>
              <button onClick={onJoinGroup} className="flex min-h-28 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md active:scale-[0.98]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><UserPlus size={22} /></span>
                <span className="text-left"><span className="block font-semibold">Join a group</span><span className="mt-1 block text-xs text-slate-500">Connect with your people</span></span>
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Your groups</h2>
                <p className="mt-1 text-sm text-slate-500">Shared spaces you’re part of</p>
              </div>
              {myGroups.length > 0 && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{myGroups.length} total</span>}
            </div>
            
            {myGroups.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100"><Users size={26} className="text-slate-400" /></div>
                <p className="font-semibold text-slate-700">You aren’t in any groups yet.</p>
                <p className="mt-1 text-sm text-slate-500">Create a group or join one to get started.</p>
              </div>
            ) : (
              <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                {myGroups.map((group) => (
                  <Card key={group.id} onClick={() => onOpenGroup(group.id)} className="p-5 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer">
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

      <PrimaryNav
        activeItem={activeTab}
        onNavigate={(tab) => {
          setActiveTab(tab);
          onTabChange(tab);
        }}
        unreadCount={unreadNotifications.length}
        onLogout={onLogout}
      />
    </div>
  );
}
