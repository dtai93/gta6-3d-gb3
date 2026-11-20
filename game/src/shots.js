// Frozen screenshot scenes. One staged moment per ?shot= name. No unseeded motion.

import * as THREE from '../vendor/three.module.min.js';
import { SHOTS } from './config.js';
import { setWantedStars } from './wanted.js';
import { stagePolice } from './police.js';
import { stageMission } from './missions.js';
import { stageRace } from './races.js';
import { say as sayLine } from './dialogue.js';
import { addGlow } from './glow.js';
import { createVehicle, seatPlayer, syncVehicle, yawFromDir } from './vehicles.js';

function poseRig(player, rig, shot, testing) {
  player.mesh.position.set(shot.x, 0, shot.z);
  player.mesh.rotation.y = shot.face;
  rig.yaw = shot.yaw;
  rig.pitch = shot.pitch;
  rig.dist = shot.dist;
  rig.lookY = shot.lookY;
  rig.aim = shot.aim || 2.2;
  rig.frozen = !testing;
}

function mountCar(world, typeId, x, z, yaw, speed, condition) {
  const ride = createVehicle(typeId, x, z, yaw);
  world.scene.add(ride.mesh);
  world.cars.push(ride);
  ride.speed = speed;
  ride.condition = condition;
  ride.occupied = true;
  syncVehicle(ride, 0, 0.22);
  return ride;
}

function drive(world, typeId, shot, speed, condition) {
  const ride = mountCar(world, typeId, shot.x, shot.z, shot.face, speed, condition);
  seatPlayer(ride, world.player);
  return ride;
}

function stand(player, combat, slot) {
  combat.loadout.index = slot;
  combat.gun.visible = slot > 0;
  player.armR.rotation.x = slot > 0 ? 1.32 : 0.15;
  player.armL.rotation.x = 0.35;
  player.legL.rotation.x = 0.22;
  player.legR.rotation.x = -0.12;
}

function placePed(ped, x, z, yaw) {
  if (!ped) return;
  ped.x = x;
  ped.z = z;
  ped.yaw = yaw;
  ped.state = 'flee';
  ped.mesh.position.set(x, 0, z);
  ped.mesh.rotation.y = yaw;
}

function driftFx(scene, x, z, yaw, roadYaw) {
  const nx = -Math.sin(yaw);
  const nz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const roadX = -Math.sin(roadYaw);
  const roadZ = -Math.cos(roadYaw);
  const sideX = Math.cos(roadYaw);
  const sideZ = -Math.sin(roadYaw);
  const smokeGeo = new THREE.SphereGeometry(0.34, 6, 5);
  const puff = [
    [0.72, 2.35, 0.28, 0.55, 0.4],
    [-0.72, 2.35, 0.36, 0.62, 0.36],
    [0.4, 3.3, 0.5, 0.85, 0.28],
    [-0.3, 4.2, 0.7, 1.05, 0.22],
    [0.1, 5.2, 0.9, 1.25, 0.16],
  ];
  for (let i = 0; i < puff.length; i++) {
    const s = puff[i];
    const mat = new THREE.MeshBasicMaterial({ color: 0xe7e2d8, transparent: true, opacity: s[4], depthWrite: false });
    const mesh = new THREE.Mesh(smokeGeo, mat);
    mesh.position.set(x - nx * s[1] + rx * s[0], s[2], z - nz * s[1] + rz * s[0]);
    mesh.scale.setScalar(s[3]);
    scene.add(mesh);
  }
  const streak = new THREE.MeshBasicMaterial({ color: 0xfff8ee, transparent: true, opacity: 0.72, depthWrite: false });
  const geo = new THREE.BoxGeometry(0.07, 0.07, 1);
  const lines = [[-2.5, 0.38, 0.4, 5.4], [2.55, 0.42, -0.6, 5.6], [-2.8, 0.9, 1.8, 3.8], [2.85, 0.95, -2.2, 4.2]];
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i];
    const mesh = new THREE.Mesh(geo, streak);
    mesh.position.set(x + s[0], s[1], z + s[2]);
    mesh.scale.z = s[3];
    scene.add(mesh);
  }
  const mark = new THREE.MeshBasicMaterial({ color: 0x121212 });
  const slab = new THREE.PlaneGeometry(0.26, 1.15);
  for (let i = 0; i < 5; i++) {
    for (let side = -1; side <= 1; side += 2) {
      const mesh = new THREE.Mesh(slab, mark);
      mesh.rotation.order = 'YXZ';
      mesh.rotation.y = yaw;
      mesh.rotation.x = -Math.PI / 2;
      const dist = 2.2 + i * 1.05;
      mesh.position.set(x - nx * dist + rx * side * 0.7, 0.05, z - nz * dist + rz * side * 0.7);
      scene.add(mesh);
    }
  }
  const blockMat = new THREE.MeshLambertMaterial({ color: 0xd4c5ab });
  const blockGeo = new THREE.BoxGeometry(3.4, 0.55, 0.8);
  for (let i = -1; i <= 1; i++) {
    const mesh = new THREE.Mesh(blockGeo, blockMat);
    const dist = 13.5 + i * 0.15;
    mesh.position.set(x + roadX * dist + sideX * i * 2.25, 0.32, z + roadZ * dist + sideZ * i * 2.25);
    mesh.rotation.y = roadYaw + (i === 0 ? 0 : i * 0.12);
    mesh.castShadow = true;
    scene.add(mesh);
  }
  for (let i = -2; i <= 2; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.85, 7),
      new THREE.MeshLambertMaterial({ color: i % 2 ? 0xff7a24 : 0xffcc55 }),
    );
    cone.position.set(x + roadX * 15.5 + sideX * i * 1.15, 0.42, z + roadZ * 15.5 + sideZ * i * 1.15);
    scene.add(cone);
  }
}

