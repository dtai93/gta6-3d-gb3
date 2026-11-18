// Boot, play loop, and frozen screenshot poses for Port Solano.

import * as THREE from '../vendor/three.module.min.js';
import { SHOTS, GRID_X, GRID_Z, SPAN, CAM } from './config.js';
import { makeRng } from './rng.js';
import { createInput } from './input.js';
import { createSky } from './sky.js';
import { createCity, districtAt } from './city.js';
import { createChaseCamera, updateChaseCamera, applyMouseLook, planarBasis } from './camera.js';
import { createPlayer, updatePlayer } from './player.js';
import {
  createTireFx, createVehicle, doorPoint, nearestVehicle, pushOutOfCars,
  resolveCarCollisions, seatPlayer, syncVehicle, unseatPlayer, updateDrivenVehicle, yawForward,
} from './vehicles.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPeds, dropDriver, updatePeds } from './peds.js';
import { createWanted, reportCrime, setWantedStars, updateWanted } from './wanted.js';
import { createPolice, policeRoster, stagePolice, updatePolice } from './police.js';
import { currentWeapon } from './weapons.js';
import { createCombat, hurtPlayer, updateCombat } from './combat.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;
const shot = SHOTS[shotName] || null;
const aerial = shotName === 'city' || shotName === 'start';
const testing = params.get('test') === '1';

const canvas = document.getElementById('view');
const districtEl = document.getElementById('district');
const statusEl = document.getElementById('status');
const starsEl = document.getElementById('stars');
const vitalsEl = document.getElementById('vitals');
const armsEl = document.getElementById('arms');
const unitsEl = document.getElementById('units');
const crosshairEl = document.getElementById('crosshair');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(aerial ? 48 : 58, window.innerWidth / window.innerHeight, 0.12, 1400);
const sky = createSky(scene, aerial ? { near: 90, far: 760 } : { near: 45, far: 360 });
const city = createCity(scene, makeRng(seed));
const player = createPlayer();
scene.add(player.mesh);
const cars = createTraffic(scene, makeRng(seed + 17));
const peds = createPeds(scene, makeRng(seed + 29));
const wanted = createWanted();
const police = createPolice(scene);
const combat = createCombat(scene, player);
const tires = createTireFx(scene);
const rig = createChaseCamera();
const input = createInput(canvas);
const focus = new THREE.Vector3();
const nose = new THREE.Vector3();
let driven = null;
let orbit = 0;
let clock = 0;

if (shot) {
  player.mesh.position.set(shot.x, 0, shot.z);
  player.mesh.rotation.y = shot.face;
  rig.yaw = shot.yaw;
  rig.pitch = shot.pitch;
  rig.dist = shot.dist;
  rig.lookY = shot.lookY;
  rig.frozen = !testing;
} else {
  player.mesh.position.set(city.spawn.x, 0, city.spawn.z);
}

if (shotName === 'chase' && shot) {
  setWantedStars(wanted, 4, shot.x, shot.z);
  const ride = createVehicle(0, shot.x, shot.z, shot.face);
  scene.add(ride.mesh);
  seatPlayer(ride, player);
  driven = ride;
  cars.push(ride);
  syncVehicle(ride, 0, 0.2);
  stagePolice(police, 'chase', shot.x, shot.z, shot.face);
} else if (shotName === 'onfoot' && shot) {
  setWantedStars(wanted, 3, shot.x, shot.z);
  combat.loadout.index = 1;
  combat.gun.visible = true;
  player.armR.rotation.x = 1.2;
  stagePolice(police, 'onfoot', shot.x, shot.z, shot.face);
}

function avoidBody() {
  if (driven) return null;
  return { x: player.mesh.position.x, z: player.mesh.position.z, r: 1.2 };
}

function respawnAt(place) {
  if (driven) {
    unseatPlayer(driven, player);
    driven = null;
    rig.dist = CAM.dist;
    rig.lookY = CAM.lookY;
  }
  player.mesh.position.set(place.x, 0, place.z);
  player.mesh.rotation.z = 0;
  player.vy = 0;
  player.grounded = true;
}

