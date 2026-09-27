import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`absolute top-4 left-4 right-4 p-4 rounded-xl shadow-lg z-50 flex items-center gap-3 animate-in slide-in-from-top-5 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}>
      {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
      <span className="font-medium text-sm">{toast.message}</span>
    </div>
  );
}