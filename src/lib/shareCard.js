import { yearDays, dayOfYear, daysInYear, parseYmd } from './dates.js';
import { scorer } from './progress.js';

export const SHARE_FORMATS = {
  post: { label: 'Post', width: 1080, height: 1350 },
  story: { label: 'Story', width: 1080, height: 1920 },
};

const DISPLAY = "'Unbounded Variable', 'Segoe UI', sans-serif";
const BODY = "'Geist Variable', 'Segoe UI', sans-serif";

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function starfield(ctx, w, h) {
  const rnd = seeded(20260);
  for (let i = 0; i < 520; i += 1) {
    const x = rnd() * w;
    const y = rnd() * h;
    const big = rnd() ** 8;
    ctx.globalAlpha = 0.15 + rnd() * 0.5 + big * 0.4;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 0.6 + big * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const glow = ctx.createRadialGradient(w * 0.3, h * 0.35, 0, w * 0.3, h * 0.35, w * 0.9);
  glow.addColorStop(0, 'rgba(255,255,255,0.07)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function logo(ctx, x, y, size) {
  const s = size / 64;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(32, 32, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.84);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(11.74, 19.14, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fill(new Path2D('M32 19 Q33.9 30.1 45 32 Q33.9 33.9 32 45 Q30.1 33.9 19 32 Q30.1 30.1 32 19Z'));
  ctx.restore();
}

function orbit(ctx, cx, cy, radius, state, today) {
  const year = parseYmd(today).getFullYear();
  const keys = yearDays(year);
  const n = keys.length;
  const scoreOf = scorer(state);
  const joined = new Date(state.profile.createdAt).toLocaleDateString('sv');

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 46, 0, Math.PI * 2);
  ctx.stroke();

  const ti = keys.indexOf(today);
  if (ti >= 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 46, -Math.PI / 2, -Math.PI / 2 + ((ti + 1) / n) * Math.PI * 2);
    ctx.stroke();
  }

  keys.forEach((key, i) => {
    const a = -Math.PI / 2 + ((i + 0.5) / n) * Math.PI * 2;
    const lit = Boolean(state.days[key]?.done);
    const future = key > today || (key < joined && !lit);
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    if (lit) {
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, key === today ? 9 : 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      const s = future ? 0 : scoreOf(key);
      ctx.fillStyle = `rgba(255,255,255,${future ? 0.16 : 0.22 + s * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, future ? 1.8 : 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  if (ti >= 0) {
    const a = -Math.PI / 2 + ((ti + 0.5) / n) * Math.PI * 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * (radius + 26), cy + Math.sin(a) * (radius + 26), 12, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function stat(ctx, x, y, value, label) {
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = `600 64px ${DISPLAY}`;
  ctx.fillText(value, x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `500 26px ${BODY}`;
  ctx.fillText(label, x, y + 44);
}

export async function drawShareCard(canvas, { format, state, stats, today }) {
  const { width: w, height: h } = SHARE_FORMATS[format];
  canvas.width = w;
  canvas.height = h;
  await Promise.all([document.fonts.load(`600 64px ${DISPLAY}`), document.fonts.load(`500 26px ${BODY}`)]);
  const ctx = canvas.getContext('2d');
  const date = parseYmd(today);
  const year = date.getFullYear();
  const story = format === 'story';

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  starfield(ctx, w, h);

  logo(ctx, 80, 80, 56);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.font = `600 30px ${DISPLAY}`;
  ctx.fillText('Beyond Human', 152, 118);

  ctx.font = `600 ${story ? 104 : 92}px ${DISPLAY}`;
  ctx.fillText(`My ${year}`, 80, story ? 320 : 270);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `500 ${story ? 36 : 32}px ${BODY}`;
  ctx.fillText(`${stats.litDays} days lit. ${daysInYear(year) - dayOfYear(date)} to go.`, 84, story ? 384 : 326);

  const cx = w / 2;
  const cy = story ? 940 : 760;
  const radius = story ? 380 : 330;
  orbit(ctx, cx, cy, radius, state, today);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(255,255,255,0.6)';
  ctx.shadowBlur = 40;
  ctx.font = `600 ${story ? 200 : 170}px ${DISPLAY}`;
  ctx.fillText(String(dayOfYear(date)), cx, cy + (story ? 62 : 52));
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `500 30px ${BODY}`;
  ctx.fillText(`day of ${daysInYear(year)}`, cx, cy + (story ? 122 : 106));

  const rowY = story ? 1520 : 1190;
  const col = (w - 160) / 3;
  stat(ctx, 80, rowY, String(stats.streak), 'day streak');
  stat(ctx, 80 + col, rowY, String(stats.bestStreak), 'best streak');
  stat(ctx, 80 + col * 2, rowY, `Lv ${stats.level}`, stats.rank.name);

  if (story) {
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 1680);
    ctx.lineTo(w - 80, 1680);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = `600 34px ${DISPLAY}`;
    ctx.fillText('Light up all 365 days.', 80, 1760);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `500 28px ${BODY}`;
    ctx.fillText('Made with Beyond Human', 80, 1810);
  }
  return canvas;
}
