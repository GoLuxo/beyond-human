import { useEffect, useRef, useState } from 'react';
import { Download, Copy } from 'lucide-react';
import { Modal, Segmented } from './ui.jsx';
import { useAppState } from '../state/store.js';
import { computeStats } from '../lib/progress.js';
import { todayKey } from '../lib/dates.js';
import { drawShareCard, SHARE_FORMATS } from '../lib/shareCard.js';
import { system } from '../lib/platform.js';
import { toast } from '../lib/events.js';

export default function ShareModal({ open, onClose }) {
  const state = useAppState();
  const canvasRef = useRef(null);
  const [format, setFormat] = useState('post');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    drawShareCard(canvasRef.current, { format, state, stats: computeStats(state), today: todayKey() });
  }, [open, format, state]);

  const dataUrl = () => canvasRef.current.toDataURL('image/png');
  const fileName = `beyond-human-${todayKey()}-${format}.png`;

  const save = async () => {
    setBusy(true);
    const r = await system.saveImage(dataUrl(), fileName);
    setBusy(false);
    if (r?.ok) toast('Image saved. Post it and tag your progress.');
  };

  const copy = async () => {
    const ok = await system.copyImage(dataUrl());
    toast(ok ? 'Image copied to the clipboard' : 'Copying images isn\'t supported here. Save it instead.');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Share your year"
      subtitle="A card of your 365-day orbit, sized for Instagram and TikTok."
      footer={
        <>
          <Segmented
            label="Format"
            value={format}
            onChange={setFormat}
            options={Object.entries(SHARE_FORMATS).map(([value, f]) => ({ value, label: `${f.label} ${f.width}×${f.height}` }))}
          />
          <span className="spacer" />
          <button className="btn" onClick={copy}>
            <Copy /> Copy
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            <Download /> Save image
          </button>
        </>
      }
    >
      <div className={`share-preview ${format}`}>
        <canvas ref={canvasRef} aria-label="Preview of your share card" />
      </div>
    </Modal>
  );
}
