import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { getState } from '../state/store.js';

gsap.registerPlugin(SplitText);

const reduced = () => getState().settings.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function SplitHeading({ text, as: Tag = 'h1', className, delay = 0 }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    el.textContent = text;
    if (reduced()) return undefined;
    const split = SplitText.create(el, { type: 'words,chars', wordsClass: 'split-word' });
    const tween = gsap.from(split.chars, {
      yPercent: 110,
      opacity: 0,
      filter: 'blur(10px)',
      rotateX: -70,
      transformOrigin: '50% 100%',
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.022,
      delay,
      onComplete: () => split.revert(),
    });
    return () => {
      tween.kill();
      split.revert();
    };
  }, [text, delay]);
  return <Tag ref={ref} className={className} aria-label={text} />;
}

export function CountUp({ value, duration = 1.6, delay = 0, fromZero = true, format = (v) => Math.round(v).toLocaleString(), className }) {
  const ref = useRef(null);
  const current = useRef({ v: fromZero ? 0 : value });
  useEffect(() => {
    const el = ref.current;
    if (reduced()) {
      current.current.v = value;
      el.textContent = format(value);
      return undefined;
    }
    const tween = gsap.to(current.current, {
      v: value,
      duration,
      delay,
      ease: 'expo.out',
      onUpdate: () => {
        el.textContent = format(current.current.v);
      },
    });
    return () => tween.kill();
  }, [value, duration, delay]);
  return (
    <span ref={ref} className={className}>
      {format(current.current.v)}
    </span>
  );
}
