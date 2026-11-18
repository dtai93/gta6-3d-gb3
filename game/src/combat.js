// Hits, muzzle flashes, tracers, sparks, armour, and the wasted / busted respawn.

import * as THREE from '../vendor/three.module.min.js';
import { createLoadout, currentWeapon, pullTrigger, reloadWeapon, selectWeapon, tickLoadout } from './weapons.js';
import { reportCrime, setWantedStars } from './wanted.js';
import { damageVehicle, yawForward, yawFromDir } from './vehicles.js';

const HOSPITAL = { x: 44, z: 44, kind: 'wasted' };
const STATION = { x: 132, z: 44, kind: 'busted' };
const _aim = new THREE.Vector3();
const _nose = new THREE.Vector3();

function pool(scene, count, geo, color) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    list.push({ mesh, mat, life: 0 });
  }
  return list;
}

function spawn(list, life, place) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].life > 0) continue;
    list[i].life = life;
    place(list[i]);
    return;
  }
}

export function createCombat(scene, player) {
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.24, 0.08),
    new THREE.MeshLambertMaterial({ color: 0x1a1d22 }),
  );
  gun.position.set(0.02, -0.58, -0.02);
  gun.visible = false;
  player.armR.add(gun);
  return {
    vitals: { health: 100, armour: 40, cash: 480, state: 'ok', timer: 0 },
    loadout: createLoadout(),
    gun,
    flashes: pool(scene, 4, new THREE.SphereGeometry(0.16, 6, 5), 0xffe1a8),
    tracers: pool(scene, 16, new THREE.BoxGeometry(1, 1, 1), 0xffe7a2),
    sparks: pool(scene, 12, new THREE.SphereGeometry(0.09, 5, 4), 0xfff6ea),
    cursor: 0,
  };
}

export function hurtPlayer(vitals, amount) {
  if (vitals.state !== 'ok' || amount <= 0) return;
  let left = amount;
  if (vitals.armour > 0) {
    const soak = Math.min(vitals.armour, left * 0.65);
    vitals.armour -= soak;
    left -= soak;
  }
  vitals.health = Math.max(0, vitals.health - left);
  if (vitals.health <= 0) {
    vitals.health = 0;
    vitals.state = 'wasted';
    vitals.timer = 2.3;
  }
}

function fade(list, dt) {
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (item.life <= 0) continue;
    item.life -= dt;
    if (item.life <= 0) {
      item.mesh.visible = false;
      item.mat.opacity = 0;
      continue;
    }
    item.mesh.visible = true;
    item.mat.opacity = Math.min(1, item.life * 8);
  }
}

function cylinderT(ox, oy, oz, dx, dy, dz, cx, cz, radius, height) {
  const fx = ox - cx;
  const fz = oz - cz;
  const a = dx * dx + dz * dz;
  if (a < 1e-6) return -1;
  const b = 2 * (fx * dx + fz * dz);
  const c = fx * fx + fz * fz - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return -1;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  if (t < 0.05) return -1;
  const y = oy + dy * t;
  if (y < 0 || y > height) return -1;
  return t;
}

function blockT(ox, oy, oz, dx, dy, dz, blocks, maxT) {
  let best = maxT;
  const step = 0.85;
  const n = Math.ceil(maxT / step);
  for (let s = 1; s <= n; s++) {
    const t = Math.min(maxT, s * step);
    const x = ox + dx * t;
    const y = oy + dy * t;
    const z = oz + dz * t;
    if (y < 0 || y > 40) continue;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ && y < (b.maxY || 40)) {
        if (t < best) best = t;
      }
    }
    if (best < maxT) break;
  }
  return best;
}

function tracer(combat, ox, oy, oz, hx, hy, hz) {
  spawn(combat.tracers, 0.07, (item) => {
    item.mesh.position.set((ox + hx) * 0.5, (oy + hy) * 0.5, (oz + hz) * 0.5);
    item.mesh.lookAt(hx, hy, hz);
    item.mesh.scale.set(0.04, 0.04, Math.max(0.25, Math.hypot(hx - ox, hy - oy, hz - oz)));
    item.mat.opacity = 0.95;
  });
  spawn(combat.sparks, 0.16, (item) => {
    item.mesh.position.set(hx, hy, hz);
    item.mat.opacity = 1;
  });
}

function aimDir(camera, ox, oy, oz, out) {
  camera.getWorldDirection(_aim);
  const ax = camera.position.x + _aim.x * 80;
  const ay = camera.position.y + _aim.y * 80;
  const az = camera.position.z + _aim.z * 80;
  out.x = ax - ox;
  out.y = ay - oy;
  out.z = az - oz;
  const len = Math.hypot(out.x, out.y, out.z) || 1;
  out.x /= len;
  out.y /= len;
  out.z /= len;
}