function stageChase(world, shot) {
  const { combat, wanted, missions, dialogue, toast, radio, peds, respect, crew } = world;
  setWantedStars(wanted, 4, shot.x, shot.z);
  wanted.seen = true;
  const ride = drive(world, 0, shot, 32, 0.48);
  ride.steer = 0.62;
  ride.skid = 1;
  syncVehicle(ride, 0.02, 0.22);
  for (let i = 0; i < world.cars.length; i++) {
    const car = world.cars[i];
    if (car === ride) continue;
    if (Math.hypot(car.x - shot.x, car.z - shot.z) < 18) car.mesh.visible = false;
  }
  stagePolice(world.police, 'chase', shot.x, shot.z, shot.yaw);
  world.police.officers[0].active = false;
  world.police.officers[0].mesh.visible = false;
  driftFx(world.scene, shot.x, shot.z, shot.face, shot.yaw);
  placePed(peds.list[0], shot.x - 7.2, shot.z - 13, shot.face + 1.5);
  placePed(peds.list[1], shot.x + 7.4, shot.z - 17, shot.face - 1.5);
  const facadeLight = new THREE.PointLight(0xffbd78, 38, 38, 1.35);
  facadeLight.position.set(shot.x + 10, 12, shot.z - 8);
  world.scene.add(facadeLight);
  const roadLight = new THREE.PointLight(0xffd89b, 30, 42, 1.2);
  roadLight.position.set(shot.x - 4, 7, shot.z - 18);
  world.scene.add(roadLight);
  const spotlightWash = new THREE.PointLight(0xdaf5ff, 18, 34, 1.4);
  spotlightWash.position.set(shot.x + 8.5, 16, shot.z - 14);
  world.scene.add(spotlightWash);
  combat.vitals.health = 84;
  combat.vitals.armour = 46;
  combat.vitals.cash = 2460;
  combat.vitals.cashPop = 1200;
  combat.loadout.index = 1;
  stageMission(missions, 'chase');
  sayLine(dialogue, 'nia', "They're on the causeway. Don't stop for the lights.", 999);
  toast.text = '';
  toast.t = 0;
  radio.index = 0;
  respect.rp = 910;
  crew.selected = 0;
  crew.cooldowns[0] = 0;
  crew.cooldowns[1] = 16;
  crew.cooldowns[2] = 0;
  return ride;
}

function bolt(scene, ax, ay, az, bx, by, bz, color) {
  const len = Math.hypot(bx - ax, by - ay, bz - az) || 1;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.07, 1),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.94, depthWrite: false }),
  );
  mesh.position.set((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  mesh.scale.z = len;
  mesh.lookAt(bx, by, bz);
  scene.add(mesh);
}

function muzzle(scene, x, y, z, color) {
  addGlow(scene, x, y, z, 0xfff6e4, 0.55);
  addGlow(scene, x, y, z, color, 1.7);
}

function fightFx(scene, x, z, yaw, cops) {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const mx = x + fx * 0.9 + rx * 0.34;
  const my = 1.34;
  const mz = z + fz * 0.9 + rz * 0.34;
  muzzle(scene, mx, my, mz, 0xffb15a);
  for (let i = 0; i < cops.length; i++) {
    const c = cops[i];
    bolt(scene, mx, my, mz, c.x, 1.16, c.z, i ? 0xffe08a : 0xfff4c8);
    muzzle(scene, c.x - fx * 0.5, 1.22, c.z - fz * 0.5, 0xff5a3a);
    bolt(scene, c.x, 1.22, c.z, x - rx * (1.2 + i * 0.7), 1.05, z - rz * (1.2 + i * 0.7), 0xff4d3a);
  }
  const warm = new THREE.PointLight(0xffb27a, 24, 18, 1.4);
  warm.position.set(x + fx * 2.2, 2.6, z + fz * 2.2);
  scene.add(warm);
  const cool = new THREE.PointLight(0x79b6ff, 18, 16, 1.5);
  cool.position.set(cops[0].x, 2.5, cops[0].z);
  scene.add(cool);
  const pink = new THREE.PointLight(0xff4ad4, 12, 22, 2);
  pink.position.set(x - rx * 6, 5.2, z + fz * 3);
  scene.add(pink);
}

function districtTag(scene, text, x, y, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const g = canvas.getContext('2d');
  g.fillStyle = 'rgba(10,12,18,0.8)';
  g.fillRect(6, 12, 500, 72);
  g.strokeStyle = '#ffc14a';
  g.lineWidth = 6;
  g.strokeRect(6, 12, 500, 72);
  g.fillStyle = '#fff6ea';
  g.font = '700 42px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 48);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    depthTest: false,
    depthWrite: false,
    fog: false,
  }));
  sprite.position.set(x, y, z);
  sprite.scale.set(36, 6.8, 1);
  sprite.renderOrder = 12;
  scene.add(sprite);
}

