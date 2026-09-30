import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Download, ImagePlus, MessageCircle, Paperclip, Send, Smile, Sticker, X } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const EMOJIS = ['😀', '😂', '🥰', '😍', '😎', '😭', '😅', '🤔', '🙌', '👏', '👍', '👎', '🙏', '❤️', '🔥', '🎉', '✨', '💸', '🍕', '☕', '🏠', '✅', '❌'];
const STICKERS = ['🥳', '💖', '🫶', '🤝', '🎂', '🧋', '🐱', '🐻', '🌈', '💯', '💤', '🚀'];

export default function ChatTab({ group, currentUser, users }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [picker, setPicker] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

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

      setMessages(msgs);
    }, (err) => {
      console.error("Firestore chat error:", err);
    });

    return () => unsubscribe();
  }, [group?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selectedImage) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage]);

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

  const appendEmoji = (emoji) => {
    setInput((previous) => `${previous}${emoji}`);
  };

  const handleSendSticker = async (sticker) => {
    setPicker(null);
    if (!db) return;
    try {
      await addDoc(collection(db, 'messages'), {
        groupId: group.id,
        senderId: currentUser.id,
        senderName: currentUser.username,
        text: sticker,
        type: 'sticker',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error sending sticker:', error);
      setAttachmentError('Sticker could not be sent. Please try again.');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || !db || uploading) return;

    setAttachmentError('');
    const lowerName = file.name.toLowerCase();
    const isGif = file.type === 'image/gif' || lowerName.endsWith('.gif');
    const isImage = file.type.startsWith('image/') && !isGif;
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.zip'];
    const isDocument = documentExtensions.some((extension) => lowerName.endsWith(extension))
      || file.type === 'application/pdf'
      || file.type === 'text/plain'
      || file.type === 'text/csv';

    if (!isImage && !isGif && !isVideo && !isAudio && !isDocument) {
      setAttachmentError('Choose an image, video, audio, PDF, Office, text, CSV, or ZIP file.');
      return;
    }
    if (!isImage && file.size > 450 * 1024) {
      setAttachmentError('Files must be 450 KB or smaller with Firestore storage.');
      return;
    }
    if (isImage && file.size > 8 * 1024 * 1024) {
      setAttachmentError('Choose an image smaller than 8 MB.');
      return;
    }

    setUploading(true);
    try {
      let attachmentData;
      if (isImage) {
        const objectUrl = URL.createObjectURL(file);
        try {
          const image = await new Promise((resolve, reject) => {
            const loadedImage = new Image();
            loadedImage.onload = () => resolve(loadedImage);
            loadedImage.onerror = () => reject(new Error('Could not load this image.'));
            loadedImage.src = objectUrl;
          });
          const scale = Math.min(1, 960 / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Could not process this image.');

          for (let attempt = 0; attempt < 4; attempt += 1) {
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            attachmentData = canvas.toDataURL('image/jpeg', 0.75 - attempt * 0.1);
            if (attachmentData.length <= 640 * 1024) break;
            canvas.width = Math.max(1, Math.round(canvas.width * 0.8));
            canvas.height = Math.max(1, Math.round(canvas.height * 0.8));
          }
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
        if (attachmentData.length > 640 * 1024) {
          throw new Error('This image is still too large after compression. Choose another image.');
        }
      } else {
        attachmentData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Could not read this file.'));
          reader.readAsDataURL(file);
        });
      }

      const attachmentType = isGif ? 'gif' : isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'document';
      await addDoc(collection(db, 'messages'), {
        groupId: group.id,
        senderId: currentUser.id,
        senderName: currentUser.username,
        text: '',
        attachmentType,
        attachmentName: file.name,
        attachmentMimeType: isImage ? 'image/jpeg' : file.type || 'application/octet-stream',
        attachmentData,
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error uploading chat attachment:', error);
      setAttachmentError(error.message || 'Could not send this file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const renderAttachment = (message) => {
    const attachmentData = message.attachmentData || message.mediaData;
    const attachmentType = message.attachmentType || message.type;
    const downloadName = message.attachmentName || 'chat-attachment';
    const downloadLink = (
      <a
        href={attachmentData}
        download={downloadName}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
      >
        <Download size={14} /> Download
      </a>
    );

    if (attachmentType === 'image' || attachmentType === 'gif') {
      return (
        <div className="space-y-2">
          <button type="button" onClick={() => setSelectedImage({ ...message, attachmentData })} className="block max-w-full" title="Open image full screen">
            <img src={attachmentData} alt={downloadName} className="max-h-64 max-w-full rounded-xl object-contain" loading="lazy" />
          </button>
          {downloadLink}
        </div>
      );
    }

    if (attachmentType === 'video') {
      return (
        <div className="space-y-2">
          <video src={attachmentData} controls preload="metadata" className="max-h-64 max-w-full rounded-xl" />
          <p className="max-w-52 truncate text-xs">{downloadName}</p>
          {downloadLink}
        </div>
      );
    }

    if (attachmentType === 'audio') {
      return (
        <div className="w-full min-w-52 space-y-2">
          <audio src={attachmentData} controls preload="metadata" className="w-full" />
          <p className="max-w-52 truncate text-xs">{downloadName}</p>
          {downloadLink}
        </div>
      );
    }

    return (
      <div className="flex max-w-56 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-slate-900 shadow-sm">
        <Paperclip size={18} className="flex-shrink-0 text-indigo-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-900" title={downloadName}>{downloadName}</p>
          <div className="mt-1">{downloadLink}</div>
        </div>
      </div>
    );
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
            const avatar = sender.photoDataUrl ? (
              <img
                src={sender.photoDataUrl}
                alt={`${sender.username || 'Roommate'} profile`}
                className="mb-1 h-7 w-7 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="mb-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">
                {(sender.username || 'R').charAt(0).toUpperCase()}
              </div>
            );

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'} items-end`}
              >
                {!isMe && avatar}

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

                  {msg.attachmentData || msg.mediaData
                    ? renderAttachment(msg)
                    : msg.type === 'sticker'
                      ? <p className="text-6xl leading-none" aria-label="Sticker">{msg.text}</p>
                      : <p className="whitespace-pre-wrap">{msg.text}</p>}

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
      <div className="flex-shrink-0 border-t border-slate-200/80 bg-white px-3 py-3 sm:px-4">
        {attachmentError && <p role="alert" className="px-2 pb-2 text-xs text-rose-600">{attachmentError}</p>}
        {picker && (
          <div className="mb-2 border border-slate-200 bg-slate-50 rounded-xl p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600">
                {picker === 'emoji' ? 'Emoji' : 'Stickers'}
              </span>
              <button type="button" onClick={() => setPicker(null)} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Close picker">
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-8 gap-1 max-h-36 overflow-y-auto">
              {(picker === 'emoji' ? EMOJIS : STICKERS).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => (picker === 'emoji' ? appendEmoji(item) : void handleSendSticker(item))}
                  className={`${picker === 'emoji' ? 'text-2xl' : 'text-3xl'} aspect-square rounded-lg hover:bg-white active:scale-95`}
                  aria-label={picker === 'emoji' ? `Insert ${item}` : `Send sticker ${item}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={handleSend} className="flex min-w-0 items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5 shadow-sm sm:gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white hover:text-indigo-600 disabled:opacity-40"
            title="Upload image, document, video, or audio"
            aria-label="Upload attachment"
          >
            {uploading ? <span className="text-[10px]">...</span> : <ImagePlus size={18} />}
          </button>
          <button
            type="button"
            onClick={() => setPicker((current) => (current === 'emoji' ? null : 'emoji'))}
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-white ${picker === 'emoji' ? 'text-indigo-600' : 'text-slate-500'}`}
            title="Insert emoji"
            aria-label="Open emoji picker"
          >
            <Smile size={18} />
          </button>
          <button
            type="button"
            onClick={() => setPicker((current) => (current === 'sticker' ? null : 'sticker'))}
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-white ${picker === 'sticker' ? 'text-indigo-600' : 'text-slate-500'}`}
            title="Send sticker"
            aria-label="Open sticker picker"
          >
            <Sticker size={18} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 sm:px-3"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition-colors hover:bg-indigo-700 active:scale-95 disabled:opacity-40"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen image preview"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/20"
            aria-label="Back to chat"
          >
            <ArrowLeft size={19} />
            <span>Back to chat</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Close image"
          >
            <X size={22} />
          </button>
          <img
            src={selectedImage.attachmentData}
            alt={selectedImage.attachmentName || 'Chat image'}
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          <a
            href={selectedImage.attachmentData}
            download={selectedImage.attachmentName || 'chat-image'}
            onClick={(event) => event.stopPropagation()}
            className="absolute bottom-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900"
          >
            <Download size={16} /> Download image
          </a>
        </div>
      )}
    </div>
  );
}