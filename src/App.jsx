import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Plus, LogOut, Receipt, Wallet, 
  ArrowLeft, CheckCircle2, AlertCircle,
  ChevronRight, UserPlus, Copy, KeyRound, Settings, 
  Trash2, Loader2
} from 'lucide-react';

// Firebase Modular SDK
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, collection, onSnapshot, doc, 
  setDoc, deleteDoc, writeBatch 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const hasFirebase = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app = null;
let db = null;
let auth = null;

if (hasFirebase) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (err) {
    console.error("Firebase init failed:", err);
  }
}

const CATEGORIES = ['Food', 'Grocery', 'Petrol', 'Rent', 'Electricity', 'WiFi', 'Shopping', 'Entertainment', 'Other'];
const PAYMENT_METHODS = ['UPI', 'Cash', 'Card', 'Other'];

const generateInviteCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const INITIAL_USERS = [
  { id: 'usr_taran', username: 'Taran', password: 'taran', createdAt: new Date().toISOString() },
  { id: 'usr_sushant', username: 'Sushant', password: 'sushant', createdAt: new Date().toISOString() },
  { id: 'usr_tushar', username: 'Tushar', password: 'tushar', createdAt: new Date().toISOString() }
];

const INITIAL_GROUPS = [
  {
    id: 'grp_room302',
    name: 'Room',
    description: 'Flat 302 room expenses',
    inviteCode: 'SINGH1',
    createdBy: 'usr_taran',
    members: ['usr_taran', 'usr_sushant', 'usr_tushar'],
    createdAt: new Date().toISOString()
  }
];

const INITIAL_EXPENSES = [
  {
    id: 'exp_1',
    groupId: 'grp_room302',
    title: 'Pizza Dinner',
    totalAmount: '900.00',
    paidBy: 'usr_taran',
    paymentMethod: 'UPI',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
    splits: {
      'usr_taran': '300.00',
      'usr_sushant': '300.00',
      'usr_tushar': '300.00'
    },
    createdAt: new Date().toISOString()
  }
];

const calculateSettlements = (expenses, members) => {
  let balances = {};
  members.forEach(mId => balances[mId] = 0);

  expenses.forEach(exp => {
    const totalAmount = parseFloat(exp.totalAmount);
    const payer = exp.paidBy;

    if (balances[payer] !== undefined) {
      balances[payer] += totalAmount;
    }

    Object.entries(exp.splits || {}).forEach(([userId, amountStr]) => {
      if (balances[userId] !== undefined) {
        balances[userId] -= parseFloat(amountStr);
      }
    });
  });

  Object.keys(balances).forEach(user => {
    balances[user] = Math.round(balances[user] * 100) / 100;
  });

  let debtors = [];
  let creditors = [];
  
  Object.entries(balances).forEach(([userId, amount]) => {
    if (amount < -0.01) debtors.push({ userId, amount });
    else if (amount > 0.01) creditors.push({ userId, amount });
  });

  debtors.sort((a, b) => a.amount - b.amount); 
  creditors.sort((a, b) => b.amount - a.amount);

  let settlements = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    let debtor = debtors[i];
    let creditor = creditors[j];
    let amountToSettle = Math.min(Math.abs(debtor.amount), creditor.amount);

    if (amountToSettle > 0.01) {
      settlements.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: amountToSettle
      });
    }

    debtor.amount += amountToSettle;
    creditor.amount -= amountToSettle;

    if (Math.abs(debtor.amount) < 0.01) debtor.amount = 0;
    if (Math.abs(creditor.amount) < 0.01) creditor.amount = 0;

    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return { balances, settlements };
};

