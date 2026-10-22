import { memo, useEffect, useRef } from 'react';

function Starfield({ theme, reduced }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const light = theme === 'light';
    const rgb = light ? '0,0,0' : '255,255,255';
    let w = 0;
    let h = 0;
    let stars = [];
    let raf = 0;
    let last = 0;
    let shooting = null;
    let nextShot = performance.now() + 9000 + Math.random() * 9000;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 4200);
      stars = Array.from({ length: count }, () => {
        const z = Math.random() ** 2.2;
        return { x: Math.random() * w, y: Math.random() * h, z, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 1.4 };
      });
      if (reduced) draw(0);
    }

    function sparkle(x, y, size, alpha) {
      ctx.strokeStyle = `rgba(${rgb},${alpha * 0.55})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x + size, y);
      ctx.moveTo(x, y - size);
      ctx.lineTo(x, y + size);
      ctx.stroke();
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      mouse.x += (mouse.tx - mouse.x) * 0.03;
      mouse.y += (mouse.ty - mouse.y) * 0.03;
      const drift = reduced ? 0 : t * 0.0035;
      for (const s of stars) {
        const px = (((s.x + drift * (0.2 + s.z) + mouse.x * s.z * 18) % w) + w) % w;
        const py = s.y + mouse.y * s.z * 18;
        const twinkle = reduced ? 1 : 0.6 + 0.4 * Math.sin(t * 0.0012 * s.speed + s.phase);
        const alpha = (0.18 + 0.82 * s.z) * twinkle * (light ? 0.55 : 1);
        const r = 0.35 + s.z * 1.25;
        ctx.fillStyle = `rgba(${rgb},${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        if (s.z > 0.86) sparkle(px, py, r * 4.5 * twinkle, alpha);
      }

      if (!reduced && !light) {
        if (!shooting && t > nextShot) {
          const fromLeft = Math.random() > 0.5;
          shooting = { x: fromLeft ? Math.random() * w * 0.5 : w * (0.5 + Math.random() * 0.5), y: Math.random() * h * 0.4, vx: (fromLeft ? 1 : -1) * (7 + Math.random() * 4), vy: 2.5 + Math.random() * 2, life: 0 };
        }
        if (shooting) {
          const s = shooting;
          s.x += s.vx;
          s.y += s.vy;
          s.life += 1;
          const tail = 18;
          const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * tail, s.y - s.vy * tail);
          const fade = Math.max(0, 1 - s.life / 70);
          grad.addColorStop(0, `rgba(${rgb},${0.9 * fade})`);
          grad.addColorStop(1, `rgba(${rgb},0)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.vx * tail, s.y - s.vy * tail);
          ctx.stroke();
          if (s.life > 70 || s.x < -200 || s.x > w + 200 || s.y > h + 200) {
            shooting = null;
            nextShot = t + 14000 + Math.random() * 16000;
          }
        }
      }
    }

    function frame(t) {
      raf = requestAnimationFrame(frame);
      if (document.hidden || t - last < 33) return;
      last = t;
      draw(t);
    }

    const onMove = (e) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    resize();
    window.addEventListener('resize', resize);
    if (!reduced) {
      window.addEventListener('mousemove', onMove);
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, [theme, reduced]);

  return <canvas className="starfield" ref={ref} aria-hidden="true" />;
}

export default memo(Starfield);