function park(world, typeId, x, z, yaw) {
  for (let i = 0; i < world.cars.length; i++) {
    if (Math.hypot(world.cars[i].x - x, world.cars[i].z - z) < 7) return;
  }
  const ride = createVehicle(typeId, x, z, yaw);
  world.scene.add(ride.mesh);
  world.cars.push(ride);
  ride.speed = 8;
  ride.condition = 0.9;
  syncVehicle(ride, 0, 0.3);
}

function stageOnFoot(world, shot) {
  const { player, combat, wanted, missions, dialogue, radio, peds, toast, respect, crew } = world;
  setWantedStars(wanted, 4, shot.x, shot.z);
  wanted.seen = true;
  stand(player, combat, 2);
  combat.vitals.health = 64;
  combat.vitals.armour = 36;
  combat.vitals.cash = 6240;
  combat.vitals.cashPop = 800;
  stagePolice(world.police, 'onfoot', shot.x, shot.z, shot.face);
  for (let i = 0; i < world.cars.length; i++) {
    const car = world.cars[i];
    if (!car.cop && Math.hypot(car.x - shot.x, car.z - shot.z) < 14) car.mesh.visible = false;
  }
  fightFx(world.scene, shot.x, shot.z, shot.face, [world.police.officers[0], world.police.officers[1]]);
  stageMission(missions, 'onfoot');
  sayLine(dialogue, 'jun', 'On the pavement. Drop them before they reach the till.', 999);
  toast.text = 'SHOTS FIRED ON THE STRIP';
  toast.t = 999;
  radio.index = 2;
  respect.rp = 1540;
  crew.selected = 2;
  crew.cooldowns[0] = 0;
  crew.cooldowns[1] = 0;
  crew.cooldowns[2] = 21;
  placePed(peds.list[0], shot.x - 5.4, shot.z + 1.6, shot.face + 1.7);
  placePed(peds.list[1], shot.x + 5.6, shot.z - 0.8, shot.face - 0.5);
  return null;
}

function stageCity(world, shot) {
  const { combat, missions, dialogue, radio, scene } = world;
  const ride = drive(world, 0, shot, 18, 0.94);
  combat.vitals.health = 100;
  combat.vitals.armour = 40;
  combat.vitals.cash = 480;
  combat.vitals.cashPop = 200;
  stageMission(missions, 'city');
  sayLine(dialogue, 'mateo', 'Cooler is under the kiosk. Ice, not questions.', 999);
  radio.index = 4;
  const east = yawFromDir(1, 0);
  const west = yawFromDir(-1, 0);
  const north = yawFromDir(0, 1);
  const south = yawFromDir(0, -1);
  const spots = [
    [1, 40, 45.9, east], [3, 110, 42.1, west], [2, 168, 45.9, east], [4, 210, 42.1, west],
    [0, 86.1, 18, north], [1, 89.9, 100, south], [3, 130.1, 150, north], [2, 177.9, 90, east],
    [4, 221.9, 132, north], [1, 48, 89.9, east], [0, 42.1, 160, south], [3, 174.1, 176, north],
  ];
  for (let i = 0; i < spots.length; i++) park(world, spots[i][0], spots[i][1], spots[i][2], spots[i][3]);
  districtTag(scene, 'CORAL SHORE', 62, 36, 18);
  districtTag(scene, 'OLD HARBOR', 186, 32, 14);
  districtTag(scene, 'NEON STRIP', 132, 68, 112);
  districtTag(scene, 'PALM HEIGHTS', 52, 30, 188);
  districtTag(scene, 'INDUSTRIAL DOCKS', 238, 28, 130);
  return ride;
}

function stageDocklineRace(world, shot) {
  const { combat, radio, respect, crew, race } = world;
  const ride = drive(world, 0, shot, 26, 0.8);
  ride.steer = 0.12;
  stageRace(race);
  combat.vitals.cash = 3180;
  combat.vitals.health = 100;
  combat.vitals.armour = 40;
  respect.rp = 910;
  crew.selected = 0;
  crew.cooldowns[0] = 0;
  crew.cooldowns[1] = 12;
  crew.cooldowns[2] = 0;
  radio.index = 4;
  return ride;
}

// Returns the driven car when the pose is in a vehicle. Start stays on the title card.
export function applyShot(name, world) {
  const shot = SHOTS[name];
  if (!shot) return null;
  poseRig(world.player, world.rig, shot, world.testing);
  let driven = null;
  if (name === 'chase') driven = stageChase(world, shot);
  else if (name === 'onfoot') driven = stageOnFoot(world, shot);
  else if (name === 'city') driven = stageCity(world, shot);
  else if (name === 'race') driven = stageDocklineRace(world, shot);
  return { driven };
}
