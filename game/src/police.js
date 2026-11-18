// Port Solano police. Cruisers chase, ram and block. Foot officers deploy at two
// stars. KESTREL-1, the helicopter, lifts off at three with a searchlight.

import * as THREE from '../vendor/three.module.min.js';
import { addGlow } from './glow.js';
import { SPAN } from './config.js';
import { createVehicle, pushCircle, syncVehicle, yawForward, yawFromDir } from './vehicles.js';

const CALLS = ['GULL-1', 'GULL-4', 'MARLIN-11', 'MARLIN-12', 'HERON-7', 'TERN-2'];
const FOOT = ['OSPREY-3', 'IBIS-9', 'PLOVER-6', 'SANDER-14'];
const NAVY = new THREE.MeshLambertMaterial({ color: 0x1d3d73 });
const NAVY_D = new THREE.MeshLambertMaterial({ color: 0x142848 });
const SKIN = new THREE.MeshLambertMaterial({ color: 0xd9a27a });
const BLACK = new THREE.MeshLambertMaterial({ color: 0x14181e });
const _fwd = new THREE.Vector3();

function officerMesh() {
  const mesh = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.24), NAVY);
  body.position.y = 1.05;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), SKIN);
  head.position.y = 1.46;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.22), NAVY_D);
  cap.position.y = 1.58;
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  legL.position.set(-0.1, 0.72, 0);
  legR.position.set(0.1, 0.72, 0);
  const limb = new THREE.BoxGeometry(0.12, 0.58, 0.12);
  const l1 = new THREE.Mesh(limb, NAVY_D);
  const l2 = new THREE.Mesh(limb, NAVY_D);
  l1.position.y = -0.28;
  l2.position.y = -0.28;
  legL.add(l1);
  legR.add(l2);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.22), BLACK);
  gun.position.set(0.22, 1.05, -0.16);
  mesh.add(body, head, cap, legL, legR, gun);
  return { mesh, legL, legR };
}

function helicopterMesh() {
  const mesh = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1b2430 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0xb7d4e2 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.72, 3.3), bodyMat);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 2.3), bodyMat);
  tail.position.set(0, 0.2, 2.4);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.46), bodyMat);
  fin.position.set(0, 0.55, 3.3);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.08, 0.46), BLACK);
  rotor.add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 7.2), BLACK));
  rotor.position.y = 0.55;
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.12), BLACK);
  tailRotor.position.set(0.22, 0.55, 3.3);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.42, 1.15), glassMat);
  glass.position.set(0, 0.22, -0.75);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.22), new THREE.MeshBasicMaterial({ color: 0xff2430 }));
  red.position.set(-0.42, 0.48, -0.3);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.22), new THREE.MeshBasicMaterial({ color: 0x2f6bff }));
  blue.position.set(0.42, 0.48, -0.3);
  const beamGeo = new THREE.ConeGeometry(5.2, 20, 8, 1, true);
  beamGeo.translate(0, -10, 0);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({
    color: 0xfff6d8, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide,
  }));
  addGlow(red, 0, 0, 0, 0xff2430, 1.6);
  addGlow(blue, 0, 0, 0, 0x3d7bff, 1.6);
  mesh.add(body, tail, fin, rotor, tailRotor, glass, red, blue, beam);
  const spot = new THREE.SpotLight(0xfff4d2, 0, 96, 0.42, 0.5, 0.85);
  spot.position.set(0, -0.2, 0.2);
  const target = new THREE.Object3D();
  mesh.add(spot);
  return { mesh, rotor, tailRotor, spot, target, red, blue, beam };
}

