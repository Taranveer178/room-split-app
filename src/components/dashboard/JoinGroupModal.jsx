import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Camera, KeyRound, ScanLine, X, Loader2, Sparkles } from 'lucide-react';
import QrScanner from 'qr-scanner';
import { Button } from '../common/UI';

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
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!isScanning || !videoRef.current) return undefined;
    let isMounted = true;
    setIsCameraReady(false);
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => !isJoining && handleBack()}
    >
      {/* Liquid Glass Modal Card */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/80 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.3)] backdrop-blur-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Ambient Gradient Glows */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between pb-5 border-b border-slate-200/50">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={handleBack} 
              disabled={isJoining}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 border border-white/80 text-slate-600 shadow-sm transition-all hover:bg-white hover:text-slate-900 active:scale-95 disabled:opacity-50"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Join a Space</h1>
              <p className="text-xs text-slate-500 font-medium">Connect to your shared expenses</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleBack}
            disabled={isJoining}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/80 text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="relative z-10 pt-6 text-center">
          {/* Key Icon Badge */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500/10 to-blue-600/20 text-blue-600 border border-blue-200/50 shadow-inner">
            <KeyRound size={28} />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1.5">
            Enter Invite Code
          </h2>
          <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto mb-6">
            Ask your flatmate or group admin for their 6-digit space invite code.
          </p>

          <form onSubmit={handleJoin} className="max-w-[340px] mx-auto space-y-3.5">
            {/* Input with glass aesthetics */}
            <div className="rounded-2xl border border-white/80 bg-white/60 p-1.5 shadow-inner backdrop-blur-sm">
              <input
                className="w-full px-4 py-3.5 text-center text-2xl sm:text-3xl font-mono font-bold tracking-[0.25em] border-2 border-slate-200/70 rounded-xl focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 outline-none uppercase bg-slate-50/70 text-slate-900 placeholder:text-slate-300 transition-all"
                placeholder="XXXXXX"
                maxLength={10}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck="false"
                required
              />
            </div>

            {/* Submit Action Button */}
            <Button
              type="submit"
              disabled={code.trim().length < 3 || isJoining}
              className="w-full h-13 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isJoining ? (
                <>
                  <Loader2 size={19} className="animate-spin text-white" />
                  <span>Joining Group…</span>
                </>
              ) : (
                <span>Join Group</span>
              )}
            </Button>

            {/* Scan QR Button */}
            <button
              type="button"
              onClick={() => setIsScanning(true)}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/70 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700 active:scale-[0.98]"
            >
              <ScanLine size={18} className="text-blue-600" />
              <span>Scan QR code</span>
            </button>
          </form>
        </div>
      </div>

      {/* QR Scanner Modal Portal with Liquid Glass Theme */}
      {isScanning && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsScanning(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="scan-group-invite-title"
            className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/90 p-6 text-center shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-150"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsScanning(false)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-sm transition-colors hover:bg-slate-200 hover:text-slate-800"
              aria-label="Close QR scanner"
            >
              <X size={18} />
            </button>

            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-inner">
              <Camera size={22} />
            </div>

            <h2 id="scan-group-invite-title" className="text-lg font-bold text-slate-900 tracking-tight">
              Scan a group QR code
            </h2>
            <p className="mb-4 mt-1 text-xs text-slate-500 font-medium">
              Place the QR code inside the frame to join.
            </p>

            <div className="relative overflow-hidden rounded-2xl bg-slate-950 shadow-inner">
              <video
                ref={videoRef}
                className="aspect-square w-full bg-slate-950 object-cover"
                autoPlay
                muted
                playsInline
                controls={false}
                disablePictureInPicture
                onPlaying={() => setIsCameraReady(true)}
              />

              {!isCameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-white" role="status" aria-live="polite">
                  <Loader2 size={28} className="animate-spin text-blue-400" />
                  <span className="text-xs font-semibold text-slate-300">Opening camera…</span>
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-[68%] w-[68%] rounded-2xl border-2 border-white/40 shadow-[0_0_0_999px_rgba(15,23,42,0.35)]">
                  <span className="absolute -left-0.5 -top-0.5 h-6 w-6 rounded-tl-lg border-l-4 border-t-4 border-blue-500" />
                  <span className="absolute -right-0.5 -top-0.5 h-6 w-6 rounded-tr-lg border-r-4 border-t-4 border-blue-500" />
                  <span className="absolute -bottom-0.5 -left-0.5 h-6 w-6 rounded-bl-lg border-b-4 border-l-4 border-blue-500" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-br-lg border-b-4 border-r-4 border-blue-500" />
                </div>
              </div>
            </div>

            <p className="mt-3.5 text-[11px] font-semibold text-slate-400">
              RoomSplit will recognize the invite automatically.
            </p>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}