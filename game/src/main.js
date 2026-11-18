// Boot, play loop, and frozen screenshot poses for Port Solano.

import * as THREE from '../vendor/three.module.min.js';
import { SHOTS, GRID_X, GRID_Z, SPAN, CAM } from './config.js';
import { makeRng } from './rng.js';
import { createInput } from './input.js';
import { createSky, updateSkyHour } from './sky.js';
import { createCity, districtAt } from './city.js';
import { createChaseCamera, updateChaseCamera, applyMouseLook, planarBasis, addCameraShake } from './camera.js';
import { createPlayer, updatePlayer } from './player.js';
import {
  createTireFx, createVehicle, doorPoint, nearestVehicle, pushOutOfCars,
  resolveCarCollisions, seatPlayer, syncVehicle, unseatPlayer, updateDrivenVehicle, yawForward,
} from './vehicles.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPeds, dropDriver, updatePeds } from './peds.js';
import { createWanted, reportCrime, setWantedStars, updateWanted } from './wanted.js';
import { createPolice, policeRoster, stagePolice, updatePolice } from './police.js';
import { createCombat, hurtPlayer, updateCombat } from './combat.js';
import { createDialogue, say as sayLine, updateDialogue } from './dialogue.js';
import { createHud, updateHud } from './hud.js';
import { MISSIONS, createMissions, missionView, pulseBeacon, stageMission, updateMissions, exportMission, restoreMission } from './missions.js';
import { WEAPONS } from './weapons.js';
import { createRadio, cycleRadio, nowPlaying } from './radio.js';
import { createNeon, updateNeon } from './daynight.js';
import { SAFEHOUSE, captureState, readSave, writeSave, insideSafehouse, readSettings } from './save.js';
import { createAudio, unlockAudio, setMix, updateAudio } from './audio.js';
import { createFx, emitBurst, updateFx } from './fx.js';
import { createMenus } from './menus.js';
import { drawWorldMap } from './mapscreen.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;
const shot = SHOTS[shotName] || null;
const wide = shotName === 'city' || shotName === 'start';
const testing = params.get('test') === '1';
const baseFov = wide ? 48 : 58;

const canvas = document.getElementById('view');
const statusEl = document.getElementById('status');
const hud = createHud(document.getElementById('hud'));

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(baseFov, window.innerWidth / window.innerHeight, 0.12, 1400);
const sky = createSky(scene, wide ? { near: 90, far: 760 } : { near: 45, far: 360 });
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
const missions = createMissions(scene);
const dialogue = createDialogue();
const radio = createRadio();
const toast = { text: '', t: 0 };
let driven = null;
let orbit = 0;
let clock = 0;
let day = 2;
let dayClock = 18 * 3600 + 42 * 60;
let playing = testing || (!!shot && shotName !== 'start');
let savedClear = 0;
let homeLatch = false;
let heardShot = 0;
let lastCond = 1;
let dustT = 0;
let titleYaw = 0.55;
if (shotName === 'start') dayClock = 21 * 3600 + 18 * 60;