export function createPolice(scene) {
  const spots = [
    [SPAN * 2 + 6, SPAN * 2, 0.15],
    [SPAN * 4 + 5, SPAN * 1, 1.1],
    [SPAN * 1 + 6, SPAN * 3, -0.35],
    [SPAN * 5 - 6, SPAN * 3, 0.7],
    [SPAN * 3 + 5, SPAN * 4, 2.2],
    [SPAN * 5 - 5, SPAN * 2, -1.05],
  ];
  const units = [];
  for (let i = 0; i < spots.length; i++) {
    const car = createVehicle(3, spots[i][0], spots[i][1], spots[i][2]);
    car.occupied = true;
    car.ai = false;
    car.cop = true;
    car.callsign = CALLS[i];
    car.role = 'patrol';
    const siren = new THREE.PointLight(0x2f6bff, 0, 11, 2);
    siren.position.set(0, 1.7, 0);
    car.mesh.add(siren);
    car.siren = siren;
    scene.add(car.mesh);
    syncVehicle(car, 0, 0);
    units.push(car);
  }
  const officers = [];
  for (let i = 0; i < FOOT.length; i++) {
    const built = officerMesh();
    built.mesh.visible = false;
    scene.add(built.mesh);
    officers.push({
      mesh: built.mesh, legL: built.legL, legR: built.legR,
      callsign: FOOT[i], x: 0, z: 0, yaw: 0, hp: 100,
      down: 0, cool: 0.8 + i * 0.25, active: false, phase: i,
    });
  }
  const heli = helicopterMesh();
  heli.mesh.visible = false;
  scene.add(heli.mesh);
  scene.add(heli.target);
  heli.spot.target = heli.target;
  return {
    units, officers, heli, callsign: 'KESTREL-1',
    hx: SPAN * 3, hz: SPAN * 2, hy: 24, bust: 0, playerHit: 0,
  };
}

function wrap(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function sees(x, z, px, pz, blocks, maxDist) {
  const dx = px - x;
  const dz = pz - z;
  if (dx * dx + dz * dz > maxDist * maxDist) return false;
  for (let s = 1; s <= 5; s++) {
    const sx = x + dx * (s / 6);
    const sz = z + dz * (s / 6);
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (sx > b.minX && sx < b.maxX && sz > b.minZ && sz < b.maxZ) return false;
    }
  }
  return true;
}

function driveAt(car, tx, tz, dt, wantSpeed) {
  const dx = tx - car.x;
  const dz = tz - car.z;
  const gap = wrap(yawFromDir(dx, dz) - car.yaw);
  car.yaw += Math.max(-2.1, Math.min(2.1, gap * 3.4)) * dt;
  car.steer = Math.max(-0.45, Math.min(0.45, -gap));
  let spd = wantSpeed;
  if (Math.abs(gap) > 0.75) spd *= 0.32;
  const dist = Math.hypot(dx, dz);
  if (dist < 5) spd = Math.min(spd, Math.max(0, dist - 2.2) * 2.4);
  car.speed += (spd - car.speed) * Math.min(1, dt * 1.7);
  yawForward(car.yaw, _fwd);
  car.vx = _fwd.x * car.speed;
  car.vz = _fwd.z * car.speed;
  car.x += car.vx * dt;
  car.z += car.vz * dt;
}

function clampRoad(car) {
  const maxX = SPAN * 6 - 8;
  const maxZ = SPAN * 5 - 8;
  if (car.x < 8) { car.x = 8; car.yaw = yawFromDir(1, 0); car.speed *= 0.4; }
  else if (car.x > maxX) { car.x = maxX; car.yaw = yawFromDir(-1, 0); car.speed *= 0.4; }
  if (car.z < 10) { car.z = 10; car.yaw = yawFromDir(0, 1); car.speed *= 0.4; }
  else if (car.z > maxZ) { car.z = maxZ; car.yaw = yawFromDir(0, -1); car.speed *= 0.4; }
}

function pulseSiren(car, time, on) {
  if (!car.siren) return;
  const blink = ((time * 5) | 0) % 2 === 0;
  car.siren.intensity = on ? 2.6 : 0;
  car.siren.color.setHex(blink ? 0xff2430 : 0x2f6bff);
}

