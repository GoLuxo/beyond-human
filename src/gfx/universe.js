import * as THREE from 'three/webgpu';
import {
  float, vec3, vec4, sin, cos, sqrt, mix, step, exp, hash, instanceIndex, uv, texture,
  mx_fractal_noise_float, TWO_PI, PI,
} from 'three/tsl';
import { flareStar } from './shapes.js';

export const MAX_STARS = 14000;

function bakeNebula(renderer) {
  const target = new THREE.RenderTarget(1536, 768, { type: THREE.HalfFloatType });
  const mat = new THREE.MeshBasicNodeMaterial();
  const phi = uv().x.mul(TWO_PI);
  const theta = float(1).sub(uv().y).mul(PI);
  const dir = vec3(cos(phi).negate().mul(sin(theta)), cos(theta), sin(phi).mul(sin(theta)));
  const broad = mx_fractal_noise_float(dir.mul(1.8), 5, 2.0, 0.5, 1.0).mul(0.5).add(0.5);
  const fine = mx_fractal_noise_float(dir.mul(6.5).add(3.1), 4, 2.1, 0.55, 1.0).mul(0.5).add(0.5);
  const band = exp(dir.y.mul(dir.y).mul(-11));
  const cloud = broad.pow(3.2).mul(band.mul(0.9).add(0.1)).mul(fine.mul(0.7).add(0.3));
  mat.colorNode = vec3(cloud);

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  renderer.setRenderTarget(target);
  renderer.render(scene, cam);
  renderer.setRenderTarget(null);
  quad.geometry.dispose();
  mat.dispose();
  return target;
}

export function createUniverse({ light, uTime, renderer }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(light ? 0xffffff : 0x000000);
  const camera = new THREE.PerspectiveCamera(55, 1, 1, 4000);

  const sky = new THREE.Group();
  sky.rotation.z = THREE.MathUtils.degToRad(-24);
  sky.rotation.x = THREE.MathUtils.degToRad(8);
  scene.add(sky);

  const nebulaTarget = bakeNebula(renderer);
  const nebula = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false });
  const cloud = texture(nebulaTarget.texture, uv()).r;
  nebula.colorNode = light ? vec3(1).sub(vec3(cloud.mul(0.08))) : vec3(cloud.mul(0.17));
  sky.add(new THREE.Mesh(new THREE.SphereGeometry(2400, 64, 32), nebula));

  const stars = new THREE.SpriteNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: light ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
  const h1 = hash(instanceIndex.add(1));
  const h2 = hash(instanceIndex.add(7));
  const h3 = hash(instanceIndex.add(13));
  const h4 = hash(instanceIndex.add(29));
  const h5 = hash(instanceIndex.add(41));
  const theta = h1.mul(TWO_PI);
  const yRaw = h2.mul(2).sub(1);
  const y = mix(yRaw, yRaw.mul(0.13), step(0.55, h4));
  const ring = sqrt(float(1).sub(y.mul(y)));
  const radius = mix(500, 1600, h3);
  stars.positionNode = vec3(cos(theta).mul(ring), y, sin(theta).mul(ring)).mul(radius);

  const big = h5.pow(9);
  stars.scaleNode = mix(1.1, 7.0, big).mul(radius.div(900));
  const twinkle = sin(uTime.mul(mix(0.5, 2.6, h1)).add(h3.mul(TWO_PI))).mul(0.3).add(0.7);
  const brightness = mix(0.12, 0.55, h2.pow(2)).add(big.mul(2.4)).mul(twinkle);
  const alpha = flareStar(big.mul(1.6).min(1), 3);
  stars.colorNode = light ? vec4(vec3(0), alpha.mul(mix(0.15, 0.7, brightness.min(1)))) : vec4(vec3(brightness), alpha);

  const starMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), stars, MAX_STARS);
  starMesh.frustumCulled = false;
  sky.add(starMesh);

  let drift = 0;
  const look = { x: 0, y: 0 };

  return {
    scene,
    camera,
    setStarCount(n) {
      starMesh.count = Math.min(MAX_STARS, n);
    },
    update(dt, mouse, reduced) {
      if (!reduced) drift += dt * 0.006;
      look.x += (mouse.x - look.x) * Math.min(1, dt * 2.2);
      look.y += (mouse.y - look.y) * Math.min(1, dt * 2.2);
      camera.rotation.set(0.05 - look.y * 0.035, drift - look.x * 0.05, 0, 'YXZ');
    },
    dispose() {
      nebulaTarget.dispose();
      scene.traverse((o) => {
        if (!o.isSprite) o.geometry?.dispose();
        o.material?.dispose();
      });
    },
  };
}
