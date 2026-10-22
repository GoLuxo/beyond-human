import { useSyncExternalStore } from 'react';
import * as THREE from 'three/webgpu';
import { pass, uniform, vec4, mix } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { createUniverse } from './universe.js';
import { createOrbit } from './orbit.js';
import { system } from '../lib/platform.js';

export const QUALITY = {
  ultra: { label: 'Ultra', maxDpr: 2, bloom: true, cap: 0, stars: 14000, dust: 22000 },
  high: { label: 'High', maxDpr: 1.25, bloom: true, cap: 0, stars: 9000, dust: 14000 },
  battery: { label: 'Battery saver', maxDpr: 1, bloom: false, cap: 30, stars: 5000, dust: 7000 },
};

const BLOOM = { strength: 1.05, radius: 0.6, threshold: 0.7 };
const MIN_PIXEL_RATIO = 0.5;

let status = { state: 'idle', backend: '', gpu: '', fps: 0, error: '', resolution: 100, lowPower: false, safe: false };
const statusListeners = new Set();
function setStatus(patch) {
  status = { ...status, ...patch };
  statusListeners.forEach((l) => l());
}
const subscribeStatus = (cb) => {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
};
export const useGfx = () => useSyncExternalStore(subscribeStatus, () => status);
export const gfxStatus = () => status;

const uTime = uniform(0);
let renderer = null;
let pipeline = null;
let bloomNode = null;
let universe = null;
let orbit = null;
let canvas = null;
let opts = { theme: 'dark', quality: 'high', reduced: false };
const mouse = { x: 0, y: 0 };
let lastRender = 0;
let fpsFrames = 0;
let fpsSince = 0;
let bloomBoost = 0;
let scale = 1;
let lowPower = false;
let perf = { since: 0, frames: 0, good: 0, bad: 0, startedAt: 0 };
let orbitMemory = { slot: null, days: null, monthStarts: null };
const frameListeners = new Set();

export const onFrame = (cb) => {
  frameListeners.add(cb);
  return () => frameListeners.delete(cb);
};

function onPointer(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
}

const baseRatio = () => Math.min(window.devicePixelRatio || 1, (QUALITY[opts.quality] ?? QUALITY.high).maxDpr);

