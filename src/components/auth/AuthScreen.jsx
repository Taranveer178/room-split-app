import { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import roomsplitIcon from '../../assets/roomsplit-icon.webp';
import { Button, Input } from '../common/UI';

export default function AuthScreen({ users, onSaveUser, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // New state for toggling password visibility
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen w-full flex relative bg-slate-900 overflow-hidden">
      
      {/* 1. Full Screen Background Layer */}
      <div className="absolute inset-0 z-0">
        {/* You can swap this out with any GIF or Image link you like */}
        <img 
          src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
          alt="Modern Apartment Background" 
          className="w-full h-full object-cover opacity-80"
        />
        {/* Dark gradient overlay so the image isn't too distracting */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/60 via-slate-900/30 to-slate-900/10"></div>
      </div>

      {/* 2. Form Container Wrapper (Forces the box to the right side on Desktop) */}
      <div className="relative z-10 w-full flex justify-end min-h-screen">
        
        {/* 3. The Form Card (Vertically centered, anchored to right) */}
        <div className="w-full md:w-[500px] bg-white/95 backdrop-blur-lg shadow-2xl flex flex-col justify-center px-8 sm:px-14 py-12 h-full">
          
          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center overflow-hidden bg-white border border-slate-100 p-2">
              <img src={roomsplitIcon} alt="RoomSplit Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">RoomSplit</h1>
            <p className="text-slate-500 mt-2 font-medium">Shared expenses, sorted.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2 border border-red-100 animate-in fade-in zoom-in-95 duration-200">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
            
            <div className="space-y-1">
              <Input 
                label="Username" 
                placeholder="e.g. Taran" 
                value={username} 
                onChange={(event) => setUsername(event.target.value)} 
                autoCapitalize="none" 
                required 
              />
            </div>

            {/* Password Field with Custom Show/Hide Button */}
            <div className="space-y-1 relative group">
              <Input 
                label="Password" 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••" 
                value={password} 
                onChange={(event) => setPassword(event.target.value)} 
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                // Adjust the `bottom-x` value depending on how your <Input/> component handles padding/margins
                className="absolute right-4 bottom-[0.8rem] text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button 
              type="submit" 
              className="w-full mt-8 h-14 text-lg font-semibold shadow-md shadow-indigo-200 hover:-translate-y-0.5 transition-transform duration-200"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-10 text-center">
            <button 
              onClick={() => { 
                setIsLogin(!isLogin); 
                setError(''); 
                setPassword(''); // Good practice to clear password on switch
              }} 
              className="text-slate-500 font-medium hover:text-indigo-600 transition-colors"
            >
              {isLogin ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}