function step(dt, sample) {
  const alive = combat.vitals.state === 'ok';
  const fleet = cars.concat(police.units);
  if (driven) {
    if (alive) updateDrivenVehicle(driven, sample, dt);
    else {
      driven.speed *= Math.exp(-dt * 2);
      driven.vx *= Math.exp(-dt * 2);
      driven.vz *= Math.exp(-dt * 2);
      driven.x += driven.vx * dt;
      driven.z += driven.vz * dt;
    }
    player.mesh.position.set(driven.x, 0, driven.z);
    if (alive && sample.use) {
      unseatPlayer(driven, player);
      driven = null;
      rig.dist = CAM.dist;
      rig.lookY = CAM.lookY;
    }
  } else if (alive) {
    const basis = planarBasis(camera);
    const wishX = basis.fwd.x * sample.forward + basis.right.x * sample.strafe;
    const wishZ = basis.fwd.z * sample.forward + basis.right.z * sample.strafe;
    updatePlayer(player, wishX, wishZ, dt, city.colliders, sample);
    const pushed = pushOutOfCars(player.mesh.position.x, player.mesh.position.z, 0.42, fleet);
    player.mesh.position.x = pushed.x;
    player.mesh.position.z = pushed.z;
    if (sample.use) {
      const car = nearestVehicle(cars, player.mesh.position.x, player.mesh.position.z, 3.6)
        || nearestVehicle(police.units, player.mesh.position.x, player.mesh.position.z, 3.6);
      if (car) {
        const pulled = seatPlayer(car, player);
        if (pulled && !car.cop) {
          const door = doorPoint(car);
          dropDriver(peds, door.x, door.z, car.x, car.z);
        }
        if (pulled) reportCrime(wanted, car.cop ? 'officer' : 'carjack', car.x, car.z);
        driven = car;
        let gap = rig.yaw - car.yaw;
        while (gap > Math.PI) gap -= Math.PI * 2;
        while (gap < -Math.PI) gap += Math.PI * 2;
        orbit = gap;
      }
    }
  }
  updateTraffic(cars, dt, avoidBody());
  const threat = driven || player.mesh.position;
  const threatSpeed = driven ? Math.abs(driven.speed) : 0;
  updatePeds(peds, dt, threat, threatSpeed, city.colliders, fleet);
  for (let i = 0; i < peds.list.length; i++) {
    const ped = peds.list[i];
    if (ped.struck !== 'player') continue;
    ped.struck = '';
    reportCrime(wanted, threatSpeed > 14 ? 'kill' : 'rundown', ped.x, ped.z);
  }
  resolveCarCollisions(fleet, city.colliders);
  tires.update(cars, dt);
  for (let i = 0; i < cars.length; i++) {
    if (!cars[i].cop) syncVehicle(cars[i], dt, clock);
  }
  const here = driven || player.mesh.position;
  updatePolice(police, dt, {
    x: here.x,
    z: here.z,
    vx: driven ? driven.vx : 0,
    vz: driven ? driven.vz : 0,
    speed: driven ? Math.abs(driven.speed) : 0,
    yaw: driven ? driven.yaw : player.mesh.rotation.y,
    onFoot: !driven,
    still: sample.forward === 0 && sample.strafe === 0 && !sample.run,
    driven,
    wanted,
    blocks: city.colliders,
    time: clock,
  });
  updateWanted(wanted, dt, here.x, here.z);
  updateCombat(combat, dt, {
    sample, camera, player, driven, peds, police, wanted, cars,
    blocks: city.colliders,
    respawn: respawnAt,
  });
}

