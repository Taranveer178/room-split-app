import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Download, 
  ImagePlus, 
  MessageCircle, 
  Paperclip, 
  Send, 
  Smile, 
  Sticker, 
  X,
  Sparkles,
  FileText
} from 'lucide-react';
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
      await addDoc(collection(db, 'messages'), {
        groupId: group.id,
        senderId: currentUser.id,
        senderName: currentUser.username,
        text: cleanText,
        timestamp: Date.now(),
        createdAt: serverTimestamp()
      });

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
    const isMe = message.senderId === currentUser.id;

    const downloadLink = (
      <a
        href={attachmentData}
        download={downloadName}
        className={`inline-flex items-center gap-1.5 text-xs font-bold transition-opacity hover:opacity-80 ${
          isMe ? 'text-white/90 underline' : 'text-blue-600 hover:underline'
        }`}
      >
        <Download size={13} /> Download
      </a>
    );

    if (attachmentType === 'image' || attachmentType === 'gif') {
      return (
        <div className="space-y-2">
          <button 
            type="button" 
            onClick={() => setSelectedImage({ ...message, attachmentData })} 
            className="block max-w-full overflow-hidden rounded-2xl border border-white/20 shadow-sm transition-transform active:scale-98" 
            title="Open image full screen"
          >
            <img src={attachmentData} alt={downloadName} className="max-h-64 max-w-full rounded-2xl object-cover" loading="lazy" />
          </button>
          <div className="flex justify-end">{downloadLink}</div>
        </div>
      );
    }

    if (attachmentType === 'video') {
      return (
        <div className="space-y-2" style={{ width: 'min(65vw, 24rem)', maxWidth: '100%' }}>
          <VideoPlayer src={attachmentData} mimeType={message.attachmentMimeType} />
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="max-w-full truncate text-[11px] opacity-80" title={downloadName}>{downloadName}</p>
            {downloadLink}
          </div>
        </div>
      );
    }

    if (attachmentType === 'audio') {
      return (
        <div className="w-full min-w-52 space-y-2">
          <audio src={attachmentData} controls preload="metadata" className="w-full accent-blue-600" />
          <div className="flex items-center justify-between text-[11px] pt-1">
            <p className="max-w-40 truncate opacity-80">{downloadName}</p>
            {downloadLink}
          </div>
        </div>
      );
    }

    return (
      <div className={`flex max-w-56 items-center gap-3 rounded-2xl p-3 shadow-xs border ${
        isMe 
          ? 'bg-white/15 border-white/20 text-white' 
          : 'bg-white border-slate-200/80 text-slate-800'
      }`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isMe ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
        }`}>
          <FileText size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold" title={downloadName}>{downloadName}</p>
          <div className="mt-1">{downloadLink}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white/80 to-slate-50">
      
      {/* Background ambient lighting */}
      <div className="absolute top-10 right-10 w-80 h-80 bg-blue-300/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-indigo-300/10 rounded-full blur-3xl pointer-events-none" />

      {/* Scrollable Message List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-4 relative z-10 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-50 to-indigo-100/70 border border-blue-200/60 text-blue-600 flex items-center justify-center mb-3 shadow-inner">
              <MessageCircle size={30} />
            </div>
            <p className="font-extrabold text-slate-900 text-base">No messages yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-relaxed">
              Chat, drop grocery lists, receipts, or discuss room expenses in this space!
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
                className="mb-1 h-7 w-7 flex-shrink-0 rounded-full object-cover shadow-2xs border border-white"
              />
            ) : (
              <div className="mb-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-50 to-indigo-100 border border-blue-200/50 text-[11px] font-black text-blue-700 shadow-2xs">
                {(sender.username || 'R').charAt(0).toUpperCase()}
              </div>
            );

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'} items-end group`}
              >
                {!isMe && avatar}

                <div
                  className={`max-w-[82%] sm:max-w-[70%] px-4 py-2.5 rounded-[22px] text-[13.5px] leading-relaxed break-words relative transition-all ${
                    isMe
                      ? 'bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 text-white rounded-br-sm shadow-md shadow-blue-500/20'
                      : 'bg-white/90 backdrop-blur-md text-slate-800 border border-white/80 rounded-bl-sm shadow-[0_4px_16px_rgba(15,23,42,0.04)]'
                  }`}
                >
                  {!isMe && (
                    <div className="text-[10px] font-black text-blue-600 tracking-wider uppercase mb-0.5">
                      {msg.senderName || sender.username}
                    </div>
                  )}

                  {msg.attachmentData || msg.mediaData
                    ? renderAttachment(msg)
                    : msg.type === 'sticker'
                      ? <p className="text-6xl py-1 leading-none" aria-label="Sticker">{msg.text}</p>
                      : <p className="whitespace-pre-wrap font-normal">{msg.text}</p>}

                  <div className={`text-[9.5px] text-right mt-1 font-semibold tracking-tight ${
                    isMe ? 'text-blue-100/90' : 'text-slate-400'
                  }`}>
                    {timeString}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Floating Liquid Glass Input Bar (Elevated) */}
      <div className="relative z-20 px-3 pb-6 sm:px-6 pt-2">
        {attachmentError && (
          <div className="max-w-3xl mx-auto mb-2 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold border border-rose-200/80 animate-in fade-in duration-150">
            {attachmentError}
          </div>
        )}

        {/* Emoji / Sticker Tray (Liquid Glass popover) */}
        {picker && (
          <div className="max-w-3xl mx-auto mb-3 rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/70 p-3 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {picker === 'emoji' ? 'Choose Emoji' : 'Pick Sticker'}
              </span>
              <button 
                type="button" 
                onClick={() => setPicker(null)} 
                className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 transition-colors" 
                aria-label="Close picker"
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto scrollbar-hide p-1">
              {(picker === 'emoji' ? EMOJIS : STICKERS).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => (picker === 'emoji' ? appendEmoji(item) : void handleSendSticker(item))}
                  className={`${picker === 'emoji' ? 'text-2xl' : 'text-3xl'} aspect-square rounded-2xl hover:bg-blue-50 active:scale-90 transition-all flex items-center justify-center`}
                  aria-label={picker === 'emoji' ? `Insert ${item}` : `Send sticker ${item}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Floating Input Capsule */}
        <form 
          onSubmit={handleSend} 
          className="max-w-3xl mx-auto flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-full bg-white/85 backdrop-blur-2xl border border-white/80 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.1)] transition-all focus-within:ring-2 focus-within:ring-blue-500/20"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Media Attachment Action */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-40"
            title="Upload photo, doc or media"
            aria-label="Upload attachment"
          >
            {uploading ? (
              <span className="text-[10px] font-bold text-blue-600 animate-pulse">...</span>
            ) : (
              <ImagePlus size={19} />
            )}
          </button>

          {/* Emoji Toggle */}
          <button
            type="button"
            onClick={() => setPicker((current) => (current === 'emoji' ? null : 'emoji'))}
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${
              picker === 'emoji' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
            }`}
            title="Insert emoji"
            aria-label="Open emoji picker"
          >
            <Smile size={19} />
          </button>

          {/* Sticker Toggle */}
          <button
            type="button"
            onClick={() => setPicker((current) => (current === 'sticker' ? null : 'sticker'))}
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${
              picker === 'sticker' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
            }`}
            title="Send sticker"
            aria-label="Open sticker picker"
          >
            <Sticker size={19} />
          </button>

          {/* Text Input */}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message or bill note..."
            className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 font-medium"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Send message"
          >
            <Send size={16} className="-mr-0.5" />
          </button>
        </form>
      </div>

      {/* Full-Screen Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen image preview"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition-all"
            aria-label="Back to chat"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 backdrop-blur-md p-2.5 text-white hover:bg-white/20 transition-all"
            aria-label="Close image"
          >
            <X size={18} />
          </button>
          
          <img
            src={selectedImage.attachmentData}
            alt={selectedImage.attachmentName || 'Chat image'}
            className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
          
          <a
            href={selectedImage.attachmentData}
            download={selectedImage.attachmentName || 'chat-image'}
            onClick={(event) => event.stopPropagation()}
            className="absolute bottom-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-xs font-bold text-slate-900 shadow-xl transition-transform hover:scale-105"
          >
            <Download size={15} /> Download original
          </a>
        </div>
      )}
    </div>
  );
}

function VideoPlayer({ src, mimeType }) {
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [hasPlaybackError, setHasPlaybackError] = useState(false);

  useEffect(() => {
    let objectUrl;
    let isCancelled = false;

    const setSource = async () => {
      try {
        if (src.startsWith('data:')) {
          const response = await fetch(src);
          if (!response.ok) throw new Error('Could not load video data.');
          const videoBlob = await response.blob();
          objectUrl = URL.createObjectURL(new Blob([videoBlob], { type: mimeType || videoBlob.type }));
          if (isCancelled) {
            URL.revokeObjectURL(objectUrl);
            return;
          }
          setPlaybackUrl(objectUrl);
        } else {
          setPlaybackUrl(src);
        }
      } catch (error) {
        console.error('Could not prepare video playback:', error);
        if (!isCancelled) setHasPlaybackError(true);
      }
    };

    void setSource();
    return () => {
      isCancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, mimeType]);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-white/20 bg-black shadow-sm">
        {playbackUrl ? (
          <video
            src={playbackUrl}
            controls
            playsInline
            preload="metadata"
            className="block aspect-video w-full bg-black object-contain"
            onError={() => setHasPlaybackError(true)}
          >
            Your browser does not support embedded video.
          </video>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center text-xs text-white/70">
            Preparing video...
          </div>
        )}
      </div>
      {hasPlaybackError && (
        <p role="status" className="text-xs text-amber-500 font-semibold pt-1">
          Video format not supported. Download to view.
        </p>
      )}
    </>
  );
}