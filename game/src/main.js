// Boot, play loop, and frozen screenshot poses for Port Solano.

import * as THREE from '../vendor/three.module.min.js';
import { SHOTS, GRID_X, GRID_Z, SPAN } from './config.js';
import { makeRng } from './rng.js';
import { createInput } from './input.js';
import { createSky } from './sky.js';
import { createCity, districtAt } from './city.js';
import { createChaseCamera, updateChaseCamera, applyMouseLook, planarBasis } from './camera.js';
import { createPlayer, updatePlayer } from './player.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;
const shot = SHOTS[shotName] || null;
const aerial = shotName === 'city' || shotName === 'start';

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
const rig = createChaseCamera();
const input = createInput(canvas);
const focus = new THREE.Vector3();

if (shot) {
  player.mesh.position.set(shot.x, 0, shot.z);
  player.mesh.rotation.y = shot.face;
  rig.yaw = shot.yaw;
  rig.pitch = shot.pitch;
  rig.dist = shot.dist;
  rig.lookY = shot.lookY;
  rig.frozen = true;
} else {
  player.mesh.position.set(city.spawn.x, 0, city.spawn.z);
}

function frameFocus() {
  if (aerial) {
    focus.set(GRID_X * SPAN * 0.48, shot.lookY, GRID_Z * SPAN * 0.38);
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
placeCamera();

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!rig.frozen) {
    const sample = input.sample();
    const basis = planarBasis(camera);
    const wishX = basis.fwd.x * sample.forward + basis.right.x * sample.strafe;
    const wishZ = basis.fwd.z * sample.forward + basis.right.z * sample.strafe;
    updatePlayer(player, wishX, wishZ, dt, city.colliders, sample);
    applyMouseLook(rig, sample);
  }
  placeCamera();
  const district = districtAt(player.mesh.position.x, player.mesh.position.z);
  if (districtEl.textContent !== district) districtEl.textContent = district;
  statusEl.textContent = 'Port Solano. Rafa Quill, on foot in ' + district + '.';
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
