// Save slot and settings in localStorage. Safehouse, autosave, and manual saves.

const KEY = 'port-solano-v1';
const SET_KEY = 'port-solano-settings';

export const SAFEHOUSE = { x: 44, z: 22, r: 8, name: 'Coral Shore' };

function clamp(n, lo, hi, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(lo, Math.min(hi, v));
}

export function insideSafehouse(x, z) {
  const dx = x - SAFEHOUSE.x;
  const dz = z - SAFEHOUSE.z;
  return dx * dx + dz * dz < SAFEHOUSE.r * SAFEHOUSE.r;
}

export function captureState(s) {
  return {
    v: 1,
    x: s.x,
    z: s.z,
    yaw: s.yaw || 0,
    health: s.health,
    armour: s.armour,
    cash: s.cash,
    stars: s.stars | 0,
    day: s.day,
    clock: s.clock,
    radio: s.radio | 0,
    place: s.place || 'MANUAL',
    district: s.district || 'Port Solano',
    missionTitle: s.missionTitle || 'PORT SOLANO',
    mission: {
      active: s.mission.active,
      stage: s.mission.stage | 0,
      progress: s.mission.progress || 0,
      cleared: s.mission.cleared | 0,
    },
    weapons: s.weapons || [],
    weapon: s.weapon | 0,
  };
}

export function readSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 1 || !data.mission) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

export function readSettings() {
  const base = { volume: 0.8, music: 0.6, sens: 1 };
  try {
    const raw = localStorage.getItem(SET_KEY);
    if (!raw) return base;
    const data = JSON.parse(raw);
    return {
      volume: clamp(data.volume, 0, 1, base.volume),
      music: clamp(data.music, 0, 1, base.music),
      sens: clamp(data.sens, 0.45, 1.8, base.sens),
    };
  } catch (err) {
    return base;
  }
}

export function writeSettings(settings) {
  try {
    localStorage.setItem(SET_KEY, JSON.stringify(settings));
  } catch (err) {
    /* private mode */
  }
}
