// Three dockside contacts with small, timed favors.

import { repairVehicle } from './vehicles.js';

export const DOCK_CREW = [
  { id: 'nia', name: 'Nia Voss', portrait: 'nia', ability: 'Tide Cut', hint: 'shave off heat', cooldown: 42 },
  { id: 'mateo', name: 'Mateo Sol', portrait: 'mateo', ability: 'Yard Patch', hint: 'mend car or health', cooldown: 34 },
  { id: 'jun', name: 'Jun Park', portrait: 'jun', ability: 'Slip Wake', hint: 'short speed surge', cooldown: 38 },
];

export function createCrew() {
  return { selected: 0, cooldowns: [0, 0, 0], flash: 0 };
}

export function updateCrew(state, dt) {
  for (let i = 0; i < state.cooldowns.length; i++) state.cooldowns[i] = Math.max(0, state.cooldowns[i] - dt);
  state.flash = Math.max(0, state.flash - dt);
}

export function activateCrew(state, world) {
  if (state.cooldowns[state.selected] > 0) {
    let ready = -1;
    for (let offset = 1; offset < DOCK_CREW.length; offset++) {
      const candidate = (state.selected + offset) % DOCK_CREW.length;
      if (state.cooldowns[candidate] <= 0) { ready = candidate; break; }
    }
    if (ready < 0) return { ok: false, message: 'DOCK CREW FAVORS COOLING' };
    state.selected = ready;
  }
  const member = DOCK_CREW[state.selected];
  if (member.id === 'nia') {
    world.wanted.heat = Math.max(0, world.wanted.heat - 1.15);
    world.wanted.stars = world.wanted.heat < 0.2 ? 0 : Math.ceil(world.wanted.heat - 1e-4);
  } else if (member.id === 'mateo') {
    if (world.driven) {
      repairVehicle(world.driven);
    } else world.vitals.health = Math.min(100, world.vitals.health + 18);
  } else if (world.driven) {
    world.driven.boostT = Math.max(world.driven.boostT || 0, 3.5);
    world.driven.speed += 3;
  } else {
    world.vitals.armour = Math.min(100, world.vitals.armour + 12);
  }
  state.cooldowns[state.selected] = member.cooldown;
  state.flash = 1.4;
  const message = member.id === 'nia' ? 'NIA · TIDE CUT — HEAT EASED'
    : member.id === 'mateo' ? 'MATEO · YARD PATCH — ' + (world.driven ? 'CAR MENDED' : 'HEALTH RESTORED')
      : 'JUN · SLIP WAKE — ' + (world.driven ? 'SPEED SURGE' : 'ARMOUR SET');
  state.selected = (state.selected + 1) % DOCK_CREW.length;
  return { ok: true, message };
}