export function updatePolice(police, dt, world) {
  const stars = world.wanted.stars;
  const px = world.x;
  const pz = world.z;
  const sight = 20 + stars * 9;
  let seen = false;
  if (stars > 0) {
    for (let i = 0; i < police.units.length; i++) {
      const car = police.units[i];
      if (!car.player && sees(car.x, car.z, px, pz, world.blocks, sight)) seen = true;
    }
    for (let i = 0; i < police.officers.length; i++) {
      const cop = police.officers[i];
      if (cop.active && cop.down <= 0 && sees(cop.x, cop.z, px, pz, world.blocks, sight * 0.85)) seen = true;
    }
  }
  world.wanted.seen = seen;
  const knowX = seen ? px : world.wanted.searchX;
  const knowZ = seen ? pz : world.wanted.searchZ;
  const order = police.units.slice().sort((a, b) => {
    const da = (a.x - px) * (a.x - px) + (a.z - pz) * (a.z - pz);
    const db = (b.x - px) * (b.x - px) + (b.z - pz) * (b.z - pz);
    return da - db;
  });
  const cap = stars <= 0 ? 0 : Math.min(order.length, stars + 1);
  police.playerHit = 0;
  let pressure = false;
  for (let i = 0; i < police.units.length; i++) {
    const car = police.units[i];
    if (car.player) {
      pulseSiren(car, world.time, stars > 0);
      syncVehicle(car, dt, world.time);
      continue;
    }
    const rank = order.indexOf(car);
    const engage = rank < cap;
    const dist = Math.hypot(car.x - px, car.z - pz);
    if (!engage) {
      car.role = 'patrol';
      car.speed += (7 - car.speed) * Math.min(1, dt * 0.8);
      yawForward(car.yaw, _fwd);
      car.vx = _fwd.x * car.speed;
      car.vz = _fwd.z * car.speed;
      car.x += car.vx * dt;
      car.z += car.vz * dt;
    } else if (!seen) {
      car.role = 'search';
      driveAt(car, knowX, knowZ, dt, 16);
    } else if (stars >= 3 && rank >= Math.max(0, cap - 2)) {
      car.role = 'roadblock';
      let vx = world.vx;
      let vz = world.vz;
      if (vx * vx + vz * vz < 9) {
        yawForward(world.yaw, _fwd);
        vx = _fwd.x * 10;
        vz = _fwd.z * 10;
      }
      const len = Math.hypot(vx, vz) || 1;
      const side = (rank % 2 === 0 ? 1 : -1) * 3.4;
      const tx = px + (vx / len) * 16 + (-vz / len) * side;
      const tz = pz + (vz / len) * 16 + (vx / len) * side;
      if (Math.hypot(car.x - tx, car.z - tz) < 3.2) {
        car.speed *= Math.exp(-dt * 5);
        car.yaw = yawFromDir(-vz, vx);
        car.vx = 0;
        car.vz = 0;
      } else {
        driveAt(car, tx, tz, dt, 22);
      }
    } else {
      car.role = stars >= 2 ? 'ram' : 'chase';
      driveAt(car, px, pz, dt, stars >= 2 ? 26 : 18);
    }
    clampRoad(car);
    const pushed = pushCircle(car.x, car.z, 1.15, world.blocks);
    car.x = pushed.x;
    car.z = pushed.z;
    if (engage && dist < 3.1 && world.speed < 2.2) pressure = true;
    if (engage && world.driven && dist < 3.4 && Math.abs(car.speed) > 9) police.playerHit += 7 * dt;
    pulseSiren(car, world.time, engage || car.player);
    syncVehicle(car, dt, world.time);
  }
  const footOn = stars >= 2;
  for (let i = 0; i < police.officers.length; i++) {
    const cop = police.officers[i];
    if (!footOn) {
      cop.active = false;
      cop.mesh.visible = false;
      cop.down = 0;
      cop.hp = 100;
      continue;
    }
    if (!cop.active && cop.down <= 0) {
      const host = order[i % order.length];
      cop.x = host.x + 2.4;
      cop.z = host.z + 1.2;
      cop.active = true;
      cop.hp = 100;
      cop.mesh.visible = true;
    }
    if (cop.down > 0) {
      cop.down -= dt;
      cop.mesh.rotation.z = 1.2;
      cop.mesh.position.set(cop.x, 0.2, cop.z);
      continue;
    }
    const dx = (seen ? px : knowX) - cop.x;
    const dz = (seen ? pz : knowZ) - cop.z;
    const dist = Math.hypot(dx, dz) || 1;
    cop.yaw = yawFromDir(dx, dz);
    const spd = dist < 1.65 ? 0 : 5.4;
    cop.x += (dx / dist) * spd * dt;
    cop.z += (dz / dist) * spd * dt;
    const feet = pushCircle(cop.x, cop.z, 0.32, world.blocks);
    cop.x = feet.x;
    cop.z = feet.z;
    cop.phase += dt * (spd + 1);
    cop.mesh.visible = true;
    cop.mesh.position.set(cop.x, 0, cop.z);
    cop.mesh.rotation.set(0, cop.yaw, 0);
    const swing = Math.sin(cop.phase * 2) * (spd > 0 ? 0.65 : 0);
    cop.legL.rotation.x = swing;
    cop.legR.rotation.x = -swing;
    if (seen && stars >= 3 && dist < 28 && dist > 3.5) {
      cop.cool -= dt;
      if (cop.cool <= 0) {
        cop.cool = 0.9;
        police.playerHit += 9;
      }
    }
    if (seen && world.onFoot && world.still && dist < 1.85) pressure = true;
  }
  police.bust = pressure ? Math.min(2.4, police.bust + dt * 0.95) : Math.max(0, police.bust - dt * 0.55);
  const heliOn = stars >= 3;
  const heli = police.heli;
  heli.mesh.visible = heliOn;
  heli.beam.visible = heliOn;
  heli.spot.intensity = heliOn ? 7 : 0;
  if (!heliOn) return;
  police.hx += ((seen ? px : knowX) - police.hx) * Math.min(1, dt * 0.55);
  police.hz += ((seen ? pz : knowZ) - police.hz) * Math.min(1, dt * 0.55);
  police.hy = 22 + Math.sin(world.time * 0.8) * 0.8;
  heli.mesh.position.set(police.hx, police.hy, police.hz);
  heli.rotor.rotation.y += dt * 28;
  heli.tailRotor.rotation.x += dt * 34;
  heli.target.position.set(seen ? px : knowX, 0.4, seen ? pz : knowZ);
  const blink = ((world.time * 6) | 0) % 2 === 0;
  heli.red.scale.y = blink ? 1.8 : 0.35;
  heli.blue.scale.y = blink ? 0.35 : 1.8;
}