function spread(dir, amount, n, out) {
  const rx = dir.z;
  const rz = -dir.x;
  const rl = Math.hypot(rx, rz) || 1;
  const ang = n * 1.7;
  const rad = amount * (0.3 + ((n * 3) % 5) / 6);
  out.x = dir.x + (rx / rl) * Math.cos(ang) * rad;
  out.y = dir.y + Math.sin(ang) * rad;
  out.z = dir.z + (rz / rl) * Math.cos(ang) * rad;
  const len = Math.hypot(out.x, out.y, out.z) || 1;
  out.x /= len;
  out.y /= len;
  out.z /= len;
}

function dropPed(ped, dx, dz) {
  ped.state = 'down';
  ped.down = 1.7;
  const len = Math.hypot(dx, dz) || 1;
  ped.vx = (dx / len) * 2.4;
  ped.vz = (dz / len) * 2.4;
}

function fireWeapon(combat, ctx, weapon, origin, dir) {
  const hx = origin.x;
  const hz = origin.z;
  let copHit = false;
  let killed = false;
  const pellet = { x: 0, y: 0, z: 0 };
  for (let p = 0; p < weapon.pellets; p++) {
    spread(dir, weapon.spread, combat.loadout.shot * 5 + p, pellet);
    let best = weapon.range;
    let kind = '';
    let ped = null;
    let cop = null;
    let car = null;
    const list = ctx.peds.list;
    for (let i = 0; i < list.length; i++) {
      const body = list[i];
      if (body.down > 0) continue;
      const t = cylinderT(origin.x, origin.y, origin.z, pellet.x, pellet.y, pellet.z, body.x, body.z, 0.42, 1.7);
      if (t > 0 && t < best) { best = t; kind = 'ped'; ped = body; }
    }
    const officers = ctx.police.officers;
    for (let i = 0; i < officers.length; i++) {
      const body = officers[i];
      if (!body.active || body.down > 0) continue;
      const t = cylinderT(origin.x, origin.y, origin.z, pellet.x, pellet.y, pellet.z, body.x, body.z, 0.42, 1.75);
      if (t > 0 && t < best) { best = t; kind = 'cop'; cop = body; }
    }
    const fleets = [ctx.cars, ctx.police.units];
    for (let f = 0; f < fleets.length; f++) {
      const fleet = fleets[f];
      for (let i = 0; i < fleet.length; i++) {
        const body = fleet[i];
        if (body === ctx.driven) continue;
        const t = cylinderT(origin.x, origin.y, origin.z, pellet.x, pellet.y, pellet.z, body.x, body.z, body.type.width * 0.55, 1.55);
        if (t > 0 && t < best) { best = t; kind = 'car'; car = body; }
      }
    }
    const wall = blockT(origin.x, origin.y, origin.z, pellet.x, pellet.y, pellet.z, ctx.blocks, best);
    if (wall < best) { best = wall; kind = 'wall'; }
    const ex = origin.x + pellet.x * best;
    const ey = origin.y + pellet.y * best;
    const ez = origin.z + pellet.z * best;
    tracer(combat, origin.x, origin.y, origin.z, ex, ey, ez);
    if (kind === 'ped') {
      ped.hp = (ped.hp == null ? 46 : ped.hp) - weapon.damage;
      dropPed(ped, pellet.x, pellet.z);
      if (ped.hp <= 0) killed = true;
    } else if (kind === 'cop') {
      cop.hp -= weapon.damage;
      copHit = true;
      if (cop.hp <= 0) {
        cop.down = 8;
        cop.mesh.rotation.z = 1.2;
        killed = true;
      }
    } else if (kind === 'car') {
      damageVehicle(car, weapon.damage * 0.003);
      if (car.cop) copHit = true;
    }
  }
  reportCrime(ctx.wanted, 'gunfire', hx, hz);
  if (copHit) reportCrime(ctx.wanted, 'officer', hx, hz);
  if (killed) reportCrime(ctx.wanted, 'kill', hx, hz);
  spawn(combat.flashes, 0.05, (item) => {
    item.mesh.position.set(origin.x, origin.y, origin.z);
    item.mat.opacity = 1;
  });
}

