// Low-poly on-foot body. The group's -Z is the face. Heading comes from travel, not a second yaw formula.

import * as THREE from '../vendor/three.module.min.js';
import { PLAYER } from './config.js';

const SKIN = 0xd9a27a;
const SHIRT = 0x1f8a86;
const PANTS = 0x243044;
const SHOE = 0x1a1c22;
const HAIR = 0x2a211c;

function part(geo, color, x, y, z) {
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function limb(color, w, h, d) {
  const pivot = new THREE.Group();
  const mesh = part(new THREE.BoxGeometry(w, h, d), color, 0, -h * 0.5, 0);
  pivot.add(mesh);
  return pivot;
}

export function createPlayer() {
  const mesh = new THREE.Group();
  const body = new THREE.Group();
  mesh.add(body);

  body.add(part(new THREE.BoxGeometry(0.46, 0.52, 0.26), SHIRT, 0, 1.22, 0));
  body.add(part(new THREE.SphereGeometry(0.16, 8, 7), SKIN, 0, 1.62, 0));
  body.add(part(new THREE.BoxGeometry(0.18, 0.08, 0.18), HAIR, 0, 1.76, -0.01));

  const armL = limb(SKIN, 0.1, 0.46, 0.1);
  const armR = limb(SKIN, 0.1, 0.46, 0.1);
  armL.position.set(-0.3, 1.42, 0);
  armR.position.set(0.3, 1.42, 0);
  body.add(armL, armR);

  const legL = limb(PANTS, 0.14, 0.58, 0.14);
  const legR = limb(PANTS, 0.14, 0.58, 0.14);
  legL.position.set(-0.12, 0.96, 0);
  legR.position.set(0.12, 0.96, 0);
  const shoeL = part(new THREE.BoxGeometry(0.14, 0.08, 0.2), SHOE, 0, -0.62, -0.03);
  const shoeR = part(new THREE.BoxGeometry(0.14, 0.08, 0.2), SHOE, 0, -0.62, -0.03);
  legL.add(shoeL);
  legR.add(shoeR);
  body.add(legL, legR);

  return {
    mesh,
    body,
    armL,
    armR,
    legL,
    legR,
    vy: 0,
    grounded: true,
    phase: 0,
  };
}

function pushOut(x, z, blocks) {
  const r = PLAYER.radius;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const cx = Math.max(b.minX, Math.min(x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
    let dx = x - cx;
    let dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 < 1e-8) {
      const left = x - b.minX;
      const right = b.maxX - x;
      const down = z - b.minZ;
      const up = b.maxZ - z;
      const m = Math.min(left, right, down, up);
      if (m === left) x = b.minX - r;
      else if (m === right) x = b.maxX + r;
      else if (m === down) z = b.minZ - r;
      else z = b.maxZ + r;
      continue;
    }
    const d = Math.sqrt(d2);
    const push = (r - d) / d;
    x += dx * push;
    z += dz * push;
  }
  return { x, z };
}

// wishX/wishZ are camera-relative intent already in world space. Facing uses that same vector.
export function updatePlayer(player, wishX, wishZ, dt, colliders, sample) {
  let len = Math.hypot(wishX, wishZ);
  let mx = 0;
  let mz = 0;
  const speed = sample.run ? PLAYER.run : PLAYER.walk;
  if (len > 1e-4) {
    mx = (wishX / len) * speed;
    mz = (wishZ / len) * speed;
    player.mesh.rotation.y = Math.atan2(-mx, -mz);
  }
  if (sample.jump && player.grounded) {
    player.vy = PLAYER.jump;
    player.grounded = false;
  }
  player.vy -= PLAYER.gravity * dt;
  let y = player.mesh.position.y + player.vy * dt;
  player.impact = 0;
  if (y <= 0) {
    if (!player.grounded && player.vy < -7) player.impact = Math.min(0.7, (-player.vy - 7) / 12);
    y = 0;
    player.vy = 0;
    player.grounded = true;
  }
  const next = pushOut(player.mesh.position.x + mx * dt, player.mesh.position.z + mz * dt, colliders);
  player.mesh.position.set(next.x, y, next.z);

  const moving = len > 1e-4 && player.grounded;
  if (moving) player.phase += dt * speed * 1.7;
  const swing = moving ? Math.sin(player.phase) * 0.7 : 0;
  player.legL.rotation.x = swing;
  player.legR.rotation.x = -swing;
  player.armL.rotation.x = -swing * 0.65;
  player.armR.rotation.x = swing * 0.65;
  player.body.position.y = player.grounded ? Math.abs(Math.sin(player.phase * 2)) * (moving ? 0.04 : 0) : 0;
}
