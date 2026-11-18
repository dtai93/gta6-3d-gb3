// Sidewalk pedestrians. They stroll the block edge, watch Rafa, and flee from cars.

import * as THREE from '../vendor/three.module.min.js';
import { blockBounds, GRID_X, GRID_Z } from './config.js';
import { rngInt } from './rng.js';
import { damageVehicle, pushCircle, yawFromDir, yawForward } from './vehicles.js';

const BODY = new THREE.BoxGeometry(0.38, 0.48, 0.22);
const LEG = new THREE.BoxGeometry(0.13, 0.64, 0.14);
const HEAD = new THREE.SphereGeometry(0.13, 6, 5);
const SKIN = new THREE.MeshLambertMaterial({ color: 0xd9a27a });
const SHOE = new THREE.MeshLambertMaterial({ color: 0x1a1c22 });
const CLOTHES = [0x1f8a86, 0xc43737, 0xe0a030, 0x2d6e9c, 0x6e5344, 0xf4f1ea, 0x243044, 0xd46aa4];
const INSET = 0.95;
const _fwd = new THREE.Vector3();

function spot(ix, iz, edge, t) {
  const b = blockBounds(ix, iz);
  const x0 = b.x0 + INSET;
  const x1 = b.x1 - INSET;
  const z0 = b.z0 + INSET;
  const z1 = b.z1 - INSET;
  if (edge === 0) return { x: x0 + (x1 - x0) * t, z: z0, dx: 1, dz: 0 };
  if (edge === 1) return { x: x1, z: z0 + (z1 - z0) * t, dx: 0, dz: 1 };
  if (edge === 2) return { x: x1 + (x0 - x1) * t, z: z1, dx: -1, dz: 0 };
  return { x: x0, z: z1 + (z0 - z1) * t, dx: 0, dz: -1 };
}

function makePed(root, ix, iz, edge, t, color, speed) {
  const mesh = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(BODY, shirt);
  body.position.y = 1.02;
  body.castShadow = true;
  const head = new THREE.Mesh(HEAD, SKIN);
  head.position.y = 1.4;
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  legL.position.set(-0.1, 0.7, 0);
  legR.position.set(0.1, 0.7, 0);
  const limbL = new THREE.Mesh(LEG, shirt);
  const limbR = new THREE.Mesh(LEG, shirt);
  limbL.position.y = -0.32;
  limbR.position.y = -0.32;
  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.2), SHOE);
  const shoeR = shoeL.clone();
  shoeL.position.set(0, -0.66, -0.02);
  shoeR.position.set(0, -0.66, -0.02);
  legL.add(limbL, shoeL);
  legR.add(limbR, shoeR);
  mesh.add(body, head, legL, legR);
  const at = spot(ix, iz, edge, t);
  mesh.position.set(at.x, 0, at.z);
  mesh.rotation.y = yawFromDir(at.dx, at.dz);
  root.add(mesh);
  return {
    mesh, legL, legR, ix, iz, edge, t, speed,
    x: at.x, z: at.z, yaw: mesh.rotation.y,
    state: 'walk', flee: 0, down: 0, phase: t * 6, vx: 0, vz: 0,
  };
}

export function createPeds(scene, rng) {
  const root = new THREE.Group();
  scene.add(root);
  const list = [
    makePed(root, 3, 1, 3, 0.42, 0x1f8a86, 1.25),
    makePed(root, 2, 1, 1, 0.55, 0xc43737, 1.15),
    makePed(root, 3, 0, 0, 0.3, 0xe0a030, 1.05),
  ];
  for (let iz = 0; iz < GRID_Z && list.length < 22; iz++) {
    for (let ix = 0; ix < GRID_X && list.length < 22; ix++) {
      if (rng() < 0.45) continue;
      list.push(makePed(root, ix, iz, rngInt(rng, 0, 3), rng(), CLOTHES[list.length % CLOTHES.length], 0.9 + rng() * 0.6));
    }
  }
  return { root, list };
}

export function dropDriver(peds, x, z, fromX, fromZ) {
  if (peds.list.length > 36) return;
  const ped = makePed(peds.root, 1, 1, 0, 0, CLOTHES[peds.list.length % CLOTHES.length], 1.3);
  ped.x = x;
  ped.z = z;
  ped.state = 'flee';
  ped.flee = 2.6;
  const dx = x - fromX;
  const dz = z - fromZ;
  const len = Math.hypot(dx, dz) || 1;
  ped.vx = (dx / len) * 4.4;
  ped.vz = (dz / len) * 4.4;
  ped.mesh.position.set(x, 0, z);
  peds.list.push(ped);
}

