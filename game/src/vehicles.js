// Driveable cars: low-poly bodies, arcade handling, damage, enter/exit.
// Nose is local -Z. yaw 0 faces world -Z. yawForward is the only sin/cos of that yaw.

import * as THREE from '../vendor/three.module.min.js';
import { GRID_X, GRID_Z, SPAN } from './config.js';

export const CAR_TYPES = [
  { name: 'Solano Sprint', color: 0xc43737, length: 4.25, width: 1.82, height: 0.42, cabinL: 1.65, cabinH: 0.36, cabinZ: -0.2, accel: 18, brake: 30, max: 32, steer: 1.85, extra: 'sport' },
  { name: 'Harbor Cab', color: 0xf0c230, length: 4.45, width: 1.78, height: 0.52, cabinL: 2.15, cabinH: 0.46, cabinZ: 0.05, accel: 11, brake: 22, max: 22, steer: 1.5, extra: 'taxi' },
  { name: 'Dock Hauler', color: 0x2c6b52, length: 4.9, width: 1.95, height: 0.92, cabinL: 1.45, cabinH: 0.55, cabinZ: -1.25, accel: 8, brake: 16, max: 17, steer: 1.25, extra: 'van' },
  { name: 'Port Sentinel', color: 0x1b2430, length: 4.55, width: 1.82, height: 0.5, cabinL: 2.1, cabinH: 0.44, cabinZ: 0.08, accel: 14, brake: 26, max: 28, steer: 1.55, extra: 'police' },
  { name: 'Reef Runner', color: 0xe07a28, length: 4.75, width: 1.88, height: 0.46, cabinL: 1.5, cabinH: 0.4, cabinZ: 0.55, accel: 15, brake: 22, max: 30, steer: 1.4, extra: 'muscle' },
];

const BOX = new THREE.BoxGeometry(1, 1, 1);
const WHEEL_GEO = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 8);
WHEEL_GEO.rotateZ(Math.PI / 2);
const HEAD_GEO = new THREE.SphereGeometry(0.12, 6, 5);
const GLASS = new THREE.MeshLambertMaterial({ color: 0xb7d4e2 });
const RUBBER = new THREE.MeshLambertMaterial({ color: 0x1a1c20 });
const SKIN = new THREE.MeshLambertMaterial({ color: 0xd9a27a });
const SHIRT = new THREE.MeshLambertMaterial({ color: 0x243044 });
const TAIL = new THREE.MeshBasicMaterial({ color: 0xe4232b });
const POLICE_RED = new THREE.MeshBasicMaterial({ color: 0xff2430 });
const POLICE_BLUE = new THREE.MeshBasicMaterial({ color: 0x2f6bff });
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _dark = new THREE.Color(0x2a2424);
let nextId = 1;

function taxiMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f0c230';
  g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#1a1408';
  g.font = 'bold 40px sans-serif';
  g.textAlign = 'center';
  g.fillText('CAB', 64, 46);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex });
}

const TAXI_MAT = taxiMaterial();

