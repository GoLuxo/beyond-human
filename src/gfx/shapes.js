import { uv, float, smoothstep, clamp } from 'three/tsl';

export function softDisc(power = 2.2) {
  const d = uv().sub(0.5).length();
  return float(1).sub(smoothstep(0, 0.5, d)).pow(power);
}

export function flareStar(amount, power = 2.2) {
  const p = uv().sub(0.5);
  const d = p.length();
  const fade = float(1).sub(smoothstep(0, 0.5, d));
  const core = fade.pow(power);
  const spikes = float(0.0022).div(p.x.abs().mul(p.y.abs()).add(0.0022)).mul(fade.pow(1.5));
  return clamp(core.add(spikes.mul(amount).mul(0.55)), 0, 1);
}

export function ringShape(radius = 0.4, width = 0.035) {
  const d = uv().sub(0.5).length();
  return float(1).sub(smoothstep(0, width, d.sub(radius).abs()));
}