function placeUnit(car, x, z, yaw, role, time) {
  car.x = x;
  car.z = z;
  car.yaw = yaw;
  car.speed = role === 'roadblock' ? 0 : 12;
  car.vx = 0;
  car.vz = 0;
  car.role = role;
  car.occupied = true;
  pulseSiren(car, time, true);
  syncVehicle(car, 0, time);
}

// Frozen screenshot poses. Chase puts three cruisers and KESTREL-1 around the camera.
export function stagePolice(police, shot, x, z, yaw) {
  const time = 0.18;
  if (shot === 'chase') {
    // Offsets sit in the chase camera (yaw 0.45, pitch 0.34, dist 13): one cruiser
    // on the near right, one on the left, a roadblock down the road, heli low ahead.
    placeUnit(police.units[0], x + 7.2, z + 4.8, yaw + 2.55, 'ram', time);
    placeUnit(police.units[1], x - 6.4, z + 1.2, yaw + 0.25, 'chase', time);
    placeUnit(police.units[2], x - 1.2, z - 13.5, yaw + Math.PI * 0.9, 'roadblock', time);
    for (let i = 3; i < police.units.length; i++) police.units[i].mesh.visible = false;
    yawForward(yaw, _fwd);
    const cop = police.officers[0];
    cop.active = true;
    cop.mesh.visible = true;
    cop.x = x + _fwd.x * 12 + 1.8;
    cop.z = z + _fwd.z * 12;
    cop.yaw = yaw + Math.PI;
    cop.mesh.position.set(cop.x, 0, cop.z);
    cop.mesh.rotation.set(0, cop.yaw, 0);
    yawForward(yaw, _fwd);
    const rx = -_fwd.z;
    const rz = _fwd.x;
    police.hx = x + _fwd.x * 16;
    police.hz = z + _fwd.z * 16;
    police.hy = 5.6;
    police.heli.mesh.visible = true;
    police.heli.mesh.scale.setScalar(1.15);
    police.heli.mesh.position.set(police.hx, police.hy, police.hz);
    police.heli.mesh.rotation.y = yaw + 1.25;
    police.heli.rotor.rotation.y = 0.7;
    police.heli.beam.visible = true;
    police.heli.spot.intensity = 8;
    police.heli.target.position.set(x, 0.6, z);
    police.bust = 0.4;
  } else if (shot === 'onfoot') {
    yawForward(yaw, _fwd);
    const rx = -_fwd.z;
    const rz = _fwd.x;
    placeUnit(police.units[0], x + _fwd.x * 9.5 + rx * 3.4, z + _fwd.z * 9.5 + rz * 3.4, yaw + 3.02, 'chase', time);
    placeUnit(police.units[1], x - _fwd.x * 4.5 + rx * 5.2, z - _fwd.z * 4.5 + rz * 5.2, yaw + 0.55, 'ram', time);
    for (let i = 2; i < police.units.length; i++) police.units[i].mesh.visible = false;
    const cop = police.officers[0];
    cop.active = true;
    cop.mesh.visible = true;
    cop.x = x + _fwd.x * 6.4 - rx * 1.15;
    cop.z = z + _fwd.z * 6.4 - rz * 1.15;
    cop.yaw = yaw + Math.PI;
    cop.mesh.position.set(cop.x, 0, cop.z);
    cop.mesh.rotation.set(0, cop.yaw, 0);
    const cop2 = police.officers[1];
    cop2.active = true;
    cop2.mesh.visible = true;
    cop2.x = x + _fwd.x * 12 + rx * 2.2;
    cop2.z = z + _fwd.z * 12 + rz * 2.2;
    cop2.yaw = yaw + Math.PI * 0.9;
    cop2.mesh.position.set(cop2.x, 0, cop2.z);
    cop2.mesh.rotation.set(0, cop2.yaw, 0);
    police.heli.mesh.visible = true;
    police.heli.mesh.scale.setScalar(1.35);
    police.heli.mesh.position.set(x + rx * 8 + _fwd.x * 18, 10, z + rz * 8 + _fwd.z * 18);
    police.heli.mesh.rotation.y = yaw + 0.85;
    police.heli.rotor.rotation.y = 0.4;
    police.heli.beam.visible = true;
    police.heli.spot.intensity = 7;
    police.heli.target.position.set(cop.x, 1, cop.z);
  }
}

export function policeRoster(police, x, z) {
  const rows = [];
  for (let i = 0; i < police.units.length; i++) {
    const car = police.units[i];
    if (car.player || !car.mesh.visible) continue;
    if (car.role === 'patrol') continue;
    rows.push({
      callsign: car.callsign,
      role: car.role.toUpperCase(),
      dist: Math.hypot(car.x - x, car.z - z),
      x: car.x,
      z: car.z,
      kind: 'car',
    });
  }
  for (let i = 0; i < police.officers.length; i++) {
    const cop = police.officers[i];
    if (!cop.active || !cop.mesh.visible) continue;
    rows.push({
      callsign: cop.callsign,
      role: cop.down > 0 ? 'DOWN' : 'FOOT',
      dist: Math.hypot(cop.x - x, cop.z - z),
      x: cop.x,
      z: cop.z,
      kind: 'foot',
    });
  }
  if (police.heli.mesh.visible) {
    rows.push({
      callsign: police.callsign,
      role: 'AIR',
      dist: Math.hypot(police.hx - x, police.hz - z),
      x: police.hx,
      z: police.hz,
      kind: 'air',
    });
  }
  rows.sort((a, b) => a.dist - b.dist);
  return rows;
}
