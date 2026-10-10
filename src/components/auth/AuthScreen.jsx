import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import roomsplitIcon from '../../assets/roomsplit-icon.webp';
import { Button } from '../common/UI';

export default function AuthScreen({ users = [], onSaveUser, onLogin }) {
  // --- STATE ---
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // --- REFS ---
  const mobileUsernameRef = useRef(null);
  const desktopUsernameRef = useRef(null);

  // Auto-focus logic for the mobile slide-up sheet
  useEffect(() => {
    if (isSheetOpen) {
      const timer = setTimeout(() => {
        if (mobileUsernameRef.current) {
          mobileUsernameRef.current.focus();
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isSheetOpen, isLogin]);

  // Optionally auto-focus desktop on mount
  useEffect(() => {
    // Desktop layout is hidden on mobile via CSS, but the DOM node exists.
    // We check window width to prevent stealing focus on mobile load.
    if (window.innerWidth >= 768 && desktopUsernameRef.current) {
      desktopUsernameRef.current.focus();
    }
  }, []);

  // --- HANDLERS ---
  const handleOpenSheet = (mode) => {
    setIsLogin(mode === 'login');
    setError('');
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const cleanUser = username.trim();

    if (isLogin) {
      const user = users.find(
        (item) => item.username.toLowerCase() === cleanUser.toLowerCase() && item.password === password
      );
      if (user) onLogin(user.id);
      else setError('Invalid username or password.');
      return;
    }

    if (cleanUser.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 3) {
      setError('Password must be at least 3 characters.');
      return;
    }
    if (users.some((item) => item.username.toLowerCase() === cleanUser.toLowerCase())) {
      setError('Username already taken. Please sign in.');
      return;
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      username: cleanUser,
      password,
      createdAt: new Date().toISOString(),
    };
    await onSaveUser(newUser);
    onLogin(newUser.id);
  };

  // --- REUSABLE FORM CONTENT ---
  // Extracted to avoid duplicating input JSX for mobile and desktop views
  const renderAuthForm = (inputRef) => (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto">
      {error && (
        <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium flex items-start gap-2.5 border border-red-100">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Username */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
        <input
          ref={inputRef}
          type="text"
          placeholder="e.g. taran"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          enterKeyHint="next"
          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all placeholder:text-slate-400 shadow-sm"
          required
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5 relative">
        <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            enterKeyHint="done"
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all placeholder:text-slate-400 shadow-sm pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 focus:outline-none transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full mt-2 h-[52px] text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 rounded-xl active:scale-[0.98] transition-all"
      >
        {isLogin ? 'Continue' : 'Sign Up'}
      </Button>
      
      {/* Toggle Sign In / Sign Up */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="text-slate-500 font-medium text-sm inline-flex items-center gap-1.5 hover:text-slate-700 transition-colors"
        >
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <span className="text-blue-600 font-bold hover:underline">{isLogin ? 'Sign Up' : 'Login'}</span>
        </button>
      </div>
    </div>
  );

  return (
    /* Outer container handles both viewport sizes cleanly */
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-950 font-sans flex items-center justify-center md:p-6 relative overflow-hidden">
      
      {/* Global Ambient Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-400 rounded-full mix-blend-overlay filter blur-[100px] opacity-60 md:opacity-30"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-indigo-500 rounded-full mix-blend-overlay filter blur-[120px] opacity-0 md:opacity-40"></div>

      {/* =========================================================================
          MOBILE LAYOUT (Swiggy Style: Hidden on md and up)
          ========================================================================= */}
      <div className="md:hidden fixed inset-0 flex flex-col w-full h-full overflow-hidden">
        
        {/* Mobile Landing View */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="w-20 h-20 bg-white rounded-[1.25rem] p-2.5 shadow-xl shadow-black/10 mb-6 flex items-center justify-center animate-[fadeIn_0.5s_ease-out]">
              <img src={roomsplitIcon} alt="RoomSplit Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight max-w-xs animate-[fadeIn_0.6s_ease-out]">
              One app for your shared expenses!
            </h1>
            <p className="text-blue-100 mt-4 text-lg font-medium max-w-sm animate-[fadeIn_0.7s_ease-out]">
              Split bills, track balances, and settle up in minutes.
            </p>
          </div>

          {/* Bottom Action Bar */}
          <div className="relative z-20 bg-white w-full rounded-t-[2rem] pt-8 pb-10 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] flex flex-col gap-3">
            <Button 
              onClick={() => handleOpenSheet('login')}
              className="w-full h-[52px] text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 rounded-xl"
            >
              Login
            </Button>
            <div className="text-center mt-2">
              <span className="text-slate-500 font-medium text-sm">New to RoomSplit? </span>
              <button 
                onClick={() => handleOpenSheet('signup')}
                className="text-blue-600 font-bold text-sm hover:underline"
              >
                Create an account
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Slide-Up Sheet */}
        <div 
          className={`fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-300 ease-in-out ${
            isSheetOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="flex items-center px-4 py-4 border-b border-slate-100 bg-white shadow-sm z-10">
            <button 
              onClick={closeSheet}
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
            >
              <ArrowLeft size={24} />
            </button>
            <h2 className="ml-3 text-lg font-bold text-slate-800">
              {isLogin ? 'Login to your account' : 'Create new account'}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-none px-6 pt-6 pb-12 bg-slate-50/50">
            <form onSubmit={handleSubmit} className="w-full">
              {renderAuthForm(mobileUsernameRef)}
            </form>
          </div>
        </div>

      </div>

      {/* =========================================================================
          DESKTOP LAYOUT (Split SaaS Card: Hidden on mobile)
          ========================================================================= */}
      <div className="hidden md:flex relative z-10 w-full max-w-[950px] min-h-[580px] bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
        
        {/* Left Side: Branding Banner */}
        <div className="w-[45%] bg-blue-600 p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-400 rounded-full mix-blend-screen opacity-30 blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500 rounded-full mix-blend-screen opacity-50 blur-3xl"></div>

          <div className="relative z-10 mt-4">
            <div className="w-16 h-16 bg-white/95 rounded-2xl p-2 mb-8 shadow-xl border border-white/20">
              <img src={roomsplitIcon} alt="RoomSplit Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-4xl font-extrabold text-white leading-[1.15] tracking-tight mb-4">
              Split bills.<br />Track expenses.<br />Settle up.
            </h2>
            <p className="text-blue-100/90 text-lg font-medium pr-4 leading-relaxed">
              The smartest way to manage shared living without the financial stress.
            </p>
          </div>

          <div className="relative z-10 pb-4">
            <p className="text-blue-200/80 text-sm font-medium">© {new Date().getFullYear()} RoomSplit Inc.</p>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-[55%] bg-white p-12 flex flex-col justify-center items-center">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                {isLogin ? 'Welcome back' : 'Get started'}
              </h2>
              <p className="text-slate-500 mt-2 font-medium">
                {isLogin ? 'Please enter your details to sign in.' : 'Create your account in seconds.'}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="w-full">
              {renderAuthForm(desktopUsernameRef)}
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}