import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { auth, db, hasFirebase, signInAnonymously } from './firebase';
import {
  INITIAL_EXPENSES,
  INITIAL_GROUPS,
  INITIAL_USERS,
} from './utils/constants';
import AuthScreen from './components/auth/AuthScreen';
import Dashboard from './components/dashboard/Dashboard';
import CreateGroupModal from './components/dashboard/CreateGroupModal';
import JoinGroupModal from './components/dashboard/JoinGroupModal';
import GroupView from './components/group/GroupView';
import Toast from './components/common/Toast';
import roomsplitIcon from './assets/roomsplit-icon.webp';


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration.scope);
      })
      .catch((err) => {
        console.log('Service Worker registration failed:', err);
      });
  });
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeUserId, setActiveUserId] = useState(() => (
    localStorage.getItem('rs_active_user_id') || null
  ));
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!hasFirebase || !db || !auth) {
      const savedUsers = localStorage.getItem('rs_users');
      const savedGroups = localStorage.getItem('rs_groups');
      const savedExpenses = localStorage.getItem('rs_expenses');
      setUsers(savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS);
      setGroups(savedGroups ? JSON.parse(savedGroups) : INITIAL_GROUPS);
      setExpenses(savedExpenses ? JSON.parse(savedExpenses) : INITIAL_EXPENSES);
      setLoading(false);
      return undefined;
    }

    const unsubscribers = [];
    const setupAuthAndSync = async () => {
      try {
        await signInAnonymously(auth);
        unsubscribers.push(onSnapshot(collection(db, 'users'), (snapshot) => {
          if (!snapshot.empty) {
            setUsers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
          } else {
            INITIAL_USERS.forEach((user) => setDoc(doc(db, 'users', user.id), user).catch(() => {}));
            setUsers(INITIAL_USERS);
          }
        }, (error) => console.error('Users listener error:', error)));

        unsubscribers.push(onSnapshot(collection(db, 'groups'), (snapshot) => {
          if (!snapshot.empty) {
            setGroups(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
          } else {
            INITIAL_GROUPS.forEach((group) => setDoc(doc(db, 'groups', group.id), group).catch(() => {}));
            setGroups(INITIAL_GROUPS);
          }
        }, (error) => console.error('Groups listener error:', error)));

        unsubscribers.push(onSnapshot(collection(db, 'expenses'), (snapshot) => {
          if (!snapshot.empty) {
            setExpenses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
          } else if (!localStorage.getItem('rs_seeded_expenses')) {
            INITIAL_EXPENSES.forEach((expense) => setDoc(doc(db, 'expenses', expense.id), expense).catch(() => {}));
            localStorage.setItem('rs_seeded_expenses', 'true');
            setExpenses(INITIAL_EXPENSES);
          } else {
            setExpenses([]);
          }
          setLoading(false);
        }, (error) => {
          console.error('Expenses listener error:', error);
          setLoading(false);
        }));
      } catch (error) {
        console.error('Firestore auth setup failed:', error);
        setLoading(false);
      }
    };

    setupAuthAndSync();
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
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

  const saveUser = async (newUser) => {
    if (db) {
      await setDoc(doc(db, 'users', newUser.id), newUser);
      return;
    }
    setUsers((previous) => {
      const next = [...previous, newUser];
      localStorage.setItem('rs_users', JSON.stringify(next));
      return next;
    });
  };

  const saveGroup = async (newGroup) => {
    if (db) {
      await setDoc(doc(db, 'groups', newGroup.id), newGroup);
      return;
    }
    setGroups((previous) => {
      const next = [...previous, newGroup];
      localStorage.setItem('rs_groups', JSON.stringify(next));
      return next;
    });
  };

  const updateGroup = async (updatedGroup) => {
    if (db) {
      await setDoc(doc(db, 'groups', updatedGroup.id), updatedGroup, { merge: true });
      return;
    }
    setGroups((previous) => {
      const next = previous.map((group) => (group.id === updatedGroup.id ? updatedGroup : group));
      localStorage.setItem('rs_groups', JSON.stringify(next));
      return next;
    });
  };

  const saveExpense = async (newExpense) => {
    if (db) {
      await setDoc(doc(db, 'expenses', newExpense.id), newExpense);
      return;
    }
    setExpenses((previous) => {
      const next = [...previous, newExpense];
      localStorage.setItem('rs_expenses', JSON.stringify(next));
      return next;
    });
  };

  const deleteExpense = async (expenseId) => {
    if (db) {
      await deleteDoc(doc(db, 'expenses', expenseId));
      return;
    }
    setExpenses((previous) => {
      const next = previous.filter((expense) => expense.id !== expenseId);
      localStorage.setItem('rs_expenses', JSON.stringify(next));
      return next;
    });
  };

  const activeUser = users.find((user) => user.id === activeUserId);

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto h-[100dvh] flex flex-col items-center justify-center bg-slate-50">
        <div className="relative flex items-center justify-center mb-4">
          <img src={roomsplitIcon} alt="RoomSplit" className="w-16 h-16 rounded-2xl shadow-lg shadow-indigo-100 object-contain animate-pulse" />
        </div>
        <p className="text-slate-600 font-semibold text-sm">Expense Tracker</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto h-[100dvh] flex flex-col bg-slate-50 sm:border-x border-slate-200 sm:shadow-[0_0_40px_rgba(0,0,0,0.1)] relative overflow-hidden font-sans">
      <Toast toast={toast} />
      {!activeUser ? (
        <AuthScreen users={users} onSaveUser={saveUser} onLogin={handleLogin} />
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
        <CreateGroupModal user={activeUser} onSaveGroup={saveGroup} onBack={() => setCurrentView('dashboard')} showToast={showToast} />
      ) : currentView === 'join_group' ? (
        <JoinGroupModal user={activeUser} groups={groups} onUpdateGroup={updateGroup} onBack={() => setCurrentView('dashboard')} showToast={showToast} />
      ) : currentView === 'group' && currentGroupId ? (
        <GroupView
          group={groups.find((group) => group.id === currentGroupId)}
          expenses={expenses.filter((expense) => expense.groupId === currentGroupId)}
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