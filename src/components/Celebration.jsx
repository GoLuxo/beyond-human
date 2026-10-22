import { useEffect, useRef } from 'react';
import { on } from '../lib/events.js';

export default function Celebration({ reduced }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let rings = [];
    let raf = 0;
    let w = 0;
    let h = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function star(x, y, r, rot) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      for (let i = 0; i < 4; i += 1) {
        const a = (i * Math.PI) / 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a + Math.PI / 4) * r * 0.28, Math.sin(a + Math.PI / 4) * r * 0.28);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);
      const rgb = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() === '#000000' ? '0,0,0' : '255,255,255';

      rings = rings.filter((r) => r.life < r.max);
      for (const r of rings) {
        r.life += 1;
        if (r.life <= 0) continue;
        const p = r.life / r.max;
        const radius = r.size * (1 - (1 - p) ** 3);
        ctx.strokeStyle = `rgba(${rgb},${(1 - p) * 0.7})`;
        ctx.lineWidth = 2 * (1 - p) + 0.4;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      particles = particles.filter((p) => p.life < p.max);
      for (const p of particles) {
        p.life += 1;
        p.vx *= 0.965;
        p.vy = p.vy * 0.965 + 0.09;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.spin;
        const a = 1 - p.life / p.max;
        ctx.fillStyle = `rgba(${rgb},${a})`;
        if (p.kind === 'star') star(p.x, p.y, p.size * (0.6 + a * 0.6), p.rot);
        else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (particles.length || rings.length) raf = requestAnimationFrame(tick);
      else {
        raf = 0;
        ctx.clearRect(0, 0, w, h);
      }
    }

    const off = on('celebrate', ({ x, y, intensity = 1 }) => {
      rings.push({ x, y, size: 60 + 90 * intensity, life: 0, max: 46 });
      if (!reduced) {
        if (intensity > 1.2) rings.push({ x, y, size: 160 * intensity, life: -8, max: 60 });
        const count = Math.round(26 * intensity);
        for (let i = 0; i < count; i += 1) {
          const angle = Math.random() * Math.PI * 2;
          const speed = (2 + Math.random() * 6) * Math.min(1.6, 0.7 + intensity * 0.4);
          particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 0,
            max: 50 + Math.random() * 50,
            size: 3 + Math.random() * 6,
            rot: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.2,
            kind: Math.random() > 0.45 ? 'star' : 'dot',
          });
        }
      }
      if (!raf) raf = requestAnimationFrame(tick);
    });

    resize();
    window.addEventListener('resize', resize);
    return () => {
      off();
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reduced]);

  return <canvas className="celebration" ref={ref} aria-hidden="true" />;
}