function resize() {
  if (!renderer || !canvas) return;
  const ratio = Math.max(MIN_PIXEL_RATIO, baseRatio() * scale);
  renderer.setPixelRatio(ratio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  setStatus({ resolution: Math.round((ratio / (window.devicePixelRatio || 1)) * 100) });
  universe.camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  universe.camera.updateProjectionMatrix();
}

function build() {
  const light = opts.theme === 'light';

  universe?.dispose();
  orbit?.dispose();

  universe = createUniverse({ light, uTime, renderer });
  orbit = createOrbit({ light, uTime, compute: renderer.backend.isWebGPUBackend === true });
  if (orbitMemory.days) orbit.setDays(...orbitMemory.days);
  if (orbitMemory.monthStarts) orbit.setMonthStarts(orbitMemory.monthStarts);
  if (orbitMemory.slot) orbit.attach(orbitMemory.slot);
  applyCounts();
  makePipeline();
}

function applyCounts() {
  const q = QUALITY[opts.quality] ?? QUALITY.high;
  const f = lowPower ? 0.45 : 1;
  universe.setStarCount(Math.round(q.stars * f));
  orbit.setDustCount(Math.round(q.dust * f));
}

function makePipeline() {
  const light = opts.theme === 'light';
  const q = QUALITY[opts.quality] ?? QUALITY.high;
  pipeline?.dispose();
  const sky = pass(universe.scene, universe.camera).getTextureNode();
  const ring = pass(orbit.scene, orbit.camera).getTextureNode();
  let out = light ? mix(sky, vec4(ring.rgb, 1), ring.a) : sky.add(vec4(ring.rgb, 0));
  bloomNode = null;
  if (q.bloom && !light && !lowPower) {
    bloomNode = bloom(out, BLOOM.strength, BLOOM.radius, BLOOM.threshold);
    out = out.add(bloomNode);
  }
  pipeline = new THREE.RenderPipeline(renderer);
  pipeline.outputColorTransform = false;
  pipeline.outputNode = out.renderOutput();
}

function frame(t) {
  if (document.hidden || !pipeline) return;
  const q = QUALITY[opts.quality] ?? QUALITY.high;
  const cap = opts.reduced ? 24 : q.cap;
  if (cap && lastRender && t - lastRender < 1000 / cap - 2) return;
  const dt = lastRender ? Math.min(0.1, (t - lastRender) / 1000) : 1 / 60;
  lastRender = t;
  if (!opts.reduced) uTime.value += dt;

  fpsFrames += 1;
  if (t - fpsSince >= 500) {
    setStatus({ fps: Math.round((fpsFrames * 1000) / (t - fpsSince)) });
    fpsFrames = 0;
    fpsSince = t;
  }
  adapt(t, cap);

  bloomBoost *= Math.exp(-dt * 2.6);
  if (bloomNode) bloomNode.strength.value = BLOOM.strength + bloomBoost;

  const rect = canvas.getBoundingClientRect();
  universe.update(dt, mouse, opts.reduced);
  orbit.update(dt, mouse, rect, renderer);
  pipeline.render();
  frameListeners.forEach((cb) => cb(rect));
}

function adapt(t, cap) {
  perf.frames += 1;
  if (!perf.since) perf.since = t;
  if (t - perf.since < 1000) return;
  const fps = (perf.frames * 1000) / (t - perf.since);
  perf.frames = 0;
  perf.since = t;
  if (t - perf.startedAt < 2500) return; 
  const target = cap ? cap * 0.9 : 52;
  const minScale = MIN_PIXEL_RATIO / baseRatio();
  if (fps < target) {
    perf.good = 0;
    if (scale > minScale + 0.01) {
      scale = Math.max(minScale, scale * 0.8);
      resize();
    } else if (fps < 30 && !lowPower && (perf.bad += 1) >= 3) {
      lowPower = true;
      applyCounts();
      makePipeline();
      setStatus({ lowPower: true });
    }
  } else if (fps >= target + 5) {
    perf.bad = 0;
    if (scale < 1 && (perf.good += 1) >= 4) {
      perf.good = 0;
      scale = Math.min(1, scale * 1.12);
      resize();
    }
  }
}

async function describeGpu() {
  try {
    const adapter = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
    const info = adapter?.info;
    const vendors = { amd: 'AMD', nvidia: 'NVIDIA', intel: 'Intel', apple: 'Apple', qualcomm: 'Qualcomm', microsoft: 'Microsoft' };
    if (info) return info.description || [vendors[info.vendor] ?? info.vendor, info.architecture?.toUpperCase()].filter(Boolean).join(' ');
  } catch {}
  return '';
}

export async function startGfx(el, initial = {}) {
  if (renderer) return status.state === 'running';
  canvas = el;
  opts = { ...opts, ...initial };
  setStatus({ state: 'starting' });
  const safe = Boolean(initial.safe);
  try {
    renderer = new THREE.WebGPURenderer({ canvas, antialias: true, powerPreference: safe ? 'default' : 'high-performance', forceWebGL: safe });
    await renderer.init();
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.setClearColor(0x000000, 0);
    build();
    resize();
  } catch (err) {
    console.error('[gfx] GPU renderer unavailable', err);
    renderer = null;
    setStatus({ state: 'failed', error: String(err?.message ?? err) });
    return false;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointer, { passive: true });
  renderer.onDeviceLost = (info) => {
    console.error('[gfx] graphics device lost', info?.message);
    system.gfxDeviceLost(`${info?.api ?? 'GPU'}: ${info?.message ?? 'unknown'}`);
  };
  perf.startedAt = performance.now();
  renderer.setAnimationLoop(frame);
  setStatus({ state: 'running', safe, backend: renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL 2', gpu: safe ? '' : await describeGpu() });
  return true;
}

export const gfx = {
  setOptions(patch) {
    const rebuild = (patch.theme && patch.theme !== opts.theme) || (patch.quality && patch.quality !== opts.quality);
    const qualityChanged = patch.quality && patch.quality !== opts.quality;
    opts = { ...opts, ...patch };
    if (qualityChanged) {
      scale = 1;
      lowPower = false;
      perf = { since: 0, frames: 0, good: 0, bad: 0, startedAt: performance.now() };
      setStatus({ lowPower: false });
    }
    if (renderer && rebuild) {
      build();
      resize();
    }
  },

  orbit: {
    attach(el) {
      orbitMemory.slot = el;
      orbit?.attach(el);
    },
    detach(el) {
      if (orbitMemory.slot === el) orbitMemory.slot = null;
      orbit?.detach(el);
    },
    setDays(styles, todayIndex, elapsed, monthStarts) {
      orbitMemory.days = [styles, todayIndex, elapsed];
      orbitMemory.monthStarts = monthStarts;
      if (!orbit) return;
      orbit.setDays(styles, todayIndex, elapsed);
      orbit.setMonthStarts(monthStarts);
    },
    setHover: (i) => orbit?.setHover(i),
    ignite(i) {
      if (!orbit) return;
      orbit.ignite(i, uTime.value, renderer);
      bloomBoost = 2.4;
    },
    pick(x, y) {
      if (!orbit || !canvas) return -1;
      return orbit.pick(x, y, canvas.getBoundingClientRect());
    },
    projectDay(i, rect) {
      const p = orbit?.dayPosition(i);
      return p ? orbit.project(p, rect) : null;
    },
    projectLabel(i, rect) {
      return orbit ? orbit.project(orbit.labelPosition(i), rect) : null;
    },
    get rig() {
      return orbit?.rig;
    },
    get reveal() {
      return orbit?.uniforms.uReveal;
    },
  },
};
