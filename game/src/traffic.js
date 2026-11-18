// Lane traffic: cars follow the road grid, stop at crossings, honk, avoid the player.

import * as THREE from '../vendor/three.module.min.js';
import { SPAN, GRID_X, GRID_Z } from './config.js';
import { createVehicle, yawForward, yawFromDir } from './vehicles.js';

const LANE = 1.9;
const _fwd = new THREE.Vector3();

function hash(a, b, c, d) {
  let h = Math.imul(a + 3, 374761393) ^ Math.imul(b * 17 + c * 13 + d, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h >>> 0) % 100;
}

function dampAngle(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, k);
}

function turnOf(axis, dir, which) {
  if (which === 0) return { axis, dir };
  if (axis === 'z') return { axis: 'x', dir: which === 1 ? -dir : dir };
  return { axis: 'z', dir: which === 1 ? dir : -dir };
}

function canTake(axis, dir, which, ix, iz) {
  const next = turnOf(axis, dir, which);
  if (next.axis === 'z') return iz + next.dir >= 1 && iz + next.dir <= GRID_Z - 1;
  return ix + next.dir >= 1 && ix + next.dir <= GRID_X - 1;
}

function laneFixed(car) {
  if (car.axis === 'z') return car.road + (car.dir < 0 ? LANE : -LANE);
  return car.road + (car.dir > 0 ? LANE : -LANE);
}

function nextCrossing(car) {
  if (car.axis === 'z') {
    const iz = car.dir > 0 ? Math.ceil((car.z + 0.2) / SPAN) : Math.floor((car.z - 0.2) / SPAN);
    const ix = Math.round(car.road / SPAN);
    const z = Math.max(0, Math.min(GRID_Z, iz)) * SPAN;
    return { ix, iz: Math.max(0, Math.min(GRID_Z, iz)), dist: Math.abs(z - car.z) };
  }
  const ix = car.dir > 0 ? Math.ceil((car.x + 0.2) / SPAN) : Math.floor((car.x - 0.2) / SPAN);
  const iz = Math.round(car.road / SPAN);
  const x = Math.max(0, Math.min(GRID_X, ix)) * SPAN;
  return { ix: Math.max(0, Math.min(GRID_X, ix)), iz, dist: Math.abs(x - car.x) };
}

function crossingBusy(car, cars, next) {
  const cx = next.ix * SPAN;
  const cz = next.iz * SPAN;
  for (let i = 0; i < cars.length; i++) {
    const other = cars[i];
    if (other === car || Math.abs(other.speed) < 0.6) continue;
    if (Math.abs(other.x - cx) < 9 && Math.abs(other.z - cz) < 9 && other.axis !== car.axis) return true;
  }
  return false;
}

function addCar(scene, cars, typeId, x, z, yaw, ai, axis, dir, road, speed, occupied) {
  const car = createVehicle(typeId, x, z, yaw);
  car.ai = ai;
  car.axis = axis;
  car.dir = dir;
  car.road = road;
  car.speed = speed;
  car.occupied = occupied;
  yawForward(yaw, _fwd);
  car.vx = _fwd.x * speed;
  car.vz = _fwd.z * speed;
  car.driver.visible = !!occupied;
  scene.add(car.mesh);
  cars.push(car);
  return car;
}

export function createTraffic(scene, rng) {
  const cars = [];
  const heroes = [
    [0, 130.1, 54, yawFromDir(0, 1), true, 'z', 1, 132, 7, true],
    [3, 133.9, 62, yawFromDir(0, -1), true, 'z', -1, 132, 8, true],
    [4, 120, 44 - LANE, yawFromDir(-1, 0), true, 'x', -1, 44, 6, true],
    [1, 133.9, 42, yawFromDir(0, -1), false, 'z', -1, 132, 0, false],
    [2, 108, 44 + LANE, yawFromDir(1, 0), false, 'x', 1, 44, 0, false],
    [1, 168, 88 - LANE, yawFromDir(-1, 0), false, 'x', -1, 88, 0, true],
  ];
  for (let i = 0; i < heroes.length; i++) {
    const h = heroes[i];
    addCar(scene, cars, h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], h[8], h[9]);
  }
  for (let i = 0; i < 14; i++) {
    const vertical = i % 2 === 0;
    const dir = i % 4 < 2 ? 1 : -1;
    const typeId = (i + 2) % 5;
    let x;
    let z;
    let axis;
    let road;
    if (vertical) {
      const ix = 1 + (i % (GRID_X - 1));
      road = ix * SPAN;
      x = road + (dir < 0 ? LANE : -LANE);
      z = 22 + ((i * 47) % 170);
      axis = 'z';
    } else {
      const iz = 1 + (i % (GRID_Z - 1));
      road = iz * SPAN;
      z = road + (dir > 0 ? LANE : -LANE);
      x = 24 + ((i * 61) % 200);
      axis = 'x';
    }
    let crowded = false;
    for (let k = 0; k < cars.length; k++) {
      if (Math.hypot(cars[k].x - x, cars[k].z - z) < 9) crowded = true;
    }
    if (crowded) continue;
    const yaw = axis === 'z' ? yawFromDir(0, dir) : yawFromDir(dir, 0);
    addCar(scene, cars, typeId, x, z, yaw, true, axis, dir, road, 6 + (i % 4), rng() > 0.25);
  }
  return cars;
}

