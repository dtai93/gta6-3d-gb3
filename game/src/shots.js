// Frozen screenshot scenes. One staged moment per ?shot= name. No unseeded motion.

import * as THREE from '../vendor/three.module.min.js';
import { SHOTS } from './config.js';
import { setWantedStars } from './wanted.js';
import { stagePolice } from './police.js';
import { stageMission } from './missions.js';
import { say as sayLine } from './dialogue.js';
import { createVehicle, seatPlayer, syncVehicle } from './vehicles.js';

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

function driftFx(scene, x, z, yaw) {
  const nx = -Math.sin(yaw);
  const nz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
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
}

function stageChase(world, shot) {
  const { combat, wanted, missions, dialogue, toast, radio } = world;
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
  driftFx(world.scene, shot.x, shot.z, shot.face);
  combat.vitals.health = 84;
  combat.vitals.armour = 46;
  combat.vitals.cash = 2460;
  combat.vitals.cashPop = 1200;
  combat.loadout.index = 1;
  stageMission(missions, 'chase');
  sayLine(dialogue, 'nia', "They're on the causeway. Don't stop for the lights.", 999);
  toast.text = 'ROADBLOCK ON THE CAUSEWAY';
  toast.t = 999;
  radio.index = 0;
  return ride;
}

function stageOnFoot(world, shot) {
  const { player, combat, wanted, missions, dialogue, radio, peds } = world;
  setWantedStars(wanted, 3, shot.x, shot.z);
  stand(player, combat, 2);
  combat.vitals.health = 62;
  combat.vitals.armour = 18;
  combat.vitals.cash = 6240;
  stagePolice(world.police, 'onfoot', shot.x, shot.z, shot.face);
  stageMission(missions, 'onfoot');
  sayLine(dialogue, 'jun', 'Back room of Vesper. Forty seconds, then noise.', 999);
  radio.index = 2;
  mountCar(world, 4, shot.x - 3.4, shot.z - 13.5, shot.face + 0.15, 0, 0.9);
  placePed(peds.list[0], shot.x - 2.6, shot.z - 1.6, shot.face + 2.4);
  placePed(peds.list[1], shot.x + 3.2, shot.z - 5.5, shot.face);
  return null;
}

function stageCity(world, shot) {
  const { combat, missions, dialogue, radio } = world;
  const ride = drive(world, 0, shot, 16, 0.96);
  combat.vitals.health = 100;
  combat.vitals.armour = 40;
  combat.vitals.cash = 480;
  stageMission(missions, 'city');
  sayLine(dialogue, 'mateo', 'Cooler is under the kiosk. Ice, not questions.', 999);
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
  return { driven };
}
