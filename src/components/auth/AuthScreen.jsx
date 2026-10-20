import { useState, useEffect, useRef } from 'react';
import { AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import roomsplitIcon from '../../assets/roomsplit-icon.webp';
import { Button } from '../common/UI';
import { auth } from '../../firebase';

export default function AuthScreen({ users = [], onLoadUsers, onSaveUser, onLogin }) {
  // --- STATE ---
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- REFS ---
  const mobileIdentifierRef = useRef(null);
  const desktopIdentifierRef = useRef(null);

  // Auto-focus logic for the mobile slide-up sheet
  useEffect(() => {
    if (isSheetOpen) {
      const timer = setTimeout(() => {
        if (mobileIdentifierRef.current) {
          mobileIdentifierRef.current.focus();
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isSheetOpen, isLogin]);

  // Optionally auto-focus desktop on mount
  useEffect(() => {
    // Desktop layout is hidden on mobile via CSS, but the DOM node exists.
    // We check window width to prevent stealing focus on mobile load.
    if (window.innerWidth >= 768 && desktopIdentifierRef.current) {
      desktopIdentifierRef.current.focus();
    }
  }, []);

  // --- HANDLERS ---
  const handleOpenSheet = (mode) => {
    setIsLogin(mode === 'login');
    setIsForgotPassword(false);
    setError('');
    setNotice('');
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    setError('');
    setNotice('');
  };

  const getAuthErrorMessage = (authError) => {
    switch (authError.code) {
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'auth/user-disabled':
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'Invalid email/username or password.';
      case 'auth/email-already-in-use':
        return 'An account already uses this email. Please sign in.';
      case 'auth/weak-password':
        return 'Choose a password with at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Wait a little and try again.';
      default:
        return 'Could not complete the request. Please try again.';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);
    const cleanIdentifier = identifier.trim();
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    try {
      const authUsers = isForgotPassword ? users : await onLoadUsers();

      if (!auth) {
        if (isForgotPassword) {
          throw new Error('Password reset is unavailable without a Firebase connection.');
        }
        if (isLogin) {
          const localUser = authUsers.find((item) => (
            item.email?.toLowerCase() === cleanIdentifier.toLowerCase()
            || item.username?.toLowerCase() === cleanIdentifier.toLowerCase()
          ));
          if (!localUser || localUser.password !== password) {
            setError('Invalid email/username or password.');
            return;
          }
          onLogin(localUser.id);
          return;
        }
        if (cleanUsername.length < 3) {
          setError('Username must be at least 3 characters.');
          return;
        }
        if (!cleanEmail) {
          setError('Email is required to create an account.');
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          return;
        }
        if (authUsers.some((item) => (
          item.username?.toLowerCase() === cleanUsername.toLowerCase()
          || item.email?.toLowerCase() === cleanEmail
        ))) {
          setError('An account already uses this username or email. Please sign in.');
          return;
        }
        const localUser = {
          id: `usr_${Date.now()}`,
          username: cleanUsername,
          email: cleanEmail,
          password,
          createdAt: new Date().toISOString(),
        };
        await onSaveUser(localUser);
        onLogin(localUser.id);
        return;
      }

      if (isForgotPassword) {
        if (!cleanIdentifier.includes('@')) {
          setError('Enter the email address for your account.');
          return;
        }
        await sendPasswordResetEmail(auth, cleanIdentifier.toLowerCase());
        setIsForgotPassword(false);
        setIsLogin(true);
        setIdentifier(cleanIdentifier);
        setNotice('If an account uses this email, a password reset link is on its way.');
        return;
      }

      if (isLogin) {
        const matchedUser = authUsers.find((item) => (
          item.email?.toLowerCase() === cleanIdentifier.toLowerCase()
          || item.username?.toLowerCase() === cleanIdentifier.toLowerCase()
        ));
        if (!matchedUser) {
          const legacyUser = authUsers.find(
            (item) => item.username?.toLowerCase() === cleanIdentifier.toLowerCase()
          );
          if (!legacyUser || legacyUser.password !== password) {
            setError('Invalid email/username or password.');
            return;
          }
          onLogin(legacyUser.id);
          return;
        }

        const userEmail = matchedUser.email?.toLowerCase();
        if (!userEmail) {
          if (matchedUser.password !== password) {
            setError('Invalid email/username or password.');
            return;
          }
          onLogin(matchedUser.id);
          return;
        }

        if (matchedUser.password === password && password.length < 6) {
          onLogin(matchedUser.id);
          return;
        }

        if (matchedUser.password === password) {
          try {
            await createUserWithEmailAndPassword(auth, userEmail, password);
            await onSaveUser({ ...matchedUser, password: '' });
            onLogin(matchedUser.id);
            return;
          } catch (migrationError) {
            if (migrationError.code !== 'auth/email-already-in-use') throw migrationError;
          }
        }

        await signInWithEmailAndPassword(auth, userEmail, password);
        if (matchedUser.password) await onSaveUser({ ...matchedUser, password: '' });
        onLogin(matchedUser.id);
        return;
      }

      if (cleanUsername.length < 3) {
        setError('Username must be at least 3 characters.');
        return;
      }
      if (!cleanEmail) {
        setError('Email is required to create an account.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (authUsers.some((item) => item.username?.toLowerCase() === cleanUsername.toLowerCase())) {
        setError('Username already taken. Please sign in.');
        return;
      }
      if (authUsers.some((item) => item.email?.toLowerCase() === cleanEmail)) {
        setError('An account already uses this email. Please sign in.');
        return;
      }

      const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const newUser = {
        id: credential.user.uid,
        username: cleanUsername,
        email: cleanEmail,
        createdAt: new Date().toISOString(),
      };
      try {
        await onSaveUser(newUser);
      } catch (saveError) {
        await deleteUser(credential.user);
        await signInAnonymously(auth);
        throw saveError;
      }
      onLogin(newUser.id);
    } catch (authError) {
      console.error('Authentication request failed:', authError);
      setError(authError.code ? getAuthErrorMessage(authError) : authError.message);
    } finally {
      setIsSubmitting(false);
    }
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
      {notice && (
        <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-700">
          {notice}
        </p>
      )}

      {isLogin || isForgotPassword ? (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">
            {isForgotPassword ? 'Email address' : 'Email or username'}
          </label>
          <input
            ref={inputRef}
            type={isForgotPassword ? 'email' : 'text'}
            placeholder={isForgotPassword ? 'you@example.com' : 'you@example.com or username'}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete={isForgotPassword ? 'email' : 'username'}
            enterKeyHint="next"
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all placeholder:text-slate-400 shadow-sm"
            required
          />
        </div>
      ) : (
        <>
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
              autoComplete="username"
              enterKeyHint="next"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all placeholder:text-slate-400 shadow-sm"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              enterKeyHint="next"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all placeholder:text-slate-400 shadow-sm"
              required
            />
          </div>
        </>
      )}

      {!isForgotPassword && (
        <div className="flex flex-col gap-1.5 relative">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
            {isLogin && (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError('');
                  setNotice('');
                }}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={isLogin ? 'Your password' : 'At least 6 characters'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              enterKeyHint="done"
              minLength={!isLogin && !isForgotPassword ? 6 : undefined}
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
      )}

      <Button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full mt-2 h-[52px] text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 rounded-xl active:scale-[0.98] transition-all"
      >
        {isSubmitting
          ? 'Please wait...'
          : isForgotPassword
            ? 'Send reset link'
            : isLogin
              ? 'Continue'
              : 'Sign Up'}
      </Button>
      
      {/* Toggle Sign In / Sign Up */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            if (isForgotPassword) {
              setIsForgotPassword(false);
            } else {
              setIsLogin(!isLogin);
            }
            setError('');
            setNotice('');
          }}
          className="text-slate-500 font-medium text-sm inline-flex items-center gap-1.5 hover:text-slate-700 transition-colors"
        >
          {isForgotPassword ? 'Remember your password?' : isLogin ? "Don't have an account?" : 'Already have an account?'}
          <span className="text-blue-600 font-bold hover:underline">
            {isForgotPassword ? 'Sign in' : isLogin ? 'Sign Up' : 'Login'}
          </span>
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
              {isForgotPassword
                ? 'Reset your password'
                : isLogin
                  ? 'Login to your account'
                  : 'Create new account'}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-none px-6 pt-6 pb-12 bg-slate-50/50">
            <form onSubmit={handleSubmit} className="w-full">
              {renderAuthForm(mobileIdentifierRef)}
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
                {isForgotPassword ? 'Reset your password' : isLogin ? 'Welcome back' : 'Get started'}
              </h2>
              <p className="text-slate-500 mt-2 font-medium">
                {isForgotPassword
                  ? 'We’ll email you a secure password reset link.'
                  : isLogin
                    ? 'Please enter your details to sign in.'
                    : 'Create your account in seconds.'}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="w-full">
              {renderAuthForm(desktopIdentifierRef)}
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}