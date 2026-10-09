import { useEffect } from 'react';
import { ArrowUpRight, MessageCircle, X } from 'lucide-react';

export default function IncomingChatAlert({ message, sender, group, onOpen, onClose }) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 7000);
    return () => window.clearTimeout(timeout);
  }, [message.id, onClose]);

  const preview = message.text?.trim()
    || (message.attachmentName ? `Sent ${message.attachmentName}` : 'Sent an attachment');
  const senderName = message.senderName || sender?.username || 'Roommate';

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[140] mx-auto max-w-sm animate-in slide-in-from-top-3 fade-in duration-200 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-[min(24rem,calc(100vw-2rem))]"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.22)]">
        <div className="flex items-start gap-3 p-3.5">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-extrabold text-blue-700">
            {sender?.photoDataUrl ? (
              <img src={sender.photoDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              senderName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700">
              <MessageCircle size={13} />
              <span className="truncate">{group?.name || 'Group chat'}</span>
            </div>
            <p className="mt-0.5 truncate text-sm font-extrabold text-slate-900">{senderName}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600">{preview}</p>
            <button
              type="button"
              onClick={onOpen}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800"
            >
              Open chat <ArrowUpRight size={13} />
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss chat notification"
            className="-mr-1 -mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
