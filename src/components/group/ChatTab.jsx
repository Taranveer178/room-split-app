import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { ImagePlus, MessageCircle, Phone, PhoneOff, Send, Smile, Sticker, Users as UsersIcon, Video, X } from 'lucide-react';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ChatTab({ group, currentUser, users }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [calls, setCalls] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [callTarget, setCallTarget] = useState('');
  const [activeCallId, setActiveCallId] = useState(null);
  const [showGroupCallOptions, setShowGroupCallOptions] = useState(false);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [picker, setPicker] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const messagesContainerRef = useRef(null);
  const receivedSnapshotRef = useRef(false);
  const positionedAtLatestRef = useRef(false);
  const shouldFollowRef = useRef(true);
  const fileInputRef = useRef(null);
  const eligibleMembers = group.members.filter((memberId) => memberId !== currentUser.id);
  const selectedCall = calls.find((call) => call.id === activeCallId);
  const joinedCall = selectedCall && (
    selectedCall.callType === 'group' ? selectedCall.status === 'active' : selectedCall.status === 'accepted'
  ) ? selectedCall : null;
  const incomingCall = calls.find((call) => (
    call.callType === 'direct'
    && call.toId === currentUser.id
    && call.status === 'ringing'
    && call.expiresAtMs > currentTime
  ));
  const activeGroupCall = calls.find((call) => (
    call.callType === 'group'
    && call.status === 'active'
    && call.expiresAtMs > currentTime
    && call.fromId !== currentUser.id
  ));
  const outgoingCall = calls.find((call) => (
    call.callType === 'direct'
    && call.fromId === currentUser.id
    && call.status === 'ringing'
    && call.expiresAtMs > currentTime
  ));

  const emojis = ['😀', '😂', '🥰', '😍', '😎', '😭', '😅', '🤔', '🙌', '👏', '👍', '👎', '🙏', '❤️', '💔', '🔥', '🎉', '✨', '💸', '🍕', '☕', '🏠', '✅', '❌'];
  const stickers = ['🥳', '💖', '🫶', '🤝', '🎂', '🧋', '🐱', '🐻', '🌈', '💯', '💤', '🚀'];

  useEffect(() => {
    const refreshTime = () => setCurrentTime(Date.now());
    refreshTime();
    const intervalId = window.setInterval(refreshTime, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const getUser = (userId) => {
    return users.find(u => u.id === userId) || { username: 'Roommate' };
  };

  const formatTime = (msg) => {
    if (!msg.timestamp && !msg.createdAt) return '';
    const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.timestamp || 0);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (!db || !group?.id) return;

    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, where('groupId', '==', group.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      msgs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.timestamp || 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.timestamp || 0);
        return timeA - timeB;
      });

      const container = messagesContainerRef.current;
      shouldFollowRef.current = !receivedSnapshotRef.current
        || !container
        || container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      receivedSnapshotRef.current = true;
      setMessages(msgs);
      setMessagesLoaded(true);
    }, (err) => {
      console.error("Firestore chat error:", err);
    });

    return () => unsubscribe();
  }, [group?.id]);

  useEffect(() => {
    if (!db || !group?.id) return undefined;
    const callsQuery = query(collection(db, 'calls'), where('groupId', '==', group.id));
    return onSnapshot(callsQuery, (snapshot) => {
      setCalls(snapshot.docs.map((callDoc) => ({ id: callDoc.id, ...callDoc.data() })));
    }, (error) => console.error('Firestore call listener error:', error));
  }, [group?.id]);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!messagesLoaded || !container || !shouldFollowRef.current) return;

    if (!positionedAtLatestRef.current) {
      container.scrollTop = container.scrollHeight;
      positionedAtLatestRef.current = true;
      return;
    }

    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages, messagesLoaded]);

  const sendMessage = async ({ text = '', type = 'text', mediaData = '' }) => {
    if (!db || isSending) return;
    setIsSending(true);
    setSendError('');

    try {
      await addDoc(collection(db, 'messages'), {
        groupId: group.id,
        senderId: currentUser.id,
        senderName: currentUser.username,
        text,
        type,
        mediaData,
        createdAt: serverTimestamp(),
      });

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`New message in ${group.name}`, {
          body: text || (type === 'sticker' ? 'Sent a sticker' : type === 'gif' ? 'Sent a GIF' : 'Sent an image'),
          icon: '/roomsplit-icon.webp',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setSendError('Message could not be sent. Please try again.');
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const cleanText = input.trim();
    if (!cleanText || !db || isSending) return;

    setInput('');
    try {
      await sendMessage({ text: cleanText });
    } catch {
      setInput(cleanText);
    }
  };

  const handleMediaSelect = async (event) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setSendError('');
    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
    if (!file.type.startsWith('image/') && !isGif) {
      setSendError('Choose an image or GIF file.');
      return;
    }

    try {
      let mediaData;
      if (isGif) {
        if (file.size > 500 * 1024) {
          throw new Error('GIFs must be smaller than 500 KB to send in chat.');
        }
        mediaData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Could not read this GIF.'));
          reader.readAsDataURL(file);
        });
      } else {
        if (file.size > 8 * 1024 * 1024) {
          throw new Error('Images must be smaller than 8 MB.');
        }
        const objectUrl = URL.createObjectURL(file);
        try {
          const image = await new Promise((resolve, reject) => {
            const loadedImage = new Image();
            loadedImage.onload = () => resolve(loadedImage);
            loadedImage.onerror = () => reject(new Error('Could not load this image.'));
            loadedImage.src = objectUrl;
          });
          const maxDimension = 960;
          const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Could not process this image.');
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          mediaData = canvas.toDataURL('image/jpeg', 0.75);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      }

      if (mediaData.length > 700_000) {
        throw new Error('This media file is too large to store in chat. Choose a smaller file.');
      }

      await sendMessage({ type: isGif ? 'gif' : 'image', mediaData });
    } catch (error) {
      setSendError(error.message || 'Media could not be sent. Please try again.');
    }
  };

  const handleStickerSelect = async (sticker) => {
    setPicker(null);
    try {
      await sendMessage({ text: sticker, type: 'sticker' });
    } catch {
      // The send error is shown below the composer.
    }
  };

  const appendEmoji = (emoji) => {
    setInput((previous) => `${previous}${emoji}`);
  };

  const togglePicker = (nextPicker) => {
    setPicker((current) => (current === nextPicker ? null : nextPicker));
    setSendError('');
  };

  const startCall = async (callType, targetId = null, mediaType = 'video') => {
    if (!db || isStartingCall || (callType === 'direct' && !targetId)) return;
    setIsStartingCall(true);
    setSendError('');
    try {
      const roomId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const callRef = await addDoc(collection(db, 'calls'), {
        groupId: group.id,
        callType,
        mediaType,
        fromId: currentUser.id,
        fromName: currentUser.username || 'Roommate',
        toId: targetId,
        roomName: `roomsplit-${roomId}`,
        status: callType === 'group' ? 'active' : 'ringing',
        expiresAtMs: Date.now() + 2 * 60 * 60 * 1000,
        createdAt: serverTimestamp(),
      });
      setActiveCallId(callRef.id);
      setShowGroupCallOptions(false);
    } catch (error) {
      console.error('Could not start call:', error);
      setSendError('Could not start the call. Check your connection and try again.');
    } finally {
      setIsStartingCall(false);
    }
  };

  const updateCall = async (call, updates) => {
    try {
      await updateDoc(doc(db, 'calls', call.id), updates);
    } catch (error) {
      console.error('Could not update call:', error);
      setSendError('Could not update the call. Check your connection and try again.');
    }
  };

  const handleLeaveCall = async () => {
    if (!selectedCall) return;
    const shouldEndRoom = selectedCall.callType === 'direct' || selectedCall.fromId === currentUser.id;
    if (shouldEndRoom) await updateCall(selectedCall, { status: 'ended' });
    setActiveCallId(null);
  };

  const joinCall = (call) => {
    setActiveCallId(call.id);
    if (call.callType === 'group') return;
    void updateCall(call, { status: 'accepted', acceptedBy: currentUser.id });
  };

  const renderMessageContent = (message) => {
    if ((message.type === 'image' || message.type === 'gif') && message.mediaData) {
      return (
        <img
          src={message.mediaData}
          alt={message.type === 'gif' ? 'GIF message' : 'Image message'}
          className="max-h-72 max-w-full rounded-xl object-contain"
          loading="lazy"
        />
      );
    }
    if (message.type === 'sticker') {
      return <p className="text-6xl leading-none" aria-label="Sticker">{message.text}</p>;
    }
    return <p className="whitespace-pre-wrap">{message.text}</p>;
  };

  const jitsiUrl = joinedCall
    ? `https://meet.jit.si/${encodeURIComponent(joinedCall.roomName)}#userInfo.displayName=${encodeURIComponent(currentUser.username || 'Roommate')}&config.startWithVideoMuted=${joinedCall.mediaType === 'voice'}`
    : '';

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-slate-100/70">
      <div className="flex flex-wrap items-center gap-2 bg-white border-b border-slate-200 px-3 py-2 flex-shrink-0">
        <select
          value={callTarget}
          onChange={(event) => setCallTarget(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700"
          aria-label="Choose roommate to call"
        >
          <option value="">Choose roommate</option>
          {eligibleMembers.map((memberId) => (
            <option key={memberId} value={memberId}>{getUser(memberId).username}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={!callTarget || isStartingCall}
          onClick={() => startCall('direct', callTarget, 'voice')}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-40"
          title="Start voice call"
        >
          <Phone size={15} /> Voice
        </button>
        <button
          type="button"
          disabled={!callTarget || isStartingCall}
          onClick={() => startCall('direct', callTarget, 'video')}
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-2 text-xs font-semibold text-indigo-700 disabled:opacity-40"
          title="Start video call"
        >
          <Video size={15} /> Video
        </button>
        <button
          type="button"
          disabled={isStartingCall}
          onClick={() => setShowGroupCallOptions((visible) => !visible)}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
          title="Group call options"
        >
          <UsersIcon size={15} /> Group
        </button>
      </div>

      {showGroupCallOptions && (
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 flex-shrink-0">
          <span className="text-xs font-medium text-slate-600">Start a group call</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isStartingCall}
              onClick={() => startCall('group', null, 'voice')}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
            >
              <Phone size={14} /> Voice
            </button>
            <button
              type="button"
              disabled={isStartingCall}
              onClick={() => startCall('group', null, 'video')}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-40"
            >
              <Video size={14} /> Video
            </button>
            <button type="button" onClick={() => setShowGroupCallOptions(false)} aria-label="Close group call options" className="p-1 text-slate-400">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {incomingCall && (
        <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-3 py-2 flex-shrink-0">
          <Phone size={16} className="text-emerald-700" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-emerald-900">
            {incomingCall.fromName} is calling ({incomingCall.mediaType})
          </span>
          <button type="button" onClick={() => joinCall(incomingCall)} className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white">
            Answer
          </button>
          <button type="button" onClick={() => void updateCall(incomingCall, { status: 'rejected' })} className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 border border-rose-200">
            Decline
          </button>
        </div>
      )}

      {outgoingCall && (
        <div className="flex items-center gap-2 border-b border-indigo-200 bg-indigo-50 px-3 py-2 flex-shrink-0">
          <Phone size={15} className="text-indigo-700" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-indigo-900">
            Calling {getUser(outgoingCall.toId).username}...
          </span>
          <button type="button" onClick={() => void updateCall(outgoingCall, { status: 'ended' })} className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 border border-rose-200">
            Cancel
          </button>
        </div>
      )}

      {activeGroupCall && !joinedCall && (
        <div className="flex items-center gap-2 border-b border-indigo-200 bg-indigo-50 px-3 py-2 flex-shrink-0">
          <UsersIcon size={16} className="text-indigo-700" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-indigo-900">
            {activeGroupCall.fromName} started a group {activeGroupCall.mediaType} call
          </span>
          <button type="button" onClick={() => joinCall(activeGroupCall)} className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white">
            Join
          </button>
        </div>
      )}

      {/* Scrollable Message List */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3.5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mb-3 shadow-inner">
              <MessageCircle size={28} />
            </div>
            <p className="font-semibold text-slate-700 text-sm">No messages yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              Chat, drop grocery lists, or discuss shared room expenses here!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const sender = getUser(msg.senderId);
            const timeString = formatTime(msg);

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'} items-end`}
              >
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 font-bold text-[11px] flex items-center justify-center flex-shrink-0 mb-1">
                    {sender.username.charAt(0).toUpperCase()}
                  </div>
                )}

                <div
                  className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-[14px] leading-relaxed shadow-sm break-words relative ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                  }`}
                >
                  {!isMe && (
                    <div className="text-[10px] font-bold text-indigo-600 tracking-wide mb-0.5">
                      {msg.senderName || sender.username}
                    </div>
                  )}

                  {renderMessageContent(msg)}

                  <div className={`text-[9px] text-right mt-1 font-medium ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {timeString}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {picker && (
        <div className="flex-shrink-0 border-t border-slate-200 bg-white p-3 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">
              {picker === 'emoji' ? 'Emoji' : 'Stickers'}
            </span>
            <button type="button" onClick={() => setPicker(null)} className="p-1.5 text-slate-400 hover:text-slate-700" aria-label="Close picker">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
            {(picker === 'emoji' ? emojis : stickers).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => (picker === 'emoji' ? appendEmoji(item) : handleStickerSelect(item))}
                className={`${picker === 'emoji' ? 'text-2xl' : 'text-3xl'} aspect-square rounded-lg hover:bg-slate-100 active:scale-95`}
                aria-label={picker === 'emoji' ? `Insert ${item}` : `Send sticker ${item}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-2.5 bg-white border-t border-slate-200/90 flex-shrink-0">
        {sendError && <p role="alert" className="px-2 pb-2 text-xs text-rose-600">{sendError}</p>}
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.gif"
            onChange={handleMediaSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            className="w-9 h-9 flex-shrink-0 rounded-full text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40"
            title="Send image or GIF"
            aria-label="Send image or GIF"
          >
            <ImagePlus size={19} className="mx-auto" />
          </button>
          <button
            type="button"
            onClick={() => togglePicker('sticker')}
            className={`w-9 h-9 flex-shrink-0 rounded-full hover:bg-slate-100 ${picker === 'sticker' ? 'text-indigo-600' : 'text-slate-500'}`}
            title="Send sticker"
            aria-label="Open sticker picker"
          >
            <Sticker size={19} className="mx-auto" />
          </button>
          <button
            type="button"
            onClick={() => togglePicker('emoji')}
            className={`w-9 h-9 flex-shrink-0 rounded-full hover:bg-slate-100 ${picker === 'emoji' ? 'text-indigo-600' : 'text-slate-500'}`}
            title="Insert emoji"
            aria-label="Open emoji picker"
          >
            <Smile size={19} className="mx-auto" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="min-w-0 flex-1 px-4 py-2.5 text-sm bg-slate-100 rounded-full border border-transparent focus:border-indigo-400 focus:bg-white outline-none transition-all placeholder:text-slate-400 text-slate-800"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 active:scale-95 disabled:opacity-40 transition-transform flex-shrink-0 shadow-sm"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {joinedCall && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {joinedCall.callType === 'group' ? `${group.name} group call` : `Call with ${joinedCall.fromId === currentUser.id ? getUser(joinedCall.toId).username : joinedCall.fromName}`}
              </p>
              <p className="text-xs text-slate-400">{joinedCall.mediaType === 'voice' ? 'Voice call' : 'Video call'}</p>
            </div>
            <button type="button" onClick={() => void handleLeaveCall()} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
              <PhoneOff size={16} /> {joinedCall.callType === 'group' && joinedCall.fromId !== currentUser.id ? 'Leave' : 'End call'}
            </button>
          </div>
          <iframe
            title="RoomSplit call"
            src={jitsiUrl}
            allow="camera; microphone; display-capture; autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            className="min-h-0 flex-1 border-0"
          />
        </div>
      )}
    </div>
  );
}