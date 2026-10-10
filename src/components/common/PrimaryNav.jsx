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
    <nav className={`${desktopOnly ? 'hidden md:flex md:order-first' : 'flex w-full px-1 md:flex'} z-40 md:static md:h-full md:w-60 md:flex-shrink-0 md:flex-col md:items-stretch md:rounded-none md:border-r md:border-t-0 md:bg-white md:px-4 md:py-6 md:pb-6 md:shadow-none lg:w-64`}>
      <div className="hidden items-center md:flex">
        <button
          type="button"
          onClick={() => onNavigate('groups')}
          aria-label="Go to RoomSplit home"
          title="RoomSplit home"
          className="flex w-full items-center gap-3 rounded-2xl py-1 text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <img
            src={roomsplitIcon}
            alt="RoomSplit"
            className="h-10 w-10 rounded-xl object-contain shadow-sm"
          />
          <span className="text-lg font-extrabold tracking-tight text-slate-900">RoomSplit</span>
        </button>
      </div>

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
              className={`group relative flex h-full w-full flex-col items-center justify-center gap-1 transition-colors md:h-12 md:justify-start md:rounded-xl md:px-3 md:flex-row md:gap-3 ${
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
              <span className="text-[10px] font-semibold md:text-sm md:font-semibold">{label}</span>
            </button>
          );
        })}
      </div>

      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out"
          className="group relative mt-auto hidden h-12 w-full items-center justify-start gap-3 rounded-xl px-3 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 md:flex"
        >
          <LogOut size={20} />
          <span className="text-sm font-semibold">Log out</span>
        </button>
      )}
    </nav>
  );
}
