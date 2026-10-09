import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Camera, KeyRound, ScanLine, X } from 'lucide-react';
import QrScanner from 'qr-scanner';
import { Button } from '../common/UI';
import { useBackHandler } from '../../utils/backNavigation';

const extractInviteCode = (value) => {
  try {
    const inviteUrl = new URL(value);
    const codeFromUrl = inviteUrl.searchParams.get('join') || inviteUrl.searchParams.get('invite');
    return (codeFromUrl || value).trim().toUpperCase();
  } catch {
    return value.trim().toUpperCase();
  }
};

export default function JoinGroupModal({ user, groups, onUpdateGroup, initialCode = '', onBack, showToast }) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [isScanning, setIsScanning] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const videoRef = useRef(null);

  useBackHandler(isScanning, () => {
    setIsScanning(false);
    return true;
  }, 100);

  useEffect(() => {
    if (!isScanning || !videoRef.current) return undefined;
    let isMounted = true;
    const scanner = new QrScanner(videoRef.current, (result) => {
      const scannedCode = extractInviteCode(typeof result === 'string' ? result : result.data);
      if (scannedCode.length < 3) {
        showToast('This QR code does not contain a valid invite.', 'error');
        return;
      }
      setCode(scannedCode);
      setIsScanning(false);
      showToast('Invite scanned. Tap Join Group to continue.');
    }, { preferredCamera: 'environment' });

    scanner.start().catch((error) => {
      if (isMounted) {
        setIsScanning(false);
        showToast(error.name === 'NotAllowedError' ? 'Allow camera access to scan a QR code.' : 'Could not start the camera scanner.', 'error');
      }
    });

    return () => {
      isMounted = false;
      scanner.stop();
      scanner.destroy();
    };
  }, [isScanning, showToast]);

  const handleBack = () => {
    onBack();
  };

  const handleJoin = async (event) => {
    event.preventDefault();
    const cleanCode = extractInviteCode(code);
    if (!cleanCode) return;
    const group = groups.find((item) => item.inviteCode === cleanCode);
    if (!group) {
      showToast('Invalid invite code.', 'error');
      return;
    }
    if (group.members.includes(user.id)) {
      showToast('You are already in this group.');
      handleBack();
      return;
    }
    setIsJoining(true);
    try {
      await onUpdateGroup({ ...group, members: [...group.members, user.id] });
      showToast(`Joined ${group.name}!`);
      handleBack();
    } catch {
      showToast('Could not join this group. Please try again.', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <header className="px-4 py-4 flex items-center gap-3 border-b border-slate-100">
        <button onClick={handleBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold text-slate-800">Join a Group</h1>
      </header>
      <div className="p-5 text-center pt-8">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-5"><KeyRound size={28} className="text-indigo-600" /></div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Enter Invite Code</h2>
        <p className="text-slate-500 text-sm mb-6 px-4">Ask your roommate for the group invite code to join.</p>
          <form onSubmit={handleJoin} className="max-w-[320px] mx-auto">
          <input className="w-full px-4 py-3.5 text-center text-2xl font-mono tracking-widest border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-0 outline-none uppercase bg-slate-50" placeholder="XXXXXX" maxLength={10} value={code} onChange={(event) => setCode(event.target.value)} required />
          <Button type="submit" className="w-full mt-4 h-14" disabled={code.trim().length < 3 || isJoining}>{isJoining ? 'Joining…' : 'Join Group'}</Button>
          <button type="button" onClick={() => setIsScanning((scanning) => !scanning)} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
            <><ScanLine size={17} /> Scan QR code</>
          </button>
        </form>
      </div>
      {isScanning && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsScanning(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="scan-group-invite-title"
            className="relative w-full max-w-sm overflow-hidden rounded-[30px] border border-white/60 bg-white p-5 text-center shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsScanning(false)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition-colors hover:bg-white hover:text-slate-800"
              aria-label="Close QR scanner"
            >
              <X size={17} />
            </button>
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Camera size={21} />
            </div>
            <h2 id="scan-group-invite-title" className="text-base font-extrabold text-slate-900">Scan a group QR code</h2>
            <p className="mb-4 mt-1 text-xs text-slate-500">Place the QR code inside the frame to join.</p>
            <div className="relative overflow-hidden rounded-2xl bg-slate-950">
              <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-[68%] w-[68%] rounded-2xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(15,23,42,0.22)]">
                  <span className="absolute -left-0.5 -top-0.5 h-5 w-5 rounded-tl-lg border-l-4 border-t-4 border-indigo-400" />
                  <span className="absolute -right-0.5 -top-0.5 h-5 w-5 rounded-tr-lg border-r-4 border-t-4 border-indigo-400" />
                  <span className="absolute -bottom-0.5 -left-0.5 h-5 w-5 rounded-bl-lg border-b-4 border-l-4 border-indigo-400" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-br-lg border-b-4 border-r-4 border-indigo-400" />
                </div>
              </div>
            </div>
            <p className="mt-3 text-[11px] font-medium text-slate-400">RoomSplit will recognize the invite automatically.</p>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}