export const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}>
    {children}
  </div>
);

export const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }) => {
  const baseStyle = 'px-4 py-3.5 sm:py-3 rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed text-base';
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200',
    outline: 'border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100',
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{children}</button>;
};

export const Input = ({ label, error, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>}
    <input className={`w-full px-4 py-3.5 text-base border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-slate-50 ${error ? 'border-red-300 bg-red-50' : 'border-slate-200'}`} {...props} />
    {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
  </div>
);

export const NavItem = ({ icon: Icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors lg:h-12 lg:flex-row lg:justify-start lg:gap-3 lg:space-y-0 lg:px-5 ${isActive ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
    <span className="text-[10px] lg:text-sm">{label}</span>
  </button>
);