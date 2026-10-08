import { useState } from 'react';
import { 
  Bell, 
  BellOff, 
  CheckCheck, 
  Receipt, 
  Sparkles, 
  ArrowRight, 
  Trash2, 
  Clock 
} from 'lucide-react';

export default function ActivityTab({ 
  notifications = [], 
  user, 
  onOpenGroup, 
  onClearNotifications,
  showToast
}) {
  const [isClearing, setIsClearing] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClear = async () => {
    if (typeof onClearNotifications !== 'function' || isClearing) return;
    setIsClearing(true);
    try {
      await onClearNotifications(notifications.map((notification) => notification.id));
    } catch {
      showToast?.('Could not clear notifications. Please try again.', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  // Helper to format timestamps cleanly
  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Helper to render relevant icons based on notification text
  const getNotificationIcon = (message = '') => {
    const lower = message.toLowerCase();
    if (lower.includes('added') || lower.includes('expense') || lower.includes('bill')) {
      return <Receipt size={17} className="text-blue-600" />;
    }
    if (lower.includes('paid') || lower.includes('settle')) {
      return <CheckCheck size={17} className="text-emerald-600" />;
    }
    return <Bell size={17} className="text-indigo-600" />;
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-10 animate-in fade-in duration-300 pb-20">
      
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 right-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Title and Clear Notification Button */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/70 text-blue-700 text-xs font-bold mb-1.5">
            <Sparkles size={12} />
            <span>Activity Feed</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-black bg-blue-600 text-white rounded-full shadow-sm shadow-blue-500/30 animate-pulse">
                {unreadCount} new
              </span>
            )}
          </div>
        </div>

        {/* Clear All Action */}
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isClearing}
            className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50/70 text-slate-600 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 shadow-sm transition-all text-xs font-bold active:scale-95 disabled:cursor-wait disabled:opacity-60"
            title="Clear all notifications"
          >
            <Trash2 size={14} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
            <span>{isClearing ? 'Clearing…' : 'Clear All'}</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          /* Empty State */
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-4 shadow-inner">
              <BellOff size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-xs">
              No recent alerts or group updates. You're completely up to date.
            </p>
          </div>
        ) : (
          notifications
            .slice()
            .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
            .map((notification) => {
              const creatorId = notification.createdBy || notification.senderId || notification.userId;
              const isMe = creatorId === user?.id;
              const creatorName = isMe
                ? 'You'
                : notification.createdByName || notification.senderName || 'Someone';

              let displayMessage = notification.message || '';
              if (!isMe && displayMessage.startsWith('You added')) {
                displayMessage = displayMessage.replace('You added', `${creatorName} added`);
              } else if (isMe && !displayMessage.startsWith('You added') && displayMessage.includes('added')) {
                displayMessage = displayMessage.replace(`${creatorName} added`, 'You added');
              }

              const isUnread = !notification.read;

              return (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (notification.groupId && typeof onOpenGroup === 'function') {
                      onOpenGroup(notification.groupId);
                    }
                  }}
                  className={`group relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
                    isUnread
                      ? 'bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white border-blue-200/90 shadow-sm shadow-blue-500/5'
                      : 'bg-white hover:bg-slate-50/80 border-slate-200/70 shadow-sm'
                  }`}
                >
                  {/* Blue indicator pip for unread alerts */}
                  {isUnread && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                  )}

                  <div className="flex items-start gap-3.5 sm:gap-4">
                    {/* Contextual Icon Container */}
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      {getNotificationIcon(displayMessage)}
                    </div>

                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-sm sm:text-base text-slate-800 font-semibold leading-snug">
                        {displayMessage}
                      </p>
                      
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-100/70">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                          <Clock size={12} />
                          {formatTimestamp(notification.createdAt)}
                        </span>

                        {notification.groupId && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                            <span>Open Space</span>
                            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
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
  );
}