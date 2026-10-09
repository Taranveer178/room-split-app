import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, 
  Download, 
  ImagePlus, 
  MessageCircle, 
  Send, 
  Smile, 
  X,
  FileText,
  Trash2,
  CheckCheck,
  Ban,
  Copy,
  Share2,
  Users
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  doc,
  arrayUnion,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';

const EMOJI_CATEGORIES = {
  Recent: ['😀', '😂', '🥰', '😍', '😎', '😭', '😅', '🤔', '🙌', '👏', '👍', '👎', '🙏', '❤️', '🔥', '🎉', '✨', '💸', '🍕', '☕', '🏠', '✅', '❌'],
  Smileys: ['😃', '😄', '😁', '😆', '🥹', '😅', '😂', '🤣', '🥲', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛'],
  Gestures: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊'],
  Finance: ['💰', '🪙', '💵', '💶', '💷', '💳', '🧾', '🛒', '🛍️', '📈', '📉', '💸', '🤑', '💎', '🏦', '💹']
};

const STICKER_PACKS = {
  Reactions: ['🥳', '💖', '🫶', '🤝', '💯', '🚀', '🔥', '✨', '🎉', '👏', '🙌', '⭐'],
  'Food & Chill': ['🍕', '🍔', '🍟', '🧋', '☕', '🍰', '🍜', '🍩', '🥑', '🌮', '🍻', '🍿'],
  'Cute Animals': ['🐱', '🐶', '🐼', '🐻', '🐰', '🦊', '🐨', '🐯', '🦁', '🐸', '🐵', '🦄'],
  Money: ['💸', '🤑', '💳', '🧾', '💰', '📉', '📈', '🪙', '💎', '🏦', '⚖️', '🛒']
};

const POPULAR_GIFS = [
  { id: '1', title: 'Thumbs Up', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { id: '2', title: 'Money Rain', url: 'https://media.giphy.com/media/67ThRZlYBvibtdF9JH/giphy.gif' },
  { id: '3', title: 'Mind Blown', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { id: '4', title: 'Celebrate', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { id: '5', title: 'Confused', url: 'https://media.giphy.com/media/g01ZnwAUvutuK8GIQn/giphy.gif' },
  { id: '6', title: 'Coffee Time', url: 'https://media.giphy.com/media/oZEBLugoTdzxK/giphy.gif' },
  { id: '7', title: 'Calculating', url: 'https://media.giphy.com/media/BmmfETghGOPrW/giphy.gif' },
  { id: '8', title: 'Deal Done', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' }
];

const getTimestamp = () => Date.now();

export default function ChatTab({ group, groups = [], currentUser, users, showToast }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [pickerTab, setPickerTab] = useState(null);
  const [activeStickerPack, setActiveStickerPack] = useState('Reactions');
  const [activeEmojiCat, setActiveEmojiCat] = useState('Recent');
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');

  // Tap-and-hold popup & delete states
  const [activeContextMenu, setActiveContextMenu] = useState(null); // { message, x, y, isMe }
  const [deleteDialogMessage, setDeleteDialogMessage] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [shareDialogMessage, setShareDialogMessage] = useState(null);
  const [shareError, setShareError] = useState('');
  const [sharingGroupId, setSharingGroupId] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const pressTimerRef = useRef(null);

  const getUser = (userId) => {
    return users.find(u => u.id === userId) || { username: 'Roommate' };
  };

  const formatMessageTime = (dateObj) => {
    if (!dateObj) return '';
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageDate = (msg) => {
    if (msg.createdAt?.toDate) return msg.createdAt.toDate();
    if (msg.timestamp) return new Date(msg.timestamp);
    return new Date();
  };

  const getDateLabel = (dateObj) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (dateObj.toDateString() === today.toDateString()) return 'Today';
    if (dateObj.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return dateObj.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: dateObj.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
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

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      if (activeContextMenu) setActiveContextMenu(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeContextMenu]);

  const visibleMessages = useMemo(() => {
    return messages.filter(msg => {
      if (msg.deletedFor && Array.isArray(msg.deletedFor) && msg.deletedFor.includes(currentUser.id)) {
        return false;
      }
      return true;
    });
  }, [messages, currentUser.id]);

  // Press & Hold handling
  const handleTouchStart = (event, msg, isMe) => {
    if (msg.isDeletedForEveryone) return;
    const touch = event.touches ? event.touches[0] : event;
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    pressTimerRef.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(40);
      setActiveContextMenu({ message: msg, x: clientX, y: clientY, isMe });
    }, 450);
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleContextMenu = (e, msg, isMe) => {
    if (msg.isDeletedForEveryone) return;
    e.preventDefault();
    setActiveContextMenu({ message: msg, x: e.clientX, y: e.clientY, isMe });
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const cleanText = input.trim();
    if (!cleanText || !db) return;

    setInput('');

    try {
      await addDoc(collection(db, 'messages'), {
        groupId: group.id,
        senderId: currentUser.id,
        senderName: currentUser.username,
        text: cleanText,
        timestamp: getTimestamp(),
        createdAt: serverTimestamp(),
        deletedFor: []
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
    setInput((prev) => `${prev}${emoji}`);
  };

  const handleSendSticker = async (sticker) => {
    setPickerTab(null);
    if (!db) return;
    try {
      await addDoc(collection(db, 'messages'), {
        groupId: group.id,
        senderId: currentUser.id,
        senderName: currentUser.username,
        text: sticker,
        type: 'sticker',
        timestamp: getTimestamp(),
        createdAt: serverTimestamp(),
        deletedFor: []
      });
    } catch (error) {
      console.error('Error sending sticker:', error);
      setAttachmentError('Sticker could not be sent.');
    }
  };

  const handleSendGif = async (gifUrl) => {
    setPickerTab(null);
    if (!db) return;
    try {
      await addDoc(collection(db, 'messages'), {
        groupId: group.id,
        senderId: currentUser.id,
        senderName: currentUser.username,
        text: '',
        attachmentType: 'gif',
        attachmentName: 'reaction.gif',
        attachmentData: gifUrl,
        timestamp: getTimestamp(),
        createdAt: serverTimestamp(),
        deletedFor: []
      });
    } catch (error) {
      console.error('Error sending gif:', error);
      setAttachmentError('GIF could not be sent.');
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
    const isDocument = documentExtensions.some((ext) => lowerName.endsWith(ext))
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
        timestamp: getTimestamp(),
        createdAt: serverTimestamp(),
        deletedFor: []
      });
    } catch (error) {
      console.error('Error uploading chat attachment:', error);
      setAttachmentError(error.message || 'Could not send this file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCopyMessage = (msg) => {
    const textToCopy = msg.text || msg.attachmentName || '';
    if (textToCopy && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
    }
    setActiveContextMenu(null);
  };

  const handleShareMessage = (msg) => {
    setActiveContextMenu(null);
    setShareError('');
    setShareDialogMessage(msg);
  };

  const handleForwardMessage = async (destinationGroup) => {
    if (!db || !shareDialogMessage || sharingGroupId) return;

    setSharingGroupId(destinationGroup.id);
    setShareError('');
    try {
      const message = shareDialogMessage;
      const attachmentData = message.attachmentData || message.mediaData || null;
      await addDoc(collection(db, 'messages'), {
        groupId: destinationGroup.id,
        senderId: currentUser.id,
        senderName: currentUser.username,
        text: message.text || '',
        ...(message.type === 'sticker' ? { type: 'sticker' } : {}),
        attachmentType: message.attachmentType || null,
        attachmentName: message.attachmentName || null,
        attachmentMimeType: message.attachmentMimeType || null,
        attachmentData,
        forwardedFromGroupName: group.name,
        timestamp: getTimestamp(),
        createdAt: serverTimestamp(),
        deletedFor: []
      });
      setShareDialogMessage(null);
      showToast?.(`Message shared to ${destinationGroup.name}.`);
    } catch (error) {
      console.error('Error sharing message to group:', error);
      setShareError('Could not share this message. Please try again.');
    } finally {
      setSharingGroupId(null);
    }
  };

  const handleDeleteForMe = async (message) => {
    if (deletingMessage) return;
    if (!db || !message?.id) {
      setDeleteError('Chat is unavailable. Please try again later.');
      return;
    }
    setDeletingMessage(true);
    setDeleteError('');
    try {
      const msgRef = doc(db, 'messages', message.id);
      await updateDoc(msgRef, {
        deletedFor: arrayUnion(currentUser.id)
      });
      setDeleteDialogMessage(null);
    } catch (err) {
      console.error('Error deleting message for me:', err);
      setDeleteError('Could not delete this message for you. Please try again.');
    } finally {
      setDeletingMessage(false);
    }
  };

  const handleDeleteForEveryone = async (message) => {
    if (deletingMessage) return;
    if (!db || !message?.id) {
      setDeleteError('Chat is unavailable. Please try again later.');
      return;
    }
    setDeletingMessage(true);
    setDeleteError('');
    try {
      const msgRef = doc(db, 'messages', message.id);
      await updateDoc(msgRef, {
        isDeletedForEveryone: true,
        text: 'This message was deleted',
        attachmentData: null,
        mediaData: null,
        attachmentType: null,
        type: 'deleted'
      });
      setDeleteDialogMessage(null);
    } catch (err) {
      console.error('Error deleting message for everyone:', err);
      setDeleteError('Could not delete this message for everyone. Please try again.');
    } finally {
      setDeletingMessage(false);
    }
  };

  const handleClearChatForMe = async () => {
    if (!db || visibleMessages.length === 0) return;
    setClearing(true);
    try {
      for (const msg of visibleMessages) {
        const msgRef = doc(db, 'messages', msg.id);
        await updateDoc(msgRef, {
          deletedFor: arrayUnion(currentUser.id)
        });
      }
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Error clearing chat:', err);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-slate-50/80 font-sans select-none">
      
      {/* Ambient background glows */}
      <div className="absolute top-10 right-10 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Discrete Floating Clear Chat Icon Button */}
      {visibleMessages.length > 0 && (
        <button
          onClick={() => setShowClearConfirm(true)}
          className="absolute top-3 right-4 z-20 p-2 rounded-full bg-white/75 hover:bg-white text-slate-400 hover:text-rose-600 border border-slate-200/60 shadow-xs backdrop-blur-md transition-all active:scale-90"
          title="Clear Conversation"
          aria-label="Clear Chat"
        >
          <Trash2 size={15} />
        </button>
      )}

      {/* Main WhatsApp-Style Message Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 space-y-1 relative z-10 scrollbar-hide">
        {visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-3xl bg-white/80 backdrop-blur-md border border-white/80 text-blue-600 flex items-center justify-center mb-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <MessageCircle size={30} />
            </div>
            <p className="font-extrabold text-slate-900 text-base">No messages yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-relaxed">
              Chat, drop grocery lists, receipts, or discuss room expenses in this space!
            </p>
          </div>
        ) : (
          visibleMessages.map((msg, index) => {
            const isMe = msg.senderId === currentUser.id;
            const sender = getUser(msg.senderId);
            const msgDate = getMessageDate(msg);
            const timeString = formatMessageTime(msgDate);

            // Date divider check
            const prevMsg = visibleMessages[index - 1];
            const prevDate = prevMsg ? getMessageDate(prevMsg) : null;
            const showDateDivider = !prevDate || prevDate.toDateString() !== msgDate.toDateString();

            // Sender grouping
            const isFirstOfCluster = !prevMsg || prevMsg.senderId !== msg.senderId || showDateDivider;
            const isDeleted = msg.isDeletedForEveryone;

            return (
              <div key={msg.id} className="w-full">
                {/* Date Divider (WhatsApp style) */}
                {showDateDivider && (
                  <div className="flex justify-center my-3">
                    <span className="px-3.5 py-1 text-[11px] font-bold text-slate-600 bg-white/90 backdrop-blur-md rounded-full shadow-2xs border border-slate-200/70 select-none">
                      {getDateLabel(msgDate)}
                    </span>
                  </div>
                )}

                {/* Message Bubble Row */}
                <div 
                  className={`flex items-end gap-1.5 my-1 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    onTouchStart={(e) => handleTouchStart(e, msg, isMe)}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={(e) => handleTouchStart(e, msg, isMe)}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    onContextMenu={(e) => handleContextMenu(e, msg, isMe)}
                    className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl transition-all shadow-sm cursor-pointer select-none active:scale-[0.99] ${
                      isDeleted
                        ? 'bg-slate-100 text-slate-400 italic border border-slate-200/80 px-3.5 py-2'
                        : isMe
                          ? 'bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 text-white rounded-br-xs shadow-blue-500/15'
                          : 'bg-white/95 backdrop-blur-md text-slate-800 border border-slate-200/80 rounded-bl-xs'
                    }`}
                  >

                    {/* Sender Name in Bubble */}
                    {!isMe && isFirstOfCluster && !isDeleted && (
                      <div className="px-3 pt-2 text-[11px] font-black text-blue-600 tracking-wider uppercase">
                        {msg.senderName || sender.username}
                      </div>
                    )}

                    {/* Message Content Body */}
                    {isDeleted ? (
                      <div className="flex items-center gap-1.5 text-xs py-0.5">
                        <Ban size={14} className="text-slate-400" />
                        <span>This message was deleted</span>
                        <span className="text-[10px] text-slate-400 ml-2 font-normal not-italic">{timeString}</span>
                      </div>
                    ) : (
                      <>
                        {msg.forwardedFromGroupName && (
                          <div className={`px-3 pt-2 text-[10px] font-semibold italic ${isMe ? 'text-blue-100/80' : 'text-slate-400'}`}>
                            Forwarded from {msg.forwardedFromGroupName}
                          </div>
                        )}
                        {/* WhatsApp-Style Media View */}
                        {(msg.attachmentData || msg.mediaData) && (
                          <div className="overflow-hidden rounded-xl p-1">
                            {msg.attachmentType === 'image' || msg.attachmentType === 'gif' ? (
                              <div className="relative">
                                <img
                                  src={msg.attachmentData || msg.mediaData}
                                  alt="Chat media"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImage({ ...msg, attachmentData: msg.attachmentData || msg.mediaData });
                                  }}
                                  className="max-h-72 w-full object-cover rounded-xl"
                                  loading="lazy"
                                />
                                <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-semibold text-white">
                                  <span>{timeString}</span>
                                  {isMe && <CheckCheck size={12} className="text-blue-300" />}
                                </div>
                              </div>
                            ) : msg.attachmentType === 'video' ? (
                              <div className="relative rounded-xl overflow-hidden bg-black max-w-sm">
                                <VideoPlayer src={msg.attachmentData || msg.mediaData} mimeType={msg.attachmentMimeType} />
                                <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-semibold text-white">
                                  <span>{timeString}</span>
                                  {isMe && <CheckCheck size={12} className="text-blue-300" />}
                                </div>
                              </div>
                            ) : msg.attachmentType === 'audio' ? (
                              <div className="p-2 space-y-1">
                                <audio src={msg.attachmentData || msg.mediaData} controls className="w-full h-8" />
                              </div>
                            ) : (
                              <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                                isMe ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-200/80'
                              }`}>
                                <FileText size={20} className={isMe ? 'text-white' : 'text-blue-600'} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-bold">{msg.attachmentName || 'Document'}</p>
                                  <a href={msg.attachmentData} download className="text-[10px] underline font-semibold">Download</a>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Sticker Render */}
                        {msg.type === 'sticker' ? (
                          <div className="px-3 py-1">
                            <span className="text-6xl leading-none select-none">{msg.text}</span>
                            <div className={`text-[9.5px] text-right mt-1 font-semibold flex items-center justify-end gap-1 ${
                              isMe ? 'text-blue-100/90' : 'text-slate-400'
                            }`}>
                              <span>{timeString}</span>
                              {isMe && <CheckCheck size={12} className="text-blue-200" />}
                            </div>
                          </div>
                        ) : msg.text ? (
                          /* Proportional WhatsApp text + inline timestamp */
                          <div className="px-3 py-1.5 flex items-end">
                            <span className="whitespace-pre-wrap font-normal text-[13.5px] leading-relaxed break-words pr-1.5 select-text">
                              {msg.text}
                            </span>
                            
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ml-2 select-none flex-shrink-0 leading-none pb-0.5 ${
                              isMe ? 'text-blue-100/90' : 'text-slate-400'
                            }`}>
                              <span>{timeString}</span>
                              {isMe && <CheckCheck size={13} className="text-blue-200" />}
                            </span>
                          </div>
                        ) : null}
                      </>
                    )}

                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Tap-and-Hold Floating Context Menu (WhatsApp Style) */}
      {activeContextMenu && (
        <div 
          className="fixed z-50 animate-in zoom-in-95 duration-100"
          style={{
            top: Math.min(Math.max(16, activeContextMenu.y - 60), window.innerHeight - 150),
            left: activeContextMenu.isMe 
              ? Math.max(16, activeContextMenu.x - 170)
              : Math.min(window.innerWidth - 180, activeContextMenu.x + 10)
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-1 shadow-[0_12px_32px_rgba(0,0,0,0.18)] flex items-center gap-1 text-xs font-bold text-slate-700">
            {activeContextMenu.message.text && (
              <button
                type="button"
                onClick={() => handleCopyMessage(activeContextMenu.message)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-100 active:scale-95 transition-all"
                title="Copy text"
              >
                <Copy size={14} className="text-slate-500" />
                <span>Copy</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleShareMessage(activeContextMenu.message)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-100 active:scale-95 transition-all"
              title="Share message"
            >
              <Share2 size={14} className="text-slate-500" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const targetMsg = activeContextMenu.message;
                setActiveContextMenu(null);
                setDeleteError('');
                setDeleteDialogMessage(targetMsg);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 active:scale-95 transition-all"
              title="Delete message"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Sheet (3 options: Delete for Me, Delete for Everyone, Cancel) */}
      {deleteDialogMessage && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-3xl p-5 bg-white shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Delete message?</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Choose how you want to remove this message.
            </p>
            {deleteError && <p role="alert" className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-left text-xs font-medium text-rose-700">{deleteError}</p>}

            <div className="space-y-2">
              {/* Option 1: Delete for Me */}
              <button
                type="button"
                onClick={() => handleDeleteForMe(deleteDialogMessage)}
                disabled={deletingMessage}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
              >
                {deletingMessage ? 'Deleting...' : 'Delete for Me'}
              </button>

              {/* Option 2: Delete for Everyone (if sender is me or group admin) */}
              {(deleteDialogMessage.senderId === currentUser.id || group.createdBy === currentUser.id) && (
                <button
                  type="button"
                  onClick={() => handleDeleteForEveryone(deleteDialogMessage)}
                  disabled={deletingMessage}
                  className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-colors"
                >
                  {deletingMessage ? 'Deleting...' : 'Delete for Everyone'}
                </button>
              )}

              {/* Option 3: Cancel */}
              <button
                type="button"
                onClick={() => setDeleteDialogMessage(null)}
                disabled={deletingMessage}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {shareDialogMessage && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => {
            if (!sharingGroupId) setShareDialogMessage(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-message-title"
            className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/70 bg-white/95 p-5 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-150"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Share2 size={19} />
                </div>
                <h3 id="share-message-title" className="text-base font-extrabold text-slate-900">Share to a group</h3>
                <p className="mt-1 text-xs text-slate-500">Choose one of your other groups.</p>
              </div>
              <button
                type="button"
                onClick={() => setShareDialogMessage(null)}
                disabled={Boolean(sharingGroupId)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close share dialog"
              >
                <X size={17} />
              </button>
            </div>

            {shareError && <p role="alert" className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{shareError}</p>}

            <div className="max-h-72 space-y-2 overflow-y-auto overscroll-contain">
              {groups
                .filter((candidate) => candidate.id !== group.id && candidate.members?.includes(currentUser.id))
                .map((destinationGroup) => (
                  <button
                    key={destinationGroup.id}
                    type="button"
                    onClick={() => handleForwardMessage(destinationGroup)}
                    disabled={Boolean(sharingGroupId)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/60 disabled:cursor-wait disabled:opacity-60"
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-extrabold text-blue-700">
                      {destinationGroup.name?.charAt(0).toUpperCase() || <Users size={17} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-800">{destinationGroup.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{destinationGroup.members?.length || 0} members</span>
                    </span>
                    <span className="text-xs font-semibold text-blue-600">
                      {sharingGroupId === destinationGroup.id ? 'Sharing…' : 'Share'}
                    </span>
                  </button>
                ))}
              {groups.filter((candidate) => candidate.id !== group.id && candidate.members?.includes(currentUser.id)).length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
                  <Users size={22} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No other groups yet</p>
                  <p className="mt-1 text-xs text-slate-400">Join or create another group to share this message.</p>
                </div>
              )}
            </div>
          </section>
        </div>,
        document.body
      )}

      {/* Floating Liquid Glass Input Bar */}
      <div className="relative z-20 px-3 pb-6 sm:px-6 pt-2">
        {attachmentError && (
          <div className="max-w-3xl mx-auto mb-2 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold border border-rose-200/80 animate-in fade-in duration-150">
            {attachmentError}
          </div>
        )}

        {/* Tabbed Emoji, Sticker & GIF Picker */}
        {pickerTab && (
          <div className="max-w-3xl mx-auto mb-3 rounded-[28px] bg-white/90 backdrop-blur-2xl border border-white/80 p-3 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPickerTab('emoji')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    pickerTab === 'emoji' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Emoji
                </button>
                <button
                  type="button"
                  onClick={() => setPickerTab('sticker')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    pickerTab === 'sticker' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Stickers
                </button>
                <button
                  type="button"
                  onClick={() => setPickerTab('gif')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    pickerTab === 'gif' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  GIFs
                </button>
              </div>

              <button 
                type="button" 
                onClick={() => setPickerTab(null)} 
                className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {pickerTab === 'emoji' && (
              <>
                <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-2 scrollbar-hide text-[11px] font-bold">
                  {Object.keys(EMOJI_CATEGORIES).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveEmojiCat(cat)}
                      className={`px-2.5 py-0.5 rounded-full flex-shrink-0 transition-all ${
                        activeEmojiCat === cat ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-500'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto scrollbar-hide p-1">
                  {EMOJI_CATEGORIES[activeEmojiCat]?.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => appendEmoji(item)}
                      className="text-2xl aspect-square rounded-xl hover:bg-blue-50 active:scale-90 transition-all flex items-center justify-center"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </>
            )}

            {pickerTab === 'sticker' && (
              <>
                <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-2 scrollbar-hide text-[11px] font-bold">
                  {Object.keys(STICKER_PACKS).map(pack => (
                    <button
                      key={pack}
                      type="button"
                      onClick={() => setActiveStickerPack(pack)}
                      className={`px-2.5 py-0.5 rounded-full flex-shrink-0 transition-all ${
                        activeStickerPack === pack ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-500'
                      }`}
                    >
                      {pack}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-40 overflow-y-auto scrollbar-hide p-1">
                  {STICKER_PACKS[activeStickerPack]?.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleSendSticker(item)}
                      className="text-3xl aspect-square rounded-2xl hover:bg-blue-50 active:scale-90 transition-all flex items-center justify-center"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </>
            )}

            {pickerTab === 'gif' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto scrollbar-hide p-1">
                {POPULAR_GIFS.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => handleSendGif(gif.url)}
                    className="relative rounded-xl overflow-hidden aspect-video border border-slate-200 hover:border-blue-400 active:scale-95 transition-all group"
                  >
                    <img src={gif.url} alt={gif.title} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-white font-bold">
                      {gif.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input Capsule */}
        <form 
          onSubmit={handleSend} 
          className="max-w-3xl mx-auto flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-full bg-white/90 backdrop-blur-2xl border border-white/80 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.12)] transition-all focus-within:ring-2 focus-within:ring-blue-500/20"
        >
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
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-slate-500 hover:text-blue-600 hover:bg-white active:scale-95 transition-all disabled:opacity-40"
            title="Upload photo, document, video or audio"
          >
            {uploading ? <span className="text-[10px] font-bold text-blue-600 animate-pulse">...</span> : <ImagePlus size={19} />}
          </button>

          <button
            type="button"
            onClick={() => setPickerTab((curr) => curr === 'emoji' ? null : 'emoji')}
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${
              pickerTab === 'emoji' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-blue-600 hover:bg-white'
            }`}
            title="Emoji / Stickers / GIFs"
          >
            <Smile size={19} />
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message or note..."
            className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 font-medium"
          />

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

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-3xl p-5 bg-white shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Clear this conversation?</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Messages will be cleared from your view in this room space.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearChatForMe}
                disabled={clearing}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm shadow-rose-500/20"
              >
                {clearing ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Full-Screen Image Lightbox Modal */}
      {selectedImage && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          role="dialog"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition-all"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 backdrop-blur-md p-2.5 text-white hover:bg-white/20 transition-all"
          >
            <X size={18} />
          </button>
          
          <img
            src={selectedImage.attachmentData}
            alt="Chat full view"
            className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
          
          <a
            href={selectedImage.attachmentData}
            download="chat-image"
            onClick={(event) => event.stopPropagation()}
            className="absolute bottom-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-xs font-bold text-slate-900 shadow-xl transition-transform hover:scale-105"
          >
            <Download size={15} /> Download original
          </a>
        </div>,
        document.body
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