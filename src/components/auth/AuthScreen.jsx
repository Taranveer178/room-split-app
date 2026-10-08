import React, { useState, useEffect } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import roomsplitIcon from '../../assets/roomsplit-icon.webp';
import { Button, Input } from '../common/UI';

export default function AuthScreen({ users, onSaveUser, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Animation state for smooth mount
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    setIsVisible(true);
  }, []);

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
      createdAt: new Date().toISOString() 
    };
    await onSaveUser(newUser);
    onLogin(newUser.id);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 font-sans">
      
      {/* --- BACKGROUND EFFECTS --- */}
      {/* Blurred orbs to enhance the glassmorphism effect */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-400 rounded-full mix-blend-overlay filter blur-[100px] opacity-70 animate-[pulse_6s_ease-in-out_infinite]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-indigo-500 rounded-full mix-blend-overlay filter blur-[120px] opacity-80"></div>
      <div className="absolute top-[20%] right-[20%] w-64 h-64 bg-blue-300 rounded-full mix-blend-overlay filter blur-[80px] opacity-50"></div>

      {/* --- IOS GLASSMORPHISM CARD --- */}
      <div className={`relative z-10 w-full max-w-md mx-4 p-8 sm:p-10 transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'} bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.2)] rounded-[2rem]`}>
        
        {/* Header & Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-5 bg-white/90 rounded-2xl p-2 shadow-lg border border-white flex items-center justify-center backdrop-blur-md hover:scale-105 transition-transform duration-300">
            <img src={roomsplitIcon} alt="RoomSplit Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">RoomSplit</h1>
          <p className="text-slate-600 mt-2 font-medium">
            {isLogin ? 'Sign in to manage your expenses.' : 'Create an account to get started.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50/90 backdrop-blur-sm text-red-600 p-4 rounded-xl text-sm flex items-start gap-2 border border-red-200 animate-[pulse_0.5s_ease-in-out]">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          
          <div className="space-y-1 group">
            <div className="transition-all duration-300 transform group-focus-within:-translate-y-1">
              <Input 
                label="Username" 
                placeholder="e.g. Taran" 
                value={username} 
                onChange={(event) => setUsername(event.target.value)} 
                autoCapitalize="none" 
                required 
              />
            </div>
          </div>

          <div className="space-y-1 relative group">
            <div className="transition-all duration-300 transform group-focus-within:-translate-y-1">
              <Input 
                label="Password" 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••" 
                value={password} 
                onChange={(event) => setPassword(event.target.value)} 
                required 
              />
            </div>
            
            {/* Professional Animated Eye Toggle */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 bottom-[0.8rem] p-1 text-slate-500 hover:text-blue-600 transition-colors focus:outline-none z-10 flex items-center justify-center"
              title={showPassword ? "Hide password" : "Show password"}
            >
              <div className="relative w-5 h-5">
                {/* Closed Eye (EyeOff) */}
                <EyeOff 
                  size={20} 
                  className={`absolute inset-0 transition-all duration-300 transform ${
                    showPassword ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                  }`} 
                />
                {/* Open Eye (Eye) */}
                <Eye 
                  size={20} 
                  className={`absolute inset-0 transition-all duration-300 transform ${
                    showPassword ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                  }`} 
                />
              </div>
            </button>
          </div>

          <Button 
            type="submit" 
            className="w-full mt-6 h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300 rounded-xl border border-blue-500/50"
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>

        {/* Toggle between Sign In / Sign Up */}
        <div className="mt-8 text-center">
          <button 
            onClick={() => { 
              setIsLogin(!isLogin); 
              setError(''); 
              setPassword(''); 
            }} 
            className="text-slate-600 font-medium transition-colors inline-flex items-center gap-2 group"
          >
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <span className="text-blue-700 font-bold group-hover:text-blue-800 group-hover:underline transition-all">
              {isLogin ? "Sign Up" : 'Sign In'}
            </span>
          </button>
        </div>
        
      </div>
    </div>
  );
}