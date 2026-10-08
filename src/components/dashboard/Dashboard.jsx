import { useState, useEffect } from 'react';
import { LogOut, Plus, UserPlus, Users, Download, ChevronRight, LayoutDashboard } from 'lucide-react';
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
  
  // Animation state for smooth tab transitions
  const [isAnimating, setIsAnimating] = useState(false);

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

  const handleTabSwitch = (tab) => {
    setIsAnimating(true);
    setTimeout(() => {
      setActiveTab(tab);
      onTabChange(tab);
      setIsAnimating(false);
    }, 150);
  };

  return (
    <div className="flex h-screen min-h-screen flex-col relative overflow-hidden bg-slate-50 font-sans md:flex-row">
      
      {/* --- SUBTLE BACKGROUND EFFECTS --- */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-[pulse_8s_ease-in-out_infinite] pointer-events-none z-0"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] bg-cyan-200/30 rounded-full mix-blend-multiply filter blur-[120px] opacity-70 pointer-events-none z-0"></div>

      {/* --- MOBILE STICKY HEADER --- */}
      <header className="relative z-30 flex items-center justify-between px-5 py-4 bg-white/80 backdrop-blur-lg border-b border-slate-200 md:hidden shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100">
            <img src={roomsplitIcon} alt="RoomSplit" className="w-7 h-7 object-contain" />
          </div>
          <span className="text-xl font-extrabold text-slate-800 tracking-tight">RoomSplit</span>
        </div>
        
        {/* Tooltip Wrapper for Logout */}
        <div className="group relative">
          <button 
            onClick={onLogout} 
            className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-100 hover:bg-slate-200 rounded-full" 
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 min-w-0 overflow-y-auto pb-32 relative z-10 md:order-2 md:pb-0 scrollbar-hide">
        <div className={`transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'} h-full`}>
          
          {/* ============================== */}
          {/* TAB 1: GROUPS (Dashboard Home) */}
          {/* ============================== */}
          {activeTab === 'groups' && (
            <div className="mx-auto max-w-6xl p-4 sm:p-6 md:p-8 lg:p-12">
              
              {/* Install Banner */}
              {showInstallBanner && (
                <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-2xl shadow-sm flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-blue-50 shadow-sm">
                      <Download size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm sm:text-base">Get the App</h3>
                      <p className="text-xs sm:text-sm text-slate-500">Add to home screen for quick access.</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleInstallClick}
                    className="bg-blue-600 text-white font-bold text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    Install
                  </button>
                </div>
              )}

              {/* Welcome & Stats Section */}
              <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                <div>
                  <p className="mb-1.5 text-xs sm:text-sm font-bold uppercase tracking-[0.15em] text-blue-600">Your Workspace</p>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                    Welcome back, <br className="hidden sm:block"/> {user.username}
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-slate-500 max-w-md">Manage your shared spaces and keep every expense in sync effortlessly.</p>
                </div>
                
                {/* Stats Widget */}
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 sm:px-8 sm:py-5 flex items-center justify-between sm:flex-col sm:justify-center shadow-sm w-full sm:w-auto hover:shadow-md transition-shadow">
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0 sm:mb-1">Total Groups</p>
                  <p className="text-2xl sm:text-4xl font-black text-slate-800">{myGroups.length}</p>
                </div>
              </div>

              {/* Action Buttons (Side by Side on mobile) */}
              <div className="mb-10 flex gap-3 sm:gap-6 w-full">
                
                {/* Create Group Button with Tooltip */}
                <div className="flex-1 group/btn relative">
                  <button onClick={onCreateGroup} className="w-full relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 rounded-2xl sm:rounded-3xl border border-transparent bg-blue-600 p-4 sm:p-6 text-white shadow-md shadow-blue-600/20 transition-all hover:-translate-y-1 hover:bg-blue-700 active:scale-[0.98]">
                    <span className="flex h-10 w-10 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-white/20 shadow-inner group-hover/btn:scale-110 transition-transform duration-300">
                      <Plus size={22} className="sm:w-7 sm:h-7" />
                    </span>
                    <span className="text-left">
                      <span className="block text-sm sm:text-xl font-bold leading-tight">Create <span className="hidden sm:inline">a group</span></span>
                      <span className="mt-1 hidden sm:block text-sm text-blue-100">Start splitting together</span>
                    </span>
                  </button>
                  {/* Theme-matching Tooltip (Visible only on desktop hover) */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 invisible opacity-0 md:group-hover/btn:visible md:group-hover/btn:opacity-100 transition-all duration-200 bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xl border border-white/10 whitespace-nowrap z-50 pointer-events-none translate-y-2 md:group-hover/btn:translate-y-0">
                    Create a new workspace
                    {/* Tooltip Triangle pointer */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900/95"></div>
                  </div>
                </div>
                
                {/* Join Group Button with Tooltip */}
                <div className="flex-1 group/btn relative">
                  <button onClick={onJoinGroup} className="w-full relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 text-slate-700 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-md active:scale-[0.98]">
                    <span className="flex h-10 w-10 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 group-hover/btn:bg-blue-50 group-hover/btn:text-blue-600 group-hover/btn:border-blue-100 group-hover/btn:scale-110 transition-all duration-300">
                      <UserPlus size={22} className="sm:w-7 sm:h-7" />
                    </span>
                    <span className="text-left">
                      <span className="block text-sm sm:text-xl font-bold leading-tight">Join <span className="hidden sm:inline">a group</span></span>
                      <span className="mt-1 hidden sm:block text-sm text-slate-500">Connect with your people</span>
                    </span>
                  </button>
                  {/* Theme-matching Tooltip (Visible only on desktop hover) */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 invisible opacity-0 md:group-hover/btn:visible md:group-hover/btn:opacity-100 transition-all duration-200 bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xl border border-white/10 whitespace-nowrap z-50 pointer-events-none translate-y-2 md:group-hover/btn:translate-y-0">
                    Join via Invite Code
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900/95"></div>
                  </div>
                </div>

              </div>

              {/* Groups List */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                    <LayoutDashboard size={20} className="sm:w-6 sm:h-6 text-blue-600" /> Your Spaces
                  </h2>
                </div>
              </div>
              
              {myGroups.length === 0 ? (
                <div className="rounded-[1.5rem] sm:rounded-[2rem] border border-dashed border-slate-300 bg-white/50 px-6 py-12 sm:py-16 text-center">
                  <div className="mx-auto mb-4 sm:mb-5 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-[1.5rem] sm:rounded-[2rem] bg-slate-100 text-slate-400">
                    <Users size={32} className="sm:w-9 sm:h-9" />
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-slate-700 mb-1.5 sm:mb-2">You aren’t in any groups yet.</p>
                  <p className="text-sm sm:text-base text-slate-500 max-w-sm mx-auto">Create a group or join one using an invite code to get started.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                  {myGroups.map((group) => (
                    <div 
                      key={group.id} 
                      onClick={() => onOpenGroup(group.id)} 
                      className="group cursor-pointer rounded-[1.25rem] sm:rounded-[2rem] bg-white border border-slate-100 p-4 sm:p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-xl sm:text-2xl border border-blue-200/50 shadow-inner">
                            {group.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-base sm:text-lg leading-tight">{group.name}</h3>
                            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">{group.members.length} Members</p>
                          </div>
                        </div>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                          <ChevronRight size={18} className="sm:w-5 sm:h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================== */}
          {/* OTHER TABS */}
          {/* ============================== */}
          {activeTab !== 'groups' && (
            <div className="h-full p-0 sm:p-4 md:p-8">
              {activeTab === 'notifications' && (
                <ActivityTab notifications={notifications} user={user} onOpenGroup={onOpenGroup} />
              )}
              {activeTab === 'monthly' && (
                <MonthlyAnalyticsTab user={user} expenses={expenses} groups={groups} />
              )}
              {activeTab === 'profile' && (
                <ProfileTabView 
                  key={[user.id, user.username, user.email, user.upiId, user.photoDataUrl].join(':')}
                  user={user} 
                  onUpdateUser={onUpdateUser} 
                  showToast={showToast} 
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* --- FLOATING LIQUID GLASS PILL (Mobile Bottom Nav) --- */}
      {/* Centered on mobile via left-1/2, max width controlled so it doesn't break */}
      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-[100] w-[calc(100%-2rem)] max-w-[26rem] -translate-x-1/2 md:static md:order-1 md:h-full md:w-16 md:max-w-none md:translate-x-0 md:flex-shrink-0 lg:w-20">
        
        {/* 
          Glass Wrapper: Added bg-slate-900/10 for dark/blue tint, 
          p-1.5 so PrimaryNav isn't clipped against the curved border 
        */}
        <div className="rounded-full border border-blue-500/20 bg-slate-900/10 p-1.5 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.3)] backdrop-blur-2xl md:h-full md:rounded-none md:border-none md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
          
          <PrimaryNav
            activeItem={activeTab}
            onNavigate={handleTabSwitch}
            unreadCount={unreadNotifications.length}
            onLogout={onLogout}
          />
          
        </div>
      </div>

    </div>
  );
}