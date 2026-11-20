// World scale, movement, and the four staged screenshot poses.
// Roads run on the grid lines ix * SPAN / iz * SPAN. Blocks sit between them.
// Yaw 0 faces world -Z (inland). Camera yaw uses the same zero.

export const SPAN = 44;
export const ROAD_W = 12;
export const GRID_X = 6;
export const GRID_Z = 5;

export const RACE_LINE = { x: 132, z: 44 };
export const DOCK_GARAGE = { x: 220, z: 132 };

export const PLAYER = {
  radius: 0.42,
  walk: 4.4,
  run: 8.6,
  jump: 6.4,
  gravity: 20,
};

export const CAM = {
  dist: 6.4,
  pitch: 0.28,
  lookY: 1.35,
  minPitch: -0.22,
  maxPitch: 1.18,
  yawSpeed: 0.0022,
  pitchSpeed: 0.0018,
};

// Frozen poses. lookY is the camera's look height above the ground point.
export const SHOTS = {
  // aim is how far ahead of the hero the chase camera looks. yaw is the road; face is the drift.
  chase: { x: 128.4, z: 64, face: 0.48, yaw: 0, pitch: 0.18, dist: 13.6, lookY: 1.28, aim: 4.4 },
  onfoot: { x: 133.9, z: 132, face: 0.04, yaw: 0.04, pitch: 0.24, dist: 11.2, lookY: 1.2 },
  city: { x: 70, z: 45.9, face: -1.57, yaw: 0.1, pitch: 0.47, dist: 250, lookY: 5 },
  start: { x: 142, z: 68, face: 0, yaw: 0.5, pitch: 0.58, dist: 165, lookY: 7.5 },
  race: { x: 224, z: 118, face: 0, yaw: 0, pitch: 0.2, dist: 12.6, lookY: 1.25, aim: 5.2 },
  map: { x: 132, z: 64, face: 0, yaw: 0, pitch: 0.2, dist: 12.6, lookY: 1.25 },
};

export function blockBounds(ix, iz) {
  const inset = ROAD_W * 0.5;
  return {
    x0: ix * SPAN + inset,
    z0: iz * SPAN + inset,
    x1: (ix + 1) * SPAN - inset,
    z1: (iz + 1) * SPAN - inset,
  };
}

export function districtOf(ix, iz) {
  if (ix >= 5 && iz >= 1) return 'Industrial Docks';
  if (iz <= 0 && ix >= 3) return 'Old Harbor';
  if (iz <= 1 && ix <= 2) return 'Coral Shore';
  if (iz >= 4 || (iz >= 3 && ix <= 1)) return 'Palm Heights';
  return 'Neon Strip';
}
