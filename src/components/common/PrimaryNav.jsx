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
    <nav className={`${desktopOnly ? 'hidden lg:flex' : 'absolute bottom-0 w-full border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:flex'} z-40 lg:static lg:order-1 lg:h-full lg:w-20 lg:flex-shrink-0 lg:flex-col lg:items-center lg:border-r lg:border-t-0 lg:bg-white lg:px-3 lg:py-5 lg:pb-5`}>
      <div className="hidden items-center justify-center lg:flex">
        <img
          src={roomsplitIcon}
          alt="RoomSplit"
          className="h-11 w-11 rounded-2xl object-contain shadow-sm"
        />
      </div>

      <div className="grid h-16 w-full grid-cols-4 items-center lg:mt-8 lg:h-auto lg:grid-cols-1 lg:gap-2">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeItem === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex h-full w-full flex-col items-center justify-center gap-1 transition-colors lg:h-12 lg:rounded-2xl ${
                isActive
                  ? 'text-indigo-600 lg:bg-indigo-50'
                  : 'text-slate-400 hover:text-slate-700 lg:hover:bg-slate-50'
              }`}
            >
              <span className="relative inline-flex items-center justify-center">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {id === 'notifications' && unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </span>
              <span className="text-[10px] lg:hidden">{label}</span>
              <span className="pointer-events-none invisible absolute left-[calc(100%+12px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100 lg:block">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out"
          className="group relative mt-auto hidden h-12 w-full items-center justify-center rounded-2xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 lg:flex"
        >
          <LogOut size={20} />
          <span className="pointer-events-none invisible absolute left-[calc(100%+12px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100">
            Log out
          </span>
        </button>
      )}
    </nav>
  );
}