const Card = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
  >
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }) => {
  const baseStyle = "px-4 py-3.5 sm:py-3 rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed text-base";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200",
    outline: "border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ label, error, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>}
    <input 
      className={`w-full px-4 py-3.5 text-base border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-slate-50
        ${error ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
      {...props} 
    />
    {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
  </div>
);

export default function App() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeUserId, setActiveUserId] = useState(() => {
    return localStorage.getItem('rs_active_user_id') || null;
  });

  const [currentView, setCurrentView] = useState('dashboard');
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [toast, setToast] = useState(null);

  // Authenticate anonymously & bind real-time Firestore sync
  useEffect(() => {
    if (!hasFirebase || !db || !auth) {
      const savedUsers = localStorage.getItem('rs_users');
      const savedGroups = localStorage.getItem('rs_groups');
      const savedExpenses = localStorage.getItem('rs_expenses');

      setUsers(savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS);
      setGroups(savedGroups ? JSON.parse(savedGroups) : INITIAL_GROUPS);
      setExpenses(savedExpenses ? JSON.parse(savedExpenses) : INITIAL_EXPENSES);
      setLoading(false);
      return;
    }

    const unsubs = [];

    const setupAuthAndSync = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }

        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
          if (snapshot.empty) {
            INITIAL_USERS.forEach(u => setDoc(doc(db, 'users', u.id), u));
            setUsers(INITIAL_USERS);
          } else {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setUsers(list);
          }
        });
        unsubs.push(unsubUsers);

        const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
          if (snapshot.empty) {
            INITIAL_GROUPS.forEach(g => setDoc(doc(db, 'groups', g.id), g));
            setGroups(INITIAL_GROUPS);
          } else {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setGroups(list);
          }
        });
        unsubs.push(unsubGroups);

        const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
          if (snapshot.empty) {
            INITIAL_EXPENSES.forEach(e => setDoc(doc(db, 'expenses', e.id), e));
            setExpenses(INITIAL_EXPENSES);
          } else {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setExpenses(list);
          }
          setLoading(false);
        });
        unsubs.push(unsubExpenses);

      } catch (err) {
        console.error("Firestore sync error:", err);
        setLoading(false);
      }
    };

    setupAuthAndSync();

    return () => {
      unsubs.forEach(unsub => unsub && unsub());
    };
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = (userId) => {
    setActiveUserId(userId);
    localStorage.setItem('rs_active_user_id', userId);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setActiveUserId(null);
    localStorage.removeItem('rs_active_user_id');
    setCurrentGroupId(null);
    setCurrentView('dashboard');
  };

  // Cloud & Local unified state updaters
  const saveUser = async (newUser) => {
    if (db) {
      await setDoc(doc(db, 'users', newUser.id), newUser);
    } else {
      setUsers(prev => {
        const next = [...prev, newUser];
        localStorage.setItem('rs_users', JSON.stringify(next));
        return next;
      });
    }
  };

  const saveGroup = async (newGroup) => {
    if (db) {
      await setDoc(doc(db, 'groups', newGroup.id), newGroup);
    } else {
      setGroups(prev => {
        const next = [...prev, newGroup];
        localStorage.setItem('rs_groups', JSON.stringify(next));
        return next;
      });
    }
  };

  const updateGroup = async (updatedGroup) => {
    if (db) {
      await setDoc(doc(db, 'groups', updatedGroup.id), updatedGroup, { merge: true });
    } else {
      setGroups(prev => {
        const next = prev.map(g => g.id === updatedGroup.id ? updatedGroup : g);
        localStorage.setItem('rs_groups', JSON.stringify(next));
        return next;
      });
    }
  };

  const saveExpense = async (newExpense) => {
    if (db) {
      await setDoc(doc(db, 'expenses', newExpense.id), newExpense);
    } else {
      setExpenses(prev => {
        const next = [...prev, newExpense];
        localStorage.setItem('rs_expenses', JSON.stringify(next));
        return next;
      });
    }
  };

  const deleteExpense = async (expenseId) => {
    if (db) {
      await deleteDoc(doc(db, 'expenses', expenseId));
    } else {
      setExpenses(prev => {
        const next = prev.filter(e => e.id !== expenseId);
        localStorage.setItem('rs_expenses', JSON.stringify(next));
        return next;
      });
    }
  };

  const activeUser = users.find(u => u.id === activeUserId);

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto h-[100dvh] flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
        <p className="text-slate-500 font-medium text-sm">Connecting to RoomSplit...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto h-[100dvh] flex flex-col bg-slate-50 sm:border-x border-slate-200 sm:shadow-[0_0_40px_rgba(0,0,0,0.1)] relative overflow-hidden font-sans">
      {toast && (
        <div className={`absolute top-4 left-4 right-4 p-4 rounded-xl shadow-lg z-50 flex items-center gap-3 animate-in slide-in-from-top-5 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {!activeUser ? (
        <AuthScreen 
          users={users} 
          onSaveUser={saveUser} 
          onLogin={handleLogin} 
        />
      ) : currentView === 'dashboard' ? (
        <Dashboard 
          user={activeUser} 
          groups={groups} 
          onLogout={handleLogout} 
          onOpenGroup={(id) => { setCurrentGroupId(id); setCurrentView('group'); }}
          onCreateGroup={() => setCurrentView('create_group')}
          onJoinGroup={() => setCurrentView('join_group')}
        />
      ) : currentView === 'create_group' ? (
        <CreateGroupView 
          user={activeUser} 
          onSaveGroup={saveGroup} 
          onBack={() => setCurrentView('dashboard')} 
          showToast={showToast}
        />
      ) : currentView === 'join_group' ? (
        <JoinGroupView 
          user={activeUser} 
          groups={groups} 
          onUpdateGroup={updateGroup} 
          onBack={() => setCurrentView('dashboard')} 
          showToast={showToast}
        />
      ) : currentView === 'group' && currentGroupId ? (
        <GroupView
          group={groups.find(g => g.id === currentGroupId)}
          expenses={expenses.filter(e => e.groupId === currentGroupId)}
          onSaveExpense={saveExpense}
          onDeleteExpense={deleteExpense}
          users={users}
          currentUser={activeUser}
          onBack={() => { setCurrentGroupId(null); setCurrentView('dashboard'); }}
          showToast={showToast}
        />
      ) : null}
    </div>
  );
}

