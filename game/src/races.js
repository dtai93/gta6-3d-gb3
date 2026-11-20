// A staged cargo-and-causeway route that starts at the Old Harbor line.

import { RACE_LINE } from './config.js';

export const DOCKLINE_RACE = {
  title: 'SOLANO SPRINT',
  start: { x: RACE_LINE.x, z: RACE_LINE.z, radius: 8 },
  checkpoints: [
    { x: 176, z: 44, name: 'Ferry Cut' },
    { x: 220, z: 88, name: 'Crane Gate' },
    { x: 220, z: 132, name: 'Dock Nine' },
    { x: 176, z: 176, name: 'Palm Bend' },
    { x: 88, z: 176, name: 'Causeway Turn' },
    { x: 44, z: 88, name: 'Shore Line' },
  ],
};

export function createRace() {
  return { active: false, checkpoint: 0, elapsed: 0, finished: 0, staged: false };
}

export function startRace(state) {
  if (state.active) return false;
  state.active = true;
  state.checkpoint = 0;
  state.elapsed = 0;
  state.finished = 0;
  state.staged = false;
  return true;
}

export function stageRace(state) {
  state.active = true;
  state.checkpoint = 2;
  state.elapsed = 38.4;
  state.finished = 0;
  state.staged = true;
}

export function updateRace(state, dt, world) {
  if (!state.active || state.staged) return false;
  state.elapsed += dt;
  const point = DOCKLINE_RACE.checkpoints[state.checkpoint];
  if (world.driven && point && Math.hypot(world.x - point.x, world.z - point.z) < 9) {
    state.checkpoint += 1;
    if (state.checkpoint >= DOCKLINE_RACE.checkpoints.length) {
      state.active = false;
      state.finished = state.elapsed;
      return true;
    }
  }
  return false;
}

export function raceView(state) {
  const total = DOCKLINE_RACE.checkpoints.length;
  const point = DOCKLINE_RACE.checkpoints[Math.min(state.checkpoint, total - 1)];
  return {
    active: state.active,
    title: DOCKLINE_RACE.title,
    position: state.active ? '1 / 4' : '',
    checkpoint: Math.min(state.checkpoint + 1, total),
    total,
    next: point ? point.name : 'Finish',
    elapsed: state.elapsed,
  };
}
