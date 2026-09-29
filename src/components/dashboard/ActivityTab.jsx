import { Bell } from 'lucide-react';

export default function ActivityTab({ notifications = [], user, onOpenGroup }) {
  return (
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
                      <p className="text-sm text-slate-800 font-medium leading-relaxed">{displayMessage}</p>
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
  );
}
