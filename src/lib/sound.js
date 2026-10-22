let ctx = null;
let master = null;

function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, { start = 0, dur = 0.5, type = 'sine', gain = 0.18, attack = 0.005, detune = 0 } = {}) {
  const c = audio();
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function safe(fn) {
  return (...args) => {
    try {
      fn(...args);
    } catch {}
  };
}

export const sound = {
  tick: safe(() => tone(1320, { dur: 0.12, gain: 0.08, type: 'triangle' })),
  check: safe(() => {
    tone(880, { dur: 0.35, gain: 0.12 });
    tone(1318.5, { start: 0.06, dur: 0.45, gain: 0.1 });
  }),
  uncheck: safe(() => tone(440, { dur: 0.18, gain: 0.08, type: 'triangle' })),
  lightUp: safe(() => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, { start: i * 0.07, dur: 1.4, gain: 0.09 }));
    tone(2093, { start: 0.38, dur: 1.6, gain: 0.04, detune: 6 });
  }),
  achievement: safe(() => {
    [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => tone(f, { start: i * 0.09, dur: 0.9, gain: 0.08, type: 'triangle' }));
  }),
  levelUp: safe(() => {
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => tone(f, { start: i * 0.08, dur: 1.8, gain: 0.08 }));
    tone(196, { dur: 2.2, gain: 0.1, attack: 0.1 });
  }),
  bell: safe(() => {
    tone(1046.5, { dur: 2.4, gain: 0.14 });
    tone(2093, { dur: 1.6, gain: 0.05 });
    tone(1046.5, { start: 0.9, dur: 2.4, gain: 0.1 });
  }),
  start: safe(() => {
    tone(659.25, { dur: 0.3, gain: 0.1 });
    tone(987.77, { start: 0.1, dur: 0.5, gain: 0.1 });
  }),
};

let noise = null;

export function startAmbient(kind = 'brown', volume = 0.4) {
  stopAmbient();
  try {
    const c = audio();
    const length = c.sampleRate * 4;
    const buffer = c.createBuffer(1, length, c.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      if (kind === 'brown') {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else {
        data[i] = white * 0.5;
      }
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = c.createBiquadFilter();
    if (kind === 'rain') {
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 0.6;
    } else {
      filter.type = 'lowpass';
      filter.frequency.value = 900;
    }
    const g = c.createGain();
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(volume * 0.6, c.currentTime + 1.5);
    src.connect(filter).connect(g).connect(c.destination);
    src.start();
    noise = { src, g };
  } catch {
    noise = null;
  }
}

export function setAmbientVolume(volume) {
  if (noise && ctx) noise.g.gain.setTargetAtTime(volume * 0.6, ctx.currentTime, 0.2);
}

export function stopAmbient() {
  if (!noise || !ctx) return;
  const { src, g } = noise;
  g.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
  setTimeout(() => {
    try {
      src.stop();
    } catch {}
  }, 1200);
  noise = null;
}
