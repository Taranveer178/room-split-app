import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import roomsplitIcon from '../../assets/roomsplit-icon.webp';
import { Button, Input } from '../common/UI';

export default function AuthScreen({ users, onSaveUser, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const cleanUser = username.trim();
    if (isLogin) {
      const user = users.find((item) => item.username.toLowerCase() === cleanUser.toLowerCase() && item.password === password);
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
    const newUser = { id: `usr_${Date.now()}`, username: cleanUser, password, createdAt: new Date().toISOString() };
    await onSaveUser(newUser);
    onLogin(newUser.id);
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6 bg-white">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center overflow-hidden bg-white border border-slate-100 p-2">
          <img src={roomsplitIcon} alt="RoomSplit Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">RoomSplit</h1>
        <p className="text-slate-500 mt-2 font-medium">Shared expenses, sorted.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2 border border-red-100 mb-2"><AlertCircle size={18} className="flex-shrink-0" /><p>{error}</p></div>}
        <Input label="Username" placeholder="e.g. Taran" value={username} onChange={(event) => setUsername(event.target.value)} autoCapitalize="none" required />
        <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <Button type="submit" className="w-full mt-2 h-14 text-lg shadow-md shadow-indigo-100">{isLogin ? 'Sign In' : 'Create Account'}</Button>
      </form>
      <div className="mt-8 text-center">
        <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-slate-500 font-medium hover:text-indigo-600 transition-colors">
          {isLogin ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}