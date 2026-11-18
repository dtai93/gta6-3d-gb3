// Frozen screenshot scenes. One staged moment per ?shot= name. No unseeded motion.

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

function stageChase(world, shot) {
  const { combat, wanted, missions, dialogue, toast, radio } = world;
  setWantedStars(wanted, 4, shot.x, shot.z);
  const ride = drive(world, 0, shot, 27, 0.72);
  for (let i = 0; i < world.cars.length; i++) {
    const car = world.cars[i];
    if (car === ride) continue;
    if (Math.hypot(car.x - shot.x, car.z - shot.z) < 7.5) car.mesh.visible = false;
  }
  stagePolice(world.police, 'chase', shot.x, shot.z, shot.face);
  world.police.officers[0].active = false;
  world.police.officers[0].mesh.visible = false;
  combat.vitals.health = 84;
  combat.vitals.armour = 46;
  combat.vitals.cash = 2460;
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
