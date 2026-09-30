import { useEffect, useState } from 'react';
import {
  Bell,
  Boxes,
  ChevronRight,
  FilePlus2,
  LogOut,
  MessageCircle,
  Phone,
  Receipt,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';

const COLLECTIONS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'groups', label: 'Groups', icon: Boxes },
  { id: 'expenses', label: 'Transactions', icon: Receipt },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'calls', label: 'Calls', icon: Phone },
];

const DEFAULT_RECORDS = {
  users: { username: 'New user', password: '', createdAt: new Date().toISOString() },
  groups: { name: 'New group', members: [], inviteCode: '' },
  expenses: { title: 'New transaction', groupId: '', paidBy: '', totalAmount: '0.00', splits: {} },
  messages: { groupId: '', senderId: '', senderName: '', text: '' },
  notifications: { recipientId: '', message: '', read: false },
  calls: { groupId: '', callType: 'group', mediaType: 'video', status: 'ended' },
};

async function readResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

function recordTitle(collectionId, record) {
  if (collectionId === 'users') return record.username || record.email || record.id;
  if (collectionId === 'groups') return record.name || record.id;
  if (collectionId === 'expenses') return record.title || record.id;
  if (collectionId === 'messages') return record.text || record.attachmentName || 'Media message';
  if (collectionId === 'notifications') return record.message || record.id;
  return `${record.callType || 'Call'} ${record.mediaType || ''}`.trim() || record.id;
}

function recordSubtitle(collectionId, record) {
  if (collectionId === 'users') return record.email || record.id;
  if (collectionId === 'groups') return `${record.members?.length || 0} members · ${record.inviteCode || record.id}`;
  if (collectionId === 'expenses') return `₹${record.totalAmount || '0'} · ${record.date || record.groupId || ''}`;
  if (collectionId === 'messages') return `${record.senderName || record.senderId || 'Unknown'} · ${record.createdAt || ''}`;
  if (collectionId === 'notifications') return `${record.read ? 'Read' : 'Unread'} · ${record.recipientId || ''}`;
  return `${record.status || 'Unknown status'} · ${record.groupId || ''}`;
}

