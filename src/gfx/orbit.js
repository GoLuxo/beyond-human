import * as THREE from 'three/webgpu';
import {
  Fn, float, vec3, vec4, uniform, sin, cos, sqrt, mix, step, exp, abs, max, hash,
  instanceIndex, instancedArray, instancedDynamicBufferAttribute, TWO_PI,
} from 'three/tsl';
import { softDisc, flareStar, ringShape } from './shapes.js';

export const RING_RADIUS = 10;
const MAX_DAYS = 366;
export const MAX_DUST = 22000;
const SPARK_COUNT = 6000;

export const dayAngle = (i, n) => ((i + 0.5) / n) * Math.PI * 2;
export const ringPoint = (t, r, y = 0) => new THREE.Vector3(Math.sin(t) * r, y, -Math.cos(t) * r);

export function createOrbit({ light, uTime, compute }) {
  const scene = new THREE.Scene();
  scene.visible = false;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
  const blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
  const ink = (brightness, alpha) => (light ? vec4(vec3(0), alpha.mul(brightness.mul(2).min(1))) : vec4(vec3(brightness), alpha));

  const uHover = uniform(-1);
  const uIgnite = uniform(-1);
  const uIgniteAt = uniform(-100);
  const uReveal = uniform(1);
  const uCount = uniform(365);

  const posAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_DAYS * 3), 3);
  const styleAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_DAYS * 4), 4);
  const P = instancedDynamicBufferAttribute(posAttr);
  const S = instancedDynamicBufferAttribute(styleAttr);
  const idx = float(instanceIndex);
  const hoverF = float(1).sub(step(0.5, abs(idx.sub(uHover))));
  const igniteAge = max(uTime.sub(uIgniteAt), 0);
  const igniteF = float(1).sub(step(0.5, abs(idx.sub(uIgnite)))).mul(exp(igniteAge.mul(-1.4)));
  const revealed = step(idx.div(uCount), uReveal);
  const twinkle = sin(uTime.mul(2.1).add(hash(instanceIndex.add(3)).mul(TWO_PI))).mul(0.1).add(1);
  const pulse = sin(uTime.mul(3.2)).mul(0.2).mul(S.w).add(1);

  const dayMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending });
  dayMat.positionNode = P;
  dayMat.scaleNode = S.x.mul(twinkle).mul(pulse).mul(hoverF.mul(1.4).add(igniteF.mul(3)).add(1)).mul(revealed);
  const dayBright = S.y.mul(hoverF.mul(1.6).add(igniteF.mul(5)).add(1));
  dayMat.colorNode = ink(dayBright, flareStar(S.z.add(hoverF).min(1)).mul(revealed));
  const days = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), dayMat, MAX_DAYS);
  days.frustumCulled = false;
  days.count = 365;
  scene.add(days);

  const d1 = hash(instanceIndex.add(101));
  const d2 = hash(instanceIndex.add(211));
  const d3 = hash(instanceIndex.add(307));
  const d4 = hash(instanceIndex.add(401));
  const spread = d1.add(d2).sub(1).mul(2.6);
  const r = spread.add(RING_RADIUS);
  const speed = float(0.045).div(r.div(RING_RADIUS).pow(1.5));
  const angle = d3.mul(TWO_PI).add(uTime.mul(speed));
  const thickness = d4.sub(0.5).mul(0.22).mul(abs(spread).mul(0.35).add(1));
  const dustMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending });
  dustMat.positionNode = vec3(sin(angle).mul(r), thickness, cos(angle).negate().mul(r));
  dustMat.scaleNode = mix(0.035, 0.12, d2.pow(3)).mul(step(d3, uReveal));
  const dustBright = mix(0.12, 0.5, d4.pow(3)).add(d1.pow(12).mul(2.2)).mul(exp(abs(spread).mul(-0.45)).mul(0.8).add(0.2));
  dustMat.colorNode = ink(dustBright, softDisc(2));
  const dust = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), dustMat, MAX_DUST);
  dust.frustumCulled = false;
  scene.add(dust);

  const lineColor = light ? 0x000000 : 0xffffff;
  const circlePts = Array.from({ length: 257 }, (_, i) => ringPoint((i / 256) * Math.PI * 2, RING_RADIUS - 1.9));
  const guide = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(circlePts),
    new THREE.LineBasicNodeMaterial({ color: lineColor, transparent: true, opacity: 0.07 }),
  );
  scene.add(guide);
  const arcGeo = new THREE.BufferGeometry();
  const arc = new THREE.Line(arcGeo, new THREE.LineBasicNodeMaterial({ color: lineColor, transparent: true, opacity: 0.32 }));
  scene.add(arc);

  const tickAttr = new THREE.InstancedBufferAttribute(new Float32Array(12 * 3), 3);
  const tickMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending });
  tickMat.positionNode = instancedDynamicBufferAttribute(tickAttr);
  tickMat.scaleNode = float(0.16).mul(uReveal);
  tickMat.colorNode = ink(float(0.55), softDisc(1.5));
  const ticks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), tickMat, 12);
  ticks.frustumCulled = false;
  scene.add(ticks);

  const satMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending });
  satMat.scaleNode = sin(uTime.mul(2.6)).mul(0.12).add(0.62).mul(uReveal);
  satMat.colorNode = ink(float(3.2), flareStar(float(1)));
  const satellite = new THREE.Sprite(satMat);
  scene.add(satellite);

  const pulsePhase = uTime.mul(0.55).fract();
  const pulseMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending });
  pulseMat.scaleNode = mix(0.5, 3.2, pulsePhase).mul(uReveal);
  pulseMat.colorNode = ink(float(1.6).mul(float(1).sub(pulsePhase)), ringShape(0.42, 0.03));
  const pulseRing = new THREE.Sprite(pulseMat);
  scene.add(pulseRing);

  const shockMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending });
  shockMat.scaleNode = igniteAge.mul(16).min(30);
  shockMat.colorNode = ink(float(2.4).mul(exp(igniteAge.mul(-2.4))), ringShape(0.44, 0.025));
  const shock = new THREE.Sprite(shockMat);
  shock.visible = false;
  scene.add(shock);

  let sparks = null;
  if (compute) {
    const uOrigin = uniform(new THREE.Vector3());
    const uSeed = uniform(1);
    const uStep = uniform(1);
    const uDt = uniform(0.016);
    const pos = instancedArray(SPARK_COUNT, 'vec3');
    const vel = instancedArray(SPARK_COUNT, 'vec3');
    const life = instancedArray(SPARK_COUNT, 'float');

    const burst = Fn(() => {
      const seed = uSeed.toUint();
      const u = hash(instanceIndex.add(seed));
      const v = hash(instanceIndex.add(seed).add(7919));
      const w = hash(instanceIndex.add(seed).add(104729));
      const theta = u.mul(TWO_PI);
      const z = v.mul(2).sub(1);
      const ring = sqrt(float(1).sub(z.mul(z)));
      const dir = vec3(cos(theta).mul(ring), z.mul(0.6), sin(theta).mul(ring));
      pos.element(instanceIndex).assign(uOrigin);
      vel.element(instanceIndex).assign(dir.mul(w.pow(2).mul(0.42).add(0.03)));
      life.element(instanceIndex).assign(w.mul(0.6).add(0.55));
    })().compute(SPARK_COUNT);

    const advance = Fn(() => {
      const p = pos.element(instanceIndex);
      const vv = vel.element(instanceIndex);
      const l = life.element(instanceIndex);
      p.addAssign(vv.mul(uStep));
      vv.mulAssign(float(0.955).pow(uStep));
      vv.assign(vv.sub(vec3(0, uStep.mul(0.0025), 0)));
      l.assign(max(l.sub(uDt.mul(0.75)), 0));
    })().compute(SPARK_COUNT);

    const sparkMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending });
    const lifeA = life.toAttribute();
    sparkMat.positionNode = pos.toAttribute();
    sparkMat.scaleNode = lifeA.mul(0.26);
    sparkMat.colorNode = ink(lifeA.mul(4), softDisc(2.4));
    const sparkSprite = new THREE.Sprite(sparkMat);
    sparkSprite.count = SPARK_COUNT;
    sparkSprite.frustumCulled = false;
    scene.add(sparkSprite);
    sparks = { burst, advance, uOrigin, uSeed, uStep, uDt, alive: 0 };
  }

  const rig = { dist: 50, elev: 57, azim: 0 };
  const look = { x: 0, y: 0 };
  const positions = [];
  let n = 365;
  let slot = null;
  let attached = false;
  const tmp = new THREE.Vector3();

  function placeCamera() {
    const el = THREE.MathUtils.degToRad(rig.elev + look.y * 3);
    const az = THREE.MathUtils.degToRad(rig.azim + look.x * 5);
    camera.position.set(Math.sin(az) * Math.cos(el) * rig.dist, Math.sin(el) * rig.dist, Math.cos(az) * Math.cos(el) * rig.dist);
    camera.lookAt(0, -0.6, 0);
  }

  return {
    scene,
    camera,
    rig,
    uniforms: { uHover, uIgnite, uIgniteAt, uReveal },

    attach(element) {
      slot = element;
      attached = true;
      scene.visible = true;
    },
    detach(element) {
      if (slot !== element) return;
      slot = null;
      attached = false;
      scene.visible = false;
    },
    get attached() {
      return attached;
    },

    setDays(styles, todayIndex, elapsed) {
      n = styles.length;
      uCount.value = n;
      days.count = n;
      positions.length = 0;
      for (let i = 0; i < n; i += 1) {
        const p = ringPoint(dayAngle(i, n), RING_RADIUS);
        positions.push(p);
        posAttr.setXYZ(i, p.x, p.y, p.z);
        const s = styles[i];
        styleAttr.setXYZW(i, s.size, s.brightness, s.flare, s.pulse);
      }
      posAttr.needsUpdate = true;
      styleAttr.needsUpdate = true;

      const arcPts = [];
      const steps = Math.max(2, Math.round(256 * elapsed));
      for (let i = 0; i <= steps; i += 1) arcPts.push(ringPoint((i / 256) * Math.PI * 2, RING_RADIUS - 1.9));
      arcGeo.setFromPoints(arcPts);
      arc.visible = elapsed > 0;

      if (todayIndex >= 0) {
        const t = dayAngle(todayIndex, n);
        satellite.position.copy(ringPoint(t, RING_RADIUS + 1.05));
        pulseRing.position.copy(satellite.position);
        satellite.visible = true;
        pulseRing.visible = true;
      } else {
        satellite.visible = false;
        pulseRing.visible = false;
      }
    },

    setMonthStarts(indices) {
      indices.forEach((i, m) => {
        const p = ringPoint(dayAngle(i, n) - Math.PI / n, RING_RADIUS + 1.55);
        tickAttr.setXYZ(m, p.x, p.y, p.z);
      });
      tickAttr.needsUpdate = true;
    },

    setHover(i) {
      uHover.value = i ?? -1;
    },

    setDustCount(count) {
      dust.count = Math.min(MAX_DUST, count);
    },

    ignite(i, now, renderer) {
      if (i < 0 || i >= positions.length) return;
      uIgnite.value = i;
      uIgniteAt.value = now;
      shock.position.copy(positions[i]);
      shock.visible = true;
      if (sparks && renderer) {
        sparks.uOrigin.value.copy(positions[i]);
        sparks.uSeed.value = 1 + Math.floor(Math.random() * 100000) * 13;
        renderer.compute(sparks.burst);
        sparks.alive = 3.2;
      }
    },

    project(point, canvasRect) {
      tmp.copy(point).project(camera);
      return { x: canvasRect.left + ((tmp.x + 1) / 2) * canvasRect.width, y: canvasRect.top + ((1 - tmp.y) / 2) * canvasRect.height, behind: tmp.z > 1 };
    },
    dayPosition: (i) => positions[i],
    labelPosition: (i) => ringPoint(dayAngle(i, n) + (Math.PI * 2 * 3) / n, RING_RADIUS + 3.0),

    pick(clientX, clientY, canvasRect, radius = 16) {
      let best = -1;
      let bestD = radius * radius;
      for (let i = 0; i < positions.length; i += 1) {
        const s = this.project(positions[i], canvasRect);
        const d = (s.x - clientX) ** 2 + (s.y - clientY) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    },

    update(dt, mouse, canvasRect, renderer) {
      if (!attached || !slot) return;
      look.x += (mouse.x - look.x) * Math.min(1, dt * 2);
      look.y += (mouse.y - look.y) * Math.min(1, dt * 2);
      placeCamera();
      const r = slot.getBoundingClientRect();
      const sw = Math.max(1, r.width);
      const sh = Math.max(1, r.height);
      camera.aspect = sw / sh;
      camera.setViewOffset(sw, sh, canvasRect.left - r.left, canvasRect.top - r.top, canvasRect.width, canvasRect.height);
      camera.updateProjectionMatrix();

      if (sparks && sparks.alive > 0 && renderer) {
        sparks.uDt.value = dt;
        sparks.uStep.value = dt * 60;
        renderer.compute(sparks.advance);
        sparks.alive -= dt;
      }
      if (shock.visible && uTime.value - uIgniteAt.value > 2) shock.visible = false;
    },

    dispose() {
      scene.traverse((o) => {
        if (!o.isSprite) o.geometry?.dispose();
        o.material?.dispose();
      });
    },
  };
}
