import { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { calculateSettlements, GROUP_DELETE_BALANCE_TOLERANCE } from './utils/settlement';
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
import IncomingChatAlert from './components/common/IncomingChatAlert';
import AdminPanel from './components/admin/AdminPanel';
import {
  requestNotificationPermission,
  setPushNotificationActionHandler,
  unregisterPushNotifications,
} from './utils/notifications';
import roomsplitIcon from './assets/roomsplit-icon.webp';

const getGroupSlug = (name, fallback = 'group') => {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || fallback;
};

const getRouteFromLocation = () => {
  const url = new URL(window.location.href);
  const inviteCode = url.searchParams.get('join') || url.searchParams.get('invite') || '';
  const groupRoute = url.pathname.match(/^\/groups\/([^/]+)$/);

  if (url.pathname === '/groups/create') return { view: 'create_group' };
  if (url.pathname === '/groups/join' || inviteCode) {
    return { view: 'join_group', inviteCode };
  }
  if (groupRoute) {
    return {
      view: 'group',
      groupSlug: decodeURIComponent(groupRoute[1]),
      initialTab: 'expenses',
      drawerOpen: false,
    };
  }
  return {
    view: 'dashboard',
    dashboardTab: url.searchParams.get('tab') || 'groups',
  };
};

const getRouteUrl = (route) => {
  if (route.view === 'group' && (route.groupName || route.groupSlug || route.groupId)) {
    const slug = route.groupName
      ? getGroupSlug(route.groupName, route.groupId)
      : route.groupSlug || route.groupId;
    return `/groups/${encodeURIComponent(slug)}`;
  }
  if (route.view === 'create_group') return '/groups/create';
  if (route.view === 'join_group') {
    const params = new URLSearchParams();
    if (route.inviteCode) params.set('join', route.inviteCode);
    const search = params.toString();
    return `/groups/join${search ? `?${search}` : ''}`;
  }
  return route.dashboardTab && route.dashboardTab !== 'groups'
    ? `/?tab=${encodeURIComponent(route.dashboardTab)}`
    : '/';
};

const getNotificationTimestamp = (value) => {
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'number') return value;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};