function box(mat, x, y, z, sx, sy, sz) {
  const mesh = new THREE.Mesh(BOX, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  return mesh;
}

// yaw 0 → (0,0,-1). Right at that yaw is world +X: (cos yaw, 0, -sin yaw).
export function yawForward(yaw, out) {
  out.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  return out;
}

export function yawRight(yaw, out) {
  out.set(Math.cos(yaw), 0, -Math.sin(yaw));
  return out;
}

export function yawFromDir(dx, dz) {
  return Math.atan2(-dx, -dz);
}

function buildCar(type) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: type.color });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff1c9 });
  const L = type.length;
  const W = type.width;
  const H = type.height;
  const bodyY = 0.55 + H / 2;
  const body = box(bodyMat, 0, bodyY, 0, W * 0.92, H, L);
  body.castShadow = true;
  group.add(body);
  const cabinY = 0.55 + H + type.cabinH / 2 - 0.06;
  group.add(box(GLASS, 0, cabinY, type.cabinZ, W * 0.84, type.cabinH, type.cabinL));
  const nose = -L / 2;
  const tail = L / 2;
  group.add(box(headMat, -W * 0.32, bodyY * 0.92, nose - 0.02, 0.28, 0.14, 0.06));
  group.add(box(headMat, W * 0.32, bodyY * 0.92, nose - 0.02, 0.28, 0.14, 0.06));
  group.add(box(TAIL, -W * 0.32, bodyY * 0.9, tail + 0.02, 0.3, 0.14, 0.06));
  group.add(box(TAIL, W * 0.32, bodyY * 0.9, tail + 0.02, 0.3, 0.14, 0.06));
  const wheels = [];
  const wz = L * 0.34;
  const wx = W * 0.5 + 0.02;
  const spots = [[-wx, -wz], [wx, -wz], [-wx, wz], [wx, wz]];
  for (let i = 0; i < spots.length; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(spots[i][0], 0.42, spots[i][1]);
    const wheel = new THREE.Mesh(WHEEL_GEO, RUBBER);
    pivot.add(wheel);
    group.add(pivot);
    wheels.push({ pivot, mesh: wheel, front: spots[i][1] < 0 });
  }
  if (type.extra === 'sport') group.add(box(bodyMat, 0, 0.55 + H + 0.1, tail - 0.28, W * 0.7, 0.08, 0.24));
  if (type.extra === 'muscle') group.add(box(bodyMat, 0, 0.55 + H + 0.08, nose + 0.75, 0.5, 0.12, 0.75));
  if (type.extra === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 0.18), TAXI_MAT);
    sign.position.set(0, cabinY + type.cabinH / 2 + 0.16, type.cabinZ);
    group.add(sign);
  }
  let lights = null;
  if (type.extra === 'police') {
    const y = cabinY + type.cabinH / 2;
    const red = box(POLICE_RED, -0.18, y + 0.16, type.cabinZ, 0.24, 0.12, 0.2);
    const blue = box(POLICE_BLUE, 0.18, y + 0.16, type.cabinZ, 0.24, 0.12, 0.2);
    group.add(box(RUBBER, 0, y + 0.06, type.cabinZ, 0.72, 0.08, 0.28), red, blue);
    lights = [red, blue];
  }
  const driver = new THREE.Group();
  driver.add(box(SHIRT, 0.28, cabinY - 0.02, type.cabinZ, 0.32, 0.36, 0.2));
  const head = new THREE.Mesh(HEAD_GEO, SKIN);
  head.position.set(0.28, cabinY + 0.28, type.cabinZ);
  driver.add(head);
  group.add(driver);
  return { group, bodyMat, headMat, wheels, driver, lights };
}

export function createVehicle(typeId, x, z, yaw) {
  const type = CAR_TYPES[typeId % CAR_TYPES.length];
  const built = buildCar(type);
  built.group.position.set(x, 0, z);
  built.group.rotation.y = yaw;
  return {
    id: nextId++,
    mesh: built.group,
    type,
    typeId: typeId % CAR_TYPES.length,
    bodyMat: built.bodyMat,
    headMat: built.headMat,
    wheels: built.wheels,
    driver: built.driver,
    lights: built.lights,
    paint: new THREE.Color(type.color),
    x, z, yaw,
    vx: 0, vz: 0, speed: 0, steer: 0,
    condition: 1,
    ai: false,
    player: false,
    occupied: false,
    horn: 0,
    skid: 0,
    axis: 'z',
    dir: -1,
    road: 0,
    turns: 0,
    gate: -1,
    turnLeft: 0,
  };
}

export function syncVehicle(car, dt, time) {
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.yaw;
  car.headMat.color.setHex(car.horn > 0 ? 0xffffff : 0xfff1c9);
  for (let i = 0; i < car.wheels.length; i++) {
    const wheel = car.wheels[i];
    wheel.mesh.rotation.x -= car.speed * dt * 2.5;
    if (wheel.front) wheel.pivot.rotation.y = -car.steer;
  }
  if (car.lights) {
    const blink = ((time * 5) | 0) % 2 === 0;
    car.lights[0].scale.y = blink ? 1.6 : 0.45;
    car.lights[1].scale.y = blink ? 0.45 : 1.6;
  }
  car.driver.visible = car.occupied && !car.player;
}

export function damageVehicle(car, amount) {
  if (amount <= 0) return;
  car.condition = Math.max(0, car.condition - amount);
  car.bodyMat.color.copy(car.paint).lerp(_dark, 1 - car.condition);
}