export default function AdminPanel() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [activeCollection, setActiveCollection] = useState('users');
  const [records, setRecords] = useState([]);
  const [loadedCollection, setLoadedCollection] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editorText, setEditorText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let isCurrent = true;
    fetch('/api/admin/session', { credentials: 'same-origin' })
      .then(readResponse)
      .then((result) => {
        if (isCurrent && result.authenticated) setSession(result);
      })
      .catch((requestError) => {
        if (isCurrent && requestError.message !== 'Admin login is not configured') {
          setError(requestError.message.includes('Failed to fetch')
            ? 'Admin API is unavailable. Run this app with Vercel Dev or use its deployed URL.'
            : requestError.message);
        } else if (isCurrent) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (isCurrent) setCheckingSession(false);
      });

    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    let isCurrent = true;

    fetch(`/api/admin/data?collection=${encodeURIComponent(activeCollection)}`, { credentials: 'same-origin' })
      .then(readResponse)
      .then((result) => {
        if (!isCurrent) return;
        setRecords(result.records || []);
        setTruncated(Boolean(result.truncated));
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.message);
      })
      .finally(() => {
        if (isCurrent) setLoadedCollection(activeCollection);
      });

    return () => { isCurrent = false; };
  }, [session, activeCollection]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await readResponse(await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      }));
      setSession(result);
      setLoginPassword('');
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      setSession(null);
      setRecords([]);
      setSelectedRecord(null);
      setEditorText('');
    }
  };

  const refreshRecords = async () => {
    setLoadingRecords(true);
    setError('');
    try {
      const result = await readResponse(await fetch(
        `/api/admin/data?collection=${encodeURIComponent(activeCollection)}`,
        { credentials: 'same-origin' },
      ));
      setRecords(result.records || []);
      setTruncated(Boolean(result.truncated));
      if (selectedRecord?.id) {
        const refreshed = result.records?.find((record) => record.id === selectedRecord.id);
        if (refreshed) {
          setSelectedRecord(refreshed);
          setEditorText(JSON.stringify(refreshed, null, 2));
        }
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleCreate = () => {
    const draft = DEFAULT_RECORDS[activeCollection];
    setSelectedRecord(null);
    setEditorText(JSON.stringify(draft, null, 2));
    setConfirmDelete(false);
    setNotice('New record');
    setError('');
  };

  const handleSelectRecord = async (record) => {
    setSelectedRecord(record);
    setEditorText(JSON.stringify(record, null, 2));
    setConfirmDelete(false);
    setNotice('');
    setError('');
  };

  const handleSaveRecord = async () => {
    let record;
    try {
      record = JSON.parse(editorText);
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        throw new Error('Record must be a JSON object.');
      }
    } catch (parseError) {
      setError(parseError.message || 'Enter valid JSON.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const isUpdate = Boolean(selectedRecord?.id);
      const query = new URLSearchParams({ collection: activeCollection });
      if (isUpdate) query.set('id', selectedRecord.id);
      const response = await fetch(`/api/admin/data?${query}`, {
        method: isUpdate ? 'PATCH' : 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record }),
      });
      const result = await readResponse(response);
      const updatedRecord = result.record;
      setSelectedRecord(updatedRecord);
      setEditorText(JSON.stringify(updatedRecord, null, 2));
      setNotice(isUpdate ? 'Record updated' : 'Record created');
      const listResult = await readResponse(await fetch(
        `/api/admin/data?collection=${encodeURIComponent(activeCollection)}`,
        { credentials: 'same-origin' },
      ));
      setRecords(listResult.records || []);
      setTruncated(Boolean(listResult.truncated));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!selectedRecord?.id) return;
    setSaving(true);
    setError('');
    try {
      const query = new URLSearchParams({ collection: activeCollection, id: selectedRecord.id });
      await readResponse(await fetch(`/api/admin/data?${query}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      }));
      setRecords((previous) => previous.filter((record) => record.id !== selectedRecord.id));
      setSelectedRecord(null);
      setEditorText('');
      setConfirmDelete(false);
      setNotice('Record deleted');
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredRecords = records.filter((record) => (
    `${recordTitle(activeCollection, record)} ${recordSubtitle(activeCollection, record)} ${record.id}`
      .toLowerCase()
      .includes(searchText.trim().toLowerCase())
  ));
  const ActiveIcon = COLLECTIONS.find((item) => item.id === activeCollection)?.icon || Boxes;

  if (checkingSession) {
    return <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">Checking admin session...</div>;
  }

  if (!session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-8">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
            <ShieldCheck size={21} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">RoomSplit</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Admin sign in</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">This area is restricted to the super administrator.</p>
          {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}
          <form onSubmit={handleLogin} className="mt-5 space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Username
              <input value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} autoComplete="username" required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} autoComplete="current-password" required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
            <button type="submit" disabled={saving} className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
              {saving ? 'Signing in...' : 'Sign in securely'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><ShieldCheck size={20} /></div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold sm:text-lg">Super Admin</h1>
              <p className="truncate text-xs text-slate-500">Signed in as {session.username}</p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <a href="/" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:inline-flex">Open app</a>
            <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" title="Sign out">
              <LogOut size={16} /><span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        <nav aria-label="Manage data" className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {COLLECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveCollection(id);
                setSearchText('');
                setNotice('');
                setError('');
                setSelectedRecord(null);
                setEditorText('');
                setConfirmDelete(false);
              }}
              className={`inline-flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                activeCollection === id ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} />{label}
            </button>
          ))}
        </nav>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(290px,0.8fr)_minmax(0,1.2fr)]">
          <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-3 sm:p-4">
              <div className="flex min-w-0 items-center gap-2">
                <ActiveIcon size={18} className="flex-shrink-0 text-indigo-600" />
                <h2 className="truncate text-sm font-bold sm:text-base">{COLLECTIONS.find((item) => item.id === activeCollection)?.label}</h2>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{records.length}{truncated ? '+' : ''}</span>
              </div>
              <div className="flex flex-shrink-0 gap-1">
                <button type="button" onClick={() => void refreshRecords()} disabled={loadingRecords} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" title="Refresh records" aria-label="Refresh records">
                  <RefreshCw size={16} className={loadingRecords ? 'animate-spin' : ''} />
                </button>
                <button type="button" onClick={handleCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 sm:px-3 sm:text-sm">
                  <FilePlus2 size={15} /> New
                </button>
              </div>
            </div>

            <label className="relative block border-b border-slate-100 px-3 py-2.5 sm:px-4">
              <Search size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 sm:left-7" />
              <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search records" className="w-full rounded-lg bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
            </label>

            {error && <p role="alert" className="mx-3 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 sm:mx-4">{error}</p>}
            {notice && <p role="status" className="mx-3 mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 sm:mx-4">{notice}</p>}
            {truncated && <p className="px-4 pt-3 text-xs text-amber-700">Showing the first 500 records. Refine your search or delete/archive old records.</p>}

            <div className="max-h-[55dvh] min-h-48 overflow-y-auto lg:max-h-[calc(100dvh-250px)]">
              {loadingRecords || loadedCollection !== activeCollection ? (
                <p className="p-6 text-center text-sm text-slate-500">Loading records...</p>
              ) : filteredRecords.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">No matching records.</p>
              ) : filteredRecords.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => void handleSelectRecord(record)}
                  className={`flex w-full min-w-0 items-center gap-3 border-b border-slate-100 px-3 py-3 text-left transition-colors last:border-b-0 sm:px-4 ${
                    selectedRecord?.id === record.id ? 'bg-indigo-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{recordTitle(activeCollection, record)}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{recordSubtitle(activeCollection, record)}</p>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">{record.id}</p>
                  </div>
                  <ChevronRight size={16} className="flex-shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-3 sm:px-4">
              <div className="min-w-0">
                <h2 className="text-sm font-bold sm:text-base">{selectedRecord ? 'Edit record' : editorText ? 'Create record' : 'Record details'}</h2>
                {selectedRecord && <p className="truncate font-mono text-[10px] text-slate-500">{selectedRecord.id}</p>}
              </div>
              {editorText && (
                <button type="button" onClick={() => { setSelectedRecord(null); setEditorText(''); setConfirmDelete(false); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" title="Close editor" aria-label="Close editor">
                  <X size={17} />
                </button>
              )}
            </div>

            {editorText ? (
              <div className="p-3 sm:p-4">
                {activeCollection === 'users' && (
                  <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                    Passwords and push tokens are hidden. Updating with a new <code>password</code> field resets the app password; omitted fields are preserved.
                  </p>
                )}
                <label className="block text-xs font-semibold text-slate-600" htmlFor="record-json">Record JSON</label>
                <textarea
                  id="record-json"
                  value={editorText}
                  onChange={(event) => setEditorText(event.target.value)}
                  spellCheck="false"
                  className="mt-2 min-h-[44dvh] w-full resize-y rounded-lg border border-slate-300 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:min-h-[55dvh]"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={() => void handleSaveRecord()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                    <Save size={16} />{saving ? 'Saving...' : selectedRecord ? 'Save changes' : 'Create record'}
                  </button>
                  {selectedRecord && (
                    confirmDelete ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-700">Delete permanently?</span>
                        <button type="button" onClick={() => void handleDeleteRecord()} disabled={saving} className="rounded-lg bg-rose-600 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">Confirm</button>
                        <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600">Cancel</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                        <Trash2 size={15} />Delete
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center text-slate-500">
                <ActiveIcon size={30} className="mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">Select a record to manage it</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed">Create, inspect, update, or permanently delete {COLLECTIONS.find((item) => item.id === activeCollection)?.label.toLowerCase()} records.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