const neon = createNeon(city.glow);
const fx = createFx(scene);
const audio = createAudio();
const tune = readSettings();
CAM.yawSpeed = 0.0022 * tune.sens;
CAM.pitchSpeed = 0.0018 * tune.sens;
setMix(audio, tune.volume, tune.music);
const homeRing = new THREE.Mesh(
  new THREE.RingGeometry(2.4, 3.05, 20),
  new THREE.MeshBasicMaterial({ color: 0xffc14a, side: THREE.DoubleSide }),
);
homeRing.rotation.x = -Math.PI / 2;
homeRing.position.set(SAFEHOUSE.x, 0.22, SAFEHOUSE.z);
scene.add(homeRing);
const homePost = new THREE.Mesh(
  new THREE.CylinderGeometry(0.12, 0.16, 3.4, 6),
  new THREE.MeshLambertMaterial({ color: 0xffc14a }),
);
homePost.position.set(SAFEHOUSE.x, 1.7, SAFEHOUSE.z);
scene.add(homePost);

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
  ride.speed = 27;
  ride.condition = 0.72;
  syncVehicle(ride, 0, 0.2);
  stagePolice(police, 'chase', shot.x, shot.z, shot.face);
  combat.vitals.health = 84;
  combat.vitals.armour = 46;
  combat.vitals.cash = 2460;
  combat.loadout.index = 1;
  stageMission(missions, 'chase');
  sayLine(dialogue, 'nia', "They're on the causeway. Don't stop for the lights.", 999);
  toast.text = 'ROADBLOCK ON THE CAUSEWAY';
  toast.t = 999;
} else if (shotName === 'onfoot' && shot) {
  setWantedStars(wanted, 3, shot.x, shot.z);
  combat.loadout.index = 1;
  combat.gun.visible = true;
  player.armR.rotation.x = 1.2;
  combat.vitals.health = 62;
  combat.vitals.armour = 18;
  combat.vitals.cash = 6240;
  stagePolice(police, 'onfoot', shot.x, shot.z, shot.face);
  stageMission(missions, 'onfoot');
  sayLine(dialogue, 'jun', 'Back room of Vesper. Forty seconds, then noise.', 999);
} else if (shotName === 'city') {
  stageMission(missions, 'city');
  sayLine(dialogue, 'mateo', 'Cooler is under the kiosk. Ice, not questions.', 999);
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

function resetLoadout() {
  combat.loadout.index = 0;
  combat.loadout.cool = 0;
  for (let i = 0; i < WEAPONS.length; i++) {
    combat.loadout.slots[i].rounds = WEAPONS[i].mag;
    combat.loadout.slots[i].reserve = WEAPONS[i].reserve;
  }
}

function applySave(data) {
  if (driven) {
    unseatPlayer(driven, player);
    driven = null;
  }
  player.mesh.position.set(data.x, 0, data.z);
  player.mesh.rotation.y = data.yaw || 0;
  player.vy = 0;
  player.grounded = true;
  combat.vitals.health = data.health;
  combat.vitals.armour = data.armour;
  combat.vitals.cash = data.cash;
  combat.vitals.state = 'ok';
  combat.vitals.timer = 0;
  setWantedStars(wanted, data.stars || 0, data.x, data.z);
  day = data.day || 2;
  dayClock = data.clock == null ? dayClock : data.clock;
  radio.index = data.radio || 0;
  restoreMission(missions, data.mission);
  const slots = combat.loadout.slots;
  const weapons = data.weapons || [];
  for (let i = 0; i < weapons.length && i < slots.length; i++) {
    slots[i].rounds = weapons[i].rounds;
    slots[i].reserve = weapons[i].reserve;
  }
  if (data.weapon) combat.loadout.index = data.weapon;
  savedClear = missions.cleared;
  rig.frozen = false;
  rig.shake = 0;
  rig.dist = CAM.dist;
  rig.lookY = CAM.lookY;
  rig.pitch = CAM.pitch;
  playing = true;
  menus.showPlay();
}

function beginNew() {
  applySave({
    x: city.spawn.x, z: city.spawn.z, yaw: 0,
    health: 100, armour: 40, cash: 480, stars: 0,
    day: 2, clock: 18 * 3600 + 42 * 60, radio: 0,
    mission: { active: -1, stage: 0, progress: 0, cleared: 0 },
    weapons: [], weapon: 0,
  });
  resetLoadout();
  unlockAudio(audio);
}

function commitSave(place) {
  const here = driven || player.mesh.position;
  const view = missionView(missions);
  const data = captureState({
    x: here.x,
    z: here.z,
    yaw: driven ? driven.yaw : player.mesh.rotation.y,
    health: combat.vitals.health,
    armour: combat.vitals.armour,
    cash: combat.vitals.cash,
    stars: wanted.stars,
    day,
    clock: dayClock,
    radio: radio.index,
    place,
    district: districtAt(here.x, here.z),
    missionTitle: view.title,
    mission: exportMission(missions),
    weapons: combat.loadout.slots.map((s) => ({ rounds: s.rounds, reserve: s.reserve })),
    weapon: combat.loadout.index,
  });
  if (place === 'SAFEHOUSE') {
    data.x = SAFEHOUSE.x;
    data.z = SAFEHOUSE.z;
    data.stars = 0;
    data.district = SAFEHOUSE.name;
    setWantedStars(wanted, 0, SAFEHOUSE.x, SAFEHOUSE.z);
  }
  writeSave(data);
  menus.setSlot(data);
  toast.text = place === 'SAFEHOUSE' ? 'SAVED · CORAL SHORE SAFEHOUSE' : place === 'AUTOSAVE' ? 'AUTOSAVE' : 'GAME SAVED';
  toast.t = 2.6;
}

function shotPreview() {
  return {
    v: 1, x: SAFEHOUSE.x, z: SAFEHOUSE.z, yaw: 0.2,
    health: 84, armour: 40, cash: 2460, stars: 0,
    day: 2, clock: 21 * 3600 + 18 * 60, radio: 2,
    place: 'SAFEHOUSE', district: 'Coral Shore',
    missionTitle: 'MISSION 3/6 · THE TIDE JOB',
    mission: { active: 2, stage: 1, progress: 0.64, cleared: 2 },
    weapons: [], weapon: 1,
  };
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
  updateMissions(missions, dt, {
    x: here.x, z: here.z, driven, scene, cars, time: clock,
    pay(n) { combat.vitals.cash += n; },
    say(who, text, sec) { sayLine(dialogue, who, text, sec); },
    notice(text) { toast.text = text; toast.t = 3.6; },
  });
  updateDialogue(dialogue, dt);
  if (toast.t > 0 && toast.t < 900) {
    toast.t -= dt;
    if (toast.t <= 0) toast.text = '';
  }
  if (sample.radio) {
    cycleRadio(radio);
    const playing = nowPlaying(radio);
    toast.text = playing.station + '  ' + playing.track;
    toast.t = 2.4;
  }
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
  const jobs = MISSIONS.length === 6 && missionView(missions).title ? 'ok' : 'jobs';
  const slot = captureState({
    x: 4, z: 8, yaw: 0, health: 3, armour: 1, cash: 9, stars: 0,
    day: 2, clock: 100, radio: 0, place: 'AUTOSAVE', district: 'Coral Shore',
    missionTitle: 'X', mission: { active: -1, stage: 0, progress: 0, cleared: 0 },
    weapons: [], weapon: 0,
  });
  const saveOk = slot.v === 1 && slot.cash === 9 && slot.mission.active === -1;
  const report = drive === 'ok' && fight === 'ok' && jobs === 'ok' && saveOk ? 'ok' : drive + '|' + fight + '|' + jobs + '|' + (saveOk ? 'ok' : 'save');
  document.documentElement.dataset.driveTest = report;
  statusEl.textContent = 'drive-test ' + report;
}

function frameFocus() {
  if (shot && (shotName === 'city' || (!playing && shotName === 'start'))) {
    focus.set(GRID_X * SPAN * 0.48, shot.lookY, GRID_Z * SPAN * 0.38);
    return;
  }
  if (!playing) {
    focus.set(GRID_X * SPAN * 0.48, 8, GRID_Z * SPAN * 0.4);
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
  const hour = (dayClock / 3600) % 24;
  updateSkyHour(sky, hour);
  updateNeon(neon, hour);
  renderer.toneMappingExposure = (hour >= 20 || hour < 5) ? 0.98 : 1.05;
  frameFocus();
  updateChaseCamera(camera, rig, focus);
  sky.follow(focus, (shotName === 'city' || !playing) ? 100 : Math.max(28, rig.dist * 1.4));
}

function resize() {
  camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

const menus = createMenus(document.getElementById('menus'));
menus.onNew = beginNew;
menus.onContinue = (data) => { applySave(data); unlockAudio(audio); };
menus.onSave = () => commitSave('MANUAL');
menus.onQuit = () => {
  playing = false;
  input.release();
  menus.showTitle(readSave());
};
menus.onUnlock = () => unlockAudio(audio);
canvas.addEventListener('pointerdown', () => unlockAudio(audio));
menus.onMix = (settings) => {
  setMix(audio, settings.volume, settings.music);
  CAM.yawSpeed = 0.0022 * settings.sens;
  CAM.pitchSpeed = 0.0018 * settings.sens;
};
if (playing) menus.showPlay();
else menus.showTitle(shotName === 'start' ? shotPreview() : readSave());
savedClear = missions.cleared;
heardShot = combat.loadout.shot;
document.getElementById('hud').style.visibility = playing ? 'visible' : 'hidden';

let last = performance.now();
for (let i = 0; i < cars.length; i++) syncVehicle(cars[i], 0, 0);
placeCamera();

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const sample = rig.frozen ? null : input.sample();
  if (sample && sample.pause) {
    if (playing && menus.mode === 'play') {
      menus.showPause();
      input.release();
    } else if (menus.mode === 'pause' || menus.mode === 'map' || (playing && menus.mode === 'sheet')) {
      menus.showPlay();
    }
  }
  if (sample && sample.map && playing) {
    if (menus.mode === 'map') menus.showPlay();
    else if (menus.mode === 'play') {
      menus.showMap();
      input.release();
    }
  }
  const live = !rig.frozen && playing && menus.mode === 'play';
  if (live) {
    step(dt, sample);
    clock += dt;
    dayClock += dt * 40;
    if (dayClock >= 86400) { dayClock -= 86400; day += 1; }
    if (!shot && !driven && insideSafehouse(player.mesh.position.x, player.mesh.position.z)) {
      if (!homeLatch) { homeLatch = true; commitSave('SAFEHOUSE'); }
    } else homeLatch = false;
    if (!shot && missions.cleared > savedClear && !missions.lock) {
      savedClear = missions.cleared;
      commitSave('AUTOSAVE');
    }
    if (driven) {
      orbit -= sample.yaw * CAM.yawSpeed;
      if (!sample.yaw) orbit *= Math.exp(-dt * 2.1);
      if (orbit > 1.15) orbit = 1.15;
      if (orbit < -1.15) orbit = -1.15;
      rig.yaw = driven.yaw + orbit;
      rig.pitch -= sample.pitch * CAM.pitchSpeed;
      rig.dist = 11.2 + Math.min(2.4, Math.abs(driven.speed) * 0.05);
      rig.lookY = 1.55;
    } else applyMouseLook(rig, sample);
    if (player.impact) {
      addCameraShake(rig, player.impact);
      player.impact = 0;
    }
    if (combat.loadout.shot !== heardShot) {
      heardShot = combat.loadout.shot;
      addCameraShake(rig, 0.16);
      const ox = driven ? driven.x : player.mesh.position.x;
      const oz = driven ? driven.z : player.mesh.position.z;
      emitBurst(fx, 'flash', ox, 1.4, oz, 5);
      emitBurst(fx, 'spark', ox, 1.25, oz, 4);
    }
    const cond = driven ? driven.condition : 1;
    if (driven && cond < lastCond - 0.008) {
      addCameraShake(rig, 0.48);
      emitBurst(fx, 'spark', driven.x, 0.55, driven.z, 8);
      emitBurst(fx, 'smoke', driven.x, 0.8, driven.z, 5);
    }
    lastCond = cond;
    dustT += dt;
    if (dustT > 0.12) {
      dustT = 0;
      if (driven && Math.abs(driven.speed) > 8) {
        yawForward(driven.yaw, nose);
        emitBurst(fx, 'dust', driven.x - nose.x * 2.1, 0.25, driven.z - nose.z * 2.1, 2);
        if (driven.condition < 0.45) emitBurst(fx, 'smoke', driven.x, 0.7, driven.z, 1);
      }
    }
    updateFx(fx, dt);
    updateAudio(audio, dt, {
      speed: driven ? driven.speed : 0,
      driving: !!driven,
      throttle: sample.forward,
      siren: wanted.stars > 0,
      walking: !driven && (sample.forward !== 0 || sample.strafe !== 0) && player.grounded,
      running: sample.run,
      shot: combat.loadout.shot,
      condition: cond,
      station: radio.index,
      music: true,
    });
  } else if (!playing && !shot) {
    titleYaw += dt * 0.045;
    rig.yaw = titleYaw;
    rig.pitch = 0.62;
    rig.dist = 190;
    rig.lookY = 12;
  }
  if (live && driven) camera.fov = baseFov + Math.min(6, Math.abs(driven.speed) * 0.11);
  else camera.fov = baseFov;
  camera.updateProjectionMatrix();
  placeCamera();
  const here = driven || player.mesh.position;
  const district = districtAt(here.x, here.z);
  pulseBeacon(missions, now);
  const track = nowPlaying(radio);
  document.getElementById('hud').style.visibility = (menus.mode === 'play' || menus.mode === 'pause') ? 'visible' : 'hidden';
  updateHud(hud, {
    mission: missionView(missions),
    banner: missions.bannerT > 0 ? missions.banner : '',
    bannerCash: missions.bannerCash,
    stars: wanted.stars,
    down: combat.vitals.state,
    health: combat.vitals.health,
    armour: combat.vitals.armour,
    cash: combat.vitals.cash,
    day,
    clock: dayClock,
    police: policeRoster(police, here.x, here.z),
    loadout: combat.loadout,
    driven,
    district,
    x: here.x,
    z: here.z,
    yaw: driven ? driven.yaw : player.mesh.rotation.y,
    dialogue,
    radio: track,
    notice: toast.t > 0 ? toast.text : '',
    crosshair: live && !driven && combat.vitals.state === 'ok',
  });
  if (menus.mode === 'map') {
    drawWorldMap(menus.mapCanvas, {
      x: here.x,
      z: here.z,
      yaw: driven ? driven.yaw : player.mesh.rotation.y,
      mission: missionView(missions),
      police: policeRoster(police, here.x, here.z),
      district,
    });
  }
  if (!testing) {
    const who = playing ? (driven ? 'Driving the ' + driven.type.name : 'Rafa Quill on foot') : 'Port Solano title';
    statusEl.textContent = who + ' in ' + district + '. ' + track.station + '.';
  }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