function chooseTurn(car, ix, iz) {
  const opts = [];
  if (canTake(car.axis, car.dir, 0, ix, iz)) opts.push(0);
  if (canTake(car.axis, car.dir, 1, ix, iz)) opts.push(1);
  if (canTake(car.axis, car.dir, -1, ix, iz)) opts.push(-1);
  if (!opts.length) return 0;
  const h = hash(car.id, ix, iz, car.turns);
  car.turns += 1;
  if (h < 64 && opts.indexOf(0) >= 0) return 0;
  return opts[h % opts.length];
}

function applyTurn(car, which, ix, iz) {
  const next = turnOf(car.axis, car.dir, which);
  car.axis = next.axis;
  car.dir = next.dir;
  car.road = next.axis === 'z' ? ix * SPAN : iz * SPAN;
  car.turnLeft = 0.45;
}

export function updateTraffic(cars, dt, avoid) {
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    if (!car.ai || car.player) continue;
    const laneYaw = car.axis === 'z' ? yawFromDir(0, car.dir) : yawFromDir(car.dir, 0);
    if (car.turnLeft > 0) {
      car.yaw = dampAngle(car.yaw, laneYaw, dt * 7);
      car.turnLeft -= dt;
    } else {
      car.yaw = laneYaw;
    }
    yawForward(car.yaw, _fwd);
    let target = car.type.max * 0.55;
    let blockedByPlayer = false;
    for (let j = 0; j < cars.length; j++) {
      const other = cars[j];
      if (other === car) continue;
      const dx = other.x - car.x;
      const dz = other.z - car.z;
      const along = dx * _fwd.x + dz * _fwd.z;
      const lat = Math.abs(dx * -_fwd.z + dz * _fwd.x);
      if (along > 0.5 && along < 10 && lat < 2.15) {
        target = Math.min(target, along < 4.2 ? 0 : Math.max(0, other.speed) * 0.85);
      }
    }
    if (avoid) {
      const dx = avoid.x - car.x;
      const dz = avoid.z - car.z;
      const along = dx * _fwd.x + dz * _fwd.z;
      const lat = Math.abs(dx * -_fwd.z + dz * _fwd.x);
      if (along > 0 && along < 8 && lat < avoid.r + 1.2) {
        target = 0;
        blockedByPlayer = true;
      }
    }
    const next = nextCrossing(car);
    const key = next.ix * 20 + next.iz;
    if (next.dist > 6) car.gate = -1;
    if (next.dist < 12 && crossingBusy(car, cars, next)) {
      target = next.dist < 7 ? 0 : Math.min(target, (next.dist - 7) * 1.4);
    } else if (next.dist < 2.4 && car.gate !== key) {
      car.gate = key;
      const which = chooseTurn(car, next.ix, next.iz);
      if (which !== 0) applyTurn(car, which, next.ix, next.iz);
    }
    if (car.speed < target) car.speed = Math.min(target, car.speed + car.type.accel * dt);
    else car.speed = Math.max(target, car.speed - car.type.brake * dt);
    if (blockedByPlayer && car.speed < 0.8) car.horn = 0.45;
    if (car.horn > 0) car.horn -= dt;
    const fixed = laneFixed(car);
    if (car.axis === 'z') car.x += (fixed - car.x) * Math.min(1, dt * (car.turnLeft > 0 ? 1.5 : 5));
    else car.z += (fixed - car.z) * Math.min(1, dt * (car.turnLeft > 0 ? 1.5 : 5));
    car.x += _fwd.x * car.speed * dt;
    car.z += _fwd.z * car.speed * dt;
    car.vx = _fwd.x * car.speed;
    car.vz = _fwd.z * car.speed;
    car.steer = 0;
    car.skid = 0;
  }
}
