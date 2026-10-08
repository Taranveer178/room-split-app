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
    <nav className={`${desktopOnly ? 'hidden md:flex md:order-first' : 'flex w-full px-1 md:flex'} z-40 md:static md:h-full md:w-16 md:flex-shrink-0 md:flex-col md:items-center md:rounded-none md:border-r md:border-t-0 md:bg-white md:px-2 md:py-5 md:pb-5 md:shadow-none lg:w-20 lg:px-3`}>
      <div className="hidden items-center justify-center md:flex">
        <button
          type="button"
          onClick={() => onNavigate('groups')}
          aria-label="Go to RoomSplit home"
          title="RoomSplit home"
          className="rounded-2xl transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <img
            src={roomsplitIcon}
            alt="RoomSplit"
            className="h-11 w-11 rounded-2xl object-contain shadow-sm"
          />
        </button>
      </div>

      <div className="grid h-14 w-full grid-cols-4 items-center md:mt-8 md:h-auto md:grid-cols-1 md:gap-2">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeItem === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex h-full w-full flex-col items-center justify-center gap-1 transition-colors md:h-12 md:rounded-2xl ${
                isActive
                  ? 'text-indigo-700 md:text-indigo-600 md:bg-indigo-50'
                  : 'text-slate-700 hover:text-slate-900 md:text-slate-400 md:hover:text-slate-700 md:hover:bg-slate-50'
              }`}
            >
              <span className="relative inline-flex items-center justify-center">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {id === 'notifications' && unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </span>
              <span className="text-[10px] font-semibold md:hidden">{label}</span>
              <span className="pointer-events-none invisible absolute left-[calc(100%+12px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100 md:block">
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
          className="group relative mt-auto hidden h-12 w-full items-center justify-center rounded-2xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 md:flex"
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