export function updateDrivenVehicle(car, sample, dt) {
  const type = car.type;
  yawForward(car.yaw, _fwd);
  const forwardSpeed = car.vx * _fwd.x + car.vz * _fwd.z;
  let drive = 0;
  if (sample.forward > 0) drive = type.accel;
  else if (sample.forward < 0) drive = forwardSpeed > 1.2 ? -type.brake : -type.accel * 0.45;
  const hand = !!sample.jump && Math.abs(forwardSpeed) > 2;
  car.vx += _fwd.x * drive * dt;
  car.vz += _fwd.z * drive * dt;
  const along = car.vx * _fwd.x + car.vz * _fwd.z;
  const latX = car.vx - _fwd.x * along;
  const latZ = car.vz - _fwd.z * along;
  const grip = Math.exp(-dt * (hand ? 1.15 : 9));
  const drag = Math.exp(-dt * (hand ? 0.35 : 0.18));
  car.vx = (_fwd.x * along + latX * grip) * drag;
  car.vz = (_fwd.z * along + latZ * grip) * drag;
  let speed = car.vx * _fwd.x + car.vz * _fwd.z;
  const cap = speed >= 0 ? type.max : type.max * 0.35;
  if (Math.abs(speed) > cap) {
    const scale = cap / Math.abs(speed);
    const keepX = car.vx - _fwd.x * speed;
    const keepZ = car.vz - _fwd.z * speed;
    speed *= scale;
    car.vx = _fwd.x * speed + keepX;
    car.vz = _fwd.z * speed + keepZ;
  }
  const abs = Math.abs(speed);
  const steerScale = 0.28 + 0.72 * Math.min(1, abs / 9);
  const reverse = speed < -0.4 ? -1 : 1;
  car.yaw -= sample.strafe * type.steer * steerScale * (hand ? 1.85 : 1) * reverse * dt;
  car.steer = -sample.strafe * 0.42;
  car.x += car.vx * dt;
  car.z += car.vz * dt;
  car.speed = speed;
  const lateral = Math.hypot(latX, latZ);
  car.skid = hand || (lateral > 2.4 && abs > 6) ? 1 : 0;
}

export function pushCircle(x, z, radius, blocks) {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const cx = Math.max(b.minX, Math.min(x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
    let dx = x - cx;
    let dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= radius * radius) continue;
    if (d2 < 1e-8) {
      const left = x - b.minX;
      const right = b.maxX - x;
      const down = z - b.minZ;
      const up = b.maxZ - z;
      const m = Math.min(left, right, down, up);
      if (m === left) x = b.minX - radius;
      else if (m === right) x = b.maxX + radius;
      else if (m === down) z = b.minZ - radius;
      else z = b.maxZ + radius;
      continue;
    }
    const d = Math.sqrt(d2);
    const push = (radius - d) / d;
    x += dx * push;
    z += dz * push;
  }
  return { x, z };
}

function vehicleRadius(car) {
  return car.type.length * 0.27;
}

export function resolveCarCollisions(cars, blocks) {
  const maxX = GRID_X * SPAN - 4;
  const maxZ = GRID_Z * SPAN - 4;
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    yawForward(car.yaw, _fwd);
    const reach = car.type.length * 0.28;
    let shoved = 0;
    for (let s = -1; s <= 1; s += 2) {
      const px = car.x + _fwd.x * reach * s;
      const pz = car.z + _fwd.z * reach * s;
      const next = pushCircle(px, pz, car.type.width * 0.46, blocks);
      const dx = next.x - px;
      const dz = next.z - pz;
      if (dx * dx + dz * dz > 1e-6) {
        car.x += dx;
        car.z += dz;
        shoved += Math.hypot(dx, dz);
      }
    }
    if (shoved > 0.004 && Math.abs(car.speed) > 2) {
      damageVehicle(car, shoved * 0.08);
      car.vx *= 0.35;
      car.vz *= 0.35;
      car.speed *= 0.35;
    }
    if (car.x < 4 || car.x > maxX || car.z < 5 || car.z > maxZ) {
      car.x = Math.min(maxX, Math.max(4, car.x));
      car.z = Math.min(maxZ, Math.max(5, car.z));
      car.vx *= -0.2;
      car.vz *= -0.2;
      car.speed *= -0.2;
      damageVehicle(car, 0.01);
    }
  }
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      let dx = a.x - b.x;
      let dz = a.z - b.z;
      const min = vehicleRadius(a) + vehicleRadius(b);
      const d = Math.hypot(dx, dz);
      if (d >= min || d < 1e-5) continue;
      const nx = dx / d;
      const nz = dz / d;
      const overlap = min - d;
      a.x += nx * overlap * 0.5;
      a.z += nz * overlap * 0.5;
      b.x -= nx * overlap * 0.5;
      b.z -= nz * overlap * 0.5;
      const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      if (rel < 0) {
        a.vx -= rel * nx * 0.6;
        a.vz -= rel * nz * 0.6;
        b.vx += rel * nx * 0.6;
        b.vz += rel * nz * 0.6;
        const hit = Math.min(0.08, -rel * 0.004);
        damageVehicle(a, hit);
        damageVehicle(b, hit);
      }
    }
  }
}

