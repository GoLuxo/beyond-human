import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, Type, Play, X, Images, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppState } from '../state/store.js';
import { addVision, deleteVision, updateVision } from '../state/actions.js';
import { Modal, Field, Empty, InlineEdit } from '../components/ui.jsx';
import { toast } from '../lib/events.js';

function compressImage(file, max = 1400) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.84));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable'));
    };
    img.src = url;
  });
}

function Slideshow({ items, onClose }) {
  const [i, setI] = useState(0);
  const item = items[i % items.length];

  useEffect(() => {
    const id = setInterval(() => setI((n) => n + 1), 6500);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((n) => n + 1);
      if (e.key === 'ArrowLeft') setI((n) => (n - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [items.length, onClose]);

  return (
    <motion.div className="slideshow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Vision slideshow">
      <AnimatePresence mode="sync">
        <motion.div key={i} className="slide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.4 }}>
          {item.kind === 'image' ? (
            <>
              <motion.img src={item.src} alt={item.caption || ''} initial={{ scale: 1.02 }} animate={{ scale: 1.14 }} transition={{ duration: 8, ease: 'linear' }} />
              {item.caption && <p className="slide-caption display">{item.caption}</p>}
            </>
          ) : (
            <motion.p className="slide-text display" initial={{ y: 20, filter: 'blur(10px)' }} animate={{ y: 0, filter: 'blur(0px)' }} transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}>
              {item.text}
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="slide-controls">
        <button className="icon-btn" onClick={() => setI((n) => (n - 1 + items.length) % items.length)} aria-label="Previous">
          <ChevronLeft />
        </button>
        <span className="faint">
          {(i % items.length) + 1} / {items.length}
        </span>
        <button className="icon-btn" onClick={() => setI((n) => n + 1)} aria-label="Next">
          <ChevronRight />
        </button>
        <button className="icon-btn" onClick={onClose} aria-label="Close slideshow">
          <X />
        </button>
      </div>
    </motion.div>
  );
}

export default function Vision() {
  const state = useAppState();
  const fileRef = useRef(null);
  const [wordsOpen, setWordsOpen] = useState(false);
  const [words, setWords] = useState('');
  const [playing, setPlaying] = useState(false);
  const [dragging, setDragging] = useState(false);
  const items = state.vision;

  const addFiles = async (files) => {
    const images = [...files].filter((f) => f.type.startsWith('image/'));
    for (const f of images) {
      try {
        addVision({ kind: 'image', src: await compressImage(f), caption: '' });
      } catch {
        toast(`Couldn't read ${f.name}. Try a JPG or PNG.`);
      }
    }
    if (images.length) toast(images.length === 1 ? 'Image added to your board' : `${images.length} images added to your board`);
  };

  const saveWords = () => {
    if (!words.trim()) return;
    addVision({ kind: 'text', text: words.trim() });
    setWords('');
    setWordsOpen(false);
  };

  return (
    <div
      className={`vision${dragging ? ' dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <header className="page-head">
        <div>
          <h1>Vision board</h1>
          <p>The life you're building, in pictures and words. Drop images anywhere on this page.</p>
        </div>
        <div className="page-actions">
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files).then(() => (e.target.value = ''))} />
          <button className="btn" onClick={() => setWordsOpen(true)}>
            <Type /> Add words
          </button>
          <button className="btn" onClick={() => fileRef.current.click()}>
            <ImagePlus /> Add image
          </button>
          <button className="btn btn-primary" onClick={() => setPlaying(true)} disabled={!items.length}>
            <Play /> Play
          </button>
        </div>
      </header>

      {items.length ? (
        <div className="board">
          <AnimatePresence>
            {items.map((v) => (
              <motion.figure key={v.id} layout className={`board-item ${v.kind}`} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                {v.kind === 'image' ? (
                  <>
                    <img src={v.src} alt={v.caption || 'Vision board image'} draggable={false} />
                    <figcaption>
                      <InlineEdit value={v.caption} onSave={(caption) => updateVision(v.id, { caption })} placeholder="Add a caption" />
                    </figcaption>
                  </>
                ) : (
                  <blockquote className="display">{v.text}</blockquote>
                )}
                <button
                  className="icon-btn sm board-remove"
                  aria-label="Remove from board"
                  onClick={() => {
                    deleteVision(v.id);
                    toast('Removed from your board', { action: { label: 'Undo', onClick: () => addVision(v) } });
                  }}
                >
                  <X />
                </button>
              </motion.figure>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <section className="panel">
          <Empty icon={Images} title="Picture where you're going" action={<button className="btn btn-primary" onClick={() => fileRef.current.click()}><ImagePlus /> Add your first image</button>}>
            The house, the body, the trip, the people. Add images and words that pull you forward, then press Play when you need a reminder.
          </Empty>
        </section>
      )}

      <Modal
        open={wordsOpen}
        onClose={() => setWordsOpen(false)}
        title="Add words"
        subtitle="An affirmation, a promise, or a line that hits hard."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setWordsOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveWords} disabled={!words.trim()}>
              Add to board
            </button>
          </>
        }
      >
        <Field label="Words">
          <textarea className="textarea" autoFocus rows={3} maxLength={160} value={words} onChange={(e) => setWords(e.target.value)} placeholder="I finish what I start." />
        </Field>
      </Modal>

      <AnimatePresence>{playing && items.length > 0 && <Slideshow items={items} onClose={() => setPlaying(false)} />}</AnimatePresence>
    </div>
  );
}