if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
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
  const [initialRoute] = useState(getRouteFromLocation);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeUserId, setActiveUserId] = useState(() => (
    localStorage.getItem('rs_active_user_id') || null
  ));
  const [currentView, setCurrentView] = useState(initialRoute.view);
  const [dashboardTab, setDashboardTab] = useState(initialRoute.dashboardTab || 'groups');
  const [currentGroupRoute, setCurrentGroupRoute] = useState(
    initialRoute.groupId || initialRoute.groupSlug || null
  );
  const [currentGroupInitialTab, setCurrentGroupInitialTab] = useState('expenses');
  const [currentGroupDrawerOpen, setCurrentGroupDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [incomingChat, setIncomingChat] = useState(null);
  const [activeChatGroupId, setActiveChatGroupId] = useState(null);
  const [notificationCutoff, setNotificationCutoff] = useState(
    () => Date.now() - 7 * 24 * 60 * 60 * 1000
  );
  const historyInitializedRef = useRef(false);
  const currentRouteRef = useRef(initialRoute);
  const navigateToRef = useRef(null);
  const activeUser = users.find((user) => user.id === activeUserId);
  const mutedGroupIds = useMemo(
    () => (Array.isArray(activeUser?.mutedGroupIds) ? activeUser.mutedGroupIds : []),
    [activeUser]
  );
  const joinedGroupIds = groups
    .filter((group) => activeUserId && group.members?.includes(activeUserId))
    .map((group) => group.id)
    .sort()
    .join(',');

  useEffect(() => {
    const refreshCutoff = () => setNotificationCutoff(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const interval = window.setInterval(refreshCutoff, 60 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const applyRoute = (route) => {
    currentRouteRef.current = route;
    setCurrentView(route.view);
    setCurrentGroupRoute(route.groupId || route.groupSlug || null);
    if (route.view === 'group') {
      setCurrentGroupInitialTab(route.initialTab || 'expenses');
      setCurrentGroupDrawerOpen(Boolean(route.drawerOpen));
    } else {
      setCurrentGroupDrawerOpen(false);
    }
    if (route.view === 'dashboard') setDashboardTab(route.dashboardTab || 'groups');
  };

  const navigateTo = (route, { replace = false } = {}) => {
    const normalizedRoute = route.view === 'group'
      ? { initialTab: 'expenses', drawerOpen: false, ...route }
      : route;
    const state = { roomSplitRoute: normalizedRoute };
    const url = getRouteUrl(normalizedRoute);
    if (replace) window.history.replaceState(state, '', url);
    else window.history.pushState(state, '', url);
    applyRoute(normalizedRoute);
  };
  useEffect(() => {
    navigateToRef.current = navigateTo;
  });

  const goBack = () => {
    window.history.back();
  };

  useEffect(() => {
    if (window.location.pathname === '/admin') return undefined;

    const sentinelState = { roomSplitSentinel: true };
    if (!historyInitializedRef.current) {
      window.history.replaceState(sentinelState, '', '/');
      window.history.pushState({ roomSplitRoute: initialRoute }, '', getRouteUrl(initialRoute));
      historyInitializedRef.current = true;
    }

    const handlePopState = (event) => {
      const previousRoute = currentRouteRef.current;
      const destinationRoute = event.state?.roomSplitRoute;
      if (
        (!destinationRoute || destinationRoute.view === 'dashboard')
        && previousRoute.view === 'group'
        && (previousRoute.initialTab !== 'expenses' || previousRoute.drawerOpen)
      ) {
        const expensesRoute = {
          ...previousRoute,
          initialTab: 'expenses',
          drawerOpen: false,
        };
        window.history.pushState({ roomSplitRoute: expensesRoute }, '', getRouteUrl(expensesRoute));
        applyRoute(expensesRoute);
        return;
      }

      if (destinationRoute) {
        applyRoute(destinationRoute);
        return;
      }

      const dashboardRoute = { view: 'dashboard', dashboardTab: 'groups' };
      applyRoute(dashboardRoute);
      window.history.pushState(sentinelState, '', '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initialRoute]);

  useEffect(() => {
    if (window.location.pathname === '/admin') return undefined;

    if (!hasFirebase || !db || !auth) {
      const savedUsers = localStorage.getItem('rs_users');
      const savedGroups = localStorage.getItem('rs_groups');
      const savedExpenses = localStorage.getItem('rs_expenses');
      const savedNotifications = localStorage.getItem('rs_notifications');
      setUsers(savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS);
      setGroups(savedGroups ? JSON.parse(savedGroups) : INITIAL_GROUPS);
      setExpenses(savedExpenses ? JSON.parse(savedExpenses) : INITIAL_EXPENSES);
      setNotifications(savedNotifications ? JSON.parse(savedNotifications) : []);
      setLoading(false);
      return undefined;
    }

    const unsubscribers = [];
    let isCancelled = false;
    const setupAuthAndSync = async () => {
      try {
        await signInAnonymously(auth);
        if (isCancelled) return;
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
            setGroups([]);
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

        unsubscribers.push(onSnapshot(collection(db, 'notifications'), (snapshot) => {
          setNotifications(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        }, (error) => console.error('Notifications listener error:', error)));
      } catch (error) {
        console.error('Firestore auth setup failed:', error);
        if (!isCancelled) setLoading(false);
      }
    };

    setupAuthAndSync();
    return () => {
      isCancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe?.());
    };
  }, []);

  useEffect(() => {
    if (!activeUserId) return undefined;
    const expiredIds = new Set(notifications
      .filter((notification) => {
        const timestamp = getNotificationTimestamp(notification.createdAt);
        return notification.recipientId === activeUserId
          && timestamp !== null
          && timestamp < notificationCutoff;
      })
      .map((notification) => notification.id));
    if (!expiredIds.size) return undefined;

    if (db) {
      expiredIds.forEach((notificationId) => {
        deleteDoc(doc(db, 'notifications', notificationId)).catch((error) => {
          console.error('Could not remove expired notification:', error);
        });
      });
      return undefined;
    }

    const retained = notifications.filter((notification) => !expiredIds.has(notification.id));
    localStorage.setItem('rs_notifications', JSON.stringify(retained));
    return undefined;
  }, [activeUserId, notificationCutoff, notifications]);

  useEffect(() => {
    if (!db || !activeUserId || !joinedGroupIds) return undefined;

    const mutedGroupIdSet = new Set(mutedGroupIds);
    const unsubscribers = joinedGroupIds.split(',').filter((groupId) => !mutedGroupIdSet.has(groupId)).map((groupId) => {
      let hasBaselineSnapshot = false;
      return onSnapshot(
        query(collection(db, 'messages'), where('groupId', '==', groupId)),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!hasBaselineSnapshot) {
            if (!snapshot.metadata.fromCache) hasBaselineSnapshot = true;
            return;
          }
          if (document.visibilityState !== 'visible') return;

          const newMessage = snapshot.docChanges()
            .filter((change) => change.type === 'added')
            .map((change) => ({ id: change.doc.id, ...change.doc.data() }))
            .filter((message) => (
              message.senderId !== activeUserId
              && activeChatGroupId !== groupId
              && !message.isDeletedForEveryone
              && !message.deletedFor?.includes(activeUserId)
            ))
            .sort((first, second) => (second.timestamp || 0) - (first.timestamp || 0))[0];

          if (newMessage) setIncomingChat(newMessage);
        },
        (error) => console.error('Incoming chat listener error:', error)
      );
    });

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [activeChatGroupId, activeUserId, joinedGroupIds, mutedGroupIds]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = (userId) => {
    setIncomingChat(null);
    setActiveChatGroupId(null);
    setActiveUserId(userId);
    localStorage.setItem('rs_active_user_id', userId);
    navigateTo(initialRoute.view === 'join_group'
      ? { view: 'join_group', inviteCode: initialRoute.inviteCode }
      : { view: 'dashboard', dashboardTab: 'groups' }, { replace: true });
  };

  const handleLogout = async () => {
    try {
      await unregisterPushNotifications(activeUserId);
    } catch (error) {
      console.error('Could not safely unregister this device from push notifications.', error);
      showToast('Could not finish signing out safely. Please try again.', 'error');
      return;
    }
    setIncomingChat(null);
    setActiveChatGroupId(null);
    setActiveUserId(null);
    localStorage.removeItem('rs_active_user_id');
    navigateTo({ view: 'dashboard', dashboardTab: 'groups' }, { replace: true });
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

  const updateUser = async (userId, updates) => {
    if (db) {
      await setDoc(doc(db, 'users', userId), updates, { merge: true });
      if (incomingChat && updates.mutedGroupIds?.includes(incomingChat.groupId)) setIncomingChat(null);
      return;
    }
    setUsers((previous) => {
      const next = previous.map((user) => (user.id === userId ? { ...user, ...updates } : user));
      localStorage.setItem('rs_users', JSON.stringify(next));
      return next;
    });
    if (incomingChat && updates.mutedGroupIds?.includes(incomingChat.groupId)) setIncomingChat(null);
  };

  const saveNotifications = async (newNotifications) => {
    const deliverableNotifications = newNotifications.filter((notification) => {
      const recipient = users.find((user) => user.id === notification.recipientId);
      return !notification.groupId || !recipient?.mutedGroupIds?.includes(notification.groupId);
    });
    if (!deliverableNotifications.length) return;
    if (db) {
      await Promise.all(deliverableNotifications.map((notification) => (
        setDoc(doc(db, 'notifications', notification.id), notification)
      )));
      return;
    }
    setNotifications((previous) => {
      const next = [...previous, ...deliverableNotifications];
      localStorage.setItem('rs_notifications', JSON.stringify(next));
      return next;
    });
  };

  const markNotificationsRead = async (notificationIds) => {
    if (!notificationIds.length) return;
    if (db) {
      await Promise.all(notificationIds.map((notificationId) => (
        setDoc(doc(db, 'notifications', notificationId), { read: true }, { merge: true })
      )));
      return;
    }
    setNotifications((previous) => {
      const next = previous.map((notification) => (
        notificationIds.includes(notification.id) ? { ...notification, read: true } : notification
      ));
      localStorage.setItem('rs_notifications', JSON.stringify(next));
      return next;
    });
  };

  const clearNotifications = async (notificationIds) => {
    const requestedIds = new Set(notificationIds);
    const ownedNotifications = notifications.filter((notification) => (
      requestedIds.has(notification.id) && notification.recipientId === activeUserId
    ));
    if (!ownedNotifications.length) return;

    const deletedIds = new Set(ownedNotifications.map((notification) => notification.id));
    if (db) {
      await Promise.all(ownedNotifications.map((notification) => (
        deleteDoc(doc(db, 'notifications', notification.id))
      )));
    } else {
      localStorage.setItem('rs_notifications', JSON.stringify(
        notifications.filter((notification) => !deletedIds.has(notification.id))
      ));
    }
    setNotifications((previous) => previous.filter((notification) => !deletedIds.has(notification.id)));
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
      const next = [...previous.filter((expense) => expense.id !== newExpense.id), newExpense];
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

  const deleteGroup = async (group) => {
    if (group.createdBy !== activeUserId) {
      throw new Error('Only the group admin can delete this group.');
    }

    const groupExpenses = expenses.filter((expense) => expense.groupId === group.id);
    const { balances } = calculateSettlements(groupExpenses, group.members);
    if (Object.values(balances).some((balance) => Math.abs(balance) >= GROUP_DELETE_BALANCE_TOLERANCE)) {
      throw new Error('Settle all group balances of ₹1 or more before deleting this group.');
    }

    navigateTo({ view: 'dashboard', dashboardTab: 'groups' }, { replace: true });

    if (db) {
      await Promise.all(groupExpenses.map((expense) => deleteDoc(doc(db, 'expenses', expense.id))));
      await deleteDoc(doc(db, 'groups', group.id));
    } else {
      setExpenses((previous) => {
        const next = previous.filter((expense) => expense.groupId !== group.id);
        localStorage.setItem('rs_expenses', JSON.stringify(next));
        return next;
      });
      setGroups((previous) => {
        const next = previous.filter((item) => item.id !== group.id);
        localStorage.setItem('rs_groups', JSON.stringify(next));
        return next;
      });
    }

  };

  const activeGroup = groups.find((group) => (
    group.id === currentGroupRoute
    || getGroupSlug(group.name, group.id) === currentGroupRoute
  ));
  const pushUserId = activeUser?.id;
  useEffect(() => {
    if (!pushUserId) return;
    requestNotificationPermission({ id: pushUserId }).then((result) => {
      if (!result.success) console.warn('Push notifications are unavailable:', result.error);
    });
  }, [pushUserId]);

  useEffect(() => {
    return setPushNotificationActionHandler((notification) => {
      if (!activeUserId || notification.data?.recipientId !== activeUserId) return;
      const notificationGroup = groups.find((group) => group.id === notification.data?.groupId);
      if (notificationGroup && navigateToRef.current) {
        navigateToRef.current({
          view: 'group',
          groupId: notificationGroup.id,
          groupName: notificationGroup.name,
          initialTab: 'expenses',
        });
      }
    });
  }, [activeUserId, groups]);

  const visibleNotifications = notifications.filter((notification) => {
    const timestamp = getNotificationTimestamp(notification.createdAt);
    return notification.recipientId === activeUserId
      && (!notification.groupId || !mutedGroupIds.includes(notification.groupId))
      && (timestamp === null || timestamp >= notificationCutoff);
  });

  if (window.location.pathname === '/admin') {
    return <AdminPanel />;
  }

  if (loading) {
    return (
      <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-slate-50">
        <div className="relative flex items-center justify-center mb-4">
          <img src={roomsplitIcon} alt="RoomSplit" className="w-16 h-16 rounded-2xl shadow-lg shadow-indigo-100 object-contain animate-pulse" />
        </div>
        <p className="text-slate-600 font-semibold text-sm">RoomSplit</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] flex flex-col bg-slate-50 relative overflow-hidden font-sans">
      <Toast toast={toast} />
      {incomingChat && (
        <IncomingChatAlert
          key={incomingChat.id}
          message={incomingChat}
          sender={users.find((user) => user.id === incomingChat.senderId)}
          group={groups.find((group) => group.id === incomingChat.groupId)}
          onClose={() => setIncomingChat(null)}
          onOpen={() => {
            const incomingGroup = groups.find((group) => group.id === incomingChat.groupId);
            setIncomingChat(null);
            if (incomingGroup) {
              navigateTo({
                view: 'group',
                groupId: incomingGroup.id,
                groupName: incomingGroup.name,
                initialTab: 'chat',
              });
            }
          }}
        />
      )}
      {!activeUser ? (
        <AuthScreen users={users} onSaveUser={saveUser} onLogin={handleLogin} />
      ) : currentView === 'dashboard' ? (
        <Dashboard
          key={dashboardTab}
          user={activeUser}
          initialTab={dashboardTab}
          groups={groups}
          expenses={expenses}
          onLogout={handleLogout}
          onOpenGroup={(id) => {
            const group = groups.find((item) => item.id === id);
            if (group) navigateTo({ view: 'group', groupId: group.id, groupName: group.name });
          }}
          onCreateGroup={() => navigateTo({ view: 'create_group' })}
          onJoinGroup={() => navigateTo({ view: 'join_group' })}
          onUpdateUser={updateUser}
          notifications={visibleNotifications}
          onMarkNotificationsRead={markNotificationsRead}
          onClearNotifications={clearNotifications}
          onTabChange={(tab) => navigateTo({ view: 'dashboard', dashboardTab: tab })}
          showToast={showToast}
        />
      ) : currentView === 'create_group' ? (
        <CreateGroupModal user={activeUser} onSaveGroup={saveGroup} onBack={goBack} showToast={showToast} />
      ) : currentView === 'join_group' ? (
        <JoinGroupModal
          user={activeUser}
          groups={groups}
          onUpdateGroup={updateGroup}
          initialCode={new URLSearchParams(window.location.search).get('join') || new URLSearchParams(window.location.search).get('invite') || ''}
          onBack={goBack}
          showToast={showToast}
        />
      ) : currentView === 'group' && activeGroup ? (
        <GroupView
          key={`${activeGroup.id}:${currentGroupInitialTab}`}
          group={activeGroup}
          initialTab={currentGroupInitialTab}
          initialDrawerOpen={currentGroupDrawerOpen}
          onGroupTabChange={(tab, { replace = false } = {}) => {
            navigateTo({
              view: 'group',
              groupId: activeGroup.id,
              groupName: activeGroup.name,
              initialTab: tab,
              drawerOpen: false,
            }, { replace });
          }}
          onOpenRoomOptions={() => {
            navigateTo({
              view: 'group',
              groupId: activeGroup.id,
              groupName: activeGroup.name,
              initialTab: 'expenses',
              drawerOpen: true,
            }, { replace: currentGroupInitialTab !== 'expenses' });
          }}
          onCloseRoomOptions={() => {
            navigateTo({
              view: 'group',
              groupId: activeGroup.id,
              groupName: activeGroup.name,
              initialTab: currentGroupInitialTab,
              drawerOpen: false,
            }, { replace: true });
          }}
          onActiveChatChange={setActiveChatGroupId}
          groups={groups}
          expenses={expenses.filter((expense) => expense.groupId === activeGroup.id)}
          onSaveExpense={saveExpense}
          onDeleteExpense={deleteExpense}
          onDeleteGroup={deleteGroup}
          onUpdateGroup={updateGroup}
          onSendNotification={saveNotifications}
          users={users}
          currentUser={activeUser}
          onBack={goBack}
          onNavigateDashboard={(tab) => {
            navigateTo({ view: 'dashboard', dashboardTab: tab });
          }}
          showToast={showToast}
        />
      ) : null}
    </div>
  );
}