function driveReport() {
  const fails = [];
  yawForward(0, nose);
  if (nose.z > -0.99 || Math.abs(nose.x) > 0.01) fails.push('yaw0');
  const probe = createVehicle(0, 20, 40, 0);
  updateDrivenVehicle(probe, { forward: 1, strafe: 0, jump: false }, 0.45);
  if (!(probe.z < 38 && probe.speed > 2)) fails.push('accel');
  const block = city.colliders[0];
  const bx = probe.x;
  const bz = probe.z;
  probe.x = block.minX + 0.15;
  probe.z = (block.minZ + block.maxZ) / 2;
  probe.yaw = 0;
  probe.speed = 12;
  probe.vx = 12;
  probe.vz = 0;
  resolveCarCollisions([probe], city.colliders);
  if (probe.x > block.minX) fails.push('building');
  if (Math.abs(probe.speed) > 8) fails.push('impact');
  const a = createVehicle(0, bx, bz, 0);
  const b = createVehicle(1, bx + 1, bz, Math.PI);
  a.vx = 8; a.speed = 8; b.vx = -8; b.speed = -8;
  resolveCarCollisions([a, b], []);
  if (Math.hypot(a.x - b.x, a.z - b.z) < 2) fails.push('cars');
  const ped0 = peds.list[0];
  const px = ped0.x;
  const pz = ped0.z;
  updatePeds(peds, 0.35, { x: px + 0.15, z: pz }, 0, city.colliders, []);
  if (Math.hypot(ped0.x - px, ped0.z - pz) < 0.3) fails.push('flee');
  const marks = cars.filter((car) => car.ai).map((car) => ({ car, x: car.x, z: car.z }));
  for (let i = 0; i < 90; i++) updateTraffic(cars, 1 / 60, null);
  let travel = 0;
  for (let i = 0; i < marks.length; i++) {
    travel = Math.max(travel, Math.hypot(marks[i].car.x - marks[i].x, marks[i].car.z - marks[i].z));
  }
  if (travel < 1) fails.push('traffic');
  return fails.length ? fails.join(',') : 'ok';
}

function combatReport() {
  const fails = [];
  const heat = createWanted();
  reportCrime(heat, 'assault', 0, 0);
  if (heat.stars < 1) fails.push('stars');
  heat.seen = false;
  for (let i = 0; i < 80; i++) updateWanted(heat, 0.25, 500, 500);
  if (heat.stars !== 0) fails.push('decay');
  const ped = peds.list[0];
  ped.x = player.mesh.position.x;
  ped.z = player.mesh.position.z - 1.45;
  ped.down = 0;
  ped.hp = 40;
  ped.state = 'walk';
  player.mesh.rotation.y = 0;
  const cam = new THREE.PerspectiveCamera(58, 1.6, 0.1, 200);
  cam.position.set(player.mesh.position.x, 2.1, player.mesh.position.z + 5);
  cam.lookAt(player.mesh.position.x, 1.2, player.mesh.position.z - 12);
  const quiet = { fire: false, fireEdge: false, aim: false, reload: false, slot: 0 };
  const ctx = {
    sample: { fire: true, fireEdge: true, aim: true, reload: false, slot: 0 },
    camera: cam, player, driven: null, peds, police, wanted, cars,
    blocks: city.colliders, respawn() {},
  };
  combat.loadout.index = 0;
  combat.loadout.cool = 0;
  updateCombat(combat, 0.016, ctx);
  if (!(ped.hp < 40)) fails.push('fist');
  for (let i = 0; i < cars.length; i++) cars[i].x += 500;
  for (let i = 0; i < police.units.length; i++) police.units[i].x += 500;
  ped.x = player.mesh.position.x;
  ped.z = player.mesh.position.z - 8;
  ped.down = 0;
  ped.hp = 40;
  combat.loadout.index = 1;
  combat.loadout.cool = 0;
  combat.loadout.slots[1].rounds = 12;
  updateCombat(combat, 0.016, ctx);
  if (!(ped.down > 0)) fails.push('gun');
  if (wanted.stars < 1) fails.push('heat');
  const unit = police.units[0];
  unit.x = player.mesh.position.x;
  unit.z = player.mesh.position.z + 16;
  unit.yaw = 0;
  unit.player = false;
  unit.mesh.visible = true;
  setWantedStars(wanted, 2, player.mesh.position.x, player.mesh.position.z);
  const z0 = unit.z;
  for (let i = 0; i < 50; i++) {
    updatePolice(police, 1 / 30, {
      x: player.mesh.position.x, z: player.mesh.position.z, vx: 0, vz: 0, speed: 0, yaw: 0,
      onFoot: true, still: true, driven: null, wanted, blocks: city.colliders, time: i / 30,
    });
  }
  if (!(unit.z < z0 - 2)) fails.push('chase');
  combat.vitals.state = 'ok';
  combat.vitals.health = 6;
  combat.vitals.armour = 0;
  const cash0 = combat.vitals.cash;
  hurtPlayer(combat.vitals, 40);
  if (combat.vitals.state !== 'wasted') fails.push('wasted');
  let place = null;
  combat.vitals.timer = 0.01;
  updateCombat(combat, 0.05, { ...ctx, sample: quiet, respawn(p) { place = p; } });
  if (!place || place.kind !== 'wasted') fails.push('hospital');
  if (!(combat.vitals.cash < cash0)) fails.push('fine');
  if (wanted.stars !== 0) fails.push('clear');
  combat.vitals.state = 'ok';
  police.bust = 2;
  updateCombat(combat, 0.016, { ...ctx, sample: quiet, respawn() {} });
  if (combat.vitals.state !== 'busted') fails.push('busted');
  return fails.length ? fails.join(',') : 'ok';
}

