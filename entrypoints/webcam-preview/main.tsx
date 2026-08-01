import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../shared/styles/globals.css';

const previewStyles = `
  html, body, #root { width: 100%; height: 100%; min-width: 0; min-height: 0; overflow: hidden; }
  body { background: var(--color-ink); }
`;

interface PreviewOfferMessage {
  type: 'webcam-preview-offer';
  id: string;
  offer: RTCSessionDescriptionInit;
}

function WebcamPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    const id = crypto.randomUUID();
    const peer = new RTCPeerConnection();
    const timeout = window.setTimeout(() => setWaiting(false), 5_000);

    peer.addEventListener('track', (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setWaiting(false);
      window.clearTimeout(timeout);
    });
    peer.addEventListener('icecandidate', () => {
      if (peer.iceGatheringState !== 'complete' || !peer.localDescription) return;
      void browser.runtime.sendMessage({ type: 'webcam-preview-answer', id, answer: peer.localDescription });
    });
    const handleMessage = (message: unknown) => {
      const offer = message as PreviewOfferMessage;
      if (offer.type !== 'webcam-preview-offer' || offer.id !== id) return;
      void peer.setRemoteDescription(offer.offer)
        .then(() => peer.createAnswer())
        .then((answer) => peer.setLocalDescription(answer));
    };
    browser.runtime.onMessage.addListener(handleMessage);
    void browser.runtime.sendMessage({ type: 'webcam-preview-request', id });

    return () => {
      window.clearTimeout(timeout);
      browser.runtime.onMessage.removeListener(handleMessage);
      peer.close();
    };
  }, []);

  return (
    <div className="relative size-full bg-ink">
      <video ref={videoRef} autoPlay muted playsInline className="size-full object-cover" />
      {waiting && <div className="absolute inset-0 grid place-items-center text-[9px] font-medium text-white">Connecting…</div>}
    </div>
  );
}

const style = document.createElement('style');
style.textContent = previewStyles;
document.head.append(style);
createRoot(document.getElementById('root')!).render(<WebcamPreview />);
