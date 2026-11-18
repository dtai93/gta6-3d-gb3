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

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;
const shot = SHOTS[shotName] || null;
const aerial = shotName === 'city' || shotName === 'start';
const testing = params.get('test') === '1';

const canvas = document.getElementById('view');
const districtEl = document.getElementById('district');
const statusEl = document.getElementById('status');

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

function avoidBody() {
  if (driven) return null;
  return { x: player.mesh.position.x, z: player.mesh.position.z, r: 1.2 };
}

function step(dt, sample) {
  if (driven) {
    updateDrivenVehicle(driven, sample, dt);
    if (sample.use) {
      unseatPlayer(driven, player);
      driven = null;
      rig.dist = CAM.dist;
      rig.lookY = CAM.lookY;
    }
  } else {
    const basis = planarBasis(camera);
    const wishX = basis.fwd.x * sample.forward + basis.right.x * sample.strafe;
    const wishZ = basis.fwd.z * sample.forward + basis.right.z * sample.strafe;
    updatePlayer(player, wishX, wishZ, dt, city.colliders, sample);
    const pushed = pushOutOfCars(player.mesh.position.x, player.mesh.position.z, 0.42, cars);
    player.mesh.position.x = pushed.x;
    player.mesh.position.z = pushed.z;
    if (sample.use) {
      const car = nearestVehicle(cars, player.mesh.position.x, player.mesh.position.z, 3.6);
      if (car) {
        const pulled = seatPlayer(car, player);
        if (pulled) {
          const door = doorPoint(car);
          dropDriver(peds, door.x, door.z, car.x, car.z);
        }
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
  updatePeds(peds, dt, threat, threatSpeed, city.colliders, cars);
  resolveCarCollisions(cars, city.colliders);
  tires.update(cars, dt);
  for (let i = 0; i < cars.length; i++) syncVehicle(cars[i], dt, clock);
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

if (testing) {
  const report = driveReport();
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
  if (!testing && districtEl.textContent !== district) districtEl.textContent = district;
  if (!testing) {
    statusEl.textContent = driven
      ? 'Driving the ' + driven.type.name + '. Condition ' + Math.round(driven.condition * 100) + '.'
      : 'Rafa Quill on foot in ' + district + '. Press F to take a car.';
  }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