function punch(combat, ctx) {
  const player = ctx.player;
  yawForward(player.mesh.rotation.y, _nose);
  const x = player.mesh.position.x;
  const z = player.mesh.position.z;
  const list = ctx.peds.list;
  for (let i = 0; i < list.length; i++) {
    const ped = list[i];
    if (ped.down > 0) continue;
    const dx = ped.x - x;
    const dz = ped.z - z;
    const dist = Math.hypot(dx, dz);
    if (dist > 2.2 || dist < 0.05) continue;
    if ((dx * _nose.x + dz * _nose.z) / dist < 0.35) continue;
    ped.hp = (ped.hp == null ? 46 : ped.hp) - 18;
    if (ped.hp <= 0) dropPed(ped, _nose.x, _nose.z);
    reportCrime(ctx.wanted, ped.hp <= 0 ? 'kill' : 'assault', x, z);
    spawn(combat.sparks, 0.12, (item) => {
      item.mesh.position.set(ped.x, 1.2, ped.z);
      item.mat.opacity = 1;
    });
  }
  const officers = ctx.police.officers;
  for (let i = 0; i < officers.length; i++) {
    const cop = officers[i];
    if (!cop.active || cop.down > 0) continue;
    const dx = cop.x - x;
    const dz = cop.z - z;
    const dist = Math.hypot(dx, dz);
    if (dist > 2.2 || dist < 0.05) continue;
    if ((dx * _nose.x + dz * _nose.z) / dist < 0.35) continue;
    cop.hp -= 18;
    reportCrime(ctx.wanted, 'officer', x, z);
    if (cop.hp <= 0) {
      cop.down = 8;
      reportCrime(ctx.wanted, 'kill', x, z);
    }
  }
  player.armR.rotation.x = 1.45;
}

function settle(combat, ctx, dt) {
  const v = combat.vitals;
  if (v.state === 'ok' && ctx.police.bust >= 1.55) {
    v.state = 'busted';
    v.timer = 2.2;
  }
  if (v.state === 'ok') return;
  if (!ctx.driven) {
    ctx.player.mesh.rotation.z = 1.15;
    ctx.player.mesh.position.y = 0.22;
  }
  v.timer -= dt;
  if (v.timer > 0) return;
  const place = v.state === 'busted' ? STATION : HOSPITAL;
  const fine = Math.max(40, Math.round(v.cash * (place.kind === 'busted' ? 0.25 : 0.15)));
  v.cash = Math.max(0, v.cash - fine);
  v.health = 100;
  v.armour = place.kind === 'busted' ? 15 : 0;
  v.state = 'ok';
  v.timer = 0;
  setWantedStars(ctx.wanted, 0, place.x, place.z);
  ctx.player.mesh.rotation.z = 0;
  ctx.player.mesh.position.y = 0;
  ctx.respawn(place);
}

export function updateCombat(combat, dt, ctx) {
  fade(combat.flashes, dt);
  fade(combat.tracers, dt);
  fade(combat.sparks, dt);
  const v = combat.vitals;
  const sample = ctx.sample;
  if (v.state === 'ok') {
    if (sample.slot) selectWeapon(combat.loadout, sample.slot - 1);
    if (sample.reload) reloadWeapon(combat.loadout);
    tickLoadout(combat.loadout, dt);
    const weapon = currentWeapon(combat.loadout);
    const driven = ctx.driven;
    if (!driven && (sample.aim || sample.fire)) {
      ctx.camera.getWorldDirection(_aim);
      ctx.player.mesh.rotation.y = yawFromDir(_aim.x, _aim.z);
      ctx.player.armR.rotation.x = 1.15;
    }
    if (!driven) combat.gun.visible = weapon.id !== 'fists';
    if (weapon.id === 'fists') {
      if (sample.fireEdge && !driven) punch(combat, ctx);
    } else {
      const shot = pullTrigger(combat.loadout, sample.fire, sample.fireEdge);
      if (shot) {
        const origin = { x: 0, y: 1.3, z: 0 };
        if (driven) {
          origin.x = driven.x;
          origin.y = 1.25;
          origin.z = driven.z;
        } else {
          yawForward(ctx.player.mesh.rotation.y, _nose);
          origin.x = ctx.player.mesh.position.x + _nose.x * 0.5;
          origin.y = ctx.player.mesh.position.y + 1.35;
          origin.z = ctx.player.mesh.position.z + _nose.z * 0.5;
        }
        const dir = { x: 0, y: 0, z: 0 };
        aimDir(ctx.camera, origin.x, origin.y, origin.z, dir);
        fireWeapon(combat, ctx, shot, origin, dir);
      }
    }
    hurtPlayer(v, ctx.police.playerHit || 0);
  }
  settle(combat, ctx, dt);
}