function pose(ped) {
  ped.mesh.position.set(ped.x, ped.down > 0 ? 0.15 : 0, ped.z);
  ped.mesh.rotation.y = ped.yaw;
  ped.mesh.rotation.z = ped.down > 0 ? 1.15 : 0;
  const swing = ped.state === 'down' ? 0 : Math.sin(ped.phase) * 0.7;
  ped.legL.rotation.x = swing;
  ped.legR.rotation.x = -swing;
}

export function updatePeds(peds, dt, threat, threatSpeed, blocks, cars) {
  const list = peds.list;
  for (let i = 0; i < list.length; i++) {
    const ped = list[i];
    const dx = ped.x - threat.x;
    const dz = ped.z - threat.z;
    const dist = Math.hypot(dx, dz);
    if (ped.down > 0) {
      ped.down -= dt;
      ped.x += ped.vx * dt;
      ped.z += ped.vz * dt;
      ped.vx *= Math.exp(-dt * 3);
      ped.vz *= Math.exp(-dt * 3);
      const pushed = pushCircle(ped.x, ped.z, 0.3, blocks);
      ped.x = pushed.x;
      ped.z = pushed.z;
      if (ped.down <= 0) {
        ped.state = 'flee';
        ped.flee = 2.2;
        const len = dist || 1;
        ped.vx = (dx / len) * 4.2;
        ped.vz = (dz / len) * 4.2;
      }
      pose(ped);
      continue;
    }
    const carClose = threatSpeed > 5 && dist < 7.5;
    const personClose = threatSpeed <= 0.2 && dist < 2.5;
    if ((carClose || personClose) && ped.state !== 'flee') {
      ped.state = 'flee';
      ped.flee = carClose ? 2.4 : 1.6;
      const len = dist || 1;
      ped.vx = (dx / len) * (carClose ? 4.6 : 3.4);
      ped.vz = (dz / len) * (carClose ? 4.6 : 3.4);
    } else if (dist < 6 && threatSpeed < 1 && ped.state === 'walk') {
      ped.yaw = yawFromDir(-dx, -dz);
      ped.speedScale = 0.25;
    } else {
      ped.speedScale = 1;
    }
    if (ped.state === 'flee') {
      ped.flee -= dt;
      ped.x += ped.vx * dt;
      ped.z += ped.vz * dt;
      ped.yaw = yawFromDir(ped.vx, ped.vz);
      ped.phase += dt * 10;
      const pushed = pushCircle(ped.x, ped.z, 0.3, blocks);
      ped.x = pushed.x;
      ped.z = pushed.z;
      if (ped.flee <= 0) ped.state = 'walk';
    } else {
      const bounds = blockBounds(ped.ix, ped.iz);
      const span = ped.edge % 2 === 0 ? bounds.x1 - bounds.x0 - INSET * 2 : bounds.z1 - bounds.z0 - INSET * 2;
      ped.t += (ped.speed * (ped.speedScale || 1) * dt) / Math.max(4, span);
      if (ped.t >= 1) {
        ped.t = 0;
        ped.edge = (ped.edge + 1) % 4;
      }
      const next = spot(ped.ix, ped.iz, ped.edge, ped.t);
      ped.x = next.x;
      ped.z = next.z;
      ped.yaw = yawFromDir(next.dx, next.dz);
      ped.phase += dt * ped.speed * 5;
    }
    if (cars) {
      for (let c = 0; c < cars.length; c++) {
        const car = cars[c];
        const hitR = 0.4 + car.type.length * 0.26;
        if (Math.hypot(ped.x - car.x, ped.z - car.z) >= hitR) continue;
        if (Math.abs(car.speed) > 2.4 && ped.down <= 0) {
          yawForward(car.yaw, _fwd);
          ped.state = 'down';
          ped.down = 1.35;
          ped.vx = _fwd.x * 5 + car.vx * 0.15;
          ped.vz = _fwd.z * 5 + car.vz * 0.15;
          car.speed *= 0.82;
          car.vx *= 0.82;
          car.vz *= 0.82;
          damageVehicle(car, 0.02);
        } else {
          const away = pushCircle(ped.x, ped.z, hitR, [{ minX: car.x - 0.2, maxX: car.x + 0.2, minZ: car.z - 0.2, maxZ: car.z + 0.2 }]);
          ped.x = away.x;
          ped.z = away.z;
        }
        break;
      }
    }
    pose(ped);
  }
}
