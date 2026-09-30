import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ChatTab({ group, currentUser, users }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  const getUser = (userId) => {
    return users.find(u => u.id === userId) || { username: 'Roommate' };
  };

  const formatTime = (msg) => {
    if (!msg.timestamp && !msg.createdAt) return '';
    const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.timestamp || Date.now());
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

      setMessages(msgs);
    }, (err) => {
      console.error("Firestore chat error:", err);
    });

    return () => unsubscribe();
  }, [group?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const cleanText = input.trim();
    if (!cleanText || !db) return;

    setInput('');

    try {
      // 1. Save to Firebase Firestore
      await addDoc(collection(db, 'messages'), {
        groupId: group.id,
        senderId: currentUser.id,
        senderName: currentUser.username,
        text: cleanText,
        timestamp: Date.now(),
        createdAt: serverTimestamp()
      });

      // 2. Trigger Notification right here after successful send
      if (Notification.permission === 'granted') {
        new Notification(`New message in ${group.name}`, {
          body: `${currentUser.username}: ${cleanText}`,
          icon: '/roomsplit-icon.webp'
        });
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-100/70">
      {/* Scrollable Message List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3.5">
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

                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  <div className={`text-[9px] text-right mt-1 font-medium ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {timeString}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Floating Modern Message Input Bar */}
      <div className="p-2.5 bg-white border-t border-slate-200/90 flex-shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 text-sm bg-slate-100 rounded-full border border-transparent focus:border-indigo-400 focus:bg-white outline-none transition-all placeholder:text-slate-400 text-slate-800"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 active:scale-95 disabled:opacity-40 transition-transform flex-shrink-0 shadow-sm"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}