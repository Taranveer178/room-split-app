import {
  Bell,
  LogOut,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import roomsplitIcon from '../../assets/roomsplit-icon.webp';

const ITEMS = [
  { id: 'groups', label: 'Groups', icon: Users },
  { id: 'notifications', label: 'Activity', icon: Bell },
  { id: 'monthly', label: 'Monthly', icon: TrendingUp },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function PrimaryNav({
  activeItem,
  onNavigate,
  unreadCount = 0,
  onLogout,
  desktopOnly = false,
}) {
  return (
    <nav
      className={`${
        desktopOnly ? 'hidden md:flex md:order-first' : 'flex w-full px-1 md:flex'
      } z-40 md:static md:h-full md:w-60 md:flex-shrink-0 md:flex-col md:items-stretch md:rounded-none md:border-r md:border-blue-700/50 md:bg-gradient-to-b md:from-blue-600 md:to-blue-700 md:px-4 md:py-6 md:pb-6 md:shadow-lg lg:w-64`}
    >
      {/* Brand Header (Desktop) */}
      <div className="hidden items-center md:flex">
        <button
          type="button"
          onClick={() => onNavigate('groups')}
          aria-label="Go to RoomSplit home"
          title="RoomSplit home"
          className="flex w-full items-center gap-3 rounded-2xl py-1 text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-md shadow-blue-900/20">
            <img
              src={roomsplitIcon}
              alt="RoomSplit"
              className="h-full w-full object-contain"
            />
          </span>
          <span className="text-xl font-semibold tracking-tight text-white drop-shadow-sm">
            RoomSplit
          </span>
        </button>
      </div>

      {/* Navigation Buttons */}
      <div className="grid h-14 w-full grid-cols-4 items-center md:mt-10 md:h-auto md:grid-cols-1 md:gap-2">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeItem === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex h-full w-full flex-col items-center justify-center gap-1 transition-all md:h-12 md:justify-start md:rounded-2xl md:px-3.5 md:flex-row md:gap-3.5 ${
                isActive
                  ? 'text-indigo-700 md:bg-white md:text-blue-700 md:font-bold md:shadow-md md:shadow-blue-900/15'
                  : 'text-slate-700 hover:text-slate-900 md:text-blue-100 md:hover:bg-blue-500/40 md:hover:text-white'
              }`}
            >
              <span className="relative inline-flex items-center justify-center">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />

                {/* Mobile Notification Dot */}
                {id === 'notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white md:hidden" />
                )}
              </span>

              <span className="text-[10px] font-semibold md:text-sm">{label}</span>

              {/* Desktop Notification Pill */}
              {id === 'notifications' && unreadCount > 0 && (
                <div className="ml-auto hidden items-center justify-center md:flex">
                  <span className="relative flex items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span
                      className={`relative flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black leading-none text-white shadow-sm ring-2 ${
                        isActive ? 'bg-rose-600 ring-white' : 'bg-rose-500 ring-blue-700/60'
                      }`}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Logout Action (Desktop Only styled in #FCAB0A) */}
      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out"
          style={{
            backgroundColor: 'rgba(252, 171, 10, 0.18)',
            borderColor: 'rgba(252, 171, 10, 0.35)',
            color: '#FCAB0A',
          }}
          className="group relative mt-auto hidden h-12 w-full items-center justify-start gap-3 rounded-2xl border px-3.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-[#FCAB0A] hover:bg-[#FCAB0A]/30 hover:text-amber-100 hover:shadow-md hover:shadow-black/10 active:scale-[0.98] md:flex"
        >
          <span
            style={{ backgroundColor: 'rgba(252, 171, 10, 0.22)' }}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#FCAB0A] transition-all group-hover:scale-105 group-hover:bg-[#FCAB0A]/40 group-hover:text-amber-100"
          >
            <LogOut size={18} />
          </span>
          <span className="text-sm font-bold tracking-tight">Log out</span>
        </button>
      )}
    </nav>
  );
}