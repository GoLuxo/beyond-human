import { useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

const spring = { type: 'spring', stiffness: 380, damping: 32 };

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
}

export function Modal({ open, onClose, title, subtitle, children, footer, wide }) {
  useEscape(open, onClose);
  const titleId = useId();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className={`modal${wide ? ' wide' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={spring}
          >
            <div className="modal-head">
              <div>
                <h2 id={titleId}>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
              </div>
              <button className="icon-btn" onClick={onClose} aria-label="Close">
                <X />
              </button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-foot">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Drawer({ open, onClose, children, label }) {
  useEscape(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="scrim drawer-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            transition={spring}
          >
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Switch({ checked, onChange, label }) {
  return <button type="button" className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />;
}

export function Segmented({ value, onChange, options, label }) {
  const id = useId();
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => {
        const Icon = o.icon;
        const active = o.value === value;
        return (
          <button type="button" key={o.value} aria-pressed={active} onClick={() => onChange(o.value)}>
            {active && <motion.i className="seg-pill" layoutId={`seg-${id}`} transition={spring} />}
            {Icon && <Icon />}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function StarCheck({ checked, onToggle, label, size }) {
  return (
    <button
      type="button"
      className={`star-check${size === 'lg' ? ' lg' : ''}`}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
    >
      <Check strokeWidth={3} />
    </button>
  );
}

export function ProgressRing({ value, size = 64, stroke = 3, children, glow = true, className = '' }) {
  const r = (size - stroke * 2) / 2 - 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className={`ring ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--fg)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)', filter: glow && v > 0 ? 'var(--star-glow)' : 'none' }}
        />
      </svg>
      {children && <div className="ring-center">{children}</div>}
    </div>
  );
}

export function Bar({ value }) {
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((value || 0) * 100)}>
      <i style={{ width: `${Math.max(0, Math.min(1, value || 0)) * 100}%` }} />
    </div>
  );
}

export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && <Icon />}
      <h4>{title}</h4>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function InlineEdit({ value, onSave, placeholder, className = 'input-bare', multiline, ariaLabel }) {
  const ref = useRef(null);
  const latest = useRef({ value, onSave, text: value ?? '' });
  latest.current.value = value;
  latest.current.onSave = onSave;

  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.value = value ?? '';
      latest.current.text = value ?? '';
    }
  }, [value]);

  useEffect(
    () => () => {
      const { text, value: saved, onSave: save } = latest.current;
      if (text !== (saved ?? '')) save(text);
    },
    [],
  );

  const commit = () => {
    const next = ref.current.value;
    latest.current.text = next;
    if (next !== (value ?? '')) onSave(next);
  };
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <Tag
      ref={ref}
      className={className}
      defaultValue={value ?? ''}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      onBlur={commit}
      onInput={(e) => {
        latest.current.text = e.currentTarget.value;
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !multiline) e.currentTarget.blur();
        if (e.key === 'Escape') {
          e.currentTarget.value = value ?? '';
          latest.current.text = value ?? '';
          e.currentTarget.blur();
        }
      }}
    />
  );
}