if (testing) {
  const drive = driveReport();
  const fight = combatReport();
  const report = drive === 'ok' && fight === 'ok' ? 'ok' : drive + '|' + fight;
  document.documentElement.dataset.driveTest = report;
  statusEl.textContent = 'drive-test ' + report;
}

function frameFocus() {
  if (aerial && shot) {
    focus.set(GRID_X * SPAN * 0.48, shot.lookY, GRID_Z * SPAN * 0.38);
    return;
  }
  if (driven) {
    yawForward(driven.yaw, nose);
    focus.set(driven.x + nose.x * 2.2, rig.lookY, driven.z + nose.z * 2.2);
    return;
  }
  focus.set(player.mesh.position.x, rig.lookY + player.mesh.position.y, player.mesh.position.z);
}

function placeCamera() {
  frameFocus();
  updateChaseCamera(camera, rig, focus);
  sky.follow(focus, aerial ? 100 : Math.max(28, rig.dist * 1.4));
}

function resize() {
  camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

let last = performance.now();
for (let i = 0; i < cars.length; i++) syncVehicle(cars[i], 0, 0);
placeCamera();

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!rig.frozen) {
    const sample = input.sample();
    step(dt, sample);
    clock += dt;
    if (driven) {
      orbit -= sample.yaw * CAM.yawSpeed;
      if (!sample.yaw) orbit *= Math.exp(-dt * 2.1);
      if (orbit > 1.15) orbit = 1.15;
      if (orbit < -1.15) orbit = -1.15;
      rig.yaw = driven.yaw + orbit;
      rig.pitch -= sample.pitch * CAM.pitchSpeed;
      rig.dist = 11.2;
      rig.lookY = 1.55;
    } else {
      applyMouseLook(rig, sample);
    }
  }
  placeCamera();
  const here = driven || player.mesh.position;
  const district = districtAt(here.x, here.z);
  const weapon = currentWeapon(combat.loadout);
  const ammo = weapon.mag ? weapon.rounds + '/' + weapon.reserve : '';
  let stars = 'CLEAR';
  if (combat.vitals.state === 'wasted') stars = 'WASTED';
  else if (combat.vitals.state === 'busted') stars = 'BUSTED';
  else if (wanted.stars > 0) {
    stars = '';
    for (let i = 0; i < 5; i++) stars += i < wanted.stars ? '★' : '☆';
  }
  starsEl.textContent = stars;
  vitalsEl.textContent = 'HP ' + Math.ceil(combat.vitals.health) + '  AR ' + Math.ceil(combat.vitals.armour) + '  $' + combat.vitals.cash;
  armsEl.textContent = driven ? driven.type.name : weapon.name + (ammo ? '  ' + ammo : '');
  const rows = policeRoster(police, here.x, here.z).slice(0, 4);
  unitsEl.textContent = rows.length
    ? rows.map((r) => r.callsign + '  ' + r.role + '  ' + Math.round(r.dist) + 'm').join('\n')
    : 'NO UNITS';
  crosshairEl.style.display = aerial || driven ? 'none' : 'block';
  if (!testing && districtEl.textContent !== district) districtEl.textContent = district;
  if (!testing) {
    const who = driven ? 'Driving the ' + driven.type.name : 'Rafa Quill on foot';
    statusEl.textContent = who + ' in ' + district + '. ' + stars + '. ' + weapon.name + '.';
  }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
