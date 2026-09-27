import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Toast({ toast }) {
  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-[74px] left-5 right-5 max-w-sm mx-auto z-50 animate-in slide-in-from-bottom-3 duration-200 pointer-events-none">
      <div
        className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-medium border backdrop-blur-md pointer-events-auto ${
          isError
            ? 'bg-rose-900/95 border-rose-800 text-white'
            : 'bg-slate-900/95 border-slate-800 text-white'
        }`}
      >
        {isError ? (
          <AlertCircle size={18} className="text-rose-400 flex-shrink-0" />
        ) : (
          <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
        )}
        <span className="truncate">{toast.message}</span>
      </div>
    </div>
  );
}