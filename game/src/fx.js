// Sparks, tyre dust, crash smoke, and muzzle flash. Directions come from a counter, not Math.random.

import * as THREE from '../vendor/three.module.min.js';

const COUNT = 72;

function unit(i, axis) {
  const n = Math.sin(i * 12.9898 + axis * 78.233) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

export function createFx(scene) {
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const parts = [];
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3 + 1] = -30;
    parts.push({ life: 0, x: 0, y: -30, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, drag: 1, grav: 0 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.42,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  }));
  points.frustumCulled = false;
  scene.add(points);
  return { parts, positions, colors, geo, cursor: 0, seed: 3 };
}

function style(kind) {
  if (kind === 'spark') return { life: 0.38, r: 1, g: 0.72, b: 0.28, drag: 0.6, grav: 14, kick: 3.4, up: 2.4 };
  if (kind === 'smoke') return { life: 1.25, r: 0.45, g: 0.44, b: 0.46, drag: 1.1, grav: -0.35, kick: 0.45, up: 1.1 };
  if (kind === 'dust') return { life: 0.5, r: 0.78, g: 0.62, b: 0.4, drag: 1.8, grav: 1.4, kick: 1.3, up: 0.35 };
  return { life: 0.07, r: 1, g: 0.96, b: 0.72, drag: 0.2, grav: 0, kick: 0.35, up: 0.2 };
}

export function emitBurst(fx, kind, x, y, z, count) {
  const look = style(kind);
  for (let n = 0; n < count; n++) {
    const p = fx.parts[fx.cursor];
    fx.cursor = (fx.cursor + 1) % fx.parts.length;
    const a = unit(fx.seed + n, 1);
    const b = unit(fx.seed + n, 2);
    const c = unit(fx.seed + n, 3);
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = a * look.kick;
    p.vy = look.up + Math.abs(b) * look.kick * 0.35;
    p.vz = c * look.kick;
    p.life = look.life;
    p.r = look.r;
    p.g = look.g;
    p.b = look.b;
    p.drag = look.drag;
    p.grav = look.grav;
  }
  fx.seed += count + 1;
}

export function updateFx(fx, dt) {
  const pos = fx.positions;
  const col = fx.colors;
  for (let i = 0; i < fx.parts.length; i++) {
    const p = fx.parts[i];
    const n = i * 3;
    if (p.life <= 0) {
      pos[n + 1] = -30;
      col[n] = 0;
      col[n + 1] = 0;
      col[n + 2] = 0;
      continue;
    }
    p.life -= dt;
    p.vy -= p.grav * dt;
    const damp = Math.exp(-dt * p.drag);
    p.vx *= damp;
    p.vz *= damp;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    pos[n] = p.x;
    pos[n + 1] = p.y;
    pos[n + 2] = p.z;
    const fade = Math.max(0, p.life * 2);
    col[n] = p.r * fade;
    col[n + 1] = p.g * fade;
    col[n + 2] = p.b * fade;
  }
  fx.geo.attributes.position.needsUpdate = true;
  fx.geo.attributes.color.needsUpdate = true;
}