function AuthScreen({ users, onSaveUser, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cleanUser = username.trim();

    if (isLogin) {
      const user = users.find(u => u.username.toLowerCase() === cleanUser.toLowerCase() && u.password === password);
      if (user) {
        onLogin(user.id);
      } else {
        setError('Invalid username or password.');
      }
    } else {
      if (cleanUser.length < 3) {
        setError("Username must be at least 3 characters.");
        return;
      }
      if (password.length < 3) {
        setError("Password must be at least 3 characters.");
        return;
      }
      const existing = users.find(u => u.username.toLowerCase() === cleanUser.toLowerCase());
      if (existing) {
        setError('Username already taken. Please sign in.');
        return;
      }

      const newUser = {
        id: `usr_${Date.now()}`,
        username: cleanUser,
        password: password,
        createdAt: new Date().toISOString()
      };

      await onSaveUser(newUser);
      onLogin(newUser.id);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6 bg-white">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-indigo-600 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200 rotate-6">
          <Receipt size={36} className="text-white -rotate-6" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">RoomSplit</h1>
        <p className="text-slate-500 mt-2 font-medium">Shared expenses, sorted.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2 border border-red-100 mb-2">
            <AlertCircle size={18} className="flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        <Input 
          label="Username" 
          placeholder="e.g. Taran" 
          value={username} 
          onChange={e => setUsername(e.target.value)}
          autoCapitalize="none"
          required 
        />
        <Input 
          label="Password" 
          type="password" 
          placeholder="••••••••" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
        />
        
        <Button type="submit" className="w-full mt-2 h-14 text-lg shadow-md shadow-indigo-100">
          {isLogin ? 'Sign In' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <button 
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          className="text-slate-500 font-medium hover:text-indigo-600 transition-colors"
        >
          {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

function Dashboard({ user, groups, onLogout, onOpenGroup, onCreateGroup, onJoinGroup }) {
  const myGroups = groups.filter(g => g.members && g.members.includes(user.id));

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-sm">
            <Receipt size={20} />
          </div>
          <span className="text-xl font-bold text-slate-800">RoomSplit</span>
        </div>
        <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-full" title="Log out">
          <LogOut size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-5 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Hi, {user.username}!</h1>
          <p className="text-slate-500 mt-1">Here are your shared groups.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <button 
            onClick={onCreateGroup}
            className="flex flex-col items-center justify-center p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700 active:bg-indigo-100 transition-colors"
          >
            <Plus size={26} className="mb-2" />
            <span className="font-semibold text-sm">Create Group</span>
          </button>
          <button 
            onClick={onJoinGroup}
            className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl text-slate-700 active:bg-slate-50 transition-colors shadow-sm"
          >
            <UserPlus size={26} className="mb-2" />
            <span className="font-semibold text-sm">Join Group</span>
          </button>
        </div>

        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Your Groups</h2>
        
        {myGroups.length === 0 ? (
          <div className="text-center py-10 bg-white border border-dashed border-slate-300 rounded-3xl">
            <Users size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">You aren't in any groups yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myGroups.map(group => (
              <Card key={group.id} onClick={() => onOpenGroup(group.id)} className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{group.name}</h3>
                      <p className="text-slate-500 text-xs mt-0.5">{group.members.length} Members</p>
                    </div>
                  </div>
                  <ChevronRight size={22} className="text-slate-300" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CreateGroupView({ user, onSaveGroup, onBack, showToast }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newGroup = {
      id: `grp_${Date.now()}`,
      name: name.trim(),
      description: desc.trim(),
      inviteCode: generateInviteCode(),
      createdBy: user.id,
      members: [user.id],
      createdAt: new Date().toISOString()
    };

    await onSaveGroup(newGroup);
    showToast('Group created successfully!');
    onBack();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <header className="px-4 py-4 flex items-center gap-3 border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Create New Group</h1>
      </header>
      <div className="p-5">
        <form onSubmit={handleCreate}>
          <Input label="Group Name" placeholder="e.g. Goa Trip, Flat 101" value={name} onChange={e=>setName(e.target.value)} required />
          <Input label="Description (Optional)" placeholder="What is this group for?" value={desc} onChange={e=>setDesc(e.target.value)} />
          <Button type="submit" className="w-full mt-6 h-14">Create Group</Button>
        </form>
      </div>
    </div>
  );
}

function JoinGroupView({ user, groups, onUpdateGroup, onBack, showToast }) {
  const [code, setCode] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    const group = groups.find(g => g.inviteCode === cleanCode);
    if (!group) {
      showToast('Invalid invite code.', 'error');
      return;
    }

    if (group.members.includes(user.id)) {
      showToast('You are already in this group.');
      onBack();
      return;
    }

    const updated = {
      ...group,
      members: [...group.members, user.id]
    };

    await onUpdateGroup(updated);
    showToast(`Joined ${group.name}!`);
    onBack();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <header className="px-4 py-4 flex items-center gap-3 border-b border-slate-100">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Join a Group</h1>
      </header>
      <div className="p-5 text-center pt-8">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <KeyRound size={28} className="text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Enter Invite Code</h2>
        <p className="text-slate-500 text-sm mb-6 px-4">Ask your roommate for the group invite code to join.</p>
        
        <form onSubmit={handleJoin} className="max-w-[280px] mx-auto">
          <input 
            className="w-full px-4 py-3.5 text-center text-2xl font-mono tracking-widest border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-0 outline-none uppercase bg-slate-50"
            placeholder="XXXXXX"
            maxLength={10}
            value={code}
            onChange={e => setCode(e.target.value)}
            required 
          />
          <Button type="submit" className="w-full mt-6 h-14" disabled={code.trim().length < 3}>
            Join Group
          </Button>
        </form>
      </div>
    </div>
  );
}

function GroupView({ group, expenses, onSaveExpense, onDeleteExpense, users, currentUser, onBack, showToast }) {
  const [activeTab, setActiveTab] = useState('expenses');

  const getUserName = (userId) => {
    const u = users.find(u => u.id === userId);
    return u ? u.username : 'Unknown';
  };

  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <header className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center gap-3 z-30 sticky top-0 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 rounded-full active:bg-slate-100">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-800 truncate">{group.name}</h1>
          <p className="text-xs font-medium text-slate-500">{group.members.length} Members</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-28 relative">
        {activeTab === 'expenses' && (
          <ExpensesTab 
            expenses={sortedExpenses} 
            currentUser={currentUser} 
            getUserName={getUserName} 
            onDeleteExpense={onDeleteExpense}
            showToast={showToast}
          />
        )}
        {activeTab === 'add' && (
          <AddExpenseTab 
            group={group} 
            currentUser={currentUser} 
            users={users} 
            getUserName={getUserName} 
            onSaveExpense={onSaveExpense}
            onSaved={() => setActiveTab('expenses')} 
            showToast={showToast} 
          />
        )}
        {activeTab === 'balances' && (
          <BalancesTab 
            expenses={expenses} 
            group={group} 
            currentUser={currentUser} 
            getUserName={getUserName} 
          />
        )}
        {activeTab === 'members' && (
          <MembersTab 
            group={group} 
            users={users} 
            currentUser={currentUser} 
            showToast={showToast} 
          />
        )}

        {activeTab === 'expenses' && (
          <button 
            onClick={() => setActiveTab('add')}
            className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(79,70,229,0.4)] active:scale-95 transition-transform z-30"
            title="Add Expense"
          >
            <Plus size={28} />
          </button>
        )}
      </main>

      <nav className="bg-white border-t border-slate-200 absolute bottom-0 w-full z-40">
        <div className="flex justify-around items-center h-16">
          <NavItem icon={Receipt} label="Expenses" isActive={activeTab === 'expenses' || activeTab === 'add'} onClick={() => setActiveTab('expenses')} />
          <NavItem icon={Wallet} label="Balances" isActive={activeTab === 'balances'} onClick={() => setActiveTab('balances')} />
          <NavItem icon={Settings} label="Settings" isActive={activeTab === 'members'} onClick={() => setActiveTab('members')} />
        </div>
      </nav>
    </div>
  );
}

const NavItem = ({ icon: Icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
    <span className="text-[10px]">{label}</span>
  </button>
);

function ExpensesTab({ expenses, currentUser, getUserName, onDeleteExpense, showToast }) {
  const [filterMethod, setFilterMethod] = useState('ALL');

  const filtered = expenses.filter(exp => {
    if (filterMethod === 'ALL') return true;
    return exp.paymentMethod === filterMethod;
  });

  const handleDelete = async (e, expId) => {
    e.stopPropagation();
    await onDeleteExpense(expId);
    showToast('Expense deleted');
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button 
          onClick={() => setFilterMethod('ALL')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-colors flex-shrink-0 ${filterMethod === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          All ({expenses.length})
        </button>
        {PAYMENT_METHODS.map(method => (
          <button 
            key={method}
            onClick={() => setFilterMethod(method)}
            className={`px-3 py-1.5 rounded-full font-semibold transition-colors flex-shrink-0 ${filterMethod === method ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
          >
            {method}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-6 pt-16">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <Receipt size={32} className="text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-700 mb-1">No Expenses Found</h2>
          <p className="text-slate-400 text-xs">Tap the + button below to log your first bill.</p>
        </div>
      ) : (
        filtered.map(exp => {
          const iPaid = exp.paidBy === currentUser.id;
          const myShare = exp.splits ? exp.splits[currentUser.id] : 0;
          let statusText = "Not involved";
          let statusColor = "text-slate-400";
          
          if (iPaid) {
            const totalOthersOwe = parseFloat(exp.totalAmount) - (myShare ? parseFloat(myShare) : 0);
            statusText = `+ ₹${totalOthersOwe.toFixed(2)}`;
            statusColor = "text-emerald-600";
          } else if (myShare) {
            statusText = `- ₹${parseFloat(myShare).toFixed(2)}`;
            statusColor = "text-rose-500";
          }

          return (
            <Card key={exp.id} className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0 font-bold">
                  {exp.category ? exp.category.charAt(0) : '₹'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{exp.title}</h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    <span className="font-medium text-slate-700">{iPaid ? 'You' : getUserName(exp.paidBy)}</span> paid ₹{parseFloat(exp.totalAmount).toFixed(2)} • <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">{exp.paymentMethod || 'UPI'}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <div className={`text-sm font-bold ${statusColor}`}>
                    {statusText}
                  </div>
                  <div className="text-[10px] font-medium text-slate-400">
                    {exp.date}
                  </div>
                </div>
                <button onClick={(e) => handleDelete(e, exp.id)} className="text-slate-300 hover:text-red-500 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

function AddExpenseTab({ group, currentUser, users, getUserName, onSaveExpense, onSaved, showToast }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUser.id);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Food');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [splitMode, setSplitMode] = useState('equal');
  const [error, setError] = useState('');
  
  const [selectedParticipants, setSelectedParticipants] = useState({});
  const [customSplits, setCustomSplits] = useState({});

  useEffect(() => {
    const initSelected = {};
    const initCustom = {};
    group.members.forEach(mId => {
      initSelected[mId] = true;
      initCustom[mId] = '';
    });
    setSelectedParticipants(initSelected);
    setCustomSplits(initCustom);
  }, [group.members]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const numAmount = parseFloat(amount);
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid title and total amount.");
      return;
    }

    let finalSplits = {};

    if (splitMode === 'equal') {
      const activeMembers = Object.keys(selectedParticipants).filter(m => selectedParticipants[m]);
      if (activeMembers.length === 0) {
        setError("Select at least one participant.");
        return;
      }
      const splitAmount = (numAmount / activeMembers.length).toFixed(2);
      activeMembers.forEach(mId => finalSplits[mId] = splitAmount);
    } else {
      let totalCustom = 0;
      let hasInvalid = false;
      const activeMembers = Object.keys(customSplits).filter(mId => customSplits[mId] !== '' && parseFloat(customSplits[mId]) > 0);
      
      if (activeMembers.length === 0) {
        setError("Enter individual amounts.");
        return;
      }

      activeMembers.forEach(mId => {
        const val = parseFloat(customSplits[mId]);
        if (isNaN(val) || val < 0) {
          hasInvalid = true;
        } else {
          totalCustom += val;
          finalSplits[mId] = val.toFixed(2);
        }
      });

      if (hasInvalid) {
        setError("Enter valid positive amounts.");
        return;
      }

      if (Math.abs(totalCustom - numAmount) > 0.05) {
        setError(`Participant amounts sum to ₹${totalCustom.toFixed(2)}, but total expense is ₹${numAmount.toFixed(2)}. They must match!`);
        return;
      }
    }

    const newExpense = {
      id: `exp_${Date.now()}`,
      groupId: group.id,
      title: title.trim(),
      totalAmount: numAmount.toFixed(2),
      paidBy,
      paymentMethod,
      category,
      date,
      splits: finalSplits,
      createdAt: new Date().toISOString()
    };

    await onSaveExpense(newExpense);
    showToast('Expense saved!');
    onSaved();
  };

  const activeCount = Object.values(selectedParticipants).filter(Boolean).length;
  const equalAmount = amount && !isNaN(amount) && activeCount > 0 ? (parseFloat(amount) / activeCount).toFixed(2) : '0.00';

  return (
    <div className="p-4 pb-12">
      <h2 className="text-lg font-bold text-slate-800 mb-3">Add Expense</h2>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs flex items-start gap-2 border border-red-100 mb-4">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-4 space-y-3 bg-white">
          <Input label="Description / Title" placeholder="e.g. Dinner, Petrol, WiFi" value={title} onChange={e=>setTitle(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount (₹)" type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} required />
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Paid By</label>
              <select className="w-full px-3 py-3.5 text-base border border-slate-200 rounded-xl bg-slate-50 outline-none" value={paidBy} onChange={e=>setPaidBy(e.target.value)}>
                {group.members.map(mId => (
                  <option key={mId} value={mId}>{mId === currentUser.id ? 'You' : getUserName(mId)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
              <select className="w-full px-3 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none text-sm" value={category} onChange={e=>setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Method</label>
              <select className="w-full px-3 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none text-sm" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-bold text-slate-800">Split Method</label>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button type="button" onClick={() => setSplitMode('equal')} className={`px-3 py-1 text-xs font-bold rounded-lg ${splitMode === 'equal' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Equal</button>
              <button type="button" onClick={() => setSplitMode('custom')} className={`px-3 py-1 text-xs font-bold rounded-lg ${splitMode === 'custom' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Custom</button>
            </div>
          </div>

          <div className="space-y-2">
            {group.members.map(mId => (
              <div key={mId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-sm text-slate-700">{mId === currentUser.id ? 'You' : getUserName(mId)}</span>
                
                {splitMode === 'equal' ? (
                  <div className="flex items-center gap-3">
                    {selectedParticipants[mId] && amount > 0 && (
                      <span className="text-xs font-mono font-medium text-slate-500">₹{equalAmount}</span>
                    )}
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded accent-indigo-600 cursor-pointer" 
                      checked={selectedParticipants[mId] || false} 
                      onChange={(e) => setSelectedParticipants(prev => ({...prev, [mId]: e.target.checked}))} 
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">₹</span>
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      placeholder="0.00" 
                      className="w-20 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg text-right font-mono bg-white outline-none focus:border-indigo-500" 
                      value={customSplits[mId]} 
                      onChange={(e) => setCustomSplits(prev => ({...prev, [mId]: e.target.value}))} 
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Button type="submit" className="w-full h-14 mt-4 text-base">Save Expense</Button>
      </form>
    </div>
  );
}

function BalancesTab({ expenses, group, currentUser, getUserName }) {
  const { balances, settlements } = useMemo(() => calculateSettlements(expenses, group.members), [expenses, group.members]);
  const myBalance = balances[currentUser.id] || 0;

  return (
    <div className="p-4 pb-12 space-y-5">
      <Card className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-none shadow-md">
        <h2 className="text-indigo-100 font-medium mb-1 text-xs uppercase tracking-wider">Your Balance</h2>
        <div className="text-3xl font-bold tracking-tight">
          {myBalance < 0 ? '-' : ''}₹{Math.abs(myBalance).toFixed(2)}
        </div>
        <p className="mt-2 text-indigo-100 text-xs">
          {myBalance > 0 ? "You are owed money in total." : myBalance < 0 ? "You owe money in total." : "You are settled up!"}
        </p>
      </Card>

      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 px-1">How to Settle</h3>
        {settlements.length === 0 ? (
          <Card className="p-6 text-center text-slate-500">
            <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500" />
            <p className="text-base font-bold text-slate-700">All Settled Up</p>
            <p className="text-xs text-slate-400 mt-1">No outstanding balances remaining.</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {settlements.map((s, idx) => {
              const iAmFrom = s.from === currentUser.id;
              const iAmTo = s.to === currentUser.id;
              const fromName = iAmFrom ? "You" : getUserName(s.from);
              const toName = iAmTo ? "You" : getUserName(s.to);

              return (
                <Card key={idx} className={`p-3.5 flex items-center justify-between ${(iAmFrom || iAmTo) ? 'border-indigo-200 bg-indigo-50/40' : ''}`}>
                  <span className="text-slate-600 text-sm">
                    <strong className="text-slate-800 font-semibold">{fromName}</strong> pays <strong className="text-slate-800 font-semibold">{toName}</strong>
                  </span>
                  <div className={`text-base font-bold ${iAmFrom ? 'text-rose-500' : iAmTo ? 'text-emerald-600' : 'text-slate-700'}`}>
                    ₹{s.amount.toFixed(2)}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MembersTab({ group, users, currentUser, showToast }) {
  const handleCopyInvite = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(group.inviteCode);
      showToast('Invite code copied!');
    } else {
      showToast(`Code: ${group.inviteCode}`);
    }
  };

  return (
    <div className="p-4 pb-12 space-y-5">
      <Card className="p-5 text-center border-dashed border-2 border-indigo-200 bg-indigo-50/30">
        <h3 className="text-xs font-bold text-indigo-800 mb-1 uppercase tracking-wide">Invite Roommates</h3>
        <p className="text-slate-600 text-xs mb-3">Share this code with flatmates so they can join.</p>
        <div className="flex items-center justify-center gap-3">
          <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 font-mono text-xl font-bold tracking-[0.2em] text-slate-800">
            {group.inviteCode}
          </div>
          <button 
            onClick={handleCopyInvite}
            className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md active:bg-indigo-700"
            title="Copy Code"
          >
            <Copy size={20} />
          </button>
        </div>
      </Card>

      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 px-1">Group Members ({group.members.length})</h3>
        <Card className="overflow-hidden">
          {group.members.map((mId, idx) => {
            const user = users.find(u => u.id === mId);
            const isMe = mId === currentUser.id;
            
            return (
              <div key={mId} className={`p-3.5 flex items-center justify-between ${idx !== group.members.length - 1 ? 'border-b border-slate-100' : ''} ${isMe ? 'bg-slate-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                    {user ? user.username.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 text-sm block">
                      {user ? user.username : 'Unknown User'} {isMe && <span className="text-[10px] text-slate-400 font-normal">(You)</span>}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {mId === group.createdBy ? 'Admin' : 'Member'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}