export function nearestVehicle(cars, x, z, range) {
  let best = null;
  let bestD = range;
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    if (car.player) continue;
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) {
      best = car;
      bestD = d;
    }
  }
  return best;
}

export function seatPlayer(car, player) {
  const pulled = car.occupied;
  car.player = true;
  car.ai = false;
  car.occupied = false;
  player.mesh.visible = false;
  player.mesh.position.set(car.x, 0, car.z);
  return pulled;
}

export function unseatPlayer(car, player) {
  car.player = false;
  yawRight(car.yaw, _right);
  player.mesh.visible = true;
  player.mesh.position.set(car.x + _right.x * 2.15, 0, car.z + _right.z * 2.15);
  player.mesh.rotation.y = car.yaw;
  player.vy = 0;
  player.grounded = true;
}

export function doorPoint(car) {
  yawRight(car.yaw, _right);
  return { x: car.x + _right.x * 1.7, z: car.z + _right.z * 1.7 };
}

export function pushOutOfCars(x, z, radius, cars) {
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    const min = radius + vehicleRadius(car);
    let dx = x - car.x;
    let dz = z - car.z;
    const d = Math.hypot(dx, dz);
    if (d >= min || d < 1e-5) continue;
    const push = (min - d) / d;
    x += dx * push;
    z += dz * push;
    if (Math.abs(car.speed) > 3.5) {
      car.speed *= 0.7;
      car.vx *= 0.7;
      car.vz *= 0.7;
      damageVehicle(car, 0.015);
    }
  }
  return { x, z };
}

export function createTireFx(scene) {
  const marks = [];
  const smokes = [];
  const markMat = new THREE.MeshBasicMaterial({ color: 0x1c1c1c, transparent: true, opacity: 0.4 });
  let cursor = 0;
  let smokeCursor = 0;
  for (let i = 0; i < 40; i++) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.7), markMat);
    mesh.rotation.order = 'YXZ';
    mesh.visible = false;
    scene.add(mesh);
    marks.push(mesh);
  }
  for (let i = 0; i < 16; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xd5d2cc, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 5, 4), mat);
    mesh.visible = false;
    scene.add(mesh);
    smokes.push({ mesh, mat, life: 0 });
  }
  return {
    update(cars, dt) {
      for (let i = 0; i < smokes.length; i++) {
        const smoke = smokes[i];
        if (smoke.life <= 0) continue;
        smoke.life -= dt;
        smoke.mesh.position.y += dt * 1.1;
        smoke.mat.opacity = Math.max(0, smoke.life * 0.45);
        if (smoke.life <= 0) smoke.mesh.visible = false;
      }
      for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        if (!car.skid) continue;
        yawForward(car.yaw, _fwd);
        yawRight(car.yaw, _right);
        const back = car.type.length * 0.32;
        for (let side = -1; side <= 1; side += 2) {
          const mark = marks[cursor % marks.length];
          cursor += 1;
          mark.visible = true;
          mark.position.set(
            car.x - _fwd.x * back + _right.x * side * car.type.width * 0.42,
            0.06,
            car.z - _fwd.z * back + _right.z * side * car.type.width * 0.42,
          );
          mark.rotation.set(-Math.PI / 2, car.yaw, 0);
        }
        const puff = smokes[smokeCursor % smokes.length];
        smokeCursor += 1;
        puff.life = 0.7;
        puff.mesh.visible = true;
        puff.mesh.position.set(car.x - _fwd.x * back, 0.35, car.z - _fwd.z * back);
        puff.mat.opacity = 0.35;
      }
    },
  };
}

