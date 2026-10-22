const handlers = new Map();

export function on(event, fn) {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event).add(fn);
  return () => handlers.get(event)?.delete(fn);
}

export function emit(event, payload) {
  handlers.get(event)?.forEach((fn) => fn(payload));
}

export const toast = (message, opts = {}) => emit('toast', { message, ...opts });

export function celebrate(source, intensity = 1) {
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  const el = source?.currentTarget ?? source?.target ?? source;
  if (el && typeof el.getBoundingClientRect === 'function') {
    const r = el.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  } else if (source && typeof source.clientX === 'number') {
    x = source.clientX;
    y = source.clientY;
  }
  emit('celebrate', { x, y, intensity });